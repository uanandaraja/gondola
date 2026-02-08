import { Data } from "effect";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	readonly cause: unknown;
}> {
	get message() {
		return "A database error occurred";
	}
}

export class UnauthenticatedError extends Data.TaggedError(
	"UnauthenticatedError",
)<{
	readonly message: string;
}> {}

export class ConfigError extends Data.TaggedError("ConfigError")<{
	readonly key: string;
	readonly message: string;
}> {}
