
import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';

interface INavbarProps {
  children: JSX.Element;
}

const NavbarComponent: React.FC<INavbarProps> = ({ children }) => {
  return (
    <Navbar expand='lg' className='App-navbar'>
      {children}
    </Navbar>
  );
};

export default NavbarComponent;