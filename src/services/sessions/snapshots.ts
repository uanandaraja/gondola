import { eq } from "drizzle-orm";
import { Effect } from "effect";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { DatabaseError } from "@/services/errors";
import { SNAPSHOT_INTERVAL_MS, SNAPSHOT_TIMEOUT_MS } from "./constants";
import { SnapshotError } from "./errors";
import { activeSessions } from "./state";

export function takeSnapshot(sessionId: string) {
	return Effect.gen(function* () {
		const active = activeSessions.get(sessionId);
		if (!active) {
			return yield* Effect.fail(
				new SnapshotError({ message: "Session not active" }),
			);
		}

		console.log(`[${sessionId}] Taking filesystem snapshot...`);

		const image = yield* Effect.tryPromise({
			try: () => active.sandbox.snapshotFilesystem(SNAPSHOT_TIMEOUT_MS),
			catch: (e) =>
				new SnapshotError({
					message: "Snapshot filesystem operation failed",
					cause: e,
				}),
		});

		const imageId = image.imageId;

		const db = yield* DatabaseClient;
		yield* Effect.tryPromise({
			try: () =>
				db
					.update(schema.sessions)
					.set({
						latestSnapshotImageId: imageId,
						lastSnapshotAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(schema.sessions.id, sessionId)),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		console.log(`[${sessionId}] Snapshot saved: ${imageId}`);
		return imageId;
	});
}

export function startSnapshotScheduler(_sessionId: string) {
	return setInterval(() => {
		// The SessionService will manage this via runService
		// For now, this is a placeholder
	}, SNAPSHOT_INTERVAL_MS);
}
