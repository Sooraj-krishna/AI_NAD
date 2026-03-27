import { Request, Response } from 'express';
import { pipelineService } from '../services/pipeline-service';
import { Logger } from '../utils/logger';
import { PromptSanitizer } from '../utils/prompt-sanitizer';

class PipelineController {
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Sanitize prompt for security
      const sanitization = PromptSanitizer.sanitize(prompt);
      if (!sanitization.valid) {
        res.status(400).json({ error: sanitization.error });
        return;
      }

      Logger.info('Generation request received', { prompt: sanitization.sanitized?.substring(0, 100) });

      // Start pipeline execution (async)
      const projectId = await pipelineService.startGeneration(sanitization.sanitized!);

      res.json({
        success: true,
        projectId,
        message: 'Project generation started'
      });
    } catch (error) {
      Logger.error('Generation error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const status = await pipelineService.getStatus(id);

      if (!status) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json(status);
    } catch (error) {
      Logger.error('Status check error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await pipelineService.listProjects();
      res.json({ projects });
    } catch (error) {
      Logger.error('List projects error', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}

export const pipelineController = new PipelineController();

