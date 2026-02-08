import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import * as schema from "@/db/schema";
import { DatabaseClient } from "@/infra/db";
import { DatabaseError } from "@/services/errors";
import { ProjectService } from "@/services/projects";
import { decrypt, encrypt } from "./crypto";

/**
 * Input types for secret operations.
 */
export interface SecretEntry {
	readonly key: string;
	readonly value: string;
}

/**
 * Secret service implementation.
 */
export class SecretService extends Effect.Service<SecretService>()(
	"SecretService",
	{
		dependencies: [DatabaseClient.Default, ProjectService.Default],
		effect: Effect.gen(function* () {
			const db = yield* DatabaseClient;
			const projectService = yield* ProjectService;

			const addSecret = (
				projectId: string,
				userId: string,
				key: string,
				value: string,
			) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					const encryptedValue = yield* encrypt(value);

					const result = yield* Effect.tryPromise({
						try: () =>
							db
								.insert(schema.projectSecrets)
								.values({
									projectId,
									key,
									encryptedValue,
								})
								.returning(),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					return result[0];
				});

			const listSecrets = (projectId: string, userId: string) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					return yield* Effect.tryPromise({
						try: () =>
							db
								.select({
									id: schema.projectSecrets.id,
									key: schema.projectSecrets.key,
									createdAt: schema.projectSecrets.createdAt,
									updatedAt: schema.projectSecrets.updatedAt,
								})
								.from(schema.projectSecrets)
								.where(eq(schema.projectSecrets.projectId, projectId)),
						catch: (e) => new DatabaseError({ cause: e }),
					});
				});

			const updateSecret = (
				secretId: string,
				projectId: string,
				userId: string,
				value: string,
			) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					const encryptedValue = yield* encrypt(value);

					yield* Effect.tryPromise({
						try: () =>
							db
								.update(schema.projectSecrets)
								.set({
									encryptedValue,
									updatedAt: new Date(),
								})
								.where(
									and(
										eq(schema.projectSecrets.id, secretId),
										eq(schema.projectSecrets.projectId, projectId),
									),
								),
						catch: (e) => new DatabaseError({ cause: e }),
					});
				});

			const removeSecret = (
				secretId: string,
				projectId: string,
				userId: string,
			) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					yield* Effect.tryPromise({
						try: () =>
							db
								.delete(schema.projectSecrets)
								.where(
									and(
										eq(schema.projectSecrets.id, secretId),
										eq(schema.projectSecrets.projectId, projectId),
									),
								),
						catch: (e) => new DatabaseError({ cause: e }),
					});
				});

			const replaceAllSecrets = (
				projectId: string,
				userId: string,
				entries: SecretEntry[],
			) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					// Delete all existing secrets
					yield* Effect.tryPromise({
						try: () =>
							db
								.delete(schema.projectSecrets)
								.where(eq(schema.projectSecrets.projectId, projectId)),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					// Batch insert new secrets
					if (entries.length > 0) {
						// Encrypt all values first
						const encryptedEntries = yield* Effect.all(
							entries.map((e) =>
								Effect.map(encrypt(e.value), (encryptedValue) => ({
									projectId,
									key: e.key,
									encryptedValue,
								})),
							),
						);

						yield* Effect.tryPromise({
							try: () =>
								db.insert(schema.projectSecrets).values(encryptedEntries),
							catch: (e) => new DatabaseError({ cause: e }),
						});
					}
				});

			const getDecryptedSecretsForUser = (projectId: string, userId: string) =>
				Effect.gen(function* () {
					// Verify project ownership
					yield* projectService.findById(projectId, userId);

					return yield* getDecryptedSecrets(projectId);
				});

			const getDecryptedSecrets = (projectId: string) =>
				Effect.gen(function* () {
					const rows = yield* Effect.tryPromise({
						try: () =>
							db
								.select({
									key: schema.projectSecrets.key,
									encryptedValue: schema.projectSecrets.encryptedValue,
								})
								.from(schema.projectSecrets)
								.where(eq(schema.projectSecrets.projectId, projectId)),
						catch: (e) => new DatabaseError({ cause: e }),
					});

					const decrypted = yield* Effect.all(
						rows.map((row) =>
							Effect.map(decrypt(row.encryptedValue), (value) => ({
								key: row.key,
								value,
							})),
						),
					);

					const result: Record<string, string> = {};
					for (const { key, value } of decrypted) {
						result[key] = value;
					}
					return result;
				});

			return {
				addSecret,
				listSecrets,
				updateSecret,
				removeSecret,
				replaceAllSecrets,
				getDecryptedSecretsForUser,
				getDecryptedSecrets,
			};
		}),
	},
) {}
