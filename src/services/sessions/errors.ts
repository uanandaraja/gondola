import { Data } from "effect";

export class SessionNotFoundError extends Data.TaggedError(
	"SessionNotFoundError",
)<{
	readonly sessionId: string;
}> {
	get message(): string {
		return `Session ${this.sessionId} not found`;
	}
}

export class SandboxCreationError extends Data.TaggedError(
	"SandboxCreationError",
)<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class GitCloneError extends Data.TaggedError("GitCloneError")<{
	readonly message: string;
	readonly output?: string;
}> {}

export class OpencodeStartError extends Data.TaggedError("OpencodeStartError")<{
	readonly message: string;
}> {}

export class SnapshotError extends Data.TaggedError("SnapshotError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class NoSnapshotError extends Data.TaggedError("NoSnapshotError")<{
	readonly sessionId: string;
}> {
	get message(): string {
		return `No snapshot available for session ${this.sessionId}`;
	}
}

export class TunnelError extends Data.TaggedError("TunnelError")<{
	readonly message: string;
}> {}
