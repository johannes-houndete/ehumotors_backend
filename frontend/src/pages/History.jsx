import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const History = () => {
  const { apiFetch } = useAuth();
  
  // Data state
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [dateDebut, setDateDebut] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [chassisFilter, setChassisFilter] = useState('');

  // Local KPIs (aggregated from active view)
  const [kpis, setKpis] = useState({
    total: 87,
    paid: 82,
    collected: 120630,
    energyKWh: 256
  });

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query string
      let query = `/api/sessions/?page=${page}`;
      if (dateDebut) query += `&date_debut=${dateDebut}`;
      if (statusFilter) query += `&statut=${statusFilter}`;
      if (chassisFilter) query += `&chassis=${chassisFilter}`;

      const response = await apiFetch(query);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique.');
      }
      const data = await response.json();
      
      const results = data.results || data || [];
      setSessions(results);
      
      // Handle standard DRF pagination
      const count = data.count || results.length;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 20) || 1);

      // Dynamically calculate KPIs based on fetched list
      const total = count;
      const paidSessions = results.filter(s => s.statut === 'paye');
      const paidCount = paidSessions.length;
      const collected = paidSessions.reduce((sum, s) => sum + (s.cout_fcfa || 0), 0);
      const energyWh = results.reduce((sum, s) => sum + (s.energie_wh || 0), 0);

      // Re-adjust stats: if we are using mocks or have empty records, fallback to mockup figures
      if (results.length > 0) {
        setKpis({
          total: total,
          paid: paidCount,
          collected: collected,
          energyKWh: energyWh / 1000
        });
      } else {
        setKpis({
          total: 0,
          paid: 0,
          collected: 0,
          energyKWh: 0
        });
      }
    } catch (err) {
      console.error(err);
      setError('Erreur réseau lors du chargement de l\'historique.');
      
      setSessions([]);
      setKpis({
        total: 0,
        paid: 0,
        collected: 0,
        energyKWh: 0
      });
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset page on filter submit
    fetchHistory();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paye':
        return <span className="badge badge-success">Payé</span>;
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBatteryDelta = (start, target) => {
    return `${start}% - ${target}%`;
  };

  // Duration estimate matching mockup (~0.5 mins per % charge)
  const getDuration = (start, target) => {
    const min = Math.max(0, Math.round((target - start) * 0.5));
    return `${min} min`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Historique</h1>
        <p className="page-subtitle">Historique complet des recharges enregistrées</p>
      </div>

      {/* Filter Section */}
      <form onSubmit={handleFilterSubmit} className="card filter-card animate-fade-in">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Date de début</label>
          <div className="input-icon-wrapper">
            <Calendar size={16} />
            <input
              type="date"
              className="form-control"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Statut</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ paddingRight: '32px' }}
          >
            <option value="">Tous</option>
            <option value="paye">Payé</option>
            <option value="en_attente">En attente</option>
            <option value="echec">Échec</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Châssis</label>
          <div className="input-icon-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="form-control"
              placeholder="ex: EHU-XXX"
              value={chassisFilter}
              onChange={(e) => setChassisFilter(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
          <Filter size={16} />
          <span>Filtrer</span>
        </button>
      </form>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="metric-info">
            <span className="metric-label">Sessions</span>
            <span className="metric-value">{kpis.total}</span>
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="metric-info">
            <span className="metric-label">Payées</span>
            <span className="metric-value" style={{ color: 'var(--primary-green)' }}>{kpis.paid}</span>
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="metric-info">
            <span className="metric-label">FCFA Encaissés</span>
            <span className="metric-value">{formatPrice(kpis.collected).replace(' FCFA', '')}</span>
          </div>
        </div>

        <div className="card metric-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="metric-info">
            <span className="metric-label">Energie</span>
            <span className="metric-value" style={{ color: 'var(--primary-blue)' }}>{kpis.energyKWh ? kpis.energyKWh.toFixed(1) : 0} KWh</span>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card animate-fade-in" style={{ animationDelay: '0.2s', padding: '24px 0' }}>
        <div style={{ padding: '0 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Toutes les sessions</h2>
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
                  <th>Date & Heure</th>
                  <th>Châssis</th>
                  <th>Client</th>
                  <th>Batterie</th>
                  <th>Énergie</th>
                  <th>Durée</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td style={{ textTransform: 'capitalize' }}>{formatDate(session.date_heure)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                      {session.moto_chassis || `EHU-MOTO-${session.moto}`}
                    </td>
                    <td>{session.client_nom || `Client #${session.moto}`}</td>
                    <td>{getBatteryDelta(session.pct_depart, session.pct_cible)}</td>
                    <td>{session.energie_wh ? `${session.energie_wh} Wh` : '...'}</td>
                    <td>{getDuration(session.pct_depart, session.pct_cible)}</td>
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

        {/* Pagination section */}
        {totalPages > 1 && (
          <div style={{ padding: '0 24px' }}>
            <div className="pagination-container">
              <span>{totalCount} résultats</span>
              <div className="pagination-controls">
                <button 
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button 
                    key={p}
                    className={`pagination-btn ${page === p ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button 
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
