import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../services/auth";
import { getSandbox, deleteSandbox } from "../../server/sandbox";

async function requireUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

export const Route = createFileRoute("/api/sandbox/$id")({
	server: {
		handlers: {
			GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
				const user = await requireUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { id } = params;
				const sandbox = await getSandbox(id, user.id);

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
			DELETE: async ({ params, request }: { params: { id: string }; request: Request }) => {
				const user = await requireUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { id } = params;
				const sandbox = await getSandbox(id, user.id);

				if (!sandbox) {
					return new Response(
						JSON.stringify({ error: "Sandbox not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				await deleteSandbox(id, user.id);
				return new Response(null, { status: 204 });
			},
		},
	},
});
