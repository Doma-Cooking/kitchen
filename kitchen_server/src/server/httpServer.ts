import express from 'express';
import orderRoutes from './httpRoutes/orderRoutes.js';
import stationRoutes from './httpRoutes/stationRoutes.js';
import healthRoutes from './httpRoutes/healthRoutes.js';
import createWebhookRoutes from './httpRoutes/webhookRoutes.js';

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

    return httpServer;
}

export default createHttpServer;