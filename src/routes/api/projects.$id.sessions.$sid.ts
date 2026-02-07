import { createFileRoute } from "@tanstack/react-router";
import {
	getSessionById,
	resumeSession,
	terminateSession,
} from "../../server/session";
import { auth } from "../../services/auth";

async function requireUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

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
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const session = await getSessionById(params.sid, user.id);
				if (!session) {
					return new Response(JSON.stringify({ error: "Session not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
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
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
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
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				await terminateSession(params.sid, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
