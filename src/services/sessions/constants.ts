export const MODAL_APP_NAME = process.env.MODAL_APP_NAME || "gondola";

// Timeouts (in milliseconds)
export const SANDBOX_TIMEOUT_MS = 7200000; // 2 hours
export const SNAPSHOT_TIMEOUT_MS = 60000; // 60 seconds
export const SNAPSHOT_INTERVAL_MS = Number(
	process.env.SNAPSHOT_INTERVAL_MS || "300000",
); // 5 min default

// Health monitoring
export const HEALTH_CHECK_INTERVAL_MS = 60000; // 60 seconds

// Delays
export const OPENCODE_STARTUP_WAIT_MS = 6000; // 6 seconds
