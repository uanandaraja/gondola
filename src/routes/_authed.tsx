import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { signOut, useSession } from "../services/auth/client";
import { getSession } from "../services/auth/server";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async () => {
		const session = await getSession();

		if (!session) {
			throw redirect({ to: "/auth" });
		}

		return { session };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	const { data: session } = useSession();
	const router = useRouter();

	const handleSignOut = () => {
		signOut({
			fetchOptions: {
				onSuccess: () => {
					router.navigate({ to: "/auth" });
				},
			},
		});
	};

	return (
		<>
			<header className="border-b border-border-light bg-bg-secondary">
				<div className="w-full max-w-[1000px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
					<h1 className="font-bold text-lg tracking-tight">GONDOLA</h1>
					<div className="flex items-center gap-4">
						{session?.user && (
							<>
								{session.user.image && (
									<img
										src={session.user.image}
										alt=""
										className="w-7 h-7 rounded-full"
									/>
								)}
								<span className="text-sm text-text-secondary">
									{session.user.name}
								</span>
							</>
						)}
						<button
							type="button"
							onClick={handleSignOut}
							className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors duration-150"
						>
							Sign out
						</button>
					</div>
				</div>
			</header>
			<Outlet />
		</>
	);
}
