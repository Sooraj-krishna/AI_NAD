
import { Task, User } from '../models';

export class TaskService {
  async createTask(taskData: any): Promise<Task> {
    const task = new Task({ ...taskData });
    await task.save();
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return Task.find().exec();
  }

  async getTaskById(id: string): Promise<Task | null> {
    const task = await Task.findById(id).exec();
    return task ? task : null;
  }

  async updateTask(id: string, updatedData: any): Promise<Task | null> {
    const existingTask = await this.getTaskById(id);
    if (!existingTask) return null;
    Object.assign(existingTask, updatedData);
    await existingTask.save();
    return existingTask;
  }

  async deleteTask(id: string): Promise<void> {
    const taskToDelete = await Task.findByIdAndDelete(id);
  }
}
export default new TaskService();

