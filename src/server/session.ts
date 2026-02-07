import { and, eq } from "drizzle-orm";
import { ModalClient, type Sandbox } from "modal";
import { db, schema } from "../db";
import type { SessionRecord } from "../db/schema";
import { getProject } from "./projects";
import { getDecryptedSecrets } from "./secrets";

// ── Types & State ───────────────────────────────────────────────────

interface ActiveSession {
	sandbox: Sandbox;
	snapshotInterval: ReturnType<typeof setInterval>;
}

const activeSessions = new Map<string, ActiveSession>();

const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";
const SNAPSHOT_INTERVAL_MS = Number(
	process.env.SNAPSHOT_INTERVAL_MS || "300000",
); // 5 min default

// ── Snapshot Helpers ────────────────────────────────────────────────

async function takeSnapshot(sessionId: string): Promise<string | null> {
	const active = activeSessions.get(sessionId);
	if (!active) return null;

	try {
		console.log(`[${sessionId}] Taking filesystem snapshot...`);
		const image = await active.sandbox.snapshotFilesystem(60000);
		const imageId = image.imageId;

		await db
			.update(schema.sessions)
			.set({
				latestSnapshotImageId: imageId,
				lastSnapshotAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.sessions.id, sessionId));

		console.log(`[${sessionId}] Snapshot saved: ${imageId}`);
		return imageId;
	} catch (error) {
		console.error(`[${sessionId}] Snapshot failed:`, error);
		return null;
	}
}

function startSnapshotScheduler(
	sessionId: string,
): ReturnType<typeof setInterval> {
	return setInterval(() => {
		takeSnapshot(sessionId).catch((err) =>
			console.error(`[${sessionId}] Scheduled snapshot error:`, err),
		);
	}, SNAPSHOT_INTERVAL_MS);
}

// ── Sandbox Setup Helpers ───────────────────────────────────────────

async function setupSandboxFromScratch(
	sandbox: Sandbox,
	sessionId: string,
	githubUrl: string,
	branch?: string | null,
) {
	// Clone repository
	console.log(`[${sessionId}] Cloning repository...`);
	const branchFlag = branch ? `-b ${branch} ` : "";
	const cloneProc = await sandbox.exec([
		"bash",
		"-c",
		`cd /root/workspace && git clone ${branchFlag}${githubUrl} repo 2>&1`,
	]);

	const cloneOutput = await cloneProc.stdout.readText();
	const cloneError = await cloneProc.stderr.readText();

	try {
		await cloneProc.wait();
		console.log(`[${sessionId}] Clone output: ${cloneOutput}`);
	} catch (_error) {
		console.error(`[${sessionId}] Clone failed:`, cloneError || cloneOutput);
		await sandbox.terminate();
		throw new Error(`Failed to clone repository: ${cloneError || cloneOutput}`);
	}

	// Detect branch if not specified
	let detectedBranch = branch;
	if (!detectedBranch) {
		const branchProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && git branch --show-current 2>&1",
		]);
		detectedBranch = (await branchProc.stdout.readText()).trim();
		console.log(`[${sessionId}] Detected branch: ${detectedBranch}`);
	}

	// Install dependencies if package.json exists
	console.log(`[${sessionId}] Checking for dependencies...`);
	const checkPkgProc = await sandbox.exec([
		"bash",
		"-c",
		"test -f /root/workspace/repo/package.json && echo 'found' || echo 'none'",
	]);
	const hasPackageJson =
		(await checkPkgProc.stdout.readText()).trim() === "found";

	if (hasPackageJson) {
		console.log(`[${sessionId}] Installing dependencies...`);
		const installProc = await sandbox.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && bun install 2>&1",
		]);
		try {
			await installProc.wait();
			console.log(`[${sessionId}] Dependencies installed`);
		} catch (_error) {
			console.warn(
				`[${sessionId}] Dependency install failed (continuing anyway)`,
			);
		}
	}

	// Configure opencode
	await configureOpencode(sandbox, sessionId);
}

async function configureOpencode(sandbox: Sandbox, sessionId: string) {
	console.log(`[${sessionId}] Configuring opencode...`);
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
	console.log(`[${sessionId}] Opencode config written`);
}

async function startOpencodeServer(sandbox: Sandbox, sessionId: string) {
	console.log(`[${sessionId}] Starting opencode server on port 4096...`);
	sandbox
		.exec([
			"bash",
			"-c",
			"cd /root/workspace/repo && HOME=/root opencode serve --port 4096 --hostname 0.0.0.0 --cors '*' > /tmp/opencode.log 2>&1 &",
		])
		.catch(() => {});

	await new Promise((resolve) => setTimeout(resolve, 6000));

	const logCheck = await sandbox.exec(["cat", "/tmp/opencode.log"]);
	const logContent = await logCheck.stdout.readText();
	console.log(`[${sessionId}] Opencode log:\n${logContent}`);
}

