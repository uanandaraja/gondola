import { T as TSS_SERVER_FUNCTION, c as createServerFn } from "../server.mjs";
import { eq } from "drizzle-orm";
import { ModalClient } from "modal";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgEnum, pgTable, timestamp, text, uuid } from "drizzle-orm/pg-core";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-router";
const createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const sandboxStatusEnum = pgEnum("sandbox_status", [
  "creating",
  "running",
  "error",
  "terminated"
]);
const sandboxes = pgTable("sandboxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  modalSandboxId: text("modal_sandbox_id").notNull(),
  gitUrl: text("git_url").notNull(),
  branch: text("branch"),
  opencodeUrl: text("opencode_url").notNull(),
  status: sandboxStatusEnum("status").notNull().default("creating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  sandboxStatusEnum,
  sandboxes
}, Symbol.toStringTag, { value: "Module" }));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = postgres(databaseUrl);
const db = drizzle(client, { schema });
const modalInstances = /* @__PURE__ */ new Map();
const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";
async function createSandbox(gitUrl, branch) {
  var _a;
  const id = crypto.randomUUID();
  console.log(`[${id}] Creating sandbox for ${gitUrl}...`);
  const client2 = new ModalClient();
  const app = await client2.apps.fromName(MODAL_APP_NAME, {
    createIfMissing: true
  });
  const imageId = process.env.MODAL_IMAGE_ID;
  if (!imageId) {
    throw new Error(
      "MODAL_IMAGE_ID not set. Run: bun run scripts/build-image.ts"
    );
  }
  const image = await client2.images.fromId(imageId);
  console.log(`[${id}] Loading Modal secrets...`);
  const kimiSecret = await client2.secrets.fromName("kimi-api-key");
  console.log(`[${id}] Creating Modal sandbox...`);
  const idleTimeoutMs = parseInt(
    process.env.SANDBOX_IDLE_TIMEOUT_MS || "1200000",
    10
  );
  const sandbox = await client2.sandboxes.create(app, image, {
    idleTimeoutMs,
    // Dies after X minutes of inactivity (no HTTP requests)
    encryptedPorts: [4096],
    secrets: [kimiSecret]
    // Inject KIMI_API_KEY as env var
  });
  console.log(`[${id}] Sandbox created: ${sandbox.sandboxId}`);
  const pwdProc = await sandbox.exec(["pwd"]);
  const pwd = await pwdProc.stdout.readText();
  console.log(`[${id}] Current directory: ${pwd.trim()}`);
  console.log(`[${id}] Cloning repository...`);
  const branchFlag = branch ? `-b ${branch} ` : "";
  const cloneProc = await sandbox.exec([
    "bash",
    "-c",
    `cd /root/workspace && git clone ${branchFlag}${gitUrl} repo 2>&1`
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
  console.log(`[${id}] Verifying repo...`);
  const verifyProc = await sandbox.exec([
    "bash",
    "-c",
    "ls -la /root/workspace/repo/ 2>&1 | head -10"
  ]);
  const verifyOutput = await verifyProc.stdout.readText();
  const verifyError = await verifyProc.stderr.readText();
  console.log(`[${id}] Repo contents:
${verifyOutput}`);
  if (verifyError) {
    console.error(`[${id}] Repo error: ${verifyError}`);
  }
  const gitCheck = await sandbox.exec([
    "bash",
    "-c",
    "cd /root/workspace/repo && git status 2>&1 | head -3"
  ]);
  const gitStatus = await gitCheck.stdout.readText();
  console.log(`[${id}] Git status: ${gitStatus}`);
  let detectedBranch = branch;
  if (!detectedBranch) {
    const branchProc = await sandbox.exec([
      "bash",
      "-c",
      "cd /root/workspace/repo && git branch --show-current 2>&1"
    ]);
    detectedBranch = (await branchProc.stdout.readText()).trim();
    console.log(`[${id}] Detected branch: ${detectedBranch}`);
  }
  console.log(`[${id}] Checking for dependencies...`);
  const checkPkgProc = await sandbox.exec([
    "bash",
    "-c",
    "test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'"
  ]);
  const hasPackageJson = (await checkPkgProc.stdout.readText()).trim() === "found";
  if (hasPackageJson) {
    console.log(`[${id}] Installing dependencies...`);
    const installProc = await sandbox.exec([
      "bash",
      "-c",
      "cd /root/workspace/repo && bun install 2>&1"
    ]);
    try {
      await installProc.wait();
      console.log(`[${id}] Dependencies installed`);
    } catch (_error) {
      console.warn(`[${id}] Dependency install failed (continuing anyway)`);
    }
  }
  console.log(`[${id}] Configuring opencode with Kimi For Coding...`);
  const configDir = await sandbox.exec([
    "mkdir",
    "-p",
    "/root/.config/opencode"
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
            baseURL: "https://api.kimi.com/coding/v1"
          }
        }
      }
    },
    null,
    2
  );
  const writeConfig = await sandbox.exec([
    "bash",
    "-c",
    `echo '${configContent}' > /root/.config/opencode/opencode.json`
  ]);
  await writeConfig.wait();
  console.log(`[${id}] Opencode config created`);
  const verifyConfig = await sandbox.exec([
    "bash",
    "-c",
    "cat /root/.config/opencode/opencode.json"
  ]);
  const configOutput = await verifyConfig.stdout.readText();
  console.log(`[${id}] Config file content:
${configOutput}`);
  const checkEnv = await sandbox.exec([
    "bash",
    "-c",
    `if [ -n "$KIMI_API_KEY" ]; then echo 'KIMI_API_KEY: set (hidden)'; else echo 'KIMI_API_KEY: not set'; fi`
  ]);
  const envOutput = await checkEnv.stdout.readText();
  console.log(`[${id}] ${envOutput.trim()}`);
  console.log(`[${id}] Checking opencode installation...`);
  const checkOpencode = await sandbox.exec([
    "bash",
    "-c",
    "which opencode && opencode --version"
  ]);
  const opencodeVersion = await checkOpencode.stdout.readText();
  console.log(`[${id}] Opencode: ${opencodeVersion.trim()}`);
  console.log(`[${id}] Testing Kimi API key...`);
  const apiTest = await sandbox.exec([
    "bash",
    "-c",
    `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $KIMI_API_KEY" https://api.kimi.com/coding/v1/models 2>&1 || echo '000'`
  ]);
  const apiStatus = await apiTest.stdout.readText();
  console.log(`[${id}] API test status: ${apiStatus.trim()}`);
  if (apiStatus.trim() === "401") {
    console.error(`[${id}] ⚠️  API key is invalid or unauthorized!`);
  } else if (apiStatus.trim() === "200") {
    console.log(`[${id}] ✅ API key is valid`);
  }
  console.log(`[${id}] Starting opencode server on port 4096...`);
  sandbox.exec([
    "bash",
    "-c",
    "cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &"
  ]).catch(() => {
  });
  console.log(
    `[${id}] Opencode process started, waiting for it to be ready...`
  );
  await new Promise((resolve) => setTimeout(resolve, 6e3));
  const logCheck = await sandbox.exec(["cat", "/tmp/opencode.log"]);
  const logContent = await logCheck.stdout.readText();
  console.log(`[${id}] Opencode log:
${logContent}`);
  const tunnels = await sandbox.tunnels();
  const opencodeUrl = (_a = tunnels[4096]) == null ? void 0 : _a.url;
  if (!opencodeUrl) {
    await sandbox.terminate();
    throw new Error("Failed to get opencode tunnel URL");
  }
  console.log(`[${id}] Opencode URL: ${opencodeUrl}`);
  const [inserted] = await db.insert(sandboxes).values({
    id,
    modalSandboxId: sandbox.sandboxId,
    gitUrl,
    branch: detectedBranch || null,
    opencodeUrl,
    status: "running"
  }).returning();
  modalInstances.set(id, sandbox);
  return inserted;
}
async function getSandbox(id) {
  const result = await db.select().from(sandboxes).where(eq(sandboxes.id, id)).limit(1);
  return result[0];
}
async function deleteSandbox(id) {
  const instance = modalInstances.get(id);
  if (instance) {
    console.log(`[${id}] Terminating sandbox...`);
    try {
      await instance.terminate();
    } catch (error) {
      console.error(`[${id}] Error terminating sandbox:`, error);
    }
  }
  await db.update(sandboxes).set({ status: "terminated" }).where(eq(sandboxes.id, id));
  modalInstances.delete(id);
  console.log(`[${id}] Sandbox terminated`);
}
async function listSandboxes() {
  return db.select().from(sandboxes);
}
const fetchSandboxes_createServerFn_handler = createServerRpc({
  id: "44f1e9ede9f4237ddb921cff66b518d0f98153203c250620b2dcc5419494bf9e",
  name: "fetchSandboxes",
  filename: "src/server/functions.ts"
}, (opts, signal) => fetchSandboxes.__executeServer(opts, signal));
const fetchSandboxes = createServerFn({
  method: "GET"
}).handler(fetchSandboxes_createServerFn_handler, async () => {
  return await listSandboxes();
});
const fetchSandbox_createServerFn_handler = createServerRpc({
  id: "64e90df49532818c01330e65e310ff561cb3ac79e84b65c97f3809050c982c73",
  name: "fetchSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => fetchSandbox.__executeServer(opts, signal));
const fetchSandbox = createServerFn({
  method: "GET"
}).validator((id) => id).handler(fetchSandbox_createServerFn_handler, async ({
  data: id
}) => {
  return await getSandbox(id);
});
const createNewSandbox_createServerFn_handler = createServerRpc({
  id: "f610dba9610caa95bf56e369cb923be25a614351d53ee5d89042865973d269af",
  name: "createNewSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => createNewSandbox.__executeServer(opts, signal));
const createNewSandbox = createServerFn({
  method: "POST"
}).validator((data) => data).handler(createNewSandbox_createServerFn_handler, async ({
  data
}) => {
  return await createSandbox(data.gitUrl, data.branch);
});
const removeSandbox_createServerFn_handler = createServerRpc({
  id: "b5dc867551f5e2af0a72fdf8e10e19f05951f7ef240cb8deeefeec1136d9a4d9",
  name: "removeSandbox",
  filename: "src/server/functions.ts"
}, (opts, signal) => removeSandbox.__executeServer(opts, signal));
const removeSandbox = createServerFn({
  method: "POST"
}).validator((id) => id).handler(removeSandbox_createServerFn_handler, async ({
  data: id
}) => {
  await deleteSandbox(id);
});
export {
  createNewSandbox_createServerFn_handler,
  fetchSandbox_createServerFn_handler,
  fetchSandboxes_createServerFn_handler,
  removeSandbox_createServerFn_handler
};
