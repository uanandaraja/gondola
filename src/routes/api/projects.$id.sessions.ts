import { createFileRoute } from "@tanstack/react-router";
import { createSession, listSessions } from "../../server/session";
import { auth } from "../../services/auth";

async function requireUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

export const Route = createFileRoute("/api/projects/$id/sessions")({
	server: {
		handlers: {
			GET: async ({
				params,
				request,
			}: {
				params: { id: string };
				request: Request;
			}) => {
				const user = await requireUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const sessions = await listSessions(params.id, user.id);
				return new Response(JSON.stringify({ sessions }), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({
				params,
				request,
			}: {
				params: { id: string };
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
					const session = await createSession(params.id, user.id);
					return new Response(JSON.stringify(session), {
						status: 201,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: "Failed to create session",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
