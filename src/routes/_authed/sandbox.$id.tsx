import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { fetchSandbox, removeSandbox } from "../../server/functions";

export const Route = createFileRoute("/_authed/sandbox/$id")({
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

	const router = useRouter();
	const navigate = useNavigate();

	const deleteMutation = useMutation({
		mutationFn: () => removeSandbox({ data: sandbox.id }),
		onSuccess: () => {
			router.invalidate();
			navigate({ to: "/" });
		},
	});

	const handleDelete = () => {
		if (!confirm("Are you sure you want to delete this sandbox?")) return;
		deleteMutation.mutate();
	};

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case "running":
				return "bg-success/10 text-success border-success/30";
			case "creating":
				return "bg-warning/10 text-warning border-warning/30";
			case "error":
				return "bg-error/10 text-error border-error/30";
			case "terminated":
				return "bg-bg-tertiary text-text-muted border-border-light";
			default:
				return "bg-bg-tertiary text-text-muted border-border-light";
		}
	};

	return (
		<div className="w-full max-w-[1000px] mx-auto px-6 py-10 md:px-10 md:py-14">
			<div className="mb-8">
				<Link
					to="/"
					className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
				>
					&larr; Back to Dashboard
				</Link>
			</div>

			<div className="bg-bg-secondary border border-border-light shadow-sm">
				<div className="px-6 py-6 md:px-8 md:py-8">
					<div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
						<div>
							<h1 className="font-bold text-2xl tracking-tight mb-1">
								Sandbox Details
							</h1>
							<p className="font-mono text-sm text-text-secondary">
								{sandbox.id}
							</p>
						</div>
						<span
							className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border ${getStatusBadgeClass(sandbox.status)}`}
						>
							{sandbox.status}
						</span>
					</div>

					<div>
						<div className="py-4 border-b border-border-light">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								Git URL
							</div>
							<div className="text-sm font-mono break-all">
								{sandbox.gitUrl}
							</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								Branch
							</div>
							<div className="text-sm">{sandbox.branch || "default"}</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								Modal Sandbox ID
							</div>
							<div className="text-sm font-mono break-all">
								{sandbox.modalSandboxId}
							</div>
						</div>

						<div className="py-4 border-b border-border-light">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								Created At
							</div>
							<div className="text-sm">
								{new Date(sandbox.createdAt).toLocaleString()}
							</div>
						</div>

						<div className="py-4">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								OpenCode URL
							</div>
							<div>
								<a
									href={sandbox.opencodeUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-link underline underline-offset-2 hover:text-link-hover text-sm font-mono break-all transition-colors duration-150"
								>
									{sandbox.opencodeUrl} &nearr;
								</a>
							</div>
						</div>
					</div>

					<div className="mt-8 pt-6 border-t border-border-light flex flex-col md:flex-row gap-3">
						<a
							href={sandbox.opencodeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover md:w-auto w-full transition-colors duration-150"
						>
							OPEN IN OPENCODE &nearr;
						</a>
						<button
							onClick={handleDelete}
							className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-bg-secondary border border-error/50 text-error hover:bg-error/5 md:w-auto w-full transition-colors duration-150"
						>
							DELETE SANDBOX
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
