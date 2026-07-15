import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, 
  PlusCircle, 
  BarChart3, 
  History, 
  LogOut,
  Settings,
  Users,
  DollarSign,
  FileText
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
          {/* Agent Sidebar Navigation */}
          {isAgent && (
            <>
              <div className="sidebar-section-title">Menu Principal</div>
              
              <button 
                className={`sidebar-item btn-secondary ${activePage === 'sessions' ? 'active' : ''}`}
                onClick={() => handleNav('sessions')}
              >
                <Zap size={18} />
                <span>Sessions</span>
              </button>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'new-session' ? 'active' : ''}`}
                onClick={() => handleNav('new-session')}
              >
                <PlusCircle size={18} />
                <span>Nouvelle session</span>
              </button>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'statistics' ? 'active' : ''}`}
                onClick={() => handleNav('statistics')}
              >
                <BarChart3 size={18} />
                <span>Statistiques</span>
              </button>

              <div className="sidebar-section-title">Archives</div>
              
              <button 
                className={`sidebar-item btn-secondary ${activePage === 'history' ? 'active' : ''}`}
                onClick={() => handleNav('history')}
              >
                <History size={18} />
                <span>Historique</span>
              </button>
            </>
          )}


          {/* Admin Sidebar Navigation */}
          {isAdmin && (
            <>
              <div className="sidebar-section-title">SUPERVISION</div>
              
              <button 
                className={`sidebar-item btn-secondary ${activePage === 'sessions' ? 'active' : ''}`}
                onClick={() => handleNav('sessions')}
              >
                <Zap size={18} />
                <span>Dashboard</span>
              </button>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'statistics' ? 'active' : ''}`}
                onClick={() => handleNav('statistics')}
              >
                <BarChart3 size={18} />
                <span>Statistiques</span>
              </button>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'history' ? 'active' : ''}`}
                onClick={() => handleNav('history')}
              >
                <History size={18} />
                <span>Sessions</span>
              </button>

              <div className="sidebar-section-title">GESTION</div>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'agents' ? 'active' : ''}`}
                onClick={() => handleNav('agents')}
              >
                <Users size={18} />
                <span>Agents</span>
              </button>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'tarification' ? 'active' : ''}`}
                onClick={() => handleNav('tarification')}
              >
                <DollarSign size={18} />
                <span>Tarification</span>
              </button>

              <div className="sidebar-section-title">DONNÉES</div>

              <button 
                className={`sidebar-item btn-secondary ${activePage === 'reports' ? 'active' : ''}`}
                onClick={() => handleNav('reports')}
              >
                <FileText size={18} />
                <span>Rapports</span>
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button 
          className={`sidebar-item btn-secondary ${activePage === 'settings' ? 'active' : ''}`}
          onClick={() => handleNav('settings')}
          style={{ width: '100%', border: 'none', background: 'none', marginBottom: '8px' }}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

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
