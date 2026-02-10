import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { SessionRecord } from "../../db/schema";
import { getStatusBadgeClass, sortSessionsByStatus } from "../../lib/session";
import {
	createNewSession,
	resumeExistingSession,
} from "../../server/functions";
import { TerminalSpinner } from "../TerminalSpinner";

interface SessionsGridProps {
	projectId: string;
	sessions: SessionRecord[];
}

export function SessionsGrid({ projectId, sessions }: SessionsGridProps) {
	const router = useRouter();
	const [showInactive, setShowInactive] = useState(false);

	const createSessionMutation = useMutation({
		mutationFn: () => createNewSession({ data: projectId }),
		onSuccess: () => router.invalidate(),
	});

	const resumeSessionMutation = useMutation({
		mutationFn: (sessionId: string) =>
			resumeExistingSession({ data: sessionId }),
		onSuccess: () => router.invalidate(),
	});

	const sorted = sortSessionsByStatus(sessions);

	const inactiveCount = sessions.filter((s) => s.status !== "running").length;
	const filtered = showInactive
		? sorted
		: sorted.filter((s) => s.status === "running");

	return (
		<div className="mb-8">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-semibold text-lg">Sessions</h3>
				<button
					type="button"
					onClick={() => createSessionMutation.mutate()}
					disabled={createSessionMutation.isPending}
					className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
				>
					{createSessionMutation.isPending ? (
						<>
							<TerminalSpinner size="sm" /> CREATING...
						</>
					) : (
						"NEW SESSION"
					)}
				</button>
			</div>
			{inactiveCount > 0 && (
				<div className="mb-4">
					<button
						type="button"
						onClick={() => setShowInactive(!showInactive)}
						className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors duration-150"
					>
						{showInactive
							? "Hide inactive"
							: `Show inactive (${inactiveCount})`}
					</button>
				</div>
			)}

			{filtered.length === 0 ? (
				<div className="bg-bg-secondary border border-border-light shadow-sm px-6 py-12 text-center text-text-muted">
					No sessions yet. Create one to start working.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filtered.map((session) => (
						<div
							key={session.id}
							className="bg-bg-secondary border border-border-light shadow-sm p-5 flex flex-col gap-3"
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
										Snapshot {new Date(session.lastSnapshotAt).toLocaleString()}
									</p>
								)}
							</div>
							<span
								className={`inline-flex items-center self-start px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border ${getStatusBadgeClass(session.status)}`}
							>
								{session.status}
							</span>
							<div className="flex gap-2 mt-1">
								{session.status === "running" && session.opencodeUrl && (
									<button
										type="button"
										onClick={() => window.open(session.opencodeUrl!, "_blank")}
										className="flex-1 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
									>
										Open Sandbox
									</button>
								)}
								{(session.status === "terminated" ||
									session.status === "suspended") &&
									session.latestSnapshotImageId && (
										<button
											type="button"
											onClick={() => resumeSessionMutation.mutate(session.id)}
											disabled={resumeSessionMutation.isPending}
											className="flex-1 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono uppercase tracking-wide border border-accent text-accent hover:bg-accent hover:text-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
										>
											{resumeSessionMutation.isPending ? (
												<>
													<TerminalSpinner size="sm" /> RESUMING...
												</>
											) : (
												"RESUME"
											)}
										</button>
									)}
								<Link
									to="/app/projects/$projectId/sessions/$sessionId"
									params={{
										projectId,
										sessionId: session.id,
									}}
									className="flex-1 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono uppercase tracking-wide border border-border-light text-text-secondary hover:border-accent hover:text-accent transition-colors duration-150"
								>
									Detail
								</Link>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
