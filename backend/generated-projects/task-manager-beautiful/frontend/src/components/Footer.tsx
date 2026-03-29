
import React from 'react';

interface IFooterProps {
  children: React.ReactNode;
}

const Footer: React.FC<IFooterProps> = ({ children }) => {
  return (
    <footer className='App-footer'>{children}</footer>
  );
};

export default Footer;