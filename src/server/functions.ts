import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { auth } from "@/services/auth";
import { ProjectService } from "@/services/projects";
import { SecretService } from "@/services/secrets";
import { SessionService } from "@/services/sessions";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

// ── Projects ────────────────────────────────────────────────────────

export const fetchProjects = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.findAllWithSessionCounts(userId);
			}),
		);
	},
);

export const fetchProject = createServerFn({ method: "GET" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.findById(id, userId);
			}),
		);
	});

export const createNewProject = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			name: string;
			githubUrl: string;
			branch?: string;
			description?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.create(userId, data);
			}),
		);
	});

export const updateExistingProject = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			projectId: string;
			name?: string;
			branch?: string;
			description?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		const { projectId, ...updates } = data;
		return runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.update(projectId, userId, updates);
			}),
		);
	});

export const deleteExistingProject = createServerFn({ method: "POST" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.remove(id, userId);
			}),
		);
	});

// ── Secrets ─────────────────────────────────────────────────────────

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

// ── Sessions ────────────────────────────────────────────────────────

export const fetchSessions = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.listSessions(projectId, userId);
			}),
		);
	});

export const fetchSession = createServerFn({ method: "GET" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.getSessionById(sessionId, userId);
			}),
		);
	});

export const createNewSession = createServerFn({ method: "POST" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.createSession(projectId, userId);
			}),
		);
	});

export const resumeExistingSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.resumeSession(sessionId, userId);
			}),
		);
	});

export const removeSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.terminateSession(sessionId, userId);
			}),
		);
	});
