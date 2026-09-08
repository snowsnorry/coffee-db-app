import { createApp } from "../../server/src/appFactory.js";
import { fixtureRepository } from "./fixtures.js";
// Test entrypoint only: the production server has no fixture switch.
createApp({ catalog: fixtureRepository, serveClient: true }).listen(
  Number(process.env.PORT ?? 5310),
  "127.0.0.1",
);
