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
