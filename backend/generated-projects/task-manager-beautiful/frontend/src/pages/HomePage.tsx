import React from 'react';
import { Header, Footer } from '../components';

interface IHomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<IHomePageProps> = ({ children }) => {
  return (
    <div className='App'>
      <Header title="Task Manager" />
      {children}
      <Footer>
        <p>&copy; 2026 Task Manager. All rights reserved.</p>
      </Footer>
    </div>
  );
};

export default HomePageComponent;