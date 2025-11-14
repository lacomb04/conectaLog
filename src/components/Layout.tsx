import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo">
          <h2>ConectaLog</h2>
        </div>
        <ul>
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/tickets">Chamados</Link></li>
          <li><Link to="/new-ticket">Novo Chamado</Link></li>
          <li><Link to="/admin">Área Administrativa</Link></li>
        </ul>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
