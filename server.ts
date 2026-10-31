import path from "node:path";
import express from "express";

async function start() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const { default: app } = await import("./artifacts/api-server/src/app");
  const port = Number(process.env.PORT) || (process.env.NODE_ENV === "production" ? 5000 : 3000);
  const isProd = process.env.NODE_ENV === "production";

  app.get("/google4dfae9546e319b9f.html", (_req, res) => {
    res.type("text/html").send("google-site-verification: google4dfae9546e319b9f.html");
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: https://kirimmobil.net/sitemap.xml\n");
  });

  app.use("/assets", express.static(path.resolve(import.meta.dirname, "public/assets")));

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: path.resolve(import.meta.dirname, "artifacts/kirimmobil"),
      server: {
        middlewareMode: true,
        hmr: false,
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

  app.listen(port, "0.0.0.0", () => {
    console.log(`Kirimmobil web & API server listening on http://0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
