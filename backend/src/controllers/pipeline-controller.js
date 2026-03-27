"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineController = void 0;
const pipeline_service_1 = require("../services/pipeline-service");
const logger_1 = require("../utils/logger");
const prompt_sanitizer_1 = require("../utils/prompt-sanitizer");
class PipelineController {
    async generate(req, res) {
        try {
            const { prompt } = req.body;
            if (!prompt || typeof prompt !== 'string') {
                res.status(400).json({ error: 'Prompt is required' });
                return;
            }
            // Sanitize prompt for security
            const sanitization = prompt_sanitizer_1.PromptSanitizer.sanitize(prompt);
            if (!sanitization.valid) {
                res.status(400).json({ error: sanitization.error });
                return;
            }
            logger_1.Logger.info('Generation request received', { prompt: sanitization.sanitized?.substring(0, 100) });
            // Start pipeline execution (async)
            const projectId = await pipeline_service_1.pipelineService.startGeneration(sanitization.sanitized);
            res.json({
                success: true,
                projectId,
                message: 'Project generation started'
            });
        }
        catch (error) {
            logger_1.Logger.error('Generation error', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async getStatus(req, res) {
        try {
            const { id } = req.params;
            const status = await pipeline_service_1.pipelineService.getStatus(id);
            if (!status) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            res.json(status);
        }
        catch (error) {
            logger_1.Logger.error('Status check error', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
    async listProjects(req, res) {
        try {
            const projects = await pipeline_service_1.pipelineService.listProjects();
            res.json({ projects });
        }
        catch (error) {
            logger_1.Logger.error('List projects error', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
}
exports.pipelineController = new PipelineController();
