import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	jsonResponse,
	notFoundResponse,
	validateUUID,
	withAuth,
} from "../../server/api-utils";
import {
	deleteProject,
	getProject,
	updateProject,
} from "../../server/projects";

const updateProjectSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	branch: z.string().optional(),
	description: z.string().optional(),
});

export const Route = createFileRoute("/api/projects/$id")({
	server: {
		handlers: {
			GET: withAuth(async ({ params, user }) => {
				const error = validateUUID(params.id, "project ID");
				if (error) return error;

				const project = await getProject(params.id, user.id);
				if (!project) {
					return notFoundResponse("Project");
				}

				return jsonResponse(project);
			}),
			PUT: withAuth(async ({ params, request, user }) => {
				const error = validateUUID(params.id, "project ID");
				if (error) return error;

				try {
					const body = await request.json();
					const validation = updateProjectSchema.safeParse(body);

					if (!validation.success) {
						return jsonResponse(
							{ error: "Invalid request", details: validation.error.issues },
							400,
						);
					}

					const updated = await updateProject(
						params.id,
						user.id,
						validation.data,
					);
					if (!updated) {
						return notFoundResponse("Project");
					}
					return jsonResponse(updated);
				} catch (error) {
					return jsonResponse(
						{
							error: "Failed to update project",
							message: error instanceof Error ? error.message : "Unknown error",
						},
						500,
					);
				}
			}),
			DELETE: withAuth(async ({ params, user }) => {
				const error = validateUUID(params.id, "project ID");
				if (error) return error;

				await deleteProject(params.id, user.id);
				return new Response(null, { status: 204 });
			}),
		},
	},
});
