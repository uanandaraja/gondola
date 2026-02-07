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

import { ModalClient } from "modal@0.6.1";
// Inline imports with versions (Railway Functions will auto-install these)
import { SQL } from "bun";

// ── Configuration ───────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const MODAL_TOKEN_ID = process.env.MODAL_TOKEN_ID;
const MODAL_TOKEN_SECRET = process.env.MODAL_TOKEN_SECRET;
const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

const missingVars = [
	!DATABASE_URL && "DATABASE_URL",
	!MODAL_TOKEN_ID && "MODAL_TOKEN_ID",
	!MODAL_TOKEN_SECRET && "MODAL_TOKEN_SECRET",
].filter(Boolean);

if (missingVars.length > 0) {
	console.error(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level: "error",
			message: `Missing required environment variables: ${missingVars.join(", ")}`,
		}),
	);
	process.exit(1);
}

// ── Session type ────────────────────────────────────────────────────

interface Session {
	id: string;
	modal_sandbox_id: string | null;
	latest_snapshot_image_id: string | null;
}

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
	sql: SQL,
	session: Session,
) {
	const sessionId = session.id;
	const sandboxId = session.modal_sandbox_id;

	if (!sandboxId) {
		log("warn", "Session has no modalSandboxId, skipping", { sessionId });
		return;
	}

	try {
		// Try to get the sandbox from Modal
		const sandbox = await client.sandboxes.fromId(sandboxId);

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
		const newStatus = session.latest_snapshot_image_id
			? "suspended"
			: "terminated";

		// Update database
		await sql`
			UPDATE sessions
			SET status = ${newStatus}, modal_sandbox_id = NULL, opencode_url = NULL, updated_at = now()
			WHERE id = ${sessionId}::uuid
		`;

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
		const newStatus = session.latest_snapshot_image_id
			? "suspended"
			: "terminated";

		// Update database
		await sql`
			UPDATE sessions
			SET status = ${newStatus}, modal_sandbox_id = NULL, opencode_url = NULL, updated_at = now()
			WHERE id = ${sessionId}::uuid
		`;

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
	const sql = new SQL(DATABASE_URL!);

	// Initialize Modal client
	const modalClient = new ModalClient({
		tokenId: MODAL_TOKEN_ID,
		tokenSecret: MODAL_TOKEN_SECRET,
	});
	const _app = await modalClient.apps.fromName(MODAL_APP_NAME, {
		createIfMissing: true,
	});

	try {
		// Get all running sessions
		const runningSessions = await sql<Session[]>`
			SELECT id, modal_sandbox_id, latest_snapshot_image_id
			FROM sessions
			WHERE status = 'running'
		`;

		log("info", "Found running sessions", {
			count: runningSessions.length,
		});

		// Check each session
		let healthyCount = 0;
		const updatedCount = 0;
		let errorCount = 0;

		for (const session of runningSessions) {
			try {
				await checkSessionHealth(modalClient, sql, session);
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
		await sql.close();
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
