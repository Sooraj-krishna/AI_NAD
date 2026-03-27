"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineRoutes = void 0;
const express_1 = require("express");
const pipeline_controller_1 = require("../controllers/pipeline-controller");
exports.pipelineRoutes = (0, express_1.Router)();
exports.pipelineRoutes.post('/generate', pipeline_controller_1.pipelineController.generate);
exports.pipelineRoutes.get('/status/:id', pipeline_controller_1.pipelineController.getStatus);
exports.pipelineRoutes.get('/projects', pipeline_controller_1.pipelineController.listProjects);
