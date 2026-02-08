import type { Sandbox } from "modal";

export interface ActiveSession {
	sandbox: Sandbox;
	snapshotInterval: ReturnType<typeof setInterval>;
}
