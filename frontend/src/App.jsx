import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import Statistics from './pages/Statistics';
import History from './pages/History';
import Agents from './pages/Agents';
import Tarification from './pages/Tarification';
import './App.css';

const AppContent = () => {
  const { isAuthenticated, isAgent, isAdmin } = useAuth();
  const [activePage, setActivePage] = useState('sessions');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Automatically adjust default page based on user role when logging in
  useEffect(() => {
    if (isAuthenticated) {
      if (isAgent) {
        setActivePage('sessions');
      } else if (isAdmin) {
        setActivePage('sessions');
      }
    }
  }, [isAuthenticated, isAgent, isAdmin]);

  // Fermer la sidebar quand la fenêtre s'agrandit (desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'new-session':
        return isAgent ? <NewSession /> : <Dashboard />;
      case 'statistics':
        return <Statistics />;
      case 'history':
        return <History />;
      case 'agents':
        return isAdmin ? <Agents /> : <Dashboard />;
      case 'tarification':
        return isAdmin ? <Tarification /> : <Dashboard />;
      case 'sessions':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-wrapper">
        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};


const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
