import express from 'express';
import taskRoutes from './routes/taskRoutes.js';
import stationRoutes from './routes/stationRoutes.js';

const app = express();
app.use(express.json());

// Routes.
app.use('/api/tasks', taskRoutes);
app.use('/api/stations', stationRoutes);

export default app;