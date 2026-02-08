import { eq } from "drizzle-orm";
import { ModalClient } from "modal";
import { db, schema } from "../../db";
import type { SessionRecord } from "../../db/schema";
import { getProject } from "../projects";
import { getDecryptedSecrets } from "../secrets";
import { configureGitAuth, getGitHubAccount, getUserInfo } from "./auth";
import { MODAL_APP_NAME, SANDBOX_TIMEOUT_MS } from "./constants";
// Start health monitoring on module load
import { handleSessionDeath, startHealthMonitoring } from "./health";
import {
	setupSandboxFromScratch,
	startOpencodeServer,
	writeSecretsEnvFile,
} from "./sandbox";
import { startSnapshotScheduler, takeSnapshot } from "./snapshots";
import { activeSessions } from "./state";

startHealthMonitoring();

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
		timeoutMs: SANDBOX_TIMEOUT_MS,
		idleTimeoutMs: SANDBOX_TIMEOUT_MS,
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
		timeoutMs: SANDBOX_TIMEOUT_MS,
		idleTimeoutMs: SANDBOX_TIMEOUT_MS,
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

export * from "./auth";
export * from "./constants";
export * from "./health";
export * from "./sandbox";
export * from "./snapshots";
export * from "./state";
export * from "./types";
// Re-export everything for backward compatibility
export * from "./validation";
