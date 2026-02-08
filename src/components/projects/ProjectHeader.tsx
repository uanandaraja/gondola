import type { ProjectRecord } from "../../db/schema";

interface ProjectHeaderProps {
	project: ProjectRecord;
	secretCount: number;
	showSecrets: boolean;
	onToggleSecrets: () => void;
}

export function ProjectHeader({
	project,
	secretCount,
	showSecrets,
	onToggleSecrets,
}: ProjectHeaderProps) {
	return (
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
				onClick={onToggleSecrets}
				className="mt-3 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors duration-150"
			>
				<span className="font-mono text-xs">{showSecrets ? "▾" : "▸"}</span>
				Environment Variables
				{secretCount > 0 && (
					<span className="text-xs text-text-muted">({secretCount})</span>
				)}
			</button>
		</div>
	);
}
