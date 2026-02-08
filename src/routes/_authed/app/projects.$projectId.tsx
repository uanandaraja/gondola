import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectHeader } from "../../../components/projects/ProjectHeader";
import { SecretsPanel } from "../../../components/projects/SecretsPanel";
import { SessionsGrid } from "../../../components/projects/SessionsGrid";
import {
	fetchProject,
	fetchProjectSecrets,
	fetchSessions,
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
	const [showSecrets, setShowSecrets] = useState(false);

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
			<ProjectHeader
				project={project}
				secretCount={secrets.length}
				showSecrets={showSecrets}
				onToggleSecrets={() => setShowSecrets(!showSecrets)}
			/>

			{/* Secrets Section (collapsible) */}
			{showSecrets && <SecretsPanel projectId={project.id} secrets={secrets} />}

			{/* Sessions Section */}
			<SessionsGrid projectId={project.id} sessions={sessions} />
		</div>
	);
}
