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
			}).pipe(
				Effect.catchTag("ProjectNotFoundError", (e) =>
					Effect.succeed({ error: "not_found" as const, message: e.message }),
				),
				Effect.catchTag("DatabaseError", (e) =>
					Effect.succeed({ error: "db_error" as const, message: e.message }),
				),
			),
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
			}).pipe(
				Effect.catchTag("ProjectValidationError", (e) =>
					Effect.succeed({
						error: "validation" as const,
						field: e.field,
						message: e.message,
					}),
				),
				Effect.catchTag("DatabaseError", (e) =>
					Effect.succeed({ error: "db_error" as const, message: e.message }),
				),
			),
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
			}).pipe(
				Effect.catchTag("ProjectNotFoundError", (e) =>
					Effect.succeed({ error: "not_found" as const, message: e.message }),
				),
				Effect.catchTag("ProjectValidationError", (e) =>
					Effect.succeed({
						error: "validation" as const,
						field: e.field,
						message: e.message,
					}),
				),
				Effect.catchTag("DatabaseError", (e) =>
					Effect.succeed({ error: "db_error" as const, message: e.message }),
				),
			),
		);
	});

export const deleteExistingProject = createServerFn({ method: "POST" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* ProjectService;
				return yield* service.remove(id, userId);
			}).pipe(
				Effect.catchTag("DatabaseError", (e) =>
					Effect.succeed({ error: "db_error" as const, message: e.message }),
				),
			),
		);
	});
