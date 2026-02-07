import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createNewProject, fetchProjects } from "../../../server/functions";

export const Route = createFileRoute("/_authed/app/")({
	loader: async () => {
		return await fetchProjects();
	},
	component: ProjectList,
});

function ProjectList() {
	const projects = Route.useLoaderData();
	const router = useRouter();
	const [showForm, setShowForm] = useState(false);
	const [githubUrl, setGithubUrl] = useState("");
	const [name, setName] = useState("");
	const [branch, setBranch] = useState("");
	const [description, setDescription] = useState("");

	const createMutation = useMutation({
		mutationFn: (data: {
			name: string;
			githubUrl: string;
			branch?: string;
			description?: string;
		}) => createNewProject({ data }),
		onSuccess: () => {
			setGithubUrl("");
			setName("");
			setBranch("");
			setDescription("");
			setShowForm(false);
			router.invalidate();
		},
	});

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!githubUrl.trim()) return;
		const derivedName =
			name.trim() ||
			githubUrl
				.replace(/^https?:\/\//, "")
				.replace(/\.git$/, "")
				.split("/")
				.pop() ||
			"Untitled";
		createMutation.mutate({
			name: derivedName,
			githubUrl,
			branch: branch || undefined,
			description: description || undefined,
		});
	};

	return (
		<div className="w-full max-w-[1000px] mx-auto px-6 py-8 md:px-10 md:py-10">
			<div className="flex items-center justify-between mb-8">
				<h2 className="font-bold text-2xl tracking-tight">Projects</h2>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
				>
					{showForm ? "CANCEL" : "NEW PROJECT"}
				</button>
			</div>

			{showForm && (
				<div className="bg-bg-secondary border border-border-light shadow-sm mb-8">
					<div className="px-6 py-5 border-b border-border-light">
						<h3 className="font-semibold text-lg">Create New Project</h3>
					</div>
					<div className="px-6 py-6">
						<form onSubmit={handleCreate} className="space-y-5">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
										GitHub URL <span className="text-error">*</span>
									</label>
									<input
										type="url"
										value={githubUrl}
										onChange={(e) => {
											setGithubUrl(e.target.value);
											// Auto-derive name from URL
											if (!name) {
												const derived = e.target.value
													.replace(/^https?:\/\//, "")
													.replace(/\.git$/, "")
													.split("/")
													.pop();
												if (derived) setName(derived);
											}
										}}
										placeholder="https://github.com/user/repo.git"
										className="w-full px-3 py-2.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
										required
									/>
								</div>
								<div>
									<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
										Project Name
									</label>
									<input
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="my-project"
										className="w-full px-3 py-2.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
										Branch (optional)
									</label>
									<input
										type="text"
										value={branch}
										onChange={(e) => setBranch(e.target.value)}
										placeholder="main"
										className="w-full px-3 py-2.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									/>
								</div>
								<div>
									<label className="block mb-2 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
										Description (optional)
									</label>
									<input
										type="text"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="A brief description"
										className="w-full px-3 py-2.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									/>
								</div>
							</div>
							<button
								type="submit"
								disabled={createMutation.isPending}
								className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed md:w-auto w-full transition-colors duration-150"
							>
								{createMutation.isPending ? "CREATING..." : "CREATE PROJECT"}
							</button>
						</form>
					</div>
				</div>
			)}

			{projects.length === 0 ? (
				<div className="bg-bg-secondary border border-border-light shadow-sm px-6 py-12 text-center text-text-muted">
					No projects yet. Create one to get started.
				</div>
			) : (
				<div className="grid gap-4">
					{projects.map((project) => (
						<div
							key={project.id}
							className="bg-bg-secondary border border-border-light shadow-sm hover:border-accent/30 transition-colors duration-150"
						>
							<div className="px-6 py-5 flex items-start justify-between">
								<Link
									to="/app/projects/$projectId"
									params={{ projectId: project.id }}
									className="flex-1 min-w-0"
								>
									<h3 className="font-semibold text-lg hover:text-accent transition-colors duration-150">
										{project.name}
									</h3>
									<p className="text-sm font-mono text-text-secondary mt-1 truncate">
										{project.githubUrl
											.replace(/^https?:\/\//, "")
											.replace(/\.git$/, "")}
									</p>
									{project.branch && (
										<p className="text-xs text-text-muted mt-1">
											Branch: {project.branch}
										</p>
									)}
									{project.description && (
										<p className="text-sm text-text-secondary mt-2">
											{project.description}
										</p>
									)}
									<div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
										<span>
											{project.activeSessions}{" "}
											{project.activeSessions === 1 ? "session" : "sessions"}
										</span>
										<span>&middot;</span>
										<span>
											Created {new Date(project.createdAt).toLocaleDateString()}
										</span>
									</div>
								</Link>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
