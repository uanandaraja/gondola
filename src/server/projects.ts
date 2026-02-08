/**
 * Temporary compatibility shim for API routes.
 * These functions are used by the legacy API routes in src/routes/api/
 */
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { ProjectService } from "@/services/projects";

export async function createProject(
	userId: string,
	data: {
		name: string;
		githubUrl: string;
		branch?: string;
		description?: string;
	},
) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.create(userId, data);
		}),
	);
}

export async function getProject(id: string, userId: string) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.findById(id, userId);
		}),
	);
}

export async function listProjects(userId: string) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.findAll(userId);
		}),
	);
}

export async function updateProject(
	id: string,
	userId: string,
	updates: {
		name?: string;
		branch?: string;
		description?: string;
	},
) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.update(id, userId, updates);
		}),
	);
}

export async function deleteProject(id: string, userId: string) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.remove(id, userId);
		}),
	);
}

export async function listProjectsWithSessionCounts(userId: string) {
	return runService(
		Effect.gen(function* () {
			const service = yield* ProjectService;
			return yield* service.findAllWithSessionCounts(userId);
		}),
	);
}
