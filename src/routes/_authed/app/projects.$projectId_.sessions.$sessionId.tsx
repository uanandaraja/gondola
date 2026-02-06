import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	fetchSession,
	removeSession,
	resumeExistingSession,
} from "../../../server/functions";

export const Route = createFileRoute(
	"/_authed/app/projects/$projectId_/sessions/$sessionId",
)({
	loader: async ({ params }) => {
		const session = await fetchSession({ data: params.sessionId });
		if (!session) {
			throw new Error("Session not found");
		}
		return { session, projectId: params.projectId };
	},
	component: SessionDetail,
});

function SessionDetail() {
	const { session: initialSession, projectId } = Route.useLoaderData();
	const router = useRouter();
	const navigate = useNavigate();
	const [isResuming, setIsResuming] = useState(false);
	const [session, setSession] = useState(initialSession);

	const resumeMutation = useMutation({
		mutationFn: () => resumeExistingSession({ data: session.id }),
		onSuccess: (data) => {
			if (data) {
				setSession(data);
			}
			setIsResuming(false);
			router.invalidate();
		},
		onError: () => {
			setIsResuming(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => removeSession({ data: session.id }),
		onSuccess: () => {
			router.invalidate();
			navigate({
				to: "/app/projects/$projectId",
				params: { projectId },
			});
		},
	});

	// Auto-resume if suspended and has a snapshot
	useEffect(() => {
		if (
			session.status === "suspended" &&
			session.latestSnapshotImageId &&
			!isResuming
		) {
			setIsResuming(true);
			resumeMutation.mutate();
		}
	}, [session.status, session.latestSnapshotImageId]);

	const handleDelete = () => {
		if (!confirm("Are you sure you want to terminate this session?"))
			return;
		deleteMutation.mutate();
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

	if (isResuming || resumeMutation.isPending) {
		return (
			<div className="w-full max-w-[1000px] mx-auto px-6 py-8 md:px-10 md:py-10">
				<div className="mb-6">
					<Link
						to="/app/projects/$projectId"
						params={{ projectId }}
						className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
					>
						&larr; Back to Project
					</Link>
				</div>
				<div className="bg-bg-secondary border border-border-light shadow-sm px-6 py-16 text-center">
					<div className="text-lg font-semibold mb-2">
						Restoring from snapshot...
					</div>
					<p className="text-sm text-text-secondary">
						Recreating your sandbox from the last saved state. This
						may take a moment.
					</p>
					<div className="mt-6">
						<div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[1000px] mx-auto px-6 py-8 md:px-10 md:py-10">
			{/* Breadcrumb */}
			<div className="mb-6">
				<Link
					to="/app/projects/$projectId"
					params={{ projectId }}
					className="text-text-secondary hover:text-text text-sm transition-colors duration-150"
				>
					&larr; Back to Project
				</Link>
			</div>

			<div className="bg-bg-secondary border border-border-light shadow-sm">
				<div className="px-6 py-6 md:px-8 md:py-8">
					<div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
						<div>
							<h1 className="font-bold text-2xl tracking-tight mb-1">
								Session
							</h1>
							<p className="font-mono text-sm text-text-secondary">
								{session.id}
							</p>
						</div>
						<span
							className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wide border ${getStatusBadgeClass(session.status)}`}
						>
							{session.status}
						</span>
					</div>

					<div>
						{session.modalSandboxId && (
							<div className="py-4 border-b border-border-light">
								<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
									Modal Sandbox ID
								</div>
								<div className="text-sm font-mono break-all">
									{session.modalSandboxId}
								</div>
							</div>
						)}

						<div className="py-4 border-b border-border-light">
							<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
								Created At
							</div>
							<div className="text-sm">
								{new Date(session.createdAt).toLocaleString()}
							</div>
						</div>

						{session.lastSnapshotAt && (
							<div className="py-4 border-b border-border-light">
								<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
									Last Snapshot
								</div>
								<div className="text-sm">
									{new Date(
										session.lastSnapshotAt,
									).toLocaleString()}
								</div>
							</div>
						)}

						{session.opencodeUrl && (
							<div className="py-4">
								<div className="text-xs font-semibold font-mono uppercase tracking-wide text-text-secondary mb-1.5">
									OpenCode URL
								</div>
								<a
									href={session.opencodeUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-link underline underline-offset-2 hover:text-link-hover text-sm font-mono break-all transition-colors duration-150"
								>
									{session.opencodeUrl} &nearr;
								</a>
							</div>
						)}
					</div>

					<div className="mt-8 pt-6 border-t border-border-light flex flex-col md:flex-row gap-3">
						{session.opencodeUrl && session.status === "running" && (
							<a
								href={session.opencodeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover md:w-auto w-full transition-colors duration-150"
							>
								OPEN IN OPENCODE &nearr;
							</a>
						)}
						{session.status !== "terminated" && (
							<button
								type="button"
								onClick={handleDelete}
								className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold font-mono uppercase tracking-wide bg-bg-secondary border border-error/50 text-error hover:bg-error/5 md:w-auto w-full transition-colors duration-150"
							>
								TERMINATE SESSION
							</button>
						)}
					</div>

					{resumeMutation.isError && (
						<div className="mt-4 p-4 bg-error/10 border border-error/30 text-error text-sm">
							Failed to resume session. The snapshot may have
							expired.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
