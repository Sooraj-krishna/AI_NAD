import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const generateProject = async (prompt: string) => {
  const response = await axios.post(`${API_BASE_URL}/pipeline/generate`, {
    prompt
  });
  return response.data;
};

export const checkStatus = async (projectId: string) => {
  const response = await axios.get(`${API_BASE_URL}/pipeline/status/${projectId}`);
  return response.data;
};

export const listProjects = async () => {
  const response = await axios.get(`${API_BASE_URL}/pipeline/projects`);
  return response.data;
};


