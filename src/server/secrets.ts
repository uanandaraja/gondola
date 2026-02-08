/**
 * Temporary compatibility shim for session module.
 * This file will be removed once SessionService is migrated.
 */
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { SecretService } from "@/services/secrets";

export async function getDecryptedSecrets(
	projectId: string,
): Promise<Record<string, string>> {
	return runService(
		Effect.gen(function* () {
			const service = yield* SecretService;
			return yield* service.getDecryptedSecrets(projectId);
		}),
	);
}
