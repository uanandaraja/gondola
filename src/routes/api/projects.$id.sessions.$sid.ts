import { createFileRoute } from "@tanstack/react-router";
import {
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
} from "../../lib/auth";
import {
	getSessionById,
	resumeSession,
	terminateSession,
} from "../../server/session";

export const Route = createFileRoute("/api/projects/$id/sessions/$sid")({
	server: {
		handlers: {
			GET: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				const session = await getSessionById(params.sid, user.id);
				if (!session) {
					return notFoundResponse("Session");
				}

				return new Response(JSON.stringify(session), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				try {
					const session = await resumeSession(params.sid, user.id);
					return new Response(JSON.stringify(session), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: "Failed to resume session",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
			DELETE: async ({
				params,
				request,
			}: {
				params: { id: string; sid: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				await terminateSession(params.sid, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
