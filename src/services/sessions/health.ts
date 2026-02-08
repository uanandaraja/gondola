import { eq } from "drizzle-orm";
import { Effect } from "effect";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { DatabaseError } from "@/services/errors";
import { HEALTH_CHECK_INTERVAL_MS } from "./constants";
import { takeSnapshot } from "./snapshots";
import { activeSessions } from "./state";

export function handleSessionDeath(sessionId: string) {
	return Effect.gen(function* () {
		const active = activeSessions.get(sessionId);
		if (active) {
			clearInterval(active.snapshotInterval);
			yield* Effect.ignore(takeSnapshot(sessionId));
			activeSessions.delete(sessionId);
		}

		const db = yield* DatabaseClient;
		const rows = yield* Effect.tryPromise({
			try: () =>
				db
					.select()
					.from(schema.sessions)
					.where(eq(schema.sessions.id, sessionId))
					.limit(1),
			catch: (e) => new DatabaseError({ cause: e }),
		});
		const session = rows[0];

		const newStatus = session?.latestSnapshotImageId
			? "suspended"
			: "terminated";

		yield* Effect.tryPromise({
			try: () =>
				db
					.update(schema.sessions)
					.set({
						status: newStatus,
						modalSandboxId: null,
						opencodeUrl: null,
						updatedAt: new Date(),
					})
					.where(eq(schema.sessions.id, sessionId)),
			catch: (e) => new DatabaseError({ cause: e }),
		});

		console.log(`[${sessionId}] Session ${newStatus} (sandbox died)`);
	});
}

export function startHealthMonitoring() {
	return setInterval(() => {
		// Managed by SessionService
	}, HEALTH_CHECK_INTERVAL_MS);
}
