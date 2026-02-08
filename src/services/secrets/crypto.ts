import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Effect } from "effect";
import { ConfigError } from "@/services/errors";
import { EncryptionError } from "./errors";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment.
 * Validates it's a 64-character hex string (32 bytes).
 */
function getKey(): Effect.Effect<Buffer, ConfigError> {
	const hex = process.env.SECRETS_ENCRYPTION_KEY;
	if (!hex || hex.length !== 64) {
		return new ConfigError({
			key: "SECRETS_ENCRYPTION_KEY",
			message:
				"SECRETS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
		});
	}
	return Effect.succeed(Buffer.from(hex, "hex"));
}

/**
 * Encrypts plaintext using AES-256-GCM.
 */
export function encrypt(
	plaintext: string,
): Effect.Effect<string, ConfigError | EncryptionError> {
	return Effect.gen(function* () {
		const key = yield* getKey();

		return yield* Effect.try({
			try: () => {
				const iv = randomBytes(IV_LENGTH);
				const cipher = createCipheriv(ALGORITHM, key, iv);

				const encrypted = Buffer.concat([
					cipher.update(plaintext, "utf8"),
					cipher.final(),
				]);
				const tag = cipher.getAuthTag();

				// iv (12) + tag (16) + ciphertext
				return Buffer.concat([iv, tag, encrypted]).toString("base64");
			},
			catch: (error) =>
				new EncryptionError({
					message: "Failed to encrypt value",
					cause: error,
				}),
		});
	});
}

/**
 * Decrypts a base64-encoded ciphertext using AES-256-GCM.
 */
export function decrypt(
	encoded: string,
): Effect.Effect<string, ConfigError | EncryptionError> {
	return Effect.gen(function* () {
		const key = yield* getKey();

		return yield* Effect.try({
			try: () => {
				const buf = Buffer.from(encoded, "base64");

				const iv = buf.subarray(0, IV_LENGTH);
				const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
				const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

				const decipher = createDecipheriv(ALGORITHM, key, iv);
				decipher.setAuthTag(tag);

				return decipher.update(ciphertext) + decipher.final("utf8");
			},
			catch: (error) =>
				new EncryptionError({
					message: "Failed to decrypt value - may be corrupted or tampered",
					cause: error,
				}),
		});
	});
}
