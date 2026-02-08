import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runService } from "@/lib/effect";
import { auth } from "@/services/auth";
import { SessionService } from "./service";

async function requireUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

export const fetchSessions = createServerFn({ method: "GET" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.listSessions(projectId, userId);
			}),
		);
	});

export const fetchSession = createServerFn({ method: "GET" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.getSessionById(sessionId, userId);
			}),
		);
	});

export const createNewSession = createServerFn({ method: "POST" })
	.inputValidator((projectId: string) => projectId)
	.handler(async ({ data: projectId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.createSession(projectId, userId);
			}),
		);
	});

export const resumeExistingSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		return runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.resumeSession(sessionId, userId);
			}),
		);
	});

export const removeSession = createServerFn({ method: "POST" })
	.inputValidator((sessionId: string) => sessionId)
	.handler(async ({ data: sessionId }) => {
		const userId = await requireUserId();
		await runService(
			Effect.gen(function* () {
				const service = yield* SessionService;
				return yield* service.terminateSession(sessionId, userId);
			}),
		);
	});
