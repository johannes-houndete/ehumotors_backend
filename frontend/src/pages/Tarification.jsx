import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

const Tarification = () => {
  const { apiFetch, user } = useAuth();
  const [tarifsHistory, setTarifsHistory] = useState([]);
  const [currentTarif, setCurrentTarif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit form state
  const [tiers, setTiers] = useState([
    { min: 5, max: 10, rate: 20 },
    { min: 10, max: 20, rate: 15 },
    { min: 20, max: 90, rate: 12 },
    { min: 90, max: 100, rate: 15 }
  ]);
  const [penaltyThreshold, setPenaltyThreshold] = useState(5);
  const [penaltyValue, setPenaltyValue] = useState(250);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  // Simulator state
  const [simStart, setSimStart] = useState(22);
  const [simTarget, setSimTarget] = useState(90);
  const [simulationResult, setSimulationResult] = useState({
    breakdown: [],
    penaltyApplied: false,
    total: 0
  });

  const parseTarifConfig = (tarif) => {
    if (!tarif || !tarif.regle) return null;
    try {
      const config = JSON.parse(tarif.regle);
      if (config && config.tiers) return config;
    } catch (e) {
      // Fallback if not JSON
    }
    // Default config values
    return {
      tiers: [
        { min: 5, max: 10, rate: 20 },
        { min: 10, max: 20, rate: 15 },
        { min: 20, max: 90, rate: 12 },
        { min: 90, max: 100, rate: 15 }
      ],
      penalty_threshold: 5,
      penalty_value: 250
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/tarifs/');
      if (!response.ok) {
        throw new Error('Impossible de charger les tarifs.');
      }
      const data = await response.json();
      const list = data.results || data || [];
      setTarifsHistory(list);

      if (list.length > 0) {
        const active = list[0];
        setCurrentTarif(active);
        const parsed = parseTarifConfig(active);
        if (parsed) {
          setTiers(parsed.tiers);
          setPenaltyThreshold(parsed.penalty_threshold || 5);
          setPenaltyValue(parsed.penalty_value || 250);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erreur de chargement des configurations tarifaires.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute simulation values dynamically
  useEffect(() => {
    const start = Math.max(0, Math.min(100, parseFloat(simStart) || 0));
    const target = Math.max(0, Math.min(100, parseFloat(simTarget) || 0));

    if (target <= start) {
      setSimulationResult({ breakdown: [], penaltyApplied: false, total: 0 });
      return;
    }

    let total = 0;
    const breakdown = [];
    let penaltyApplied = false;

    if (start < penaltyThreshold) {
      penaltyApplied = true;
      total += penaltyValue;
    }

    tiers.forEach((tier, index) => {
      if (tier.max <= start) return;

      const fromVal = start > tier.min ? start : tier.min;
      const toVal = target < tier.max ? target : tier.max;
      const delta = Math.max(0, toVal - fromVal);

      if (delta > 0) {
        const cost = delta * tier.rate;
        total += cost;
        breakdown.push({
          label: `Palier ${index + 1} (${tier.min} → ${tier.max}%)`,
          delta: delta.toFixed(1),
          rate: tier.rate,
          cost: cost
        });
      }
    });

    setSimulationResult({
      breakdown,
      penaltyApplied,
      total: Math.round(total)
    });
  }, [simStart, simTarget, tiers, penaltyThreshold, penaltyValue]);

  const handleSaveTiers = async (e) => {
    e.preventDefault();
    setSaving(true);

    const newConfig = {
      tiers,
      penalty_threshold: penaltyThreshold,
      penalty_value: penaltyValue,
      justification: justification || 'Mise à jour des tarifs'
    };

    try {
      const response = await apiFetch('/api/tarifs/', {
        method: 'POST',
        body: JSON.stringify({
          regle: JSON.stringify(newConfig),
          prix_par_wh: 0.0 // not used but satisfying schema defaults
        })
      });

      if (!response.ok) {
        throw new Error('Échec de la sauvegarde.');
      }

      setJustification('');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScenario = (start, target) => {
    setSimStart(start);
    setSimTarget(target);
  };

  const handleTierChange = (index, field, value) => {
    setTiers(prev => prev.map((t, idx) => {
      if (idx === index) {
        return { ...t, [field]: parseFloat(value) || 0 };
      }
      return t;
    }));
  };

  // Helper to format visual bar widths
  const renderVisualSegments = () => {
    return (
      <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginTop: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ width: '5%', backgroundColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
          Pén.
        </div>
        {tiers.map((t, idx) => {
          const width = t.max - t.min;
          const colors = [
            'rgba(2, 160, 91, 0.4)',
            'rgba(2, 160, 91, 0.6)',
            'rgba(2, 160, 91, 0.8)',
            'rgba(2, 160, 91, 0.9)'
          ];
          return (
            <div key={idx} style={{ width: `${width}%`, backgroundColor: colors[idx % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 'bold' }} title={`${t.min}% → ${t.max}% : ${t.rate} FCFA`}>
              {t.rate} F
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Configuration tarifaire</h1>
          <p className="page-subtitle">Définissez les paliers de facturation et simulez l'impact sur les recharges</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)', padding: '16px', marginBottom: '24px' }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Current Active Config & Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Config Cards */}
          <div className="card" style={{ border: '2px solid var(--primary-green)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-green)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tarif actuel en vigueur
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {tiers.map((t, idx) => (
                <div key={idx} className="card" style={{ padding: '12px', textAlign: 'center', backgroundColor: 'var(--bg-input)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.min}% → {t.max}%</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-heading)', marginTop: '4px' }}>{t.rate}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FCFA / %</div>
                </div>
              ))}
              <div className="card" style={{ padding: '12px', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Pénalité &lt; {penaltyThreshold}%</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-danger)', marginTop: '4px' }}>{penaltyValue}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>FCFA fixe</div>
              </div>
            </div>

            {renderVisualSegments()}

            {currentTarif && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'right' }}>
                Modifié par <strong>{currentTarif.admin_nom || 'Super Admin'}</strong> le {new Date(currentTarif.date_modif).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Editor Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', marginBottom: '16px' }}>Modifier les paliers</h3>
            
            <form onSubmit={handleSaveTiers} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Paliers tarifaires (en FCFA / %)
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tiers.map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', width: '40px' }}>Palier {idx + 1}</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={t.min} 
                        onChange={(e) => handleTierChange(idx, 'min', e.target.value)}
                        placeholder="De" 
                        style={{ maxWidth: '70px' }}
                      />
                      <span>% à</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={t.max} 
                        onChange={(e) => handleTierChange(idx, 'max', e.target.value)}
                        placeholder="À" 
                        style={{ maxWidth: '70px' }}
                      />
                      <span>% :</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={t.rate} 
                        onChange={(e) => handleTierChange(idx, 'rate', e.target.value)}
                        placeholder="Taux" 
                        style={{ flexGrow: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>Pénalité Batterie &lt; (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={penaltyThreshold} 
                    onChange={(e) => setPenaltyThreshold(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>Montant Pénalité (FCFA)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={penaltyValue} 
                    onChange={(e) => setPenaltyValue(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>Justification de la modification</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Ex: Ajustement trimestriel des tarifs..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving || !justification}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>Sauvegarder</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', marginBottom: '16px' }}>Simulateur de recharge</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>BATTERIE ACTUELLE</label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={simStart} 
                    onChange={(e) => setSimStart(e.target.value)}
                    style={{ paddingRight: '32px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>BATTERIE CIBLE</label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={simTarget} 
                    onChange={(e) => setSimTarget(e.target.value)}
                    style={{ paddingRight: '32px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
                </div>
              </div>
            </div>

            {/* Simulated segment calculations */}
            <div style={{ minHeight: '120px', borderLeft: '3px solid var(--primary-green)', paddingLeft: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Décomposition par palier
              </div>
              
              {simulationResult.penaltyApplied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-danger)' }}>
                  <span>• Pénalité niveau bas (&lt; {penaltyThreshold}%)</span>
                  <span>+{penaltyValue} FCFA</span>
                </div>
              )}

              {simulationResult.breakdown.map((b, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <span>• {b.label} — {b.delta}% x {b.rate} F</span>
                  <span>+{Math.round(b.cost)} FCFA</span>
                </div>
              ))}

              {simulationResult.breakdown.length === 0 && !simulationResult.penaltyApplied && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Veuillez spécifier des pourcentages valides pour la simulation.
                </div>
              )}
            </div>

            {/* Total Display */}
            <div style={{
              backgroundColor: 'var(--primary-green)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '16px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ fontWeight: 600 }}>Total à facturer</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{simulationResult.total} FCFA</span>
            </div>

            {/* Presets */}
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>SCÉNARIOS RAPIDES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleScenario(3, 80)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}
                >
                  <span>⚡ 3% → 80% (avec pénalité)</span>
                  <span>Calculer</span>
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleScenario(22, 90)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}
                >
                  <span>⚡ 22% → 90% (standard)</span>
                  <span>Calculer</span>
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleScenario(50, 100)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}
                >
                  <span>⚡ 50% → 100% (demi-charge)</span>
                  <span>Calculer</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modifications History log */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-heading)', marginBottom: '16px' }}>Historique des modifications</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Justification</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              {tarifsHistory.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun historique disponible.</td>
                </tr>
              ) : (
                tarifsHistory.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date_modif).toLocaleString('fr-FR')}</td>
                    <td style={{ fontStyle: 'italic' }}>
                      {parseTarifConfig(t)?.justification || 'Mise à jour standard'}
                    </td>
                    <td>{t.admin_nom || 'Super Admin'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Tarification;
