import { createFileRoute } from "@tanstack/react-router";
import {
	deleteProject,
	getProject,
	updateProject,
} from "../../server/projects";
import { auth } from "../../services/auth";

async function requireUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

export const Route = createFileRoute("/api/projects/$id")({
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

				const project = await getProject(params.id, user.id);
				if (!project) {
					return new Response(JSON.stringify({ error: "Project not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(JSON.stringify(project), {
					headers: { "Content-Type": "application/json" },
				});
			},
			PUT: async ({
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
					const body = await request.json();
					const updated = await updateProject(params.id, user.id, body);
					if (!updated) {
						return new Response(
							JSON.stringify({ error: "Project not found" }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}
					return new Response(JSON.stringify(updated), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: "Failed to update project",
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

				await deleteProject(params.id, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
