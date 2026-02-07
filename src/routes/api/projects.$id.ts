import { createFileRoute } from "@tanstack/react-router";
import {
	notFoundResponse,
	requireUser,
	unauthorizedResponse,
} from "../../lib/auth";
import {
	deleteProject,
	getProject,
	updateProject,
} from "../../server/projects";

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
					return unauthorizedResponse();
				}

				const project = await getProject(params.id, user.id);
				if (!project) {
					return notFoundResponse("Project");
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
					return unauthorizedResponse();
				}

				try {
					const body = await request.json();
					const updated = await updateProject(params.id, user.id, body);
					if (!updated) {
						return notFoundResponse("Project");
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
					return unauthorizedResponse();
				}

				await deleteProject(params.id, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
