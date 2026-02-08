import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { auth } from "@/services/auth";
import { ProjectService } from "./service";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

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
