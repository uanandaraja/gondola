import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
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

// Validation schemas
const uuidSchema = z.string().uuid("Invalid UUID format");

const updateProjectSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	branch: z.string().optional(),
	description: z.string().optional(),
});

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

				// Validate project ID format
				const idValidation = uuidSchema.safeParse(params.id);
				if (!idValidation.success) {
					return new Response(
						JSON.stringify({
							error: "Invalid project ID",
							details: idValidation.error.issues,
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
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

				// Validate project ID format
				const idValidation = uuidSchema.safeParse(params.id);
				if (!idValidation.success) {
					return new Response(
						JSON.stringify({
							error: "Invalid project ID",
							details: idValidation.error.issues,
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				try {
					const body = await request.json();
					const validation = updateProjectSchema.safeParse(body);

					if (!validation.success) {
						return new Response(
							JSON.stringify({
								error: "Invalid request",
								details: validation.error.issues,
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
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

				// Validate project ID format
				const idValidation = uuidSchema.safeParse(params.id);
				if (!idValidation.success) {
					return new Response(
						JSON.stringify({
							error: "Invalid project ID",
							details: idValidation.error.issues,
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				await deleteProject(params.id, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