async function writeSecretsEnvFile(
	sandbox: Sandbox,
	sessionId: string,
	secrets: Record<string, string>,
) {
	if (Object.keys(secrets).length === 0) return;

	console.log(`[${sessionId}] Writing project secrets to .env...`);
	const envContent = Object.entries(secrets)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");

	// Use base64 to avoid shell escaping issues with secret values
	const encoded = Buffer.from(envContent).toString("base64");
	const writeProc = await sandbox.exec([
		"bash",
		"-c",
		`echo '${encoded}' | base64 -d > /root/workspace/repo/.env`,
	]);
	await writeProc.wait();
	console.log(`[${sessionId}] Project secrets written to .env`);
}

// ── GitHub Auth Helpers ─────────────────────────────────────────────

async function getGitHubAccount(userId: string) {
	const rows = await db
		.select()
		.from(schema.account)
		.where(
			and(
				eq(schema.account.userId, userId),
				eq(schema.account.providerId, "github"),
			),
		)
		.limit(1);
	return rows[0] ?? null;
}

async function getUserInfo(userId: string) {
	const rows = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.limit(1);
	return rows[0] ?? null;
}

async function configureGitAuth(
	sandbox: Sandbox,
	sessionId: string,
	githubToken: string,
	userName: string,
	userEmail: string,
) {
	console.log(`[${sessionId}] Configuring git and gh auth...`);

	// Set GITHUB_TOKEN in ~/.bashrc so it persists for all shell sessions
	const exportLine = `export GITHUB_TOKEN=${githubToken}`;
	const encoded = Buffer.from(exportLine).toString("base64");
	const envProc = await sandbox.exec([
		"bash",
		"-c",
		`echo '${encoded}' | base64 -d >> /root/.bashrc`,
	]);
	await envProc.wait();

	// Configure git user identity
	const gitConfigProc = await sandbox.exec([
		"bash",
		"-c",
		`git config --global user.name "${userName}" && git config --global user.email "${userEmail}"`,
	]);
	await gitConfigProc.wait();

	// Configure git credential helper to use GITHUB_TOKEN
	const credProc = await sandbox.exec([
		"bash",
		"-c",
		`git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=\${GITHUB_TOKEN}"; }; f'`,
	]);
	await credProc.wait();

	// Set up gh CLI auth
	const ghProc = await sandbox.exec([
		"bash",
		"-c",
		`GITHUB_TOKEN=${githubToken} gh auth setup-git`,
	]);
	await ghProc.wait();

	console.log(`[${sessionId}] Git auth configured for ${userName}`);
}

// ── Core Session Functions ──────────────────────────────────────────

export async function createSession(
	projectId: string,
	userId: string,
): Promise<SessionRecord> {
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	const sessionId = crypto.randomUUID();
	console.log(`[${sessionId}] Creating session for project ${project.name}...`);

	const client = new ModalClient();
	const app = await client.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});

	// Get base image
	const imageId = process.env.MODAL_IMAGE_ID;
	if (!imageId) {
		throw new Error(
			"MODAL_IMAGE_ID not set. Run: bun run scripts/build-image.ts",
		);
	}
	const image = await client.images.fromId(imageId);

	// Load secrets: Modal's kimi key + project secrets + GitHub token
	const kimiSecret = await client.secrets.fromName("kimi-api-key");
	const projectSecrets = await getDecryptedSecrets(projectId);
	const secrets = [kimiSecret];

	if (Object.keys(projectSecrets).length > 0) {
		const projectModalSecret = await client.secrets.fromObject(projectSecrets);
		secrets.push(projectModalSecret);
	}

	// Fetch GitHub token for git/gh auth in sandbox
	const ghAccount = await getGitHubAccount(userId);
	const userInfo = await getUserInfo(userId);
	if (ghAccount?.accessToken) {
		const ghSecret = await client.secrets.fromObject({
			GITHUB_TOKEN: ghAccount.accessToken,
		});
		secrets.push(ghSecret);
	}

	// Create sandbox
	const sandbox = await client.sandboxes.create(app, image, {
		timeoutMs: 7200000,
		idleTimeoutMs: 7200000,
		encryptedPorts: [4096],
		secrets,
	});
	console.log(`[${sessionId}] Sandbox created: ${sandbox.sandboxId}`);

	// Setup from scratch: clone, install, configure
	await setupSandboxFromScratch(
		sandbox,
		sessionId,
		project.githubUrl,
		project.branch,
	);

	// Configure git and gh CLI auth
	if (ghAccount?.accessToken && userInfo) {
		await configureGitAuth(
			sandbox,
			sessionId,
			ghAccount.accessToken,
			userInfo.name,
			userInfo.email,
		);
	}

	// Write project secrets as .env file in repo
	await writeSecretsEnvFile(sandbox, sessionId, projectSecrets);

	// Start opencode
	await startOpencodeServer(sandbox, sessionId);

	// Get tunnel URL
	const tunnels = await sandbox.tunnels();
	const opencodeUrl = tunnels[4096]?.url;
	if (!opencodeUrl) {
		await sandbox.terminate();
		throw new Error("Failed to get opencode tunnel URL");
	}
	console.log(`[${sessionId}] Opencode URL: ${opencodeUrl}`);

	// Insert session record
	const [inserted] = await db
		.insert(schema.sessions)
		.values({
			id: sessionId,
			projectId,
			modalSandboxId: sandbox.sandboxId,
			opencodeUrl,
			status: "running",
		})
		.returning();

	// Start snapshot scheduler and track
	const snapshotInterval = startSnapshotScheduler(sessionId);
	activeSessions.set(sessionId, { sandbox, snapshotInterval });

	// Take initial snapshot
	takeSnapshot(sessionId).catch(() => {});

	return inserted;
}

