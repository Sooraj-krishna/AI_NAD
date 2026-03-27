import { Router } from 'express';
import { pipelineController } from '../controllers/pipeline-controller';

export const pipelineRoutes = Router();

pipelineRoutes.post('/generate', pipelineController.generate);
pipelineRoutes.get('/status/:id', pipelineController.getStatus);
pipelineRoutes.get('/projects', pipelineController.listProjects);


