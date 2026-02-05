import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { listSandboxes, createSandbox } from "../../server/sandbox";

const createSchema = z.object({
	gitUrl: z.string().url(),
	branch: z.string().optional(),
});

export const Route = createFileRoute("/api/sandbox")({
	server: {
		handlers: {
			GET: async () => {
				const sandboxes = await listSandboxes();
				return new Response(JSON.stringify({ sandboxes }), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({ request }: { request: Request }) => {
				try {
					const body = await request.json();
					const result = createSchema.safeParse(body);

					if (!result.success) {
						return new Response(
							JSON.stringify({ error: "Invalid request", details: result.error.issues }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const { gitUrl, branch } = result.data;
					console.log(`\n🚀 Creating sandbox for: ${gitUrl}`);
					const sandbox = await createSandbox(gitUrl, branch);
					console.log(`✅ Sandbox ready: ${sandbox.opencodeUrl}\n`);

					return new Response(
						JSON.stringify({
							id: sandbox.id,
							status: sandbox.status,
							opencodeUrl: sandbox.opencodeUrl,
							gitUrl: sandbox.gitUrl,
							branch: sandbox.branch,
							createdAt: sandbox.createdAt,
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("❌ Failed to create sandbox:", error);
					return new Response(
						JSON.stringify({
							error: "Failed to create sandbox",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
