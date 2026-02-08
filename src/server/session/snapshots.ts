import { eq } from "drizzle-orm";
import { db, schema } from "../../db";
import { SNAPSHOT_INTERVAL_MS, SNAPSHOT_TIMEOUT_MS } from "./constants";
import { activeSessions } from "./state";

export async function takeSnapshot(sessionId: string): Promise<string | null> {
	const active = activeSessions.get(sessionId);
	if (!active) return null;

	try {
		console.log(`[${sessionId}] Taking filesystem snapshot...`);
		const image = await active.sandbox.snapshotFilesystem(SNAPSHOT_TIMEOUT_MS);
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

export function startSnapshotScheduler(
	sessionId: string,
): ReturnType<typeof setInterval> {
	return setInterval(() => {
		takeSnapshot(sessionId).catch((err) =>
			console.error(`[${sessionId}] Scheduled snapshot error:`, err),
		);
	}, SNAPSHOT_INTERVAL_MS);
}
