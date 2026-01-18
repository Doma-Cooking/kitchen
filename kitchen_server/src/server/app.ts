import express from 'express';
import taskRoutes from './routes/taskRoutes.js';

const app = express();
app.use(express.json());

// Routes.
app.use('/api/tasks', taskRoutes);

export default app;