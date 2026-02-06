import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-6">
			<header className="flex items-center justify-between mb-32">
				<span className="font-bold text-sm">gondola</span>
				<Link
					to="/auth"
					className="text-sm text-text-secondary hover:text-text transition-colors duration-150"
				>
					sign in
				</Link>
			</header>

			<section className="mb-24">
				<h1 className="text-3xl font-bold tracking-tight mb-4">
					Cloud sandboxes for AI coding agents
				</h1>
				<p className="text-text-secondary max-w-lg mb-8">
					gondola gives your AI agents a full dev environment in the
					cloud — clone a repo, install deps, and start coding in
					seconds.
				</p>
				<Link
					to="/auth"
					className="inline-flex items-center px-5 py-2.5 text-sm font-semibold uppercase tracking-wide bg-accent text-bg-secondary hover:bg-accent-hover transition-colors duration-150"
				>
					Get started
				</Link>
			</section>

			<section className="bg-bg-secondary border border-border-light p-8 mb-16">
				<div className="space-y-6">
					<div className="flex items-center gap-4">
						<span className="text-text-secondary text-sm shrink-0 w-20">
							you
						</span>
						<span className="text-text-muted">-&gt;</span>
						<div className="border border-accent/30 px-4 py-2 text-sm">
							git clone &amp; bun install
						</div>
						<div className="border border-success/40 text-success px-3 py-2 text-xs">
							modal gpu
						</div>
					</div>
					<div className="flex items-center gap-4">
						<span className="text-text-secondary text-sm shrink-0 w-20">
							claude
						</span>
						<span className="text-text-muted">-&gt;</span>
						<div className="border border-accent/30 px-4 py-2 text-sm">
							opencode serve
						</div>
						<div className="border border-warning/40 text-warning px-3 py-2 text-xs">
							modal cpu
						</div>
					</div>
					<div className="flex items-center gap-4">
						<span className="text-text-secondary text-sm shrink-0 w-20">
							codex
						</span>
						<span className="text-text-muted">-&gt;</span>
						<div className="border border-accent/30 px-4 py-2 text-sm">
							bun run dev
						</div>
						<div className="border border-warning/40 text-warning px-3 py-2 text-xs">
							modal cpu
						</div>
					</div>
				</div>
				<p className="text-text-muted text-xs mt-6">
					each sandbox is isolated, persistent, and accessible via
					browser
				</p>
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
								Sign in with GitHub
							</p>
							<p className="text-text-secondary text-sm">
								Authenticate once. Your sandboxes are tied to
								your account.
							</p>
						</div>
					</div>
					<div className="flex gap-4">
						<span className="text-text-muted text-sm shrink-0">
							02
						</span>
						<div>
							<p className="font-semibold text-sm mb-1">
								Paste a git URL
							</p>
							<p className="text-text-secondary text-sm">
								We clone the repo, install dependencies, and
								spin up a cloud sandbox on Modal.
							</p>
						</div>
					</div>
					<div className="flex gap-4">
						<span className="text-text-muted text-sm shrink-0">
							03
						</span>
						<div>
							<p className="font-semibold text-sm mb-1">
								Start coding
							</p>
							<p className="text-text-secondary text-sm">
								Open the sandbox in your browser. An AI agent is
								ready to help via OpenCode.
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
