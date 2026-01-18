import { createServer } from 'http';
import { Dependencies } from './di/dependencies.js';
import httpServer from './server/httpServer.js';
import { setupWsServer } from './server/wsServer.js';

export const dependencies = new Dependencies();

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = '0.0.0.0';

const server = createServer(httpServer);
setupWsServer(server);

server.listen(PORT, HOST, () => {
  console.log(`Kitchen server is running on http://${HOST}:${String(PORT)}`);
});

// Graceful shutdown handlers.
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long.
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});