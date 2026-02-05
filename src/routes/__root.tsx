import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import "../styles/app.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ title: "Gondola" },
			{ name: "description", content: "Cloud dev sandbox manager" },
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
