import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { BarChart3, TrendingUp, RefreshCw, Activity, ArrowUpRight, CheckCircle2, Plug } from 'lucide-react';

const mockEvolutionData = [
  { name: 'S1', value: 12 },
  { name: 'S2', value: 18 },
  { name: 'S3', value: 10 },
  { name: 'S4', value: 22 },
  { name: 'S5', value: 15 },
  { name: 'S6', value: 25 },
  { name: 'S7', value: 32 },
  { name: 'S8', value: 20 },
  { name: 'S9', value: 28 },
  { name: 'S10', value: 22 },
  { name: 'S11', value: 27 },
  { name: 'S12', value: 30 },
];

const mockDurationData = [
  { name: 'Di', duration: 6.2 },
  { name: 'Lu', duration: 7.8 },
  { name: 'Ma', duration: 4.5 },
  { name: 'Me', duration: 6.9 },
  { name: 'Je', duration: 6.1 },
  { name: 'Ve', duration: 3.2 },
  { name: 'Sa', duration: 6.0 },
];

const Statistics = () => {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('mois');
  const [stats, setStats] = useState({
    sessions: 22,
    totalEnergieWh: 33671,
    collected: 56050,
    cancelled: 2,
    paid: 20
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/dashboard/stats/?periode=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          sessions: data.global?.total_sessions || 22,
          totalEnergieWh: data.global?.total_energie_wh || 33671,
          collected: data.global?.chiffre_affaires_fcfa || 56050,
          cancelled: data.global?.sessions_echec || 2,
          paid: data.global?.sessions_payees || 20
        });
      }
    } catch (err) {
      console.error("Failed to load real stats, using mocks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const formatPrice = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  };

  // Helper for Circular SVG rings
  const CircularProgress = ({ percentage, strokeColor }) => {
    const radius = 40;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        {/* Inner text (requires counter-rotation to display upright) */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="var(--text-heading)"
          fontFamily="var(--font-heading)"
          fontWeight="700"
          fontSize="16px"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
        >
          {percentage}%
        </text>
      </svg>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Statistiques</h1>
          <p className="page-subtitle">Analyses et performances d'exploitation</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats} disabled={loading} style={{ padding: '8px 16px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card metric-card metric-card-green animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="metric-info">
            <span className="metric-label">Sessions</span>
            <span className="metric-value">{stats.sessions}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--primary-green)', backgroundColor: 'rgba(2, 160, 91, 0.1)' }}>
            <Activity size={20} />
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.08s' }}>
          <div className="metric-info">
            <span className="metric-label">Energie</span>
            <span className="metric-value">{new Intl.NumberFormat('fr-FR').format(stats.totalEnergieWh)} Wh</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--primary-blue)', backgroundColor: 'rgba(0, 173, 239, 0.1)' }}>
            <Plug size={20} />
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="metric-info">
            <span className="metric-label">FCFA Encaissés</span>
            <span className="metric-value">{formatPrice(stats.collected).replace(' FCFA', '')}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--primary-green)', backgroundColor: 'rgba(2, 160, 91, 0.1)' }}>
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="metric-info">
            <span className="metric-label">Annulées</span>
            <span className="metric-value" style={{ color: 'var(--color-danger)' }}>{stats.cancelled}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }}>
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="card metric-card metric-card-green animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="metric-info">
            <span className="metric-label">Payées</span>
            <span className="metric-value">{stats.paid}</span>
          </div>
          <div className="metric-icon-container" style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Evolution Sessions Line Chart */}
      <div className="card chart-card animate-fade-in" style={{ animationDelay: '0.25s', marginBottom: '32px' }}>
        <div className="chart-header">
          <span className="chart-title">Evolution des sessions</span>
          <div className="chart-filters">
            <select 
              className="chart-select" 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="jour">Aujourd'hui</option>
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois-ci</option>
            </select>
          </div>
        </div>
        <div className="chart-container" style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--border-radius-sm)'
                }} 
              />
              <Line type="monotone" dataKey="value" stroke="var(--primary-blue)" strokeWidth={3} name="Sessions" dot={{ r: 4, stroke: 'var(--primary-blue)', strokeWidth: 2, fill: 'var(--bg-card)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Double Column Sub Charts (Pie Indicators & Bar Durations) */}
      <div className="charts-grid">
        {/* Ring pie indicators */}
        <div className="card chart-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="chart-header">
            <span className="chart-title">Statut sessions</span>
          </div>
          <div className="radial-charts-container">
            <div className="radial-chart-item">
              <CircularProgress 
                percentage={stats.sessions > 0 ? Math.round((stats.paid / stats.sessions) * 100) : 0} 
                strokeColor="var(--primary-green)" 
              />
              <span className="radial-chart-label">Sessions payées (%)</span>
            </div>
            
            <div className="radial-chart-item">
              <CircularProgress 
                percentage={stats.sessions > 0 ? Math.round((stats.paid / stats.sessions) * 100) : 0} 
                strokeColor="var(--primary-blue)" 
              />
              <span className="radial-chart-label">Taux de succès (%)</span>
            </div>
          </div>
        </div>

        {/* Charge Durations vertical bar charts */}
        <div className="card chart-card animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <div className="chart-header">
            <span className="chart-title">Durée moyenne de recharge</span>
          </div>
          <div className="chart-container" style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDurationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} unit="h" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--border-radius-sm)'
                  }} 
                />
                {/* Visual vertical bars matching mock colors */}
                <Bar dataKey="duration" fill="var(--primary-green)" radius={[4, 4, 0, 0]} name="Heures" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
