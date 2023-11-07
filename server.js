import fs from "node:fs/promises";
import { normalizePath } from "vite";

const ssrDepInclude = ["cjs-dep-one"];

(async () => {
  // Reset file
  await fs.writeFile(
    "./src/entry-server.mjs",
    `
    import {something as cjsDepOne} from "cjs-dep-one";

    export function render() {
      console.log({
        cjsDepOne,
      });

      return '';
    }

  `
  );

  const { createServer } = await import("vite");
  const vite = await createServer({
    root: process.cwd(),
    logLevel: "info",
    server: {
      watch: {
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 100,
      },
    },
    esbuild: false,
    mode: "development",
    ssr: {
      noExternal: true,
      external: [],
      optimizeDeps: {
        disabled: false,
        exclude: [],
        include: ssrDepInclude,
        esbuildOptions: {
          plugins: [
            {
              name: "optimize-deps-ssr",
              setup(build) {
                build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
                  console.log(args.path);
                  return {
                    contents: (await fs.readFile(args.path, "utf-8")).replace(
                      "foo",
                      "bar"
                    ),
                    loader: "js",
                  };
                });
              },
            },
          ],
        },
      },
    },
  });

  await vite.listen();

  // Minic request
  (await vite.ssrLoadModule("./src/entry-server.mjs")).render();

  console.log("performing file update in 10 seconds.");

  async function EmulateFileChange() {
    // Update file
    await fs.writeFile(
      "./src/entry-server.mjs",
      `
      import {something as cjsDepOne} from "cjs-dep-one";
      import {something as cjsDepTwo} from "cjs-dep-two";

      export function render() {
        console.log({
          cjsDepOne,
          cjsDepTwo
        });

        return '';
      }

    `
    );

    // Add new dep to SSR includes
    ssrDepInclude.push("cjs-dep-two");

    vite.moduleGraph
      .getModulesByFile(normalizePath(process.cwd() + "/src/entry-server.mjs"))
      .forEach((m) => {
        vite.moduleGraph.invalidateModule(m);
      });

    // Minic request
    (await vite.ssrLoadModule("./src/entry-server.mjs")).render();
  }

  setTimeout(() => {
    EmulateFileChange();
  }, 10_000);
})();
