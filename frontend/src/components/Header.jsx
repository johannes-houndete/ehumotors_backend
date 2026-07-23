import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, RotateCcw, Menu } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user, theme, toggleTheme } = useAuth();

  return (
    <header className="header animate-fade-in">
      <div className="header-brand">
        {/* Hamburger pour mobile */}
        <button className="hamburger-btn" onClick={onMenuClick} title="Menu" aria-label="Ouvrir le menu">
          <Menu size={22} />
        </button>
        <img
          src="/logo.png"
          alt="EhuMotors"
          className="header-logo"
        />
      </div>

      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button className="theme-toggle" onClick={toggleTheme} title="Changer le thème">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Refresh Icon Action */}
        <button className="theme-toggle" onClick={() => window.location.reload()} title="Rafraîchir les données">
          <RotateCcw size={18} />
        </button>

        {/* User Info Card */}
        <div className="user-profile">
          <div className="user-name" style={{ textAlign: 'right' }}>
            <div>{user?.nom || 'Johannes'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
              {user?.role === 'admin' ? 'Administrateur' : `Agent (${user?.station_id ? 'Station #' + user.station_id : 'Station'})`}
            </div>
          </div>
          {/* Mock Profile Picture matching layout */}
          <div className="user-avatar" style={{
            backgroundColor: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'var(--primary-green)'
          }}>
            {(user?.nom || 'J').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
