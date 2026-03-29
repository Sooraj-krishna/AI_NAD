
import React from 'react';
import { Layout } from 'lucide-react';

interface IHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

const Header: React.FC<IHeaderProps> = ({ title, icon }) => {
  return (
    <header className='App-header'>
      {icon ? icon : <Layout className='App-logo' size={50} />}
      <h1>{title}</h1>
    </header>
  );
};

export default Header;