import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, 
  PlusCircle, 
  BarChart3, 
  History, 
  LogOut 
} from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
  const { logout, isAdmin, isAgent } = useAuth();

  const handleNav = (page) => {
    setActivePage(page);
  };

  return (
    <aside className="sidebar animate-fade-in">
      <div>
        <div className="sidebar-logo">
          <img
            src="/logo.png"
            alt="EhuMotors"
            style={{ height: '40px', width: 'auto', objectFit: 'contain', maxWidth: '160px' }}
          />
        </div>

        <nav className="sidebar-menu">
          <div className="sidebar-section-title">Menu Principal</div>
          
          <button 
            className={`sidebar-item btn-secondary ${activePage === 'sessions' ? 'active' : ''}`}
            onClick={() => handleNav('sessions')}
          >
            <Zap size={18} />
            <span>Sessions</span>
          </button>

          {isAgent && (
            <button 
              className={`sidebar-item btn-secondary ${activePage === 'new-session' ? 'active' : ''}`}
              onClick={() => handleNav('new-session')}
            >
              <PlusCircle size={18} />
              <span>Nouvelle session</span>
            </button>
          )}

          {isAdmin && (
            <button 
              className={`sidebar-item btn-secondary ${activePage === 'statistics' ? 'active' : ''}`}
              onClick={() => handleNav('statistics')}
            >
              <BarChart3 size={18} />
              <span>Statistiques</span>
            </button>
          )}

          <div className="sidebar-section-title">Archives</div>
          
          <button 
            className={`sidebar-item btn-secondary ${activePage === 'history' ? 'active' : ''}`}
            onClick={() => handleNav('history')}
          >
            <History size={18} />
            <span>Historique</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">
        <button 
          className="sidebar-item btn-secondary" 
          onClick={logout}
          style={{ width: '100%', color: 'var(--color-danger)', border: 'none', background: 'none' }}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
