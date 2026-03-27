import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pipelineRoutes } from './routes/pipeline';
import { Logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pipeline', pipelineRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});


