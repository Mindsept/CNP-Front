import { build } from "esbuild";
import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";
if (!process.argv[2]) throw new Error("Provide the Keycloak theme resources/js output directory.");
await build({
  entryPoints: ["src/components/auth/keycloak-entry.tsx"],
  outfile: resolve(process.argv[2], "cnp-space.js"),
  bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, legalComments: "linked",
});
await copyFile("src/components/auth/react-bits/LICENSE.md", resolve(process.argv[2], "REACT-BITS-LICENSE.md"));
