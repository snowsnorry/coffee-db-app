import { Router } from "express";
import type { CatalogRepository } from "./types.js";
import {
  integerParameter,
  InvalidQuery,
  parseFacet,
  parseQuery,
  textParameter,
} from "./validation.js";

export function catalogRoutes(repository?: CatalogRepository) {
  const router = Router();
  router.use((_req, res, next) => {
    if (!repository) {
      res.status(503).json({ error: "catalog_unavailable" });
      return;
    }
    next();
  });
  router.get("/catalog/stats", async (_req, res) => {
    res.json(await repository!.stats());
  });
  for (const kind of ["coffees", "roasters"] as const) {
    router.get(`/${kind}`, async (req, res) => {
      const params = new URL(req.originalUrl, "http://localhost").searchParams;
      res.json(await repository![kind](parseQuery(params, kind)));
    });
    router.get(`/${kind}/facets`, async (req, res) => {
      const params = new URL(req.originalUrl, "http://localhost").searchParams;
      res.json(
        await repository!.facet(
          kind,
          parseQuery(params, kind),
          parseFacet(params, kind),
          textParameter(params, "search"),
          integerParameter(params, "offset", 0, 1000000, 0),
        ),
      );
    });
  }
  router.use(
    (
      error: unknown,
      _req: import("express").Request,
      res: import("express").Response,
      _next: import("express").NextFunction,
    ) => {
      const invalid = error instanceof InvalidQuery;
      res
        .status(invalid ? 400 : 503)
        .json({ error: invalid ? "invalid_query" : "catalog_unavailable" });
    },
  );
  return router;
}
