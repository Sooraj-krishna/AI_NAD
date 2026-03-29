
import React from 'react';
import { NavItem } from 'react-bootstrap';

interface INavItemProps {
  children: React.ReactNode;
  eventKey?: any;
}

const NavItemComponent: React.FC<INavItemProps> = ({ children }) => {
  return (
    <NavItem>{children}</NavItem>
  );
};

export default NavItemComponent;