import express from 'express';
import orderRoutes from './httpRoutes/orderRoutes.js';
import stationRoutes from './httpRoutes/stationRoutes.js';
import healthRoutes from './httpRoutes/healthRoutes.js';

const httpServer = express();
httpServer.use(express.json());

// Routes.
httpServer.use('/health', healthRoutes);
httpServer.use('/api/orders', orderRoutes);
httpServer.use('/api/stations', stationRoutes);

export default httpServer;