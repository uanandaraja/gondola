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
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Gondola" },
			{ name: "description", content: "Cloud dev sandbox manager" },
			{
				httpEquiv: "Cache-Control",
				content: "no-cache, no-store, must-revalidate",
			},
			{ httpEquiv: "Pragma", content: "no-cache" },
			{ httpEquiv: "Expires", content: "0" },
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
