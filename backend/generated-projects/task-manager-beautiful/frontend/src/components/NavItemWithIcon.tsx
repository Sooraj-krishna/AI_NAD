
import React from 'react';
import { NavItem, NavDropdown } from 'react-bootstrap';
import { UserIcon } from 'lucide-react';

interface INavItemProps {
  children: JSX.Element;
}

const NavItemWithIconComponent: React.FC<INavItemProps> = ({ children }) => {
  return (
    <NavDropdown title='User' id='nav-dropdown-user' className='App-nav-item-with-icon'>
      <NavItem component='span' eventKey={1}>
        <UserIcon /> Profile
      </NavItem>
      <NavItem component='span' eventKey={2}>Settings</NavItem>
    </NavDropdown>
  );
};

export default NavItemWithIconComponent;