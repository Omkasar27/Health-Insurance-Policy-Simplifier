import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import policyRoutes from './routes/policy.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import agentRoutes from './routes/agent.routes.js';
import qaRoutes from './routes/qa.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);

app.use('/api/agents', agentRoutes);


app.use('/api', qaRoutes);


app.use(errorHandler);

export default app;