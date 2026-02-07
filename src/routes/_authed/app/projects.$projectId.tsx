import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	addProjectSecret,
	createNewSession,
	fetchDecryptedSecrets,
	fetchProject,
	fetchProjectSecrets,
	fetchSessions,
	removeProjectSecret,
	replaceProjectSecrets,
	resumeExistingSession,
	updateProjectSecret,
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
	const [showSecrets, setShowSecrets] = useState(false);
	const [showSecretForm, setShowSecretForm] = useState(false);
	const [showBulkForm, setShowBulkForm] = useState(false);
	const [secretKey, setSecretKey] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const [bulkEnv, setBulkEnv] = useState("");
	const [bulkError, setBulkError] = useState("");
	const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const [showTerminated, setShowTerminated] = useState(false);

	const createSessionMutation = useMutation({
		mutationFn: () => createNewSession({ data: project.id }),
		onSuccess: () => router.invalidate(),
	});

	const resumeSessionMutation = useMutation({
		mutationFn: (sessionId: string) =>
			resumeExistingSession({ data: sessionId }),
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

	const updateSecretMutation = useMutation({
		mutationFn: (data: { secretId: string; value: string }) =>
			updateProjectSecret({
				data: { projectId: project.id, ...data },
			}),
		onSuccess: () => {
			setEditingSecretId(null);
			setEditValue("");
			router.invalidate();
		},
	});

	const handleAddSecret = (e: React.FormEvent) => {
		e.preventDefault();
		if (!secretKey.trim() || !secretValue.trim()) return;
		addSecretMutation.mutate({ key: secretKey, value: secretValue });
	};

	const bulkAddMutation = useMutation({
		mutationFn: (entries: { key: string; value: string }[]) =>
			replaceProjectSecrets({
				data: { projectId: project.id, entries },
			}),
		onSuccess: () => {
			setBulkEnv("");
			setBulkError("");
			setShowBulkForm(false);
			router.invalidate();
		},
	});

	const handleBulkAdd = (e: React.FormEvent) => {
		e.preventDefault();
		const lines = bulkEnv
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));

		const entries: { key: string; value: string }[] = [];
		for (const line of lines) {
			const eqIdx = line.indexOf("=");
			if (eqIdx === -1) {
				setBulkError(`Invalid line (no = sign): ${line}`);
				return;
			}
			const key = line.slice(0, eqIdx).trim();
			let value = line.slice(eqIdx + 1).trim();
			// Strip surrounding quotes
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (!key) {
				setBulkError(`Invalid line (empty key): ${line}`);
				return;
			}
			entries.push({ key, value });
		}

		if (entries.length === 0) {
			setBulkError("No valid entries found");
			return;
		}

		setBulkError("");
		bulkAddMutation.mutate(entries);
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
				<h2 className="font-bold text-2xl tracking-tight">{project.name}</h2>
				<p className="text-sm font-mono text-text-secondary mt-1">
					{project.githubUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "")}
					{project.branch && (
						<span className="text-text-muted"> / {project.branch}</span>
					)}
				</p>
				{project.description && (
					<p className="text-sm text-text-secondary mt-2">
						{project.description}
					</p>
				)}
				<button
					type="button"
					onClick={() => setShowSecrets(!showSecrets)}
					className="mt-3 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors duration-150"
				>
					<span className="font-mono text-xs">{showSecrets ? "▾" : "▸"}</span>
					Environment Variables
					{secrets.length > 0 && (
						<span className="text-xs text-text-muted">({secrets.length})</span>
					)}
				</button>
			</div>

			{/* Secrets Section (collapsible) */}
			{showSecrets && (
				<div className="bg-bg-secondary border border-border-light shadow-sm mb-8">
					<div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
						<p className="text-xs text-text-muted">
							Encrypted at rest. Injected into sandbox sessions.
						</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={async () => {
									if (showBulkForm) {
										setShowBulkForm(false);
									} else {
										setShowSecretForm(false);
										// Pre-populate with existing decrypted secrets
										if (secrets.length > 0) {
											const decrypted = await fetchDecryptedSecrets({
												data: project.id,
											});
											const envStr = Object.entries(decrypted)
												.map(([k, v]) => `${k}=${v}`)
												.join("\n");
											setBulkEnv(envStr);
										} else {
											setBulkEnv("");
										}
										setBulkError("");
										setShowBulkForm(true);
									}
								}}
								className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide border border-accent text-accent hover:bg-accent hover:text-bg-secondary transition-colors duration-150"
							>
								{showBulkForm ? "CANCEL" : "PASTE .ENV"}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowSecretForm(!showSecretForm);
									if (!showSecretForm) setShowBulkForm(false);
								}}
								className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
							>
								{showSecretForm ? "CANCEL" : "ADD SECRET"}
							</button>
						</div>
					</div>

					{showSecretForm && (
						<div className="px-6 py-5 border-b border-border-light">
							<form onSubmit={handleAddSecret} className="flex gap-3 items-end">
								<div className="flex-1">
									<label className="block mb-1.5 text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
										Key
									</label>
									<input
										type="text"
										value={secretKey}
										onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
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
										onChange={(e) => setSecretValue(e.target.value)}
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
									{addSecretMutation.isPending ? "..." : "ADD"}
								</button>
							</form>
						</div>
					)}

					{showBulkForm && (
						<div className="px-6 py-5 border-b border-border-light">
							<form onSubmit={handleBulkAdd} className="flex flex-col gap-3">
								<label className="block text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary">
									Paste .env contents
								</label>
								<textarea
									value={bulkEnv}
									onChange={(e) => {
										setBulkEnv(e.target.value);
										setBulkError("");
									}}
									placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=sk-...\n# Comments are ignored"}
									rows={8}
									className="w-full px-3 py-2 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150 resize-y"
									required
								/>
								{bulkError && (
									<p className="text-xs text-error font-mono">{bulkError}</p>
								)}
								<div className="flex items-center justify-between">
									<p className="text-xs text-text-muted">
										{bulkEnv
											.split("\n")
											.filter((l) => l.trim() && !l.trim().startsWith("#"))
											.length}{" "}
										entries detected
									</p>
									<button
										type="submit"
										disabled={bulkAddMutation.isPending}
										className="px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 transition-colors duration-150"
									>
										{bulkAddMutation.isPending ? "ADDING..." : "ADD ALL"}
									</button>
								</div>
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
									className="px-6 py-3 border-b border-border-light last:border-b-0"
								>
									{editingSecretId === secret.id ? (
										<form
											onSubmit={(e) => {
												e.preventDefault();
												updateSecretMutation.mutate({
													secretId: secret.id,
													value: editValue,
												});
											}}
											className="flex items-center gap-3"
										>
											<span className="font-mono text-sm shrink-0">
												{secret.key}
											</span>
											<input
												type="text"
												value={editValue}
												onChange={(e) => setEditValue(e.target.value)}
												className="flex-1 px-3 py-1.5 text-sm border border-border-light bg-bg-secondary text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150"
												autoFocus
											/>
											<button
												type="submit"
												disabled={updateSecretMutation.isPending}
												className="text-accent hover:text-accent-hover text-sm font-semibold transition-colors duration-150"
											>
												{updateSecretMutation.isPending ? "..." : "Save"}
											</button>
											<button
												type="button"
												onClick={() => setEditingSecretId(null)}
												className="text-text-muted hover:text-text-secondary text-sm transition-colors duration-150"
											>
												Cancel
											</button>
										</form>
									) : (
										<div className="flex items-center justify-between">
											<span className="font-mono text-sm">{secret.key}</span>
											<div className="flex items-center gap-3">
												<span className="text-text-muted text-sm font-mono">
													••••••••
												</span>
												<button
													type="button"
													onClick={async () => {
														const decrypted = await fetchDecryptedSecrets({
															data: project.id,
														});
														setEditValue(decrypted[secret.key] ?? "");
														setEditingSecretId(secret.id);
													}}
													className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
												>
													Edit
												</button>
												<button
													type="button"
													onClick={() =>
														removeSecretMutation.mutate(secret.id)
													}
													className="text-error/70 hover:text-error text-sm transition-colors duration-150"
												>
													Remove
												</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Sessions Section */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<h3 className="font-semibold text-lg">Sessions</h3>
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
					<button
						type="button"
						onClick={() => createSessionMutation.mutate()}
						disabled={createSessionMutation.isPending}
						className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
					>
						{createSessionMutation.isPending ? "CREATING..." : "NEW SESSION"}
					</button>
				</div>

				{filtered.length === 0 ? (
					<div className="bg-bg-secondary border border-border-light shadow-sm px-6 py-12 text-center text-text-muted">
						No sessions yet. Create one to start working.
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{filtered.map((session) => (
							<Link
								key={session.id}
								to="/app/projects/$projectId/sessions/$sessionId"
								params={{
									projectId: project.id,
									sessionId: session.id,
								}}
								className="bg-bg-secondary border border-border-light shadow-sm p-5 hover:border-accent/40 transition-colors duration-150 flex flex-col gap-3"
							>
								<p className="font-mono text-sm font-semibold">
									{session.id.slice(0, 8)}
								</p>
								<div className="text-xs text-text-muted space-y-0.5">
									<p>
										Created {new Date(session.createdAt).toLocaleDateString()}
									</p>
									{session.lastSnapshotAt && (
										<p>
											Snapshot{" "}
											{new Date(session.lastSnapshotAt).toLocaleString()}
										</p>
									)}
								</div>
								<span
									className={`inline-flex items-center self-start px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border rounded ${getStatusBadgeClass(session.status)}`}
								>
									{session.status}
								</span>
								{session.status === "running" && session.opencodeUrl && (
									<span
										onClick={(e) => {
											e.preventDefault();
											window.open(session.opencodeUrl!, "_blank");
										}}
										className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150 mt-1"
									>
										Open Sandbox
									</span>
								)}
								{(session.status === "terminated" ||
									session.status === "suspended") &&
									session.latestSnapshotImageId && (
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												resumeSessionMutation.mutate(session.id);
											}}
											disabled={resumeSessionMutation.isPending}
											className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono uppercase tracking-wide border border-accent text-accent hover:bg-accent hover:text-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 mt-1"
										>
											{resumeSessionMutation.isPending
												? "RESUMING..."
												: "RESUME"}
										</button>
									)}
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
