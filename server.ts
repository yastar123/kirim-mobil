import path from "node:path";
import express from "express";
import apiApp from "./artifacts/api-server/src/app";

const app = apiApp;
const port = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: path.resolve(import.meta.dirname, "artifacts/kirimmobil"),
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname, "artifacts/kirimmobil/dist/public");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "127.0.0.1", () => {
    console.log(`Kirimmobil web & API server listening on http://127.0.0.1:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
