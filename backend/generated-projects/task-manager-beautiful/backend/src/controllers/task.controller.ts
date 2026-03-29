
import { Request, Response } from 'express';
import TaskService from '../services/task.service';

export class TaskController {
  async getAllTasks(req: Request, res: Response) {
    try {
      const tasks = await TaskService.getAllTasks();
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTask(req: Request, res: Response) {
    try {
      const newTask = await TaskService.createTask(req.body);
      res.status(201).json(newTask);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getTaskById(req: Request, res: Response) {
    try {
      const task = await TaskService.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const updatedTask = await TaskService.updateTask(req.params.id, req.body);
      res.json(updatedTask);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteTask(req: Request, res: Response) {
    try {
      await TaskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
