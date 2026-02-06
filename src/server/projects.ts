import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import type { ProjectRecord } from "../db/schema";

export async function createProject(
	userId: string,
	data: {
		name: string;
		githubUrl: string;
		branch?: string;
		description?: string;
	},
): Promise<ProjectRecord> {
	const [project] = await db
		.insert(schema.projects)
		.values({
			userId,
			name: data.name,
			githubUrl: data.githubUrl,
			branch: data.branch || null,
			description: data.description || null,
		})
		.returning();
	return project;
}

export async function getProject(
	id: string,
	userId: string,
): Promise<ProjectRecord | undefined> {
	const result = await db
		.select()
		.from(schema.projects)
		.where(
			and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)),
		)
		.limit(1);
	return result[0];
}

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
	return db
		.select()
		.from(schema.projects)
		.where(eq(schema.projects.userId, userId));
}

export async function updateProject(
	id: string,
	userId: string,
	updates: {
		name?: string;
		branch?: string;
		description?: string;
	},
): Promise<ProjectRecord | undefined> {
	const [updated] = await db
		.update(schema.projects)
		.set({ ...updates, updatedAt: new Date() })
		.where(
			and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)),
		)
		.returning();
	return updated;
}

export async function deleteProject(
	id: string,
	userId: string,
): Promise<void> {
	await db
		.delete(schema.projects)
		.where(
			and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)),
		);
}
