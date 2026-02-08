/**
 * Temporary compatibility shim for API routes.
 * This file will be removed once API routes are migrated to use Effect directly.
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