export async function resumeSession(
	sessionId: string,
	userId: string,
): Promise<SessionRecord> {
	// Load session and verify ownership via project
	const sessionRows = await db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.limit(1);
	const sessionRow = sessionRows[0];
	if (!sessionRow) {
		throw new Error("Session not found");
	}

	const project = await getProject(sessionRow.projectId, userId);
	if (!project) {
		throw new Error("Session not found");
	}

	if (!sessionRow.latestSnapshotImageId) {
		throw new Error("No snapshot available to resume from");
	}

	console.log(
		`[${sessionId}] Resuming from snapshot ${sessionRow.latestSnapshotImageId}...`,
	);

	const client = new ModalClient();
	const app = await client.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});

	// Load snapshot image
	const snapshotImage = await client.images.fromId(
		sessionRow.latestSnapshotImageId,
	);

	// Load secrets
	const kimiSecret = await client.secrets.fromName("kimi-api-key");
	const projectSecrets = await getDecryptedSecrets(sessionRow.projectId);
	const secrets = [kimiSecret];

	if (Object.keys(projectSecrets).length > 0) {
		const projectModalSecret = await client.secrets.fromObject(projectSecrets);
		secrets.push(projectModalSecret);
	}

	// Fetch GitHub token for git/gh auth in sandbox
	const ghAccount = await getGitHubAccount(userId);
	const userInfo = await getUserInfo(userId);
	if (ghAccount?.accessToken) {
		const ghSecret = await client.secrets.fromObject({
			GITHUB_TOKEN: ghAccount.accessToken,
		});
		secrets.push(ghSecret);
	}

	// Create sandbox from snapshot image
	const sandbox = await client.sandboxes.create(app, snapshotImage, {
		timeoutMs: 7200000,
		idleTimeoutMs: 7200000,
		encryptedPorts: [4096],
		secrets,
	});
	console.log(`[${sessionId}] Sandbox restored: ${sandbox.sandboxId}`);

	// Configure git and gh CLI auth
	if (ghAccount?.accessToken && userInfo) {
		await configureGitAuth(
			sandbox,
			sessionId,
			ghAccount.accessToken,
			userInfo.name,
			userInfo.email,
		);
	}

	// Write updated secrets (in case they changed since snapshot)
	await writeSecretsEnvFile(sandbox, sessionId, projectSecrets);

	// Restart opencode (processes aren't captured in filesystem snapshots)
	await startOpencodeServer(sandbox, sessionId);

	// Get tunnel URL
	const tunnels = await sandbox.tunnels();
	const opencodeUrl = tunnels[4096]?.url;
	if (!opencodeUrl) {
		await sandbox.terminate();
		throw new Error("Failed to get opencode tunnel URL after resume");
	}
	console.log(`[${sessionId}] Resumed. Opencode URL: ${opencodeUrl}`);

	// Update session record
	const [updated] = await db
		.update(schema.sessions)
		.set({
			modalSandboxId: sandbox.sandboxId,
			opencodeUrl,
			status: "running",
			updatedAt: new Date(),
		})
		.where(eq(schema.sessions.id, sessionId))
		.returning();

	// Start snapshot scheduler and track
	const snapshotInterval = startSnapshotScheduler(sessionId);
	activeSessions.set(sessionId, { sandbox, snapshotInterval });

	return updated;
}

