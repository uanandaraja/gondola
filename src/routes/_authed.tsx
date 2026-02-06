import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
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

function ProfileMenu() {
	const { data: session } = useSession();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleSignOut = () => {
		signOut({
			fetchOptions: {
				onSuccess: () => {
					router.navigate({ to: "/" });
				},
			},
		});
	};

	const firstName = session?.user?.name?.split(" ")[0] ?? "";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-150"
			>
				{session?.user?.image && (
					<img
						src={session.user.image}
						alt=""
						className="w-7 h-7 rounded-full"
					/>
				)}
				<span className="text-sm text-text-secondary">
					{firstName}
				</span>
			</button>
			{open && (
				<div className="absolute right-0 top-full mt-2 bg-bg-secondary border border-border-light shadow-sm py-1 min-w-32 z-10">
					<button
						type="button"
						onClick={handleSignOut}
						className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text hover:bg-bg-tertiary transition-colors duration-150"
					>
						Sign out
					</button>
				</div>
			)}
		</div>
	);
}

function AuthedLayout() {
	const { theme, toggle: toggleTheme } = useTheme();

	return (
		<>
			<header className="border-b border-border-light bg-bg-secondary">
				<div className="w-full max-w-[1000px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
					<Link to="/app" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity duration-150">GONDOLA</Link>
					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={toggleTheme}
							className="text-text-muted hover:text-text transition-colors duration-150 text-lg leading-none"
							aria-label="Toggle theme"
						>
							{theme === "dark" ? "\u263C" : "\u263E"}
						</button>
						<ProfileMenu />
					</div>
				</div>
			</header>
			<Outlet />
		</>
	);
}
