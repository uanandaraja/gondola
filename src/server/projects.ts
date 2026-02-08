import { and, count, eq, ne } from "drizzle-orm";
import { db, schema } from "../db";
import type { ProjectRecord } from "../db/schema";
import {
	validateBranchName,
	validateGitHubUrl,
} from "../server/session/validation";

export async function createProject(
	userId: string,
	data: {
		name: string;
		githubUrl: string;
		branch?: string;
		description?: string;
	},
): Promise<ProjectRecord> {
	// Validate GitHub URL format
	validateGitHubUrl(data.githubUrl);

	// Validate branch name if provided
	if (data.branch) {
		validateBranchName(data.branch);
	}

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
		.where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
		.limit(1);
	return result[0];
}

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
	return db
		.select()
		.from(schema.projects)
		.where(eq(schema.projects.userId, userId));
}

export async function listProjectsWithSessionCounts(
	userId: string,
): Promise<(ProjectRecord & { activeSessions: number })[]> {
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
		.where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
		.returning();
	return updated;
}

export async function deleteProject(id: string, userId: string): Promise<void> {
	await db
		.delete(schema.projects)
		.where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));
}
