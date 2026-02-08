import { and, count, eq, ne } from "drizzle-orm";
import { Effect } from "effect";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { DatabaseError } from "@/services/errors";
import { ProjectNotFoundError, ProjectValidationError } from "./errors";
import { validateBranchName, validateGitHubUrl } from "./validation";

export interface CreateProjectInput {
	readonly name: string;
	readonly githubUrl: string;
	readonly branch?: string;
	readonly description?: string;
}

export interface UpdateProjectInput {
	readonly name?: string;
	readonly branch?: string;
	readonly description?: string;
}

export class ProjectService extends Effect.Service<ProjectService>()(
	"ProjectService",
	{
		dependencies: [DatabaseClient.Default],
		effect: Effect.gen(function* () {
			const db = yield* DatabaseClient;

			const create = (userId: string, input: CreateProjectInput) =>
				Effect.gen(function* () {
					yield* Effect.try({
						try: () => validateGitHubUrl(input.githubUrl),
						catch: () =>
							new ProjectValidationError({
								field: "githubUrl",
								message: "Invalid GitHub URL format",
							}),
					});

					if (input.branch) {
						yield* Effect.try({
							try: () => validateBranchName(input.branch!),
							catch: () =>
								new ProjectValidationError({
									field: "branch",
									message: "Invalid branch name format",
								}),
						});
					}

					const result = yield* Effect.tryPromise({
						try: () =>
							db
								.insert(schema.projects)
								.values({
									userId,
									name: input.name,
									githubUrl: input.githubUrl,
									branch: input.branch || null,
									description: input.description || null,
								})
								.returning(),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					return result[0];
				});

			const findById = (id: string, userId: string) =>
				Effect.gen(function* () {
					const results = yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(schema.projects)
								.where(
									and(
										eq(schema.projects.id, id),
										eq(schema.projects.userId, userId),
									),
								)
								.limit(1),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					if (results.length === 0) {
						return yield* Effect.fail(
							new ProjectNotFoundError({ projectId: id }),
						);
					}

					return results[0];
				});

			const findAll = (userId: string) =>
				Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(schema.projects)
							.where(eq(schema.projects.userId, userId)),
					catch: (e) => new DatabaseError({ cause: e }),
				});

			const findAllWithSessionCounts = (userId: string) =>
				Effect.tryPromise({
					try: async () => {
						const result = await db
							.select({
								project: schema.projects,
								activeSessions: count(schema.sessions.id),
							})
							.from(schema.projects)
							.leftJoin(
								schema.sessions,
								and(
									eq(schema.sessions.projectId, schema.projects.id),
									ne(schema.sessions.status, "terminated"),
								),
							)
							.where(eq(schema.projects.userId, userId))
							.groupBy(schema.projects.id);

						return result.map(({ project, activeSessions }) => ({
							...project,
							activeSessions: activeSessions ?? 0,
						}));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				});

			const update = (id: string, userId: string, input: UpdateProjectInput) =>
				Effect.gen(function* () {
					if (input.branch) {
						yield* Effect.try({
							try: () => validateBranchName(input.branch!),
							catch: () =>
								new ProjectValidationError({
									field: "branch",
									message: "Invalid branch name format",
								}),
						});
					}

					const result = yield* Effect.tryPromise({
						try: () =>
							db
								.update(schema.projects)
								.set({ ...input, updatedAt: new Date() })
								.where(
									and(
										eq(schema.projects.id, id),
										eq(schema.projects.userId, userId),
									),
								)
								.returning(),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					if (result.length === 0) {
						return yield* Effect.fail(
							new ProjectNotFoundError({ projectId: id }),
						);
					}

					return result[0];
				});

			const remove = (id: string, userId: string) =>
				Effect.gen(function* () {
					yield* Effect.tryPromise({
						try: () =>
							db
								.delete(schema.projects)
								.where(
									and(
										eq(schema.projects.id, id),
										eq(schema.projects.userId, userId),
									),
								),
						catch: (e) => new DatabaseError({ cause: e }),
					});
				});

			return {
				create,
				findById,
				findAll,
				findAllWithSessionCounts,
				update,
				remove,
			};
		}),
	},
) {}
