import { eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { HEALTH_CHECK_INTERVAL_MS } from "./constants";
import { takeSnapshot } from "./snapshots";
import { activeSessions } from "./state";

export async function handleSessionDeath(sessionId: string) {
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

export function startHealthMonitoring(): ReturnType<typeof setInterval> {
	// Poll active sessions every 60 seconds
	return setInterval(async () => {
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
	}, HEALTH_CHECK_INTERVAL_MS);
}
