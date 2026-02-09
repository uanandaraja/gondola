import { Data } from "effect";

export class EncryptionError extends Data.TaggedError("EncryptionError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class SecretNotFoundError extends Data.TaggedError(
	"SecretNotFoundError",
)<{
	readonly secretId?: string;
}> {
	get message(): string {
		return this.secretId
			? `Secret with id ${this.secretId} not found`
			: "Secret not found";
	}
}
