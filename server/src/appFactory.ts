import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type RequestHandler } from "express";

export const HEALTH_PAYLOAD = Object.freeze({
  status: "ok",
  service: "coffee-db-server",
} as const);

export type CreateAppOptions = {
  clientDistPath?: string;
  serveClient?: boolean;
};

const healthHandler: RequestHandler = (_request, response) => {
  response.status(200).json(HEALTH_PAYLOAD);
};

const DEFAULT_CLIENT_DIST_PATH = fileURLToPath(
  new URL("../../client/dist", import.meta.url),
);

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const serveClient =
    options.serveClient ?? process.env.NODE_ENV === "production";
  const clientDistPath = options.clientDistPath ?? DEFAULT_CLIENT_DIST_PATH;

  app.disable("x-powered-by");
  app.use(express.json());
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "not_found" });
  });

  if (serveClient && fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, { index: false }));
    app.get("/{*splat}", (_request, response) => {
      response.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
