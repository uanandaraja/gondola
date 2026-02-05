import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchSandbox, removeSandbox } from "../server/functions";

export const Route = createFileRoute("/sandbox/$id")({
	loader: async ({ params }) => {
		const sandbox = await fetchSandbox({ data: params.id });
		if (!sandbox) {
			throw new Error("Sandbox not found");
		}
		return sandbox;
	},
	component: SandboxDetail,
});

function SandboxDetail() {
	const sandbox = Route.useLoaderData();

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this sandbox?")) return;
		await removeSandbox({ data: sandbox.id });
		window.location.href = "/";
	};

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case "running":
				return "badge-success";
			case "creating":
				return "badge-warning";
			case "error":
				return "badge-error";
			case "terminated":
				return "";
			default:
				return "";
		}
	};

	return (
		<div className="container">
			<div className="mb-6">
				<Link to="/" className="link text-sm">
					← Back to Dashboard
				</Link>
			</div>

			<div className="card">
				<div className="card-body">
					<div className="flex justify-between items-start mb-6">
						<div>
							<h1 className="font-bold mb-2" style={{ fontSize: "1.5rem" }}>
								SANDBOX DETAILS
							</h1>
							<p className="text-mono text-sm text-secondary">{sandbox.id}</p>
						</div>
						<span className={`badge ${getStatusBadgeClass(sandbox.status)}`}>
							{sandbox.status}
						</span>
					</div>

					<div className="space-y-4">
						<div className="grid-3 py-4 border-b">
							<div className="text-sm font-semibold text-secondary">
								Git URL
							</div>
							<div
								className="text-sm text-mono break-all"
								style={{ gridColumn: "span 2" }}
							>
								{sandbox.gitUrl}
							</div>
						</div>

						<div className="grid-3 py-4 border-b">
							<div className="text-sm font-semibold text-secondary">Branch</div>
							<div className="text-sm" style={{ gridColumn: "span 2" }}>
								{sandbox.branch || "default"}
							</div>
						</div>

						<div className="grid-3 py-4 border-b">
							<div className="text-sm font-semibold text-secondary">
								Modal Sandbox ID
							</div>
							<div
								className="text-sm text-mono"
								style={{ gridColumn: "span 2" }}
							>
								{sandbox.modalSandboxId}
							</div>
						</div>

						<div className="grid-3 py-4 border-b">
							<div className="text-sm font-semibold text-secondary">
								Created At
							</div>
							<div className="text-sm" style={{ gridColumn: "span 2" }}>
								{new Date(sandbox.createdAt).toLocaleString()}
							</div>
						</div>

						<div className="grid-3 py-4">
							<div className="text-sm font-semibold text-secondary">
								OpenCode URL
							</div>
							<div style={{ gridColumn: "span 2" }}>
								<a
									href={sandbox.opencodeUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="link text-sm text-mono break-all"
								>
									{sandbox.opencodeUrl} ↗
								</a>
							</div>
						</div>
					</div>

					<div className="mt-8 flex gap-4">
						<a
							href={sandbox.opencodeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="btn"
						>
							OPEN IN OPENCODE ↗
						</a>
						<button onClick={handleDelete} className="btn btn-danger">
							DELETE SANDBOX
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
