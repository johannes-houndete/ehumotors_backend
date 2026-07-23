import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, CheckCircle2, Edit2, X, Loader2, Eye, EyeOff } from 'lucide-react';

const fieldLabel = { display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 };

// Champ mot de passe avec bouton pour basculer texte visible / masqué
const PasswordField = ({ value, onChange, placeholder, required }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        className="form-control"
        style={{ paddingRight: '40px' }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        title={visible ? 'Masquer' : 'Afficher'}
        style={{
          position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)',
          border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center',
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const Settings = () => {
  const { apiFetch, user, isAdmin } = useAuth();

  // ── Mon compte ──────────────────────────────────────────────────────────
  const [account, setAccount] = useState({ email: user?.email || '', nouveau_mot_de_passe: '', mot_de_passe_actuel: '' });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const [accountSuccess, setAccountSuccess] = useState(null);

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!account.mot_de_passe_actuel) {
      setAccountError('Mot de passe actuel requis pour confirmer les changements.');
      return;
    }
    if (!account.email && !account.nouveau_mot_de_passe) {
      setAccountError('Renseignez un nouvel email et/ou un nouveau mot de passe.');
      return;
    }

    setAccountSaving(true);
    try {
      const res = await apiFetch('/api/utilisateurs/mon-compte/', {
        method: 'PATCH',
        body: JSON.stringify({
          mot_de_passe_actuel: account.mot_de_passe_actuel,
          email: account.email,
          nouveau_mot_de_passe: account.nouveau_mot_de_passe || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la mise à jour.');
      }
      setAccountSuccess('Identifiants mis à jour avec succès.');
      setAccount({ email: data.user?.email || account.email, nouveau_mot_de_passe: '', mot_de_passe_actuel: '' });
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountSaving(false);
    }
  };

  // ── Comptes stations (admin uniquement) ───────────────────────────────────
  const [agents, setAgents] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(isAdmin);
  const [listError, setListError] = useState(null);

  const [editing, setEditing] = useState(null); // agent en cours d'édition
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const fetchAgents = async () => {
    setLoading(true);
    setListError(null);
    try {
      const [agentsRes, stationsRes] = await Promise.all([
        apiFetch('/api/utilisateurs/'),
        apiFetch('/api/stations/'),
      ]);
      if (!agentsRes.ok || !stationsRes.ok) throw new Error('Impossible de charger les comptes.');
      const agentsData = await agentsRes.json();
      const stationsData = await stationsRes.json();
      setAgents((agentsData.results || agentsData || []).filter(u => u.role === 'agent'));
      setStations(stationsData.results || stationsData || []);
    } catch (err) {
      console.error(err);
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAgents();
  }, [isAdmin]);

  const openEdit = (agent) => {
    setEditing(agent);
    setEditForm({ email: agent.email, password: '' });
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditSaving(true);
    try {
      const payload = { email: editForm.email };
      if (editForm.password) payload.password = editForm.password;

      const res = await apiFetch(`/api/utilisateurs/${editing.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        const message = errData.detail || errData.error ||
          Object.entries(errData).map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`).join(' | ');
        throw new Error(message || 'Échec de la mise à jour.');
      }
      setEditing(null);
      fetchAgents();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gérez vos identifiants et ceux des comptes stations</p>
      </div>

      {/* Mon compte */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', maxWidth: '480px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={18} />
          <span>Mon compte</span>
        </h3>

        {accountError && (
          <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ShieldAlert size={16} />
            <span>{accountError}</span>
          </div>
        )}
        {accountSuccess && (
          <div style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle2 size={16} />
            <span>{accountSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={fieldLabel}>Adresse Email</label>
            <input
              type="email"
              className="form-control"
              value={account.email}
              onChange={(e) => setAccount({ ...account, email: e.target.value })}
            />
          </div>

          <div>
            <label style={fieldLabel}>Nouveau mot de passe</label>
            <PasswordField
              placeholder="Laisser vide pour ne pas changer"
              value={account.nouveau_mot_de_passe}
              onChange={(e) => setAccount({ ...account, nouveau_mot_de_passe: e.target.value })}
            />
          </div>

          <div>
            <label style={fieldLabel}>Mot de passe actuel (confirmation)</label>
            <PasswordField
              placeholder="••••••••"
              value={account.mot_de_passe_actuel}
              onChange={(e) => setAccount({ ...account, mot_de_passe_actuel: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={accountSaving}>
              {accountSaving ? <Loader2 className="animate-spin" size={16} /> : null}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comptes stations */}
      {isAdmin && (
        <div className="card table-card animate-fade-in" style={{ overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', padding: '20px 20px 0', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
            Comptes stations
          </h3>

          {listError && (
            <div style={{ margin: '16px 20px', color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
              {listError}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px' }}>
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : (
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Station</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      Aucun compte station configuré.
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
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => openEdit(agent)}
                            title="Modifier les identifiants"
                          >
                            <Edit2 size={14} />
                            <span>Identifiants</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal édition identifiants station */}
      {editing && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px', position: 'relative' }}>
            <button
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
              Identifiants — {editing.nom}
            </h3>

            {editError && (
              <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={fieldLabel}>Adresse Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={fieldLabel}>Nouveau mot de passe</label>
                <PasswordField
                  placeholder="Laisser vide pour ne pas changer"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
