import { Router } from "express";
import os from "os";

const router = Router();

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes.toString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

router.get("/", (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const cpuUsage = process.cpuUsage();
  const uptimeMicros = process.uptime() * 1e6;
  const cpuPercent = ((cpuUsage.user + cpuUsage.system) / uptimeMicros) * 100;

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      rss: formatBytes(memoryUsage.rss),
      heapUsedPercent: formatPercent((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      systemUsedPercent: formatPercent(((totalMemory - freeMemory) / totalMemory) * 100),
    },
    cpu: {
      user: `${(cpuUsage.user / 1e6).toFixed(2)}s`,
      system: `${(cpuUsage.system / 1e6).toFixed(2)}s`,
      percent: formatPercent(cpuPercent),
    },
  });
});

export default router;
