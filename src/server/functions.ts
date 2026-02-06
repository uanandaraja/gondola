import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../services/auth";
import {
	createProject,
	deleteProject,
	getProject,
	listProjects,
	updateProject,
} from "./projects";
import {
	addSecret,
	listSecrets,
	removeSecret,
} from "./secrets";
import {
	createSession,
	getSessionById,
	listSessions,
	resumeSession,
	terminateSession,
} from "./session";

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
		return await listProjects(userId);
	},
);

export const fetchProject = createServerFn({ method: "GET" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		return await getProject(id, userId);
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
		return await createProject(userId, data);
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
		return await updateProject(projectId, userId, updates);
	});

export const deleteExistingProject = createServerFn({ method: "POST" })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const userId = await requireUserId();
		await deleteProject(id, userId);
	});

// ── Secrets ─────────────────────────────────────────────────────────

export const fetchProjectSecrets = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return await listSecrets(projectId, userId);
	});

export const addProjectSecret = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { projectId: string; key: string; value: string }) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		return await addSecret(data.projectId, userId, data.key, data.value);
	});

export const removeProjectSecret = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { projectId: string; secretId: string }) => data,
	)
	.handler(async ({ data }) => {
		const userId = await requireUserId();
		await removeSecret(data.secretId, data.projectId, userId);
	});

// ── Sessions ────────────────────────────────────────────────────────

export const fetchSessions = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return await listSessions(projectId, userId);
	});

export const fetchSession = createServerFn({ method: "GET" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return await getSessionById(sessionId, userId);
	});

export const createNewSession = createServerFn({ method: "POST" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return await createSession(projectId, userId);
	});

export const resumeExistingSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return await resumeSession(sessionId, userId);
	});

export const removeSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		await terminateSession(sessionId, userId);
	});
