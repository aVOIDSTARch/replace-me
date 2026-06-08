import { defineConfig } from "vite-plus";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/replace-me/",
  server: {
    port: 5200,
    strictPort: true, // fail loudly if port is taken rather than silently drifting
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        punchlist: resolve(__dirname, "punchlist/index.html"),
      },
    },
  },
});
