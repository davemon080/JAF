import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command, mode }) => {
  const plugins = [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ];

  // Enable Nitro plugin only during build to generate correct Vercel serverless deployment configurations (preventing 404 on refresh)
  if (command === "build" || process.env.NODE_ENV === "production") {
    try {
      const nitroMod = await import("nitro/vite");
      if (nitroMod && nitroMod.nitro) {
        plugins.push(nitroMod.nitro({}));
      }
    } catch (err) {
      console.warn("Could not load nitro/vite plugin:", err);
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: "0.0.0.0",
      strictPort: true,
    },
  };
});
