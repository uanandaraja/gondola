import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	server: { port: 3000 },
	plugins: [
		nitro(),
		viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		react(),
	],
});
