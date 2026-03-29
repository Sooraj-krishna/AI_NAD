
import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { User } from 'lucide-react';
import NavItem from './NavItem';

interface INavbarProps {
  children: React.ReactNode;
}

const NavbarWithMenuComponent: React.FC<INavbarProps> = ({ children }) => {
  return (
    <Navbar expand='lg' className='App-navbar-with-menu'>
      <Nav>{children}</Nav>
      <Nav className='ms-auto'>
        <NavItem eventKey={1}>
          <User size={18} className="me-1" /> Profile
        </NavItem>
        <NavItem eventKey={2}>Settings</NavItem>
      </Nav>
    </Navbar>
  );
};

export default NavbarWithMenuComponent;