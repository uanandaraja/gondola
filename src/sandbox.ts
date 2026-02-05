import { ModalClient, type Sandbox } from "modal";

// Simple in-memory storage (no DB for now)
interface SandboxInfo {
  id: string;
  modalSandboxId: string;
  gitUrl: string;
  branch: string | null;
  opencodeUrl: string;
  status: "creating" | "running" | "error" | "terminated";
  createdAt: string;
}

const sandboxes = new Map<string, SandboxInfo>();
const modalInstances = new Map<string, Sandbox>();

const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

export async function createSandbox(
  gitUrl: string,
  branch?: string
): Promise<SandboxInfo> {
  const id = crypto.randomUUID();
  
  console.log(`[${id}] Creating sandbox for ${gitUrl}...`);

  const client = new ModalClient();
  const app = await client.apps.fromName(MODAL_APP_NAME, { createIfMissing: true });

  // Get image ID from env
  const imageId = process.env.MODAL_IMAGE_ID;
  if (!imageId) {
    throw new Error("MODAL_IMAGE_ID not set. Run: bun run scripts/build-image.ts");
  }

  const image = await client.images.fromId(imageId);

  // Get Modal secret for Moonshot API key
  console.log(`[${id}] Loading Modal secrets...`);
  const moonshotSecret = await client.secrets.fromName("moonshot-api-key");

  // Create sandbox with port 4096 encrypted and secrets
  console.log(`[${id}] Creating Modal sandbox...`);
  const idleTimeoutMs = parseInt(process.env.SANDBOX_IDLE_TIMEOUT_MS || "1200000");
  const sandbox = await client.sandboxes.create(app, image, {
    idleTimeoutMs, // Dies after X minutes of inactivity (no HTTP requests)
    encryptedPorts: [4096],
    secrets: [moonshotSecret], // Inject MOONSHOT_API_KEY as env var
  });

  console.log(`[${id}] Sandbox created: ${sandbox.sandboxId}`);

  // Check current directory
  const pwdProc = await sandbox.exec(["pwd"]);
  const pwd = await pwdProc.stdout.readText();
  console.log(`[${id}] Current directory: ${pwd.trim()}`);

  // Clone repository - use absolute path
  // If no branch specified, git will clone the default branch automatically
  console.log(`[${id}] Cloning repository...`);
  const branchFlag = branch ? `-b ${branch} ` : '';
  const cloneProc = await sandbox.exec([
    "bash", "-c",
    `cd /root/workspace && git clone ${branchFlag}${gitUrl} repo 2>&1`
  ]);
  
  const cloneOutput = await cloneProc.stdout.readText();
  const cloneError = await cloneProc.stderr.readText();
  
  try {
    await cloneProc.wait();
    console.log(`[${id}] Clone output: ${cloneOutput}`);
    console.log(`[${id}] Repository cloned successfully`);
  } catch (error) {
    console.error(`[${id}] Clone failed:`, cloneError || cloneOutput);
    await sandbox.terminate();
    throw new Error(`Failed to clone repository: ${cloneError || cloneOutput}`);
  }

  // Verify repo exists
  console.log(`[${id}] Verifying repo...`);
  const verifyProc = await sandbox.exec([
    "bash", "-c",
    "ls -la /root/workspace/repo/ 2>&1 | head -10"
  ]);
  const verifyOutput = await verifyProc.stdout.readText();
  const verifyError = await verifyProc.stderr.readText();
  console.log(`[${id}] Repo contents:\n${verifyOutput}`);
  if (verifyError) {
    console.error(`[${id}] Repo error: ${verifyError}`);
  }

  // Check if it's a git repo and get the current branch
  const gitCheck = await sandbox.exec([
    "bash", "-c",
    "cd /root/workspace/repo && git status 2>&1 | head -3"
  ]);
  const gitStatus = await gitCheck.stdout.readText();
  console.log(`[${id}] Git status: ${gitStatus}`);

  // If no branch was specified, detect which branch we're on
  let detectedBranch = branch;
  if (!detectedBranch) {
    const branchProc = await sandbox.exec([
      "bash", "-c",
      "cd /root/workspace/repo && git branch --show-current 2>&1"
    ]);
    detectedBranch = (await branchProc.stdout.readText()).trim();
    console.log(`[${id}] Detected branch: ${detectedBranch}`);
  }

  // Install dependencies if package.json exists
  console.log(`[${id}] Checking for dependencies...`);
  const checkPkgProc = await sandbox.exec([
    "bash", "-c",
    "test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'"
  ]);
  
  const hasPackageJson = (await checkPkgProc.stdout.readText()).trim() === "found";
  
  if (hasPackageJson) {
    console.log(`[${id}] Installing dependencies...`);
    const installProc = await sandbox.exec([
      "bash", "-c",
      "cd /root/workspace/repo && bun install 2>&1"
    ]);
    
    try {
      await installProc.wait();
      console.log(`[${id}] Dependencies installed`);
    } catch (error) {
      console.warn(`[${id}] Dependency install failed (continuing anyway)`);
    }
  }

  // Create global opencode config with Moonshot provider
  console.log(`[${id}] Configuring opencode with Moonshot AI...`);
  const configDir = await sandbox.exec(["mkdir", "-p", "/root/.config/opencode"]);
  await configDir.wait();
  
  const configContent = JSON.stringify({
    "$schema": "https://opencode.ai/config.json",
    "model": "moonshotai/kimi-k2.5",
    "provider": {
      "moonshotai": {
        "options": {
          "apiKey": "{env:MOONSHOT_API_KEY}",
          "baseURL": "https://api.moonshot.ai/v1"
        }
      }
    }
  }, null, 2);
  
  const writeConfig = await sandbox.exec([
    "bash", "-c",
    `echo '${configContent}' > /root/.config/opencode/opencode.json`
  ]);
  await writeConfig.wait();
  console.log(`[${id}] Opencode config created`);

  // Verify config file content
  const verifyConfig = await sandbox.exec([
    "bash", "-c",
    "cat /root/.config/opencode/opencode.json"
  ]);
  const configOutput = await verifyConfig.stdout.readText();
  console.log(`[${id}] Config file content:\n${configOutput}`);

  // Check if env var is set (masked for security)
  const checkEnv = await sandbox.exec([
    "bash", "-c",
    "if [ -n \"$MOONSHOT_API_KEY\" ]; then echo 'MOONSHOT_API_KEY: set (hidden)'; else echo 'MOONSHOT_API_KEY: not set'; fi"
  ]);
  const envOutput = await checkEnv.stdout.readText();
  console.log(`[${id}] ${envOutput.trim()}`);

  // Check if opencode is installed
  console.log(`[${id}] Checking opencode installation...`);
  const checkOpencode = await sandbox.exec([
    "bash", "-c",
    "which opencode && opencode --version"
  ]);
  const opencodeVersion = await checkOpencode.stdout.readText();
  console.log(`[${id}] Opencode: ${opencodeVersion.trim()}`);

  // Test API key by making a simple request to Moonshot
  console.log(`[${id}] Testing Moonshot API key...`);
  const apiTest = await sandbox.exec([
    "bash", "-c",
    "curl -s -o /dev/null -w '%{http_code}' -H \"Authorization: Bearer $MOONSHOT_API_KEY\" https://api.moonshot.ai/v1/models 2>&1 || echo '000'"
  ]);
  const apiStatus = await apiTest.stdout.readText();
  console.log(`[${id}] API test status: ${apiStatus.trim()}`);
  if (apiStatus.trim() === '401') {
    console.error(`[${id}] ⚠️  API key is invalid or unauthorized!`);
  } else if (apiStatus.trim() === '200') {
    console.log(`[${id}] ✅ API key is valid`);
  }

  // Start opencode serve from the repo directory
  console.log(`[${id}] Starting opencode server on port 4096...`);
  
  // Change to repo dir and start opencode in background
  // Don't wait for the process since it runs indefinitely
  sandbox.exec([
    "bash", "-c",
    "cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &"
  ]).catch(() => {}); // Ignore errors from the background process
  
  console.log(`[${id}] Opencode process started, waiting for it to be ready...`);

  // Wait and check logs
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  // Check the log
  const logCheck = await sandbox.exec(["cat", "/tmp/opencode.log"]);
  const logContent = await logCheck.stdout.readText();
  console.log(`[${id}] Opencode log:\n${logContent}`);

  // Get tunnel URL
  const tunnels = await sandbox.tunnels();
  const opencodeUrl = tunnels[4096]?.url;

  if (!opencodeUrl) {
    await sandbox.terminate();
    throw new Error("Failed to get opencode tunnel URL");
  }

  console.log(`[${id}] Opencode URL: ${opencodeUrl}`);

  // Store sandbox info
  const sandboxInfo: SandboxInfo = {
    id,
    modalSandboxId: sandbox.sandboxId,
    gitUrl,
    branch: detectedBranch || null,
    opencodeUrl,
    status: "running",
    createdAt: new Date().toISOString(),
  };

  sandboxes.set(id, sandboxInfo);
  modalInstances.set(id, sandbox);

  return sandboxInfo;
}

export function getSandbox(id: string): SandboxInfo | undefined {
  return sandboxes.get(id);
}

export async function deleteSandbox(id: string): Promise<void> {
  const sandbox = modalInstances.get(id);
  
  if (sandbox) {
    console.log(`[${id}] Terminating sandbox...`);
    try {
      await sandbox.terminate();
    } catch (error) {
      console.error(`[${id}] Error terminating sandbox:`, error);
    }
  }

  const info = sandboxes.get(id);
  if (info) {
    info.status = "terminated";
  }

  modalInstances.delete(id);
  console.log(`[${id}] Sandbox terminated`);
}

export function listSandboxes(): SandboxInfo[] {
  return Array.from(sandboxes.values());
}
