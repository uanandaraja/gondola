import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser, unauthorizedResponse } from "../../lib/auth";
import { createProject, listProjects } from "../../server/projects";

const createSchema = z.object({
	name: z.string().min(1),
	githubUrl: z.string().url(),
	branch: z.string().optional(),
	description: z.string().optional(),
});

export const Route = createFileRoute("/api/projects")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				const projects = await listProjects(user.id);
				return new Response(JSON.stringify({ projects }), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(request);
				if (!user) {
					return unauthorizedResponse();
				}

				try {
					const body = await request.json();
					const result = createSchema.safeParse(body);

					if (!result.success) {
						return new Response(
							JSON.stringify({
								error: "Invalid request",
								details: result.error.issues,
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const project = await createProject(user.id, result.data);
					return new Response(JSON.stringify(project), {
						status: 201,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							error: "Failed to create project",
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
