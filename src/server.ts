import { createServer } from 'http';
import { Dependencies } from './di/dependencies.js';
import { setupWsServer } from './server/wsServer.js';
import createHttpServer from './server/httpServer.js';

export const dependencies = new Dependencies();

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = '0.0.0.0';

const server = createServer(createHttpServer());
setupWsServer(server);

async function start() {
  // TODO: Init cooks based on configuration.
  await Promise.all([
    dependencies.createCookUseCase.execute("cook-0"),
    dependencies.createCookUseCase.execute("cook-1"),
  ]);

  server.listen(PORT, HOST, () => {
    console.log(`Kitchen server is running on http://${HOST}:${String(PORT)}`);
  });
}

// Graceful shutdown handlers.
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed');

    dependencies.close()
      .then(() => {
        console.log('Dependencies closed');
        process.exit(0);
      })
      .catch((err: unknown) => {
        console.error('Error closing dependencies:', err);
        process.exit(1);
      });
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

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});