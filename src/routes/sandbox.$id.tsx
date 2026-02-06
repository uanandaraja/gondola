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
		<div className="w-full max-w-[1200px] mx-auto p-4 md:p-6">
			<div className="mb-6">
				<Link to="/" className="link text-sm">
					← Back to Dashboard
				</Link>
			</div>

			<div className="bg-bg-secondary border border-border shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
				<div className="p-4 md:p-6">
					<div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
						<div>
							<h1 className="font-bold mb-2 text-[1.5rem]">SANDBOX DETAILS</h1>
							<p className="text-mono text-sm text-secondary">{sandbox.id}</p>
						</div>
						<span
							className={`badge inline-flex items-center px-2 py-1 text-xs font-semibold border ${getStatusBadgeClass(sandbox.status)}`}
						>
							{sandbox.status}
						</span>
					</div>

					<div className="space-y-0">
						<div className="py-4 border-b border-border-light">
							<div className="text-sm font-semibold text-secondary mb-1">
								Git URL
							</div>
							<div className="text-sm text-mono break-all">
								{sandbox.gitUrl}
							</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-sm font-semibold text-secondary mb-1">
								Branch
							</div>
							<div className="text-sm">{sandbox.branch || "default"}</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-sm font-semibold text-secondary mb-1">
								Modal Sandbox ID
							</div>
							<div className="text-sm text-mono break-all">
								{sandbox.modalSandboxId}
							</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-sm font-semibold text-secondary mb-1">
								Created At
							</div>
							<div className="text-sm">
								{new Date(sandbox.createdAt).toLocaleString()}
							</div>
						</div>

						<div className="py-4">
							<div className="text-sm font-semibold text-secondary mb-1">
								OpenCode URL
							</div>
							<div>
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

					<div className="mt-8 flex flex-col md:flex-row gap-4">
						<a
							href={sandbox.opencodeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="btn inline-flex items-center justify-center px-4 py-2 text-sm font-semibold md:w-auto w-full"
						>
							OPEN IN OPENCODE ↗
						</a>
						<button
							onClick={handleDelete}
							className="btn btn-danger inline-flex items-center justify-center px-4 py-2 text-sm font-semibold md:w-auto w-full"
						>
							DELETE SANDBOX
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
