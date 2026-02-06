import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="min-h-screen flex flex-col">
			<header className="w-full max-w-[1000px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
				<span className="font-bold text-sm tracking-tight">gondola</span>
				<Link
					to="/auth"
					className="text-sm text-text-secondary hover:text-text transition-colors duration-150"
				>
					sign in
				</Link>
			</header>

			<main className="flex-1 flex flex-col justify-center w-full max-w-[1000px] mx-auto px-6 md:px-10 pb-32">
				<h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
					Cloud sandboxes for AI coding agents
				</h1>
				<p className="text-text-secondary text-base md:text-lg max-w-[600px] mb-8">
					gondola gives your AI agents a full dev environment in the
					cloud — clone a repo, install deps, and start coding in
					seconds.
				</p>
				<div>
					<Link
						to="/auth"
						className="inline-flex items-center px-5 py-2.5 text-sm font-semibold uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
					>
						Get started
					</Link>
				</div>
			</main>
		</div>
	);
}
