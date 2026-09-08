import { createApp } from "./appFactory.js";

const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

app.listen(port, () => {
  process.stdout.write(
    `Coffee DB server listening on http://localhost:${port}\n`,
  );
});
