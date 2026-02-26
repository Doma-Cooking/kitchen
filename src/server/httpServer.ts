import express from 'express';
import basicAuth from 'express-basic-auth';
import orderRoutes from './httpRoutes/orderRoutes.js';
import stationRoutes from './httpRoutes/stationRoutes.js';
import healthRoutes from './httpRoutes/healthRoutes.js';
import createWebhookRoutes from './httpRoutes/webhookRoutes.js';
import { setupBoard } from '../dashboard/board/setupBoard.js';
import { dependencies } from '../server.js';

function createHttpServer(): express.Express {
    const httpServer = express();

    // Webhook routes must be mounted before express.json() for signature verification
    httpServer.use('/webhooks', createWebhookRoutes());

    // Middleware to parse JSON bodies.
    httpServer.use(express.json());

    // Routes.
    httpServer.use('/health', healthRoutes);
    httpServer.use('/api/orders', orderRoutes);
    httpServer.use('/api/stations', stationRoutes);

    // Dashboard with basic auth
    const serverAdapter = setupBoard({
        queueNames: [dependencies.config.eventQueueName, dependencies.config.orderQueueName],
        redisConnection: { host: dependencies.config.redisHost, port: dependencies.config.redisPort },
    });
    httpServer.use(
        '/dashboard',
        basicAuth({
            users: { [dependencies.config.adminUser]: dependencies.config.adminPassword },
            challenge: true,
            realm: 'Kitchen Dashboard',
        }),
        serverAdapter.getRouter() as express.RequestHandler
    );

    return httpServer;
}

export default createHttpServer;
