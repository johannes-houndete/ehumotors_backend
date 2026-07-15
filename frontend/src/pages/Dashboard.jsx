import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Zap, DollarSign, Plug, TrendingUp, RefreshCw, Users, Activity } from 'lucide-react';

const mockChartData = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 78000 },
  { name: 'Mar', revenue: 62000 },
  { name: 'Apr', revenue: 95000 },
  { name: 'May', revenue: 110000 },
  { name: 'Jun', revenue: 135200 },
  { name: 'Jul', revenue: 125000 },
];

const Dashboard = () => {
  const { apiFetch, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [parStation, setParStation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    totalFCFA: 0,
    totalEnergieKWh: 0,
    successRate: 82,
    activeAgents: "2/2"
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch sessions
      const sessionsResponse = await apiFetch('/api/sessions/');
      const sessionsData = await sessionsResponse.json();
      const sessionsList = sessionsData.results || sessionsData || [];
      setSessions(sessionsList.slice(0, 10)); // Take top 10 for dashboard

      // 2. Compute metrics
      if (isAdmin) {
        // Admin gets global metrics from stats endpoint
        try {
          const statsResponse = await apiFetch('/api/dashboard/stats/?periode=mois');
          const statsData = await statsResponse.json();
          setParStation(statsData.par_station || []);
          
          const total = statsData.global?.total_sessions || 0;
          const paid = statsData.global?.sessions_payees || 0;
          const success = total > 0 ? Math.round((paid / total) * 100) : 82;

          setMetrics({
            totalSessions: total,
            totalFCFA: statsData.global?.chiffre_affaires_fcfa || 0,
            totalEnergieKWh: (statsData.global?.total_energie_wh || 0) / 1000,
            successRate: success,
            activeAgents: "2/2"
          });
        } catch (statsErr) {
          console.error("Failed to load dashboard stats", statsErr);
          calculateLocalMetrics(sessionsList);
        }
      } else {
        // Agent gets local calculations from their sessions
        calculateLocalMetrics(sessionsList);
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des données du tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalMetrics = (list) => {
    const total = list.length;
    const paidList = list.filter(s => s.statut === 'paye');
    const cash = paidList.reduce((sum, s) => sum + (s.cout_fcfa || 0), 0);
    const energyWh = list.reduce((sum, s) => sum + (s.energie_wh || 0), 0);
    
    setMetrics({
      totalSessions: total,
      totalFCFA: cash,
      totalEnergieKWh: energyWh / 1000,
      successRate: total > 0 ? Math.round((paidList.length / total) * 100) : 100,
      activeAgents: "1/1"
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paye':
        return <span className="badge badge-success">Payé</span>;
      case 'en_cours':
        return <span className="badge badge-pending">En cours</span>;
      case 'echec':
        return <span className="badge badge-danger">Échec</span>;
      case 'en_attente':
      default:
        return <span className="badge badge-info">En attente</span>;
    }
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pie chart config for station distribution
  const pieData = parStation.map(station => ({
    name: station.station__nom,
    value: station.nb_sessions
  }));
  const COLORS = ['var(--primary-green)', 'var(--primary-blue)', '#10B981', '#F59E0B'];

  if (isAdmin) {
    // ADMIN SUPERVISION VIEW
    return (
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Vue globale</h1>
            <p className="page-subtitle">Supervision de toutes les stations de recharge EhuMotors</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading} style={{ padding: '8px 16px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Supervision Metrics Grid */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="metric-info">
              <span className="metric-label">Sessions totales</span>
              <span className="metric-value">{metrics.totalSessions}</span>
            </div>
            <div className="metric-icon-container" style={{ color: 'var(--primary-green)', backgroundColor: 'rgba(2, 160, 91, 0.1)' }}>
              <Zap size={20} />
            </div>
          </div>

          <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.08s' }}>
            <div className="metric-info">
              <span className="metric-label">Chiffre d'affaires</span>
              <span className="metric-value">{formatPrice(metrics.totalFCFA).replace(' FCFA', '')} F</span>
            </div>
            <div className="metric-icon-container" style={{ color: 'var(--primary-blue)', backgroundColor: 'rgba(0, 173, 239, 0.1)' }}>
              <DollarSign size={20} />
            </div>
          </div>

          <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.12s' }}>
            <div className="metric-info">
              <span className="metric-label">Énergie distribuée</span>
              <span className="metric-value">{metrics.totalEnergieKWh.toFixed(1)} KWh</span>
            </div>
            <div className="metric-icon-container" style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Plug size={20} />
            </div>
          </div>

          <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="metric-info">
              <span className="metric-label">Taux de succès</span>
              <span className="metric-value">{metrics.successRate}%</span>
            </div>
            <div className="metric-icon-container" style={{ color: 'var(--color-warning)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Activity size={20} />
            </div>
          </div>

          <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.18s' }}>
            <div className="metric-info">
              <span className="metric-label">Agents actifs</span>
              <span className="metric-value">{metrics.activeAgents}</span>
            </div>
            <div className="metric-icon-container" style={{ color: 'var(--primary-green)', backgroundColor: 'rgba(2, 160, 91, 0.1)' }}>
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Middle Section: Stations Table & Session Distribution Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', margin: '24px 0' }}>
          
          {/* Activité par station table */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-heading)' }}>
              Activité par station
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="sessions-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>CENTRE</th>
                    <th>SESSIONS</th>
                    <th>CA FCFA</th>
                    <th>ÉNERGIE</th>
                    <th>AGENT</th>
                  </tr>
                </thead>
                <tbody>
                  {parStation.map((station, idx) => {
                    const mockAgents = ["Jean ADJOVI", "Lucien HOUNSOU", "Koffi Mensah"];
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{station.station__nom}</td>
                        <td>{station.nb_sessions}</td>
                        <td>{new Intl.NumberFormat('fr-FR').format(station.ca_fcfa || 0)}</td>
                        <td>{((station.energie_wh || 0) / 1000).toFixed(1)} KWh</td>
                        <td style={{ color: 'var(--text-muted)' }}>{mockAgents[idx % mockAgents.length]}</td>
                      </tr>
                    );
                  })}
                  {parStation.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune station active.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Répartition des sessions */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', alignSelf: 'flex-start' }}>
              Répartition des sessions
            </h3>
            
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Aucune', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              {pieData.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Section: Revenue Evolution Line Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Evolution du chiffre d'affaires</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cette année</span>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} tickFormatter={(v) => `${v/1000}k F`} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="FCFA" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  }

  // AGENT VIEW
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Sessions du jour</h1>
          <p className="page-subtitle">Aperçu en temps réel des recharges et des paiements</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading} style={{ padding: '8px 16px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          padding: '16px',
          borderRadius: 'var(--border-radius-sm)',
          marginBottom: '24px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="metrics-grid">
        <div className="card metric-card metric-card-green animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="metric-info">
            <span className="metric-label">Sessions totales</span>
            <span className="metric-value">{metrics.totalSessions}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--primary-green)', backgroundColor: 'rgba(2, 160, 91, 0.1)' }}>
            <Zap size={24} />
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="metric-info">
            <span className="metric-label">FCFA Encaissés</span>
            <span className="metric-value">{formatPrice(metrics.totalFCFA).replace(' FCFA', '')}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--primary-blue)', backgroundColor: 'rgba(0, 173, 239, 0.1)' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="card metric-card metric-card-green animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="metric-info">
            <span className="metric-label">Energie distribuée</span>
            <span className="metric-value">
              {metrics.totalEnergieKWh ? metrics.totalEnergieKWh.toFixed(1) : 0} KWh
            </span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <Plug size={24} />
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="card animate-fade-in" style={{ animationDelay: '0.3s', padding: '24px 0' }}>
        <div style={{ padding: '0 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Toutes les sessions récentes</h2>
        </div>

        <div className="premium-table-container" style={{ border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chargement en cours...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune session trouvée.</div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                        {session.client_nom || `Client #${session.moto}`}
                      </div>
                      {session.moto_chassis && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {session.moto_chassis}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(session.date_heure)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                      {formatPrice(session.cout_fcfa || 0)}
                    </td>
                    <td>{getStatusBadge(session.statut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

