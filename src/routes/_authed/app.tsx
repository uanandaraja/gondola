import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	createNewSandbox,
	fetchSandboxes,
	removeSandbox,
} from "../../server/functions";

export const Route = createFileRoute("/_authed/app")({
	loader: async () => {
		return await fetchSandboxes();
	},
	component: Dashboard,
});

function Dashboard() {
	const sandboxes = Route.useLoaderData();
	const router = useRouter();
	const [gitUrl, setGitUrl] = useState("");
	const [branch, setBranch] = useState("");
	const [showTerminated, setShowTerminated] = useState(false);

	const sorted = [...sandboxes].sort((a, b) => {
		if (a.status === "running" && b.status !== "running") return -1;
		if (a.status !== "running" && b.status === "running") return 1;
		return 0;
	})
	const filtered = showTerminated
		? sorted
		: sorted.filter((s) => s.status !== "terminated");
	const terminatedCount = sandboxes.filter(
		(s) => s.status === "terminated",
	).length;

	const createMutation = useMutation({
		mutationFn: (data: { gitUrl: string; branch?: string }) =>
			createNewSandbox({ data }),
		onSuccess: () => {
			setGitUrl("");
			setBranch("");
			router.invalidate();
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => removeSandbox({ data: id }),
		onSuccess: () => router.invalidate(),
	})

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!gitUrl.trim()) return;
		createMutation.mutate({ gitUrl, branch: branch || undefined });
	}

	const handleDelete = (id: string) => {
		if (!confirm("Are you sure you want to delete this sandbox?")) return;
		deleteMutation.mutate(id);
	}

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
	}

	return (
        <div className="w-full max-w-[1000px] mx-auto px-6 py-8 md:px-10 md:py-10">
            <div className="bg-bg-secondary border border-border-light shadow-sm mb-10">
				<div className="px-6 py-5 border-b border-border-light">
					<h2 className="font-semibold text-lg">Create New Sandbox</h2>
				</div>
				<div className="px-6 py-6">
					<form onSubmit={handleCreate} className="space-y-5">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div>
								<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
									Git URL <span className="text-error">*</span>
								</label>
								<input
									type="url"
									value={gitUrl}
									onChange={(e) => setGitUrl(e.target.value)}
									placeholder="https://github.com/user/repo.git"
									className="w-full px-3 py-2.5 text-sm border border-border-light  bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									required
								/>
							</div>
							<div>
								<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
									Branch (optional)
								</label>
								<input
									type="text"
									value={branch}
									onChange={(e) => setBranch(e.target.value)}
									placeholder="main"
									className="w-full px-3 py-2.5 text-sm border border-border-light  bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
								/>
							</div>
						</div>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide  bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed md:w-auto w-full transition-colors duration-150"
						>
							{createMutation.isPending ? "CREATING..." : "CREATE SANDBOX"}
						</button>
					</form>
				</div>
			</div>
            <div className="bg-bg-secondary border border-border-light shadow-sm">
				<div className="px-6 py-5 border-b border-border-light flex items-center justify-between">
					<h2 className="font-semibold text-lg">Sandboxes</h2>
					{terminatedCount > 0 && (
						<button
							type="button"
							onClick={() => setShowTerminated(!showTerminated)}
							className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors duration-150"
						>
							{showTerminated
								? "Hide terminated"
								: `Show terminated (${terminatedCount})`}
						</button>
					)}
				</div>
				{filtered.length === 0 ? (
					<div className="px-6 py-12 text-center text-text-muted">
						No sandboxes yet. Create one above to get started.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Repository
									</th>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light whitespace-nowrap">
										Status
									</th>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light whitespace-nowrap">
										Created
									</th>
									<th className="text-right px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light whitespace-nowrap">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((sandbox) => (
									<tr
										key={sandbox.id}
										className="border-b border-border-light last:border-b-0 hover:bg-bg-tertiary transition-colors duration-150"
									>
										<td className="px-6 py-4 text-sm">
											<Link
												to="/sandbox/$id"
												params={{ id: sandbox.id }}
												className="font-semibold text-link hover:text-link-hover transition-colors duration-150 truncate block max-w-[200px] md:max-w-none"
											>
												{sandbox.gitUrl
													.replace(/^https?:\/\//, "")
													.replace(/\.git$/, "")}
											</Link>
											{sandbox.branch && (
												<div className="text-text-muted text-xs mt-0.5">
													Branch: {sandbox.branch}
												</div>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border ${getStatusBadgeClass(sandbox.status)}`}
											>
												{sandbox.status}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
											{sandbox.createdAt.toISOString().split("T")[0]}
										</td>
										<td className="px-6 py-4 text-right whitespace-nowrap">
											<button
												onClick={() => handleDelete(sandbox.id)}
												className="text-error/70 hover:text-error underline underline-offset-2 text-sm transition-colors duration-150"
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
        </div>
    )
}
