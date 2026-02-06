import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	addProjectSecret,
	createNewSession,
	fetchProject,
	fetchProjectSecrets,
	fetchSessions,
	removeProjectSecret,
	removeSession,
} from "../../../server/functions";

export const Route = createFileRoute("/_authed/app/projects/$projectId")({
	loader: async ({ params }) => {
		const [project, sessions, secrets] = await Promise.all([
			fetchProject({ data: params.projectId }),
			fetchSessions({ data: params.projectId }),
			fetchProjectSecrets({ data: params.projectId }),
		]);
		if (!project) {
			throw new Error("Project not found");
		}
		return { project, sessions, secrets };
	},
	component: ProjectDetail,
});

function ProjectDetail() {
	const { project, sessions, secrets } = Route.useLoaderData();
	const router = useRouter();
	const [showSecretForm, setShowSecretForm] = useState(false);
	const [secretKey, setSecretKey] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const [showTerminated, setShowTerminated] = useState(false);

	const createSessionMutation = useMutation({
		mutationFn: () => createNewSession({ data: project.id }),
		onSuccess: () => router.invalidate(),
	});

	const deleteSessionMutation = useMutation({
		mutationFn: (id: string) => removeSession({ data: id }),
		onSuccess: () => router.invalidate(),
	});

	const addSecretMutation = useMutation({
		mutationFn: (data: { key: string; value: string }) =>
			addProjectSecret({
				data: { projectId: project.id, ...data },
			}),
		onSuccess: () => {
			setSecretKey("");
			setSecretValue("");
			setShowSecretForm(false);
			router.invalidate();
		},
	});

	const removeSecretMutation = useMutation({
		mutationFn: (secretId: string) =>
			removeProjectSecret({
				data: { projectId: project.id, secretId },
			}),
		onSuccess: () => router.invalidate(),
	});

	const handleAddSecret = (e: React.FormEvent) => {
		e.preventDefault();
		if (!secretKey.trim() || !secretValue.trim()) return;
		addSecretMutation.mutate({ key: secretKey, value: secretValue });
	};

	const handleDeleteSession = (id: string) => {
		if (!confirm("Are you sure you want to terminate this session?"))
			return;
		deleteSessionMutation.mutate(id);
	};

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case "running":
				return "bg-success/10 text-success border-success/30";
			case "creating":
			case "snapshotting":
				return "bg-warning/10 text-warning border-warning/30";
			case "suspended":
				return "bg-blue-500/10 text-blue-500 border-blue-500/30";
			case "error":
				return "bg-error/10 text-error border-error/30";
			case "terminated":
				return "bg-bg-tertiary text-text-muted border-border-light";
			default:
				return "bg-bg-tertiary text-text-muted border-border-light";
		}
	};

	const sorted = [...sessions].sort((a, b) => {
		const order = {
			running: 0,
			creating: 1,
			snapshotting: 2,
			suspended: 3,
			error: 4,
			terminated: 5,
		};
		return (
			(order[a.status as keyof typeof order] ?? 9) -
			(order[b.status as keyof typeof order] ?? 9)
		);
	});

	const terminatedCount = sessions.filter(
		(s) => s.status === "terminated",
	).length;
	const filtered = showTerminated
		? sorted
		: sorted.filter((s) => s.status !== "terminated");

	return (
		<div className="w-full max-w-[1000px] mx-auto px-6 py-8 md:px-10 md:py-10">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Link
					to="/app"
					className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
				>
					&larr; Projects
				</Link>
			</div>

			{/* Project Header */}
			<div className="mb-8">
				<h2 className="font-bold text-2xl tracking-tight">
					{project.name}
				</h2>
				<p className="text-sm font-mono text-text-secondary mt-1">
					{project.githubUrl
						.replace(/^https?:\/\//, "")
						.replace(/\.git$/, "")}
					{project.branch && (
						<span className="text-text-muted">
							{" "}
							/ {project.branch}
						</span>
					)}
				</p>
				{project.description && (
					<p className="text-sm text-text-secondary mt-2">
						{project.description}
					</p>
				)}
			</div>

			{/* Sessions Section */}
			<div className="bg-bg-secondary border border-border-light shadow-sm mb-8">
				<div className="px-6 py-5 border-b border-border-light flex items-center justify-between">
					<h3 className="font-semibold text-lg">Sessions</h3>
					<div className="flex items-center gap-3">
						{terminatedCount > 0 && (
							<button
								type="button"
								onClick={() =>
									setShowTerminated(!showTerminated)
								}
								className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors duration-150"
							>
								{showTerminated
									? "Hide terminated"
									: `Show terminated (${terminatedCount})`}
							</button>
						)}
						<button
							type="button"
							onClick={() => createSessionMutation.mutate()}
							disabled={createSessionMutation.isPending}
							className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
						>
							{createSessionMutation.isPending
								? "CREATING..."
								: "NEW SESSION"}
						</button>
					</div>
				</div>

				{filtered.length === 0 ? (
					<div className="px-6 py-12 text-center text-text-muted">
						No sessions yet. Create one to start working.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Session
									</th>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Status
									</th>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Last Snapshot
									</th>
									<th className="text-left px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Created
									</th>
									<th className="text-right px-6 py-3.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary bg-bg-tertiary border-b border-border-light">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((session) => (
									<tr
										key={session.id}
										className="border-b border-border-light last:border-b-0 hover:bg-bg-tertiary transition-colors duration-150"
									>
										<td className="px-6 py-4 text-sm">
											<Link
												to="/app/projects/$projectId/sessions/$sessionId"
												params={{
													projectId: project.id,
													sessionId: session.id,
												}}
												className="font-semibold text-link hover:text-link-hover transition-colors duration-150 font-mono"
											>
												{session.id.slice(0, 8)}...
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border ${getStatusBadgeClass(session.status)}`}
											>
												{session.status}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
											{session.lastSnapshotAt
												? new Date(
														session.lastSnapshotAt,
													).toLocaleString()
												: "None"}
										</td>
										<td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
											{new Date(
												session.createdAt,
											).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 text-right whitespace-nowrap">
											{session.status !== "terminated" && (
												<button
													type="button"
													onClick={() =>
														handleDeleteSession(
															session.id,
														)
													}
													className="text-error/70 hover:text-error underline underline-offset-2 text-sm transition-colors duration-150"
												>
													Terminate
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Secrets Section */}
			<div className="bg-bg-secondary border border-border-light shadow-sm">
				<div className="px-6 py-5 border-b border-border-light flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-lg">
							Environment Variables
						</h3>
						<p className="text-xs text-text-muted mt-1">
							Encrypted at rest. Injected into sandbox sessions.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowSecretForm(!showSecretForm)}
						className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
					>
						{showSecretForm ? "CANCEL" : "ADD SECRET"}
					</button>
				</div>

				{showSecretForm && (
					<div className="px-6 py-5 border-b border-border-light">
						<form
							onSubmit={handleAddSecret}
							className="flex gap-3 items-end"
						>
							<div className="flex-1">
								<label className="block mb-1.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
									Key
								</label>
								<input
									type="text"
									value={secretKey}
									onChange={(e) =>
										setSecretKey(
											e.target.value.toUpperCase(),
										)
									}
									placeholder="DATABASE_URL"
									className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									required
								/>
							</div>
							<div className="flex-1">
								<label className="block mb-1.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
									Value
								</label>
								<input
									type="password"
									value={secretValue}
									onChange={(e) =>
										setSecretValue(e.target.value)
									}
									placeholder="secret-value"
									className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
									required
								/>
							</div>
							<button
								type="submit"
								disabled={addSecretMutation.isPending}
								className="px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
							>
								{addSecretMutation.isPending
									? "..."
									: "ADD"}
							</button>
						</form>
					</div>
				)}

				{secrets.length === 0 ? (
					<div className="px-6 py-8 text-center text-text-muted text-sm">
						No environment variables configured.
					</div>
				) : (
					<div>
						{secrets.map((secret) => (
							<div
								key={secret.id}
								className="px-6 py-3 border-b border-border-light last:border-b-0 flex items-center justify-between"
							>
								<span className="font-mono text-sm">
									{secret.key}
								</span>
								<div className="flex items-center gap-3">
									<span className="text-text-muted text-sm font-mono">
										••••••••
									</span>
									<button
										type="button"
										onClick={() =>
											removeSecretMutation.mutate(
												secret.id,
											)
										}
										className="text-error/70 hover:text-error text-sm transition-colors duration-150"
									>
										Remove
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
