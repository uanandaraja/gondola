import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/app")({
	component: AppLayout,
});

function AppLayout() {
	return <Outlet />;
}
