// Layout.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  FileText, 
  LogOut,
  Settings,
  UserCog,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/rentals', icon: FileText, label: 'Noleggi' },
    { path: '/customers', icon: Users, label: 'Clienti' },
    { path: '/vehicles', icon: Car, label: 'Veicoli' },
    // Aggiunto Gestione Utenti solo per Admin
    ...(user?.role === 'admin' 
        ? [{ path: '/users', icon: UserCog, label: 'Gestione Utenti' }] 
        : []
    )
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div style={{
              width: '60px',
              height: '60px',
              background: 'white',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#1a4d2e',
              marginBottom: '12px',
            }}>
              B
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>BNC Energy</div>
            <small>Gestione Noleggio</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''}`
                }
                end={item.path === '/'}
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>
                {user?.full_name || 'Utente'}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {user?.role === 'admin' ? 'Amministratore' : 'Operatore'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm"
            style={{
              width: '100%',
              marginTop: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>

      {/* Main Content: UTILIZZA content-wrapper per il CSS di scorrimento */}
      <main className="content-wrapper">
        {children}
        {/* Nuovo Footer qui */}
        <footer style={{ 
          padding: '10px 20px', 
          textAlign: 'center', 
          fontSize: '12px', 
          color: '#999',
          marginTop: 'auto', // Spinge il footer in fondo al content-wrapper
          borderTop: '1px solid #eee',
          background: '#fff',
        }}>
          Sviluppato da **Antonino Giardina** - all rights reserved 2025®
        </footer>
      </main>
    </div>
  );
};

export default Layout;