export async function terminateSession(
	sessionId: string,
	userId: string,
): Promise<void> {
	const sessionRows = await db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.limit(1);
	const sessionRow = sessionRows[0];
	if (!sessionRow) {
		throw new Error("Session not found");
	}

	const project = await getProject(sessionRow.projectId, userId);
	if (!project) {
		throw new Error("Session not found");
	}

	const active = activeSessions.get(sessionId);
	if (active) {
		// Take final snapshot before terminating
		await takeSnapshot(sessionId).catch(() => {});

		clearInterval(active.snapshotInterval);

		try {
			await active.sandbox.terminate();
		} catch (error) {
			console.error(`[${sessionId}] Error terminating sandbox:`, error);
		}

		activeSessions.delete(sessionId);
	} else if (sessionRow.modalSandboxId) {
		// Session not in memory but has a sandbox ID - terminate via Modal API directly
		console.log(
			`[${sessionId}] Session not in memory, terminating via Modal API...`,
		);
		try {
			const client = new ModalClient();
			const sandbox = await client.sandboxes.fromId(sessionRow.modalSandboxId);
			await sandbox.terminate();
			console.log(`[${sessionId}] Sandbox terminated via Modal API`);
		} catch (error) {
			// Sandbox might already be terminated or doesn't exist
			console.log(
				`[${sessionId}] Sandbox already terminated or not found in Modal:`,
				error instanceof Error ? error.message : error,
			);
		}
	}

	await db
		.update(schema.sessions)
		.set({
			status: "terminated",
			modalSandboxId: null,
			opencodeUrl: null,
			updatedAt: new Date(),
		})
		.where(eq(schema.sessions.id, sessionId));

	console.log(`[${sessionId}] Session terminated`);
}

export async function getSessionById(
	sessionId: string,
	userId: string,
): Promise<SessionRecord | undefined> {
	const rows = await db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.limit(1);
	const row = rows[0];
	if (!row) return undefined;

	// Verify ownership via project
	const project = await getProject(row.projectId, userId);
	if (!project) return undefined;

	// If marked running, check if sandbox is actually alive
	if (row.status === "running") {
		const active = activeSessions.get(sessionId);
		if (active) {
			try {
				const exitCode = await active.sandbox.poll();
				if (exitCode !== null) {
					await handleSessionDeath(sessionId);
					// Re-fetch updated row
					const updated = await db
						.select()
						.from(schema.sessions)
						.where(eq(schema.sessions.id, sessionId))
						.limit(1);
					return updated[0];
				}
			} catch {
				await handleSessionDeath(sessionId);
				const updated = await db
					.select()
					.from(schema.sessions)
					.where(eq(schema.sessions.id, sessionId))
					.limit(1);
				return updated[0];
			}
		}
	}

	return row;
}

export async function listSessions(
	projectId: string,
	userId: string,
): Promise<SessionRecord[]> {
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	return db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.projectId, projectId));
}

// ── Health Check Polling ────────────────────────────────────────────

async function handleSessionDeath(sessionId: string) {
	const active = activeSessions.get(sessionId);
	if (active) {
		clearInterval(active.snapshotInterval);

		// Try one last snapshot
		try {
			await takeSnapshot(sessionId);
		} catch {}

		activeSessions.delete(sessionId);
	}

	// Check if session has a snapshot to determine status
	const rows = await db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.limit(1);
	const session = rows[0];

	const newStatus = session?.latestSnapshotImageId ? "suspended" : "terminated";

	await db
		.update(schema.sessions)
		.set({
			status: newStatus,
			modalSandboxId: null,
			opencodeUrl: null,
			updatedAt: new Date(),
		})
		.where(eq(schema.sessions.id, sessionId));

	console.log(`[${sessionId}] Session ${newStatus} (sandbox died)`);
}

// Poll active sessions every 60 seconds
setInterval(async () => {
	for (const [sessionId, active] of activeSessions.entries()) {
		try {
			const exitCode = await active.sandbox.poll();
			if (exitCode !== null) {
				console.log(`[${sessionId}] Sandbox exited with code ${exitCode}`);
				await handleSessionDeath(sessionId);
			}
		} catch (error) {
			console.error(`[${sessionId}] Health check error:`, error);
			await handleSessionDeath(sessionId);
		}
	}
}, 60000);
