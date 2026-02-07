/**
 * Railway Function: Session Health Check
 *
 * This standalone script checks all running sessions and verifies their Modal sandboxes
 * are still alive. If a sandbox is dead, it updates the session status to suspended
 * or terminated.
 *
 * To use in Railway Functions:
 * 1. Copy this entire file into a Railway Function
 * 2. Set the cron schedule to run every 5 minutes
 * 3. Ensure DATABASE_URL and MODAL_APP_NAME env vars are set
 */

// Inline imports with versions (Railway Functions will auto-install these)
import { sql } from "drizzle-orm@0.45.1";
import { pgTable, text, timestamp, uuid } from "drizzle-orm@0.45.1/pg-core";
import { drizzle } from "drizzle-orm@0.45.1/postgres";
import { ModalClient } from "modal@0.6.1";
import postgres from "postgres@3.4.8";

// ── Configuration ───────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

if (!DATABASE_URL) {
	console.error(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level: "error",
			message: "DATABASE_URL environment variable is not set",
		}),
	);
	process.exit(1);
}

// ── Inline Schema Definition ────────────────────────────────────────

// Sessions table schema (simplified - status as text to avoid enum issues)
const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id").notNull(),
	modalSandboxId: text("modal_sandbox_id"),
	opencodeUrl: text("opencode_url"),
	status: text("status").notNull().default("creating"),
	latestSnapshotImageId: text("latest_snapshot_image_id"),
	lastSnapshotAt: timestamp("last_snapshot_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ── Logger ─────────────────────────────────────────────────────────

function log(
	level: "info" | "error" | "warn",
	message: string,
	meta?: Record<string, unknown>,
) {
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			message,
			...meta,
		}),
	);
}

// ── Health Check Logic ─────────────────────────────────────────────

async function checkSessionHealth(
	client: ModalClient,
	db: ReturnType<typeof drizzle>,
	session: typeof sessions.$inferSelect,
) {
	const sessionId = session.id;
	const sandboxId = session.modalSandboxId;

	if (!sandboxId) {
		log("warn", "Session has no modalSandboxId, skipping", { sessionId });
		return;
	}

	try {
		// Try to get the sandbox from Modal
		const sandbox = await client.sandboxes.get(sandboxId);

		// Check if sandbox is still running
		const exitCode = await sandbox.poll();

		if (exitCode === null) {
			// Sandbox is still running - all good
			log("info", "Session healthy", {
				sessionId,
				sandboxId,
				status: "running",
			});
			return;
		}

		// Sandbox has exited - need to update status
		log("info", "Sandbox exited, updating session status", {
			sessionId,
			sandboxId,
			exitCode,
		});

		// Determine new status based on whether there's a snapshot
		const newStatus = session.latestSnapshotImageId
			? "suspended"
			: "terminated";

		// Update database
		await db
			.update(sessions)
			.set({
				status: newStatus,
				modalSandboxId: null,
				opencodeUrl: null,
				updatedAt: sql`now()`,
			})
			.where(sql`${sessions.id} = ${sessionId}`);

		log("info", "Session status updated", {
			sessionId,
			oldStatus: "running",
			newStatus,
		});
	} catch (error) {
		// Sandbox not found in Modal - it's been terminated externally
		log("warn", "Sandbox not found in Modal, marking as terminated", {
			sessionId,
			sandboxId,
			error: error instanceof Error ? error.message : String(error),
		});

		// Determine new status based on whether there's a snapshot
		const newStatus = session.latestSnapshotImageId
			? "suspended"
			: "terminated";

		// Update database
		await db
			.update(sessions)
			.set({
				status: newStatus,
				modalSandboxId: null,
				opencodeUrl: null,
				updatedAt: sql`now()`,
			})
			.where(sql`${sessions.id} = ${sessionId}`);

		log("info", "Session status updated after missing sandbox", {
			sessionId,
			oldStatus: "running",
			newStatus,
		});
	}
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
	const startTime = Date.now();

	log("info", "Starting session health check", {
		timestamp: new Date().toISOString(),
	});

	// Initialize database connection
	// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is validated above
	const pgClient = postgres(DATABASE_URL!, { prepare: false });
	const db = drizzle(pgClient);

	// Initialize Modal client
	const modalClient = new ModalClient();
	const app = await modalClient.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});

	try {
		// Get all running sessions
		const runningSessions = await db
			.select()
			.from(sessions)
			.where(sql`${sessions.status} = 'running'`);

		log("info", "Found running sessions", {
			count: runningSessions.length,
		});

		// Check each session
		let healthyCount = 0;
		const updatedCount = 0;
		let errorCount = 0;

		for (const session of runningSessions) {
			try {
				await checkSessionHealth(modalClient, db, session);
				healthyCount++;
			} catch (error) {
				errorCount++;
				log("error", "Error checking session", {
					sessionId: session.id,
					error: error instanceof Error ? error.message : String(error),
				});
				// Continue with next session (fail silently per requirement)
			}
		}

		const duration = Date.now() - startTime;

		log("info", "Health check completed", {
			totalSessions: runningSessions.length,
			healthy: healthyCount,
			updated: updatedCount,
			errors: errorCount,
			durationMs: duration,
		});
	} catch (error) {
		log("error", "Health check failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		// Don't throw - Railway Functions expects clean exit
	} finally {
		// Close database connection
		await pgClient.end();
	}
}

// Run the health check
main()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		log("error", "Unhandled error in main", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(0); // Exit cleanly even on error (fail silently)
	});
