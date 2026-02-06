import { useCallback, useSyncExternalStore } from "react";

function getTheme(): "light" | "dark" {
	if (typeof document === "undefined") return "light";
	return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
	listeners.push(listener);
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}

function setTheme(theme: "light" | "dark") {
	document.documentElement.setAttribute("data-theme", theme);
	localStorage.setItem("theme", theme);
	for (const listener of listeners) listener();
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as const);

	const toggle = useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme]);

	return { theme, toggle };
}
