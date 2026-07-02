import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Zap, DollarSign, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';

const mockChartData = [
  { name: 'Jan', clients: 12000, recharge: 8000 },
  { name: 'Feb', clients: 14000, recharge: 13000 },
  { name: 'Mar', clients: 10000, recharge: 12000 },
  { name: 'Apr', clients: 15000, recharge: 20000 },
  { name: 'May', clients: 13000, recharge: 11000 },
  { name: 'Jun', clients: 22000, recharge: 15000 },
  { name: 'Jul', clients: 19000, recharge: 24000 },
  { name: 'Aug', clients: 23000, recharge: 28000 },
];

const Dashboard = () => {
  const { apiFetch, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    totalFCFA: 0,
    paidSessions: 0,
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
          setMetrics({
            totalSessions: statsData.global?.total_sessions || 0,
            totalFCFA: statsData.global?.chiffre_affaires_fcfa || 0,
            paidSessions: statsData.global?.sessions_payees || 0,
          });
        } catch (statsErr) {
          console.error("Failed to load dashboard stats", statsErr);
          // Fallback to local calculations if stats endpoint fails
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
    
    setMetrics({
      totalSessions: total,
      totalFCFA: cash,
      paidSessions: paidList.length,
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
            <span className="metric-label">Payées</span>
            <span className="metric-value">{metrics.paidSessions}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="charts-grid">
        <div className="card chart-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="chart-header">
            <span className="chart-title">Total clients</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={16} /> +12.5% vs mois dernier
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--border-radius-sm)'
                  }} 
                />
                <Line type="monotone" dataKey="clients" stroke="#6b7280" strokeWidth={2} name="Ce mois-ci" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="recharge" stroke="var(--primary-blue)" strokeDasharray="4 4" strokeWidth={2} name="Mois dernier" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card animate-fade-in" style={{ animationDelay: '0.25s', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Règles Tarifaires Actives</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem' }}>Initial &lt; 5% (Pénalité)</span>
              <strong style={{ color: 'var(--color-danger)' }}>+250 FCFA</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem' }}>Palier 5% - 10%</span>
              <strong style={{ color: 'var(--text-heading)' }}>20 FCFA / %</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem' }}>Palier 10% - 20%</span>
              <strong style={{ color: 'var(--text-heading)' }}>15 FCFA / %</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.875rem' }}>Palier 20% - 90%</span>
              <strong style={{ color: 'var(--text-heading)' }}>12 FCFA / %</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: '0.875rem' }}>Palier 90% - 100%</span>
              <strong style={{ color: 'var(--text-heading)' }}>15 FCFA / %</strong>
            </div>
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
                  <th>Client / Moto</th>
                  <th>Date & Heure</th>
                  <th>Niveau Batterie</th>
                  <th>Énergie (Wh)</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                        {session.moto_chassis || `Moto #${session.moto}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Client #{session.moto}
                      </div>
                    </td>
                    <td>{formatDate(session.date_heure)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {session.pct_depart}% &rarr; {session.pct_cible}%
                    </td>
                    <td>{session.energie_wh ? `${session.energie_wh} Wh` : '-'}</td>
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
