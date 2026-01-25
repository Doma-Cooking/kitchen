import express from "express";
import basicAuth from "express-basic-auth";
import { Configuration } from "./config/configuration.js";
import { setupBoard } from "./board/setupBoard.js";
import healthRoutes from "./routes/healthRoutes.js";

const config = new Configuration();
const serverAdapter = setupBoard(config);

const app = express();

app.use("/health", healthRoutes);

app.use(
  basicAuth({
    users: { [config.adminUser]: config.adminPassword },
    challenge: true,
    realm: "Kitchen Dashboard",
  }),
  serverAdapter.getRouter() as express.RequestHandler
);

const server = app.listen(config.dashboardPort, () => {
  console.log(
    `Kitchen Dashboard running at http://localhost:${config.dashboardPort.toString()}`
  );
  console.log(`Monitoring queue: ${config.kitchenQueueName}`);
});

const shutdown = () => {
  console.log("Shutting down gracefully...");
  server.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
