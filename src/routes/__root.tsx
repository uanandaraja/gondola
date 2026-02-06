import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Gondola" },
			{ name: "description", content: "Cloud dev sandbox manager" },
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" },
			{ rel: "stylesheet", href: appCss },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="w-full max-w-[1000px] mx-auto px-6 py-10 md:px-10 md:py-14 text-center">
			<h1 className="font-bold text-3xl tracking-tight mb-2">404</h1>
			<p className="text-text-secondary mb-6">Page not found.</p>
			<Link
				to="/app"
				className="text-link underline underline-offset-2 hover:text-link-hover text-sm transition-colors duration-150"
			>
				← Back to Dashboard
			</Link>
		</div>
	);
}

function RootComponent() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-bg text-text">
				<QueryClientProvider client={queryClient}>
					<Outlet />
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}
