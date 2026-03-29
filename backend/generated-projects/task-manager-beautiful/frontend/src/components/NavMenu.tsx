
import React from 'react';
import { NavMenu } from 'react-bootstrap';

interface INavMenuProps {
  children: JSX.Element;
}

const NavMenuComponent: React.FC<INavMenuProps> = ({ children }) => {
  return (
    <NavMenu>{children}</NavMenu>
  );
};

export default NavMenuComponent;