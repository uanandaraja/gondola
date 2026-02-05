import { eq } from "drizzle-orm";
import { ModalClient, type Sandbox } from "modal";
import { db, schema } from "../db";
import type { SandboxRecord } from "../db/schema";

const modalInstances = new Map<string, Sandbox>();

const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

export async function createSandbox(
	gitUrl: string,
	branch?: string,
): Promise<SandboxRecord> {
	const id = crypto.randomUUID();

	console.log(`[${id}] Creating sandbox for ${gitUrl}...`);

	const client = new ModalClient();
	const app = await client.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});

	// Get image ID from env
	const imageId = process.env.MODAL_IMAGE_ID;
	if (!imageId) {
		throw new Error(
			"MODAL_IMAGE_ID not set. Run: bun run scripts/build-image.ts",
		);
	}

	const image = await client.images.fromId(imageId);

	// Get Modal secret for Kimi API key
	console.log(`[${id}] Loading Modal secrets...`);
	const kimiSecret = await client.secrets.fromName("kimi-api-key");

	// Create sandbox with port 4096 encrypted and secrets
	console.log(`[${id}] Creating Modal sandbox...`);
	const idleTimeoutMs = 1800000; // 30 minutes
	const sandbox = await client.sandboxes.create(app, image, {
		idleTimeoutMs, // Dies after X minutes of inactivity (no HTTP requests)
		encryptedPorts: [4096],
		secrets: [kimiSecret], // Inject KIMI_API_KEY as env var
	});

	console.log(`[${id}] Sandbox created: ${sandbox.sandboxId}`);

	// Check current directory
	const pwdProc = await sandbox.exec(["pwd"]);
	const pwd = await pwdProc.stdout.readText();
	console.log(`[${id}] Current directory: ${pwd.trim()}`);

	// Clone repository - use absolute path
	// If no branch specified, git will clone the default branch automatically
	console.log(`[${id}] Cloning repository...`);
	const branchFlag = branch ? `-b ${branch} ` : "";
	const cloneProc = await sandbox.exec([
		"bash",
		"-c",
		`cd /root/workspace && git clone ${branchFlag}${gitUrl} repo 2>&1`,
	]);

	const cloneOutput = await cloneProc.stdout.readText();
	const cloneError = await cloneProc.stderr.readText();

	try {
		await cloneProc.wait();
		console.log(`[${id}] Clone output: ${cloneOutput}`);
		console.log(`[${id}] Repository cloned successfully`);
	} catch (_error) {
		console.error(`[${id}] Clone failed:`, cloneError || cloneOutput);
		await sandbox.terminate();
		throw new Error(`Failed to clone repository: ${cloneError || cloneOutput}`);
	}

	// Verify repo exists
	console.log(`[${id}] Verifying repo...`);
	const verifyProc = await sandbox.exec([
		"bash",
		"-c",
		"ls -la /root/workspace/repo/ 2>&1 | head -10",
	]);
	const verifyOutput = await verifyProc.stdout.readText();
	const verifyError = await verifyProc.stderr.readText();
	console.log(`[${id}] Repo contents:\n${verifyOutput}`);
	if (verifyError) {
		console.error(`[${id}] Repo error: ${verifyError}`);
	}

	// Check if it's a git repo and get the current branch
	const gitCheck = await sandbox.exec([
		"bash",
		"-c",
		"cd /root/workspace/repo && git status 2>&1 | head -3",
	]);
	const gitStatus = await gitCheck.stdout.readText();
	console.log(`[${id}] Git status: ${gitStatus}`);

	// If no branch was specified, detect which branch we're on
	let detectedBranch = branch;
	if (!detectedBranch) {
		const branchProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && git branch --show-current 2>&1",
		]);
		detectedBranch = (await branchProc.stdout.readText()).trim();
		console.log(`[${id}] Detected branch: ${detectedBranch}`);
	}

	// Install dependencies if package.json exists
	console.log(`[${id}] Checking for dependencies...`);
	const checkPkgProc = await sandbox.exec([
		"bash",
		"-c",
		"test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'",
	]);

	const hasPackageJson =
		(await checkPkgProc.stdout.readText()).trim() === "found";

	if (hasPackageJson) {
		console.log(`[${id}] Installing dependencies...`);
		const installProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && bun install 2>&1",
		]);

		try {
			await installProc.wait();
			console.log(`[${id}] Dependencies installed`);
		} catch (_error) {
			console.warn(`[${id}] Dependency install failed (continuing anyway)`);
		}
	}

	// Create global opencode config with Kimi For Coding provider
	console.log(`[${id}] Configuring opencode with Kimi For Coding...`);
	const configDir = await sandbox.exec([
		"mkdir",
		"-p",
		"/root/.config/opencode",
	]);
	await configDir.wait();

	const configContent = JSON.stringify(
		{
			$schema: "https://opencode.ai/config.json",
			model: "kimi-for-coding/k2p5",
			provider: {
				"kimi-for-coding": {
					options: {
						apiKey: "{env:KIMI_API_KEY}",
						baseURL: "https://api.kimi.com/coding/v1",
					},
				},
			},
		},
		null,
		2,
	);

	const writeConfig = await sandbox.exec([
		"bash",
		"-c",
		`echo '${configContent}' > /root/.config/opencode/opencode.json`,
	]);
	await writeConfig.wait();
	console.log(`[${id}] Opencode config created`);

	// Verify config file content
	const verifyConfig = await sandbox.exec([
		"bash",
		"-c",
		"cat /root/.config/opencode/opencode.json",
	]);
	const configOutput = await verifyConfig.stdout.readText();
	console.log(`[${id}] Config file content:\n${configOutput}`);

	// Check if env var is set (masked for security)
	const checkEnv = await sandbox.exec([
		"bash",
		"-c",
		"if [ -n \"$KIMI_API_KEY\" ]; then echo 'KIMI_API_KEY: set (hidden)'; else echo 'KIMI_API_KEY: not set'; fi",
	]);
	const envOutput = await checkEnv.stdout.readText();
	console.log(`[${id}] ${envOutput.trim()}`);

	// Check if opencode is installed
	console.log(`[${id}] Checking opencode installation...`);
	const checkOpencode = await sandbox.exec([
		"bash",
		"-c",
		"which opencode && opencode --version",
	]);
	const opencodeVersion = await checkOpencode.stdout.readText();
	console.log(`[${id}] Opencode: ${opencodeVersion.trim()}`);

	// Test API key by making a simple request to Kimi
	console.log(`[${id}] Testing Kimi API key...`);
	const apiTest = await sandbox.exec([
		"bash",
		"-c",
		"curl -s -o /dev/null -w '%{http_code}' -H \"Authorization: Bearer $KIMI_API_KEY\" https://api.kimi.com/coding/v1/models 2>&1 || echo '000'",
	]);
	const apiStatus = await apiTest.stdout.readText();
	console.log(`[${id}] API test status: ${apiStatus.trim()}`);
	if (apiStatus.trim() === "401") {
		console.error(`[${id}] ⚠️  API key is invalid or unauthorized!`);
	} else if (apiStatus.trim() === "200") {
		console.log(`[${id}] ✅ API key is valid`);
	}

	// Start opencode serve from the repo directory
	console.log(`[${id}] Starting opencode server on port 4096...`);

	// Change to repo dir and start opencode in background
	// Don't wait for the process since it runs indefinitely
	sandbox
		.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &",
		])
		.catch(() => {}); // Ignore errors from the background process

	console.log(
		`[${id}] Opencode process started, waiting for it to be ready...`,
	);

	// Wait and check logs
	await new Promise((resolve) => setTimeout(resolve, 6000));

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

	// Store sandbox info in database
	const [inserted] = await db
		.insert(schema.sandboxes)
		.values({
			id,
			modalSandboxId: sandbox.sandboxId,
			gitUrl,
			branch: detectedBranch || null,
			opencodeUrl,
			status: "running",
		})
		.returning();

	modalInstances.set(id, sandbox);

	return inserted;
}

export async function getSandbox(
	id: string,
): Promise<SandboxRecord | undefined> {
	const result = await db
		.select()
		.from(schema.sandboxes)
		.where(eq(schema.sandboxes.id, id))
		.limit(1);
	return result[0];
}

export async function deleteSandbox(id: string): Promise<void> {
	const instance = modalInstances.get(id);

	if (instance) {
		console.log(`[${id}] Terminating sandbox...`);
		try {
			await instance.terminate();
		} catch (error) {
			console.error(`[${id}] Error terminating sandbox:`, error);
		}
	}

	await db
		.update(schema.sandboxes)
		.set({ status: "terminated" })
		.where(eq(schema.sandboxes.id, id));

	modalInstances.delete(id);
	console.log(`[${id}] Sandbox terminated`);
}

export async function listSandboxes(): Promise<SandboxRecord[]> {
	return db.select().from(schema.sandboxes);
}
