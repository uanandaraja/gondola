import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { auth } from "@/services/auth";
import { SecretService } from "./service";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

export const fetchProjectSecrets = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.listSecrets(projectId, userId);
			}),
		);
	});

export const fetchDecryptedSecrets = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.getDecryptedSecretsForUser(projectId, userId);
			}),
		);
	});

export const addProjectSecret = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { projectId: string; key: string; value: string }) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.addSecret(
					data.projectId,
					userId,
					data.key,
					data.value,
				);
			}),
		);
	});

export const replaceProjectSecrets = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { projectId: string; entries: { key: string; value: string }[] }) =>
			data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.replaceAllSecrets(
					data.projectId,
					userId,
					data.entries,
				);
			}),
		);
	});

export const updateProjectSecret = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { projectId: string; secretId: string; value: string }) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.updateSecret(
					data.secretId,
					data.projectId,
					userId,
					data.value,
				);
			}),
		);
	});

export const removeProjectSecret = createServerFn({ method: "POST" })
	.inputValidator((data: { projectId: string; secretId: string }) => data)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* SecretService;
				return yield* service.removeSecret(
					data.secretId,
					data.projectId,
					userId,
				);
			}),
		);
	});
