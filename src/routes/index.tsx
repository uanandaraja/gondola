import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	createNewSandbox,
	fetchSandboxes,
	removeSandbox,
} from "../server/functions";

export const Route = createFileRoute("/")({
	loader: async () => {
		return await fetchSandboxes();
	},
	component: Dashboard,
});

function Dashboard() {
	const sandboxes = Route.useLoaderData();
	const [gitUrl, setGitUrl] = useState("");
	const [branch, setBranch] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!gitUrl.trim()) return;

		setIsCreating(true);
		try {
			await createNewSandbox({ data: { gitUrl, branch: branch || undefined } });
			window.location.reload();
		} catch (error) {
			alert("Failed to create sandbox");
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this sandbox?")) return;
		await removeSandbox({ data: id });
		window.location.reload();
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
			<div className="mb-8">
				<h1 className="font-bold text-[1.875rem]">GONDOLA</h1>
				<p className="text-secondary">Cloud development sandbox manager</p>
			</div>

			<div className="bg-bg-secondary border border-border shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] mb-8">
				<div className="p-4 md:p-6 border-b border-border-light">
					<h2 className="font-semibold text-[1.25rem]">CREATE NEW SANDBOX</h2>
				</div>
				<div className="p-4 md:p-6">
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="label block mb-1 text-xs font-semibold">
									Git URL <span className="text-[var(--color-error)]">*</span>
								</label>
								<input
									type="url"
									value={gitUrl}
									onChange={(e) => setGitUrl(e.target.value)}
									placeholder="https://github.com/user/repo.git"
									className="input w-full px-3 py-2 text-sm border transition-colors duration-150"
									required
								/>
							</div>
							<div>
								<label className="label block mb-1 text-xs font-semibold">
									Branch (optional)
								</label>
								<input
									type="text"
									value={branch}
									onChange={(e) => setBranch(e.target.value)}
									placeholder="main"
									className="input w-full px-3 py-2 text-sm border transition-colors duration-150"
								/>
							</div>
						</div>
						<button
							type="submit"
							disabled={isCreating}
							className="btn inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed md:w-auto w-full"
						>
							{isCreating ? "CREATING..." : "CREATE SANDBOX"}
						</button>
					</form>
				</div>
			</div>

			<div className="bg-bg-secondary border border-border shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
				<div className="p-4 md:p-6 border-b border-border-light">
					<h2 className="font-semibold text-[1.25rem]">SANDBOXES</h2>
				</div>
				{sandboxes.length === 0 ? (
					<div className="p-4 md:p-6 text-center text-muted">
						No sandboxes yet. Create one above to get started.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="table w-full border-collapse">
							<thead>
								<tr>
									<th className="text-left p-3 md:p-4 text-xs font-semibold border-b border-border-light whitespace-nowrap">
										ID
									</th>
									<th className="text-left p-3 md:p-4 text-xs font-semibold border-b border-border-light">
										Repository
									</th>
									<th className="text-left p-3 md:p-4 text-xs font-semibold border-b border-border-light whitespace-nowrap">
										Status
									</th>
									<th className="text-left p-3 md:p-4 text-xs font-semibold border-b border-border-light whitespace-nowrap">
										Created
									</th>
									<th className="text-right p-3 md:p-4 text-xs font-semibold border-b border-border-light whitespace-nowrap">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{sandboxes.map((sandbox) => (
									<tr key={sandbox.id} className="border-b border-border-light">
										<td className="p-3 md:p-4 text-mono text-sm whitespace-nowrap">
											<Link
												to="/sandbox/$id"
												params={{ id: sandbox.id }}
												className="link text-sm"
											>
												{sandbox.id.slice(0, 8)}...
											</Link>
										</td>
										<td className="p-3 md:p-4 text-sm">
											<div className="font-semibold truncate max-w-[120px] md:max-w-none">
												{sandbox.gitUrl
													.replace(/^https?:\/\//, "")
													.replace(/\.git$/, "")}
											</div>
											{sandbox.branch && (
												<div className="text-muted text-xs">
													Branch: {sandbox.branch}
												</div>
											)}
										</td>
										<td className="p-3 md:p-4 whitespace-nowrap">
											<span
												className={`badge inline-flex items-center px-2 py-1 text-xs font-semibold border ${getStatusBadgeClass(sandbox.status)}`}
											>
												{sandbox.status}
											</span>
										</td>
										<td className="p-3 md:p-4 text-sm text-secondary whitespace-nowrap">
											{new Date(sandbox.createdAt).toLocaleDateString()}
										</td>
										<td className="p-3 md:p-4 text-right whitespace-nowrap">
											<button
												onClick={() => handleDelete(sandbox.id)}
												className="link text-sm"
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
	);
}
