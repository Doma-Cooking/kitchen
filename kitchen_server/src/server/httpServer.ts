import express from 'express';
import taskRoutes from './httpRoutes/taskRoutes.js';
import stationRoutes from './httpRoutes/stationRoutes.js';
import healthRoutes from './httpRoutes/healthRoutes.js';

const httpServer = express();
httpServer.use(express.json());

// Routes.
httpServer.use('/health', healthRoutes);
httpServer.use('/api/tasks', taskRoutes);
httpServer.use('/api/stations', stationRoutes);

export default httpServer;