import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ShieldAlert, Check, X, UserX, Trash2, Loader2 } from 'lucide-react';

const Agents = () => {
  const { apiFetch } = useAuth();
  const [agents, setAgents] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add agent modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    nom: '',
    email: '',
    station: '',
    password: '',
    role: 'agent',
    actif: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // L'API pagine (PAGE_SIZE=20) : on parcourt toutes les pages pour ne pas
  // couper la liste des agents/stations au-delà de la première page.
  const fetchAllPages = async (path) => {
    let all = [];
    let page = 1;
    while (true) {
      const res = await apiFetch(`${path}${path.includes('?') ? '&' : '?'}page=${page}`);
      if (!res.ok) throw new Error('Impossible de charger les données.');
      const data = await res.json();
      all = all.concat(data.results || data || []);
      if (!data.next) break;
      page += 1;
    }
    return all;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsList, stationsList] = await Promise.all([
        fetchAllPages('/api/utilisateurs/'),
        fetchAllPages('/api/stations/'),
      ]);

      // Only display users with the 'agent' role
      setAgents(agentsList.filter(u => u.role === 'agent'));
      setStations(stationsList);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des agents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAgent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (!newAgent.nom || !newAgent.email || !newAgent.password || !newAgent.station) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiFetch('/api/utilisateurs/', {
        method: 'POST',
        body: JSON.stringify({
          nom: newAgent.nom,
          email: newAgent.email,
          station: parseInt(newAgent.station),
          password: newAgent.password,
          role: 'agent',
          actif: 1
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        // DRF returns field-level errors as objects: {field: ["message"]}
        let message = errData.detail || errData.error;
        if (!message) {
          // Flatten DRF validation errors into readable string
          message = Object.entries(errData)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
        }
        throw new Error(message || "Échec de l'ajout de l'agent.");
      }

      setShowAddModal(false);
      setNewAgent({ nom: '', email: '', station: '', password: '', role: 'agent', actif: 1 });
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAgentStatus = async (agent) => {
    try {
      const nextStatus = agent.actif ? 0 : 1;
      const response = await apiFetch(`/api/utilisateurs/${agent.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ actif: nextStatus })
      });

      if (response.ok) {
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, actif: nextStatus } : a));
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const deleteAgent = async (agent) => {
    if (!window.confirm(`Supprimer définitivement l'agent "${agent.nom}" ?`)) return;

    setError(null);
    try {
      const response = await apiFetch(`/api/utilisateurs/${agent.id}/`, { method: 'DELETE' });
      if (response.status === 204) {
        setAgents(prev => prev.filter(a => a.id !== agent.id));
        return;
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Échec de la suppression de l'agent.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Gestion des agents</h1>
          <p className="page-subtitle">Gérez les comptes des agents et leurs affectations aux stations de recharge</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} />
          <span>Ajouter un agent</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="card table-card animate-fade-in" style={{ overflowX: 'auto' }}>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Station Assignée</th>
                <th>Statut</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Aucun agent configuré.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => {
                  const stationName = stations.find(s => s.id === agent.station)?.nom || 'Non spécifiée';
                  return (
                    <tr key={agent.id}>
                      <td>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>{agent.nom}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{agent.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{stationName}</span>
                      </td>
                      <td>
                        {agent.actif ? (
                          <span className="badge badge-success">Actif</span>
                        ) : (
                          <span className="badge badge-danger">Inactif</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className={`btn ${agent.actif ? 'btn-secondary' : 'btn-primary'}`} 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => toggleAgentStatus(agent)}
                            title={agent.actif ? "Désactiver" : "Activer"}
                          >
                            {agent.actif ? <UserX size={14} /> : <Check size={14} />}
                            <span>{agent.actif ? 'Bloquer' : 'Activer'}</span>
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                            onClick={() => deleteAgent(agent)}
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setShowAddModal(false)}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
              Ajouter un nouvel agent
            </h3>

            {formError && (
              <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Nom Complet</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Koffi Mensah"
                  value={newAgent.nom}
                  onChange={(e) => setNewAgent({ ...newAgent, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Adresse Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Ex: koffi@ehumotors.com"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Affectation Station</label>
                <select 
                  className="form-control"
                  value={newAgent.station}
                  onChange={(e) => setNewAgent({ ...newAgent, station: e.target.value })}
                  required
                >
                  <option value="">-- Choisir une station --</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Mot de passe</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>Ajouter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
