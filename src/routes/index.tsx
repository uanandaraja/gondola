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
		<div className="container">
			<div className="mb-8">
				<h1 className="font-bold" style={{ fontSize: "1.875rem" }}>
					GONDOLA
				</h1>
				<p className="text-secondary">Cloud development sandbox manager</p>
			</div>

			<div className="card mb-8">
				<div className="card-header">
					<h2 className="font-semibold" style={{ fontSize: "1.25rem" }}>
						CREATE NEW SANDBOX
					</h2>
				</div>
				<div className="card-body">
					<form onSubmit={handleCreate} className="space-y-4">
						<div className="grid-2">
							<div>
								<label className="label label-required">Git URL</label>
								<input
									type="url"
									value={gitUrl}
									onChange={(e) => setGitUrl(e.target.value)}
									placeholder="https://github.com/user/repo.git"
									className="input"
									required
								/>
							</div>
							<div>
								<label className="label">Branch (optional)</label>
								<input
									type="text"
									value={branch}
									onChange={(e) => setBranch(e.target.value)}
									placeholder="main"
									className="input"
								/>
							</div>
						</div>
						<button type="submit" disabled={isCreating} className="btn">
							{isCreating ? "CREATING..." : "CREATE SANDBOX"}
						</button>
					</form>
				</div>
			</div>

			<div className="card">
				<div className="card-header">
					<h2 className="font-semibold" style={{ fontSize: "1.25rem" }}>
						SANDBOXES
					</h2>
				</div>
				{sandboxes.length === 0 ? (
					<div className="card-body text-center text-muted">
						No sandboxes yet. Create one above to get started.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Repository</th>
									<th>Status</th>
									<th>Created</th>
									<th className="text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{sandboxes.map((sandbox) => (
									<tr key={sandbox.id}>
										<td className="text-mono text-sm whitespace-nowrap">
											<Link
												to="/sandbox/$id"
												params={{ id: sandbox.id }}
												className="link"
											>
												{sandbox.id.slice(0, 8)}...
											</Link>
										</td>
										<td className="text-sm">
											<div className="font-semibold">
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
										<td className="whitespace-nowrap">
											<span
												className={`badge ${getStatusBadgeClass(sandbox.status)}`}
											>
												{sandbox.status}
											</span>
										</td>
										<td className="text-sm text-secondary whitespace-nowrap">
											{new Date(sandbox.createdAt).toLocaleDateString()}
										</td>
										<td className="text-right whitespace-nowrap">
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
