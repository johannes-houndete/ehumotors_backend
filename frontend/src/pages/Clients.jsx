import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Edit2, Trash2, ShieldAlert, X, Loader2 } from 'lucide-react';

const fieldLabel = { display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 };

const emptyForm = { nom: '', telephone: '', email: '', num_chassis: '', modele: '' };

const Clients = () => {
  const { apiFetch } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [editing, setEditing] = useState(null); // client en cours d'édition
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      // L'API pagine (PAGE_SIZE=20) : on parcourt toutes les pages pour
      // afficher la liste complète, pas seulement les 20 premiers clients.
      let all = [];
      let page = 1;
      while (true) {
        const res = await apiFetch(`/api/clients/?page=${page}`);
        if (!res.ok) throw new Error('Impossible de charger les clients.');
        const data = await res.json();
        const results = data.results || data || [];
        all = all.concat(results);
        if (!data.next) break;
        page += 1;
      }
      setClients(all);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.nom || !form.num_chassis) {
      setFormError('Nom du client et numéro de châssis requis.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/clients/creer/', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'ajout du client.");
      }
      setShowAddModal(false);
      setForm(emptyForm);
      fetchClients();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (client) => {
    const moto = (client.motos || [])[0] || null;
    setEditing({ client, moto });
    setEditForm({
      nom: client.nom || '',
      telephone: client.telephone || '',
      email: client.email || '',
      num_chassis: moto?.num_chassis || '',
      modele: moto?.modele || '',
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditSaving(true);
    try {
      const clientRes = await apiFetch(`/api/clients/${editing.client.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          nom: editForm.nom,
          telephone: editForm.telephone,
          email: editForm.email,
        }),
      });
      if (!clientRes.ok) {
        const errData = await clientRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Échec de la mise à jour du client.');
      }

      if (editing.moto) {
        const motoRes = await apiFetch(`/api/motos/${editing.moto.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            num_chassis: editForm.num_chassis,
            modele: editForm.modele,
          }),
        });
        if (!motoRes.ok) {
          const errData = await motoRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Échec de la mise à jour de la moto.');
        }
      }

      setEditing(null);
      fetchClients();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteClient = async (client) => {
    if (!window.confirm(`Supprimer définitivement le client "${client.nom}" et sa/ses moto(s) ?`)) return;

    setError(null);
    try {
      const res = await apiFetch(`/api/clients/${client.id}/`, { method: 'DELETE' });
      if (res.status === 204) {
        setClients(prev => prev.filter(c => c.id !== client.id));
        return;
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Échec de la suppression du client.');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Gérez les clients et leurs motos enregistrées</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} />
          <span>Ajouter un client</span>
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
                <th>Client</th>
                <th>Contact</th>
                <th>Moto(s)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Aucun client enregistré.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>{client.nom}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{client.telephone || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{client.email || ''}</div>
                    </td>
                    <td>
                      {(client.motos || []).length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {client.motos.map((m) => (
                            <span key={m.id} className="badge badge-info">
                              {m.num_chassis}{m.modele ? ` · ${m.modele}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => openEdit(client)}
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                          <span>Modifier</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                          onClick={() => deleteClient(client)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ajout */}
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
              Ajouter un nouveau client
            </h3>

            {formError && (
              <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={fieldLabel}>Nom Complet</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Ayélé Koffi"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={fieldLabel}>Téléphone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: 90000000"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>

              <div>
                <label style={fieldLabel}>Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Optionnel"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label style={fieldLabel}>Numéro de châssis</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: WTKB16404S1000370"
                  value={form.num_chassis}
                  onChange={(e) => setForm({ ...form, num_chassis: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={fieldLabel}>Modèle de la moto</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Ehu Bike"
                  value={form.modele}
                  onChange={(e) => setForm({ ...form, modele: e.target.value })}
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

      {/* Modal édition */}
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
              Modifier — {editing.client.nom}
            </h3>

            {editError && (
              <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={fieldLabel}>Nom Complet</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.nom}
                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={fieldLabel}>Téléphone</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.telephone}
                  onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                />
              </div>

              <div>
                <label style={fieldLabel}>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              {editing.moto ? (
                <>
                  <div>
                    <label style={fieldLabel}>Numéro de châssis</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.num_chassis}
                      onChange={(e) => setEditForm({ ...editForm, num_chassis: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={fieldLabel}>Modèle de la moto</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.modele}
                      onChange={(e) => setEditForm({ ...editForm, modele: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Aucune moto rattachée à ce client.
                </div>
              )}

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

export default Clients;
