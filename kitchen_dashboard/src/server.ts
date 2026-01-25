import express from "express";
import basicAuth from "express-basic-auth";
import { Configuration } from "./config/configuration.js";
import { setupBoard } from "./board/setupBoard.js";

const config = new Configuration();
const { serverAdapter, queue } = setupBoard(config);

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  basicAuth({
    users: { [config.adminUser]: config.adminPassword },
    challenge: true,
    realm: "Kitchen Dashboard",
  }),
  serverAdapter.getRouter()
);

const server = app.listen(config.dashboardPort, () => {
  console.log(
    `Kitchen Dashboard running at http://localhost:${config.dashboardPort}`
  );
  console.log(`Monitoring queue: ${config.kitchenQueueName}`);
});

async function shutdown() {
  console.log("Shutting down gracefully...");
  server.close();
  await queue.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
