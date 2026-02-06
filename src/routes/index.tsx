import { createFileRoute, Link } from "@tanstack/react-router";
import { useTheme } from "../hooks/useTheme";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function ThemeToggle() {
	const { theme, toggle } = useTheme();
	return (
		<button
			type="button"
			onClick={toggle}
			className="text-text-muted hover:text-text transition-colors duration-150 text-lg leading-none"
			aria-label="Toggle theme"
		>
			{theme === "dark" ? "\u263C" : "\u263E"}
		</button>
	);
}

function LandingPage() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-6">
			<header className="flex items-center justify-between mb-32">
				<span className="font-bold text-sm">gondola</span>
				<div className="flex items-center gap-5">
					<Link
						to="/auth"
						className="text-sm text-text-secondary hover:text-text transition-colors duration-150"
					>
						sign in
					</Link>
					<ThemeToggle />
				</div>
			</header>

			<section className="mb-24">
				<h1 className="text-3xl font-bold tracking-tight mb-4">
					Cloud sandboxes for AI coding agents
				</h1>
				<p className="text-text-secondary max-w-lg mb-8">
					spin up cloud sandboxes for your AI coding agents. run many
					in parallel, close your laptop, and check back when they're
					done.
				</p>
				<Link
					to="/auth"
					className="inline-flex items-center px-5 py-2.5 text-sm font-semibold uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
				>
					Get started
				</Link>
			</section>

			<section className="bg-bg-secondary border border-border-light p-8 mb-16">
				<div className="flex flex-col items-center gap-6">
					<div className="border border-border-light px-5 py-2.5 text-sm text-text-secondary">
						your browser
					</div>
					<span className="text-text-muted text-xs">&darr;</span>
					<div className="border border-accent/50 px-5 py-2.5 text-sm font-semibold">
						gondola
					</div>
					<span className="text-text-muted text-xs">&darr;</span>
					<div className="w-full grid grid-cols-3 gap-3">
						<div className="border border-border-light p-3 text-xs space-y-1.5">
							<p className="font-semibold text-text text-sm">acme/api</p>
							<p className="text-text-muted">repo cloned</p>
							<p className="text-text-muted">deps installed</p>
							<p className="text-success">agent running</p>
						</div>
						<div className="border border-border-light p-3 text-xs space-y-1.5">
							<p className="font-semibold text-text text-sm">acme/web</p>
							<p className="text-text-muted">repo cloned</p>
							<p className="text-text-muted">deps installed</p>
							<p className="text-success">agent running</p>
						</div>
						<div className="border border-border-light p-3 text-xs space-y-1.5">
							<p className="font-semibold text-text text-sm">acme/docs</p>
							<p className="text-text-muted">repo cloned</p>
							<p className="text-text-muted">deps installed</p>
							<p className="text-warning">agent idle</p>
						</div>
					</div>
					<p className="text-text-muted text-xs">
						each sandbox is isolated and keeps running — no laptop required
					</p>
				</div>
			</section>

			<section className="mb-16">
				<h2 className="text-lg font-bold mb-6">How it works</h2>
				<div className="space-y-6">
					<div className="flex gap-4">
						<span className="text-text-muted text-sm shrink-0">
							01
						</span>
						<div>
							<p className="font-semibold text-sm mb-1">
								Paste a git URL
							</p>
							<p className="text-text-secondary text-sm">
								We clone the repo and install dependencies in a
								cloud sandbox.
							</p>
						</div>
					</div>
					<div className="flex gap-4">
						<span className="text-text-muted text-sm shrink-0">
							02
						</span>
						<div>
							<p className="font-semibold text-sm mb-1">
								An AI agent starts working
							</p>
							<p className="text-text-secondary text-sm">
								OpenCode runs in the sandbox. Give it a task and
								walk away.
							</p>
						</div>
					</div>
					<div className="flex gap-4">
						<span className="text-text-muted text-sm shrink-0">
							03
						</span>
						<div>
							<p className="font-semibold text-sm mb-1">
								Check back anytime
							</p>
							<p className="text-text-secondary text-sm">
								Your sandboxes stay running in the cloud. No
								laptop required.
							</p>
						</div>
					</div>
				</div>
			</section>

			<footer className="border-t border-border-light py-6 text-text-muted text-xs">
				gondola
			</footer>
		</div>
	);
}
