
import React, { useState } from 'react';
import axios from 'axios';

interface ITaskFormProps {
  onSubmit: (taskData: any) => void;
}

const TaskFormComponent: React.FC<ITaskFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    try {
      const response = await axios.post('/api/tasks', { title, description, priority });
      onSubmit(response.data);
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor='title'>Title:</label>
      <input type='text' id='title' value={title} onChange={(event) => setTitle(event.target.value)} />
      <br />
      <label htmlFor='description'>Description:</label>
      <textarea id='description' value={description} onChange={(event) => setDescription(event.target.value)} />
      <br />
      <label htmlFor='priority'>Priority:</label>
      <select id='priority' value={priority} onChange={(event) => setPriority(parseInt(event.target.value))}>
        {[1, 2, 3].map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
      <br />
      <button type='submit'>Submit</button>
    </form>
  );
};

export default TaskFormComponent;