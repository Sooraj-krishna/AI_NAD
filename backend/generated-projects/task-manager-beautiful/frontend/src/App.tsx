
import React from 'react';
import HomePageComponent from './pages/HomePage';
import { TaskForm } from './components';

function App() {
  return (
    <HomePageComponent>
      <TaskForm onSubmit={(task) => console.log('Task submitted:', task)} />
    </HomePageComponent>
  );
}

export default App;