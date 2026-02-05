import { createFileRoute } from "@tanstack/react-router";
import { getSandbox, deleteSandbox } from "../../server/sandbox";

export const Route = createFileRoute("/api/sandbox/$id")({
	server: {
		handlers: {
			GET: async ({ params }: { params: { id: string } }) => {
				const { id } = params;
				const sandbox = await getSandbox(id);

				if (!sandbox) {
					return new Response(
						JSON.stringify({ error: "Sandbox not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						id: sandbox.id,
						status: sandbox.status,
						opencodeUrl: sandbox.opencodeUrl,
						gitUrl: sandbox.gitUrl,
						branch: sandbox.branch,
						createdAt: sandbox.createdAt,
					}),
					{ headers: { "Content-Type": "application/json" } },
				);
			},
			DELETE: async ({ params }: { params: { id: string } }) => {
				const { id } = params;
				const sandbox = await getSandbox(id);

				if (!sandbox) {
					return new Response(
						JSON.stringify({ error: "Sandbox not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				await deleteSandbox(id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
