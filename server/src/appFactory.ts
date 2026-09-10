import fs from "node:fs";
import { catalogRoutes } from "./catalog/routes.js";
import type { CatalogRepository } from "./catalog/types.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type RequestHandler } from "express";

export const HEALTH_PAYLOAD = Object.freeze({
  status: "ok",
  service: "coffee-db-server",
} as const);

export type CreateAppOptions = {
  catalog?: CatalogRepository;
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
  app.use((_request, response, next) => {
    response.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      // Emotion injects style elements; MUI also uses inline style attributes.
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' http: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    });
    next();
  });
  app.use(express.json());
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  const catalogue = catalogRoutes(options.catalog);
  app.use("/api", (req, res, next) => {
    if (
      /^\/(coffees|roasters)(\/facets)?\/?$/.test(req.path) ||
      req.path === "/catalog/stats"
    )
      return catalogue(req, res, next);
    next();
  });

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
