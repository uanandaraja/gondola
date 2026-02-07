import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import type { ProjectSecretRecord } from "../db/schema";
import { decrypt, encrypt } from "./crypto";
import { getProject } from "./projects";

export async function addSecret(
	projectId: string,
	userId: string,
	key: string,
	value: string,
): Promise<ProjectSecretRecord> {
	// Verify project ownership
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	const [secret] = await db
		.insert(schema.projectSecrets)
		.values({
			projectId,
			key,
			encryptedValue: encrypt(value),
		})
		.returning();
	return secret;
}

export async function listSecrets(
	projectId: string,
	userId: string,
): Promise<Pick<ProjectSecretRecord, "id" | "key" | "createdAt" | "updatedAt">[]> {
	// Verify project ownership
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	return db
		.select({
			id: schema.projectSecrets.id,
			key: schema.projectSecrets.key,
			createdAt: schema.projectSecrets.createdAt,
			updatedAt: schema.projectSecrets.updatedAt,
		})
		.from(schema.projectSecrets)
		.where(eq(schema.projectSecrets.projectId, projectId));
}

export async function updateSecret(
	secretId: string,
	projectId: string,
	userId: string,
	value: string,
): Promise<void> {
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	await db
		.update(schema.projectSecrets)
		.set({
			encryptedValue: encrypt(value),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.projectSecrets.id, secretId),
				eq(schema.projectSecrets.projectId, projectId),
			),
		);
}

export async function removeSecret(
	secretId: string,
	projectId: string,
	userId: string,
): Promise<void> {
	// Verify project ownership
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	await db
		.delete(schema.projectSecrets)
		.where(
			and(
				eq(schema.projectSecrets.id, secretId),
				eq(schema.projectSecrets.projectId, projectId),
			),
		);
}

/** Replaces all secrets for a project in a single batch operation. */
export async function replaceAllSecrets(
	projectId: string,
	userId: string,
	entries: { key: string; value: string }[],
): Promise<void> {
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}

	// Delete all existing secrets for this project
	await db
		.delete(schema.projectSecrets)
		.where(eq(schema.projectSecrets.projectId, projectId));

	// Batch insert all new secrets
	if (entries.length > 0) {
		await db.insert(schema.projectSecrets).values(
			entries.map((e) => ({
				projectId,
				key: e.key,
				encryptedValue: encrypt(e.value),
			})),
		);
	}
}

/** Returns all decrypted secrets for a project as a key-value map (with ownership check). */
export async function getDecryptedSecretsForUser(
	projectId: string,
	userId: string,
): Promise<Record<string, string>> {
	const project = await getProject(projectId, userId);
	if (!project) {
		throw new Error("Project not found");
	}
	return getDecryptedSecrets(projectId);
}

/** Internal: returns all decrypted secrets for a project as a key-value map. */
export async function getDecryptedSecrets(
	projectId: string,
): Promise<Record<string, string>> {
	const rows = await db
		.select({
			key: schema.projectSecrets.key,
			encryptedValue: schema.projectSecrets.encryptedValue,
		})
		.from(schema.projectSecrets)
		.where(eq(schema.projectSecrets.projectId, projectId));

	const result: Record<string, string> = {};
	for (const row of rows) {
		result[row.key] = decrypt(row.encryptedValue);
	}
	return result;
}
