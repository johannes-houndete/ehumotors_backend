import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, CheckCircle, ShieldAlert, Phone, CreditCard, Sparkles, Check, Loader2 } from 'lucide-react';

// Pricing tiers replication in frontend for live preview
const TIERS = [
  { min: 5, max: 10, rate: 20 },
  { min: 10, max: 20, rate: 15 },
  { min: 20, max: 90, rate: 12 },
  { min: 90, max: 100, rate: 15 },
];

function computeLivePrice(start, target) {
  start = Math.max(0, Math.min(100, start));
  target = Math.max(0, Math.min(100, target));

  if (target <= start) return 0;

  let total = 0;
  // Penalty for start < 5%
  if (start < 5) {
    total += 250;
  }

  // Calculate tiers
  for (const tier of TIERS) {
    if (tier.max <= start) continue;

    const fromVal = start > tier.min ? start : tier.min;
    const toVal = target < tier.max ? target : tier.max;

    const delta = Math.max(0, Math.min(100, toVal - fromVal));

    if (delta > 0) {
      total += delta * tier.rate;
    }
  }

  return total;
}

const NewSession = () => {
  const { apiFetch } = useAuth();
  
  // Client identification state
  const [chassis, setChassis] = useState('');
  const [client, setClient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Battery levels state
  const [pctDepart, setPctDepart] = useState(22);
  const [pctCible, setPctCible] = useState(100);

  // MoMo state
  const [momoNumber, setMomoNumber] = useState('');

  // Live billing calculations
  const [livePrice, setLivePrice] = useState(0);
  const [liveWh, setLiveWh] = useState(0);
  const [liveTime, setLiveTime] = useState(0);

  // Payment wizard flow states
  const [creating, setCreating] = useState(false);
  const [paymentStep, setPaymentStep] = useState('idle'); // idle | creating_session | initiating_payment | payment_success | payment_failed
  const [paymentMsg, setPaymentMsg] = useState('');
  const [txnId, setTxnId] = useState('');

  // Config du widget KKiaPay (clé publique + mode sandbox), fournie par le backend
  const [kkiapayConfig, setKkiapayConfig] = useState(null);
  // Contexte de la session en attente de paiement, lu par les listeners KKiaPay
  // (des refs pour éviter les closures obsolètes dans addSuccessListener/addFailedListener)
  const pendingPaymentRef = useRef({ sessionId: null, numeroMomo: '' });

  useEffect(() => {
    apiFetch('/api/paiements/config/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setKkiapayConfig(data))
      .catch(() => setKkiapayConfig(null));
  }, [apiFetch]);

  useEffect(() => {
    const handleSuccess = async (response) => {
      const { sessionId, numeroMomo } = pendingPaymentRef.current;
      if (!sessionId) return;

      try {
        const res = await apiFetch(`/api/sessions/${sessionId}/verifier-paiement/`, {
          method: 'POST',
          body: JSON.stringify({
            transaction_id: response.transactionId,
            numero_momo: numeroMomo,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Paiement refusé par KKiaPay.');
        }

        setTxnId(data.transaction_id || '');
        setPaymentMsg(data.message || '');
        setPaymentStep('payment_success');
      } catch (err) {
        setPaymentMsg(err.message);
        setPaymentStep('payment_failed');
      }
    };

    const handleFailed = async (response) => {
      const { sessionId } = pendingPaymentRef.current;
      setPaymentMsg('Paiement annulé ou refusé dans la fenêtre KKiaPay.');
      setPaymentStep('payment_failed');

      if (!sessionId) return;
      try {
        await apiFetch(`/api/sessions/${sessionId}/echec-paiement/`, {
          method: 'POST',
          body: JSON.stringify({
            transaction_id: response?.transactionId || '',
            raison: 'Paiement refusé dans la fenêtre KKiaPay.',
          }),
        });
      } catch (err) {
        console.error(err);
      }
    };

    if (typeof window.addSuccessListener === 'function') {
      window.addSuccessListener(handleSuccess);
      window.addFailedListener(handleFailed);
    }

    return () => {
      if (typeof window.removeKkiapayListener === 'function') {
        window.removeKkiapayListener('success');
        window.removeKkiapayListener('failed');
      }
    };
  }, [apiFetch]);

  useEffect(() => {
    // Recompute values when percentages change
    const price = computeLivePrice(pctDepart, pctCible);
    setLivePrice(price);

    // Wh: capacity is 4416 Wh as described in context document
    const wh = Math.max(0, ((pctCible - pctDepart) / 100) * 4416);
    setLiveWh(Math.round(wh));

    // Time estimate: ~0.5 mins per %
    const duration = Math.max(0, Math.round((pctCible - pctDepart) * 0.5));
    setLiveTime(duration);
  }, [pctDepart, pctCible]);

  const searchClient = async (e) => {
    if (e) e.preventDefault();
    if (!chassis) return;

    setSearching(true);
    setSearchError(null);
    setClient(null);

    try {
      const response = await apiFetch(`/api/clients/search/?chassis=${chassis}`);
      if (!response.ok) {
        throw new Error('Aucune moto ou client trouvé avec ce numéro de châssis.');
      }
      const data = await response.json();
      setClient(data);
      // Pre-fill phone if available
      if (data.telephone) {
        setMomoNumber(data.telephone);
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateSession = async () => {
    if (!client) {
      alert('Veuillez identifier le client d\'abord.');
      return;
    }
    if (pctCible <= pctDepart) {
      alert('Le niveau cible doit être supérieur au niveau actuel.');
      return;
    }
    if (!momoNumber) {
      alert('Veuillez renseigner le numéro Mobile Money.');
      return;
    }

    setCreating(true);
    setPaymentStep('creating_session');
    
    try {
      // 1. Create the session on backend
      const sessionResponse = await apiFetch('/api/sessions/', {
        method: 'POST',
        body: JSON.stringify({
          moto: client.moto_id,
          pct_depart: pctDepart,
          pct_cible: pctCible,
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Échec de la création de la session.');
      }
      
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;
      const montant = sessionData.cout_fcfa ?? livePrice;

      // 2. Ouvrir le widget KKiaPay — le paiement est initié et complété par
      // l'utilisateur DANS le widget (numéro MoMo + OTP), pas par notre backend.
      // La confirmation arrive de manière asynchrone via addSuccessListener,
      // qui appelle le backend pour vérifier la transaction (voir useEffect).
      setPaymentStep('initiating_payment');

      if (!kkiapayConfig || !kkiapayConfig.public_key) {
        throw new Error('Configuration KKiaPay indisponible (clé publique manquante côté serveur).');
      }
      if (typeof window.openKkiapayWidget !== 'function') {
        throw new Error('Widget KKiaPay non chargé (script cdn.kkiapay.me bloqué ou hors-ligne).');
      }

      pendingPaymentRef.current = { sessionId, numeroMomo: momoNumber };

      window.openKkiapayWidget({
        amount: Math.round(montant),
        key: kkiapayConfig.public_key,
        sandbox: kkiapayConfig.sandbox,
        position: 'center',
        callback: '',
        data: { session_id: sessionId },
      });

    } catch (err) {
      console.error(err);
      setPaymentMsg(err.message);
      setPaymentStep('payment_failed');
    } finally {
      setCreating(false);
    }
  };

  const cancelPendingPayment = () => {
    // Le widget KKiaPay n'expose pas d'événement de fermeture/annulation
    // (seulement addSuccessListener/addFailedListener) : si l'utilisateur ferme
    // la popup sans finaliser le paiement, aucun listener ne se déclenche et la
    // modale reste bloquée sur "initiating_payment" sans ce bouton d'échappement.
    const { sessionId } = pendingPaymentRef.current;
    if (sessionId) {
      apiFetch(`/api/sessions/${sessionId}/echec-paiement/`, {
        method: 'POST',
        body: JSON.stringify({ raison: 'Paiement annulé (fenêtre fermée par l\'agent).' }),
      }).catch((err) => console.error(err));
    }
    pendingPaymentRef.current = { sessionId: null, numeroMomo: '' };
    setPaymentStep('idle');
    setPaymentMsg('');
  };

  const resetForm = () => {
    setChassis('');
    setClient(null);
    setPctDepart(22);
    setPctCible(100);
    setMomoNumber('');
    setPaymentStep('idle');
    setPaymentMsg('');
    setTxnId('');
  };

  const getClientInitials = (name) => {
    if (!name) return 'AY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Nouvelle session de recharge</h1>
        <p className="page-subtitle">Créez une nouvelle session en 3 étapes simples</p>
      </div>

      <div className="session-grid">
        {/* Left Columns - Wizard Steps */}
        <div className="wizard-steps">
          {/* Step 1: Identification */}
          <div className={`wizard-step ${client ? 'completed' : 'active'}`}>
            <div className="step-header">
              <div className="step-number">1</div>
              <h3 className="step-title">Identification du client</h3>
            </div>
            
            <form onSubmit={searchClient} className="client-search-wrapper">
              <input
                type="text"
                className="form-control"
                placeholder="Entrez le numéro de châssis (ex: WTKB16404S1000370)"
                value={chassis}
                onChange={(e) => setChassis(e.target.value)}
                disabled={searching}
                style={{ flexGrow: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={searching || !chassis}>
                {searching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                <span>Rechercher</span>
              </button>
            </form>

            {searchError && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                <ShieldAlert size={16} />
                <span>{searchError}</span>
              </div>
            )}

            {client && (
              <div className="client-verified-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="client-avatar">
                    {getClientInitials(client.nom)}
                  </div>
                  <div className="client-info">
                    <div className="client-name">{client.nom}</div>
                    <div className="client-details">
                      Moto : {client.modele || 'Ehu Bike'} ({client.num_chassis})
                    </div>
                  </div>
                </div>
                <div className="client-check-icon">
                  <CheckCircle size={24} />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Battery Settings */}
          <div className={`wizard-step ${client ? (momoNumber ? 'completed' : 'active') : ''}`}>
            <div className="step-header">
              <div className="step-number">2</div>
              <h3 className="step-title">Niveau de la batterie</h3>
            </div>

            <div className="battery-inputs-grid">
              <div className="form-group">
                <label className="form-label">% Batterie actuel</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="form-control"
                  value={pctDepart}
                  onChange={(e) => setPctDepart(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">% Batterie cible</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-control"
                  value={pctCible}
                  onChange={(e) => setPctCible(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
            
            {/* Live Slider inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Ajuster niveau actuel</span>
                  <span>{pctDepart}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="99"
                  value={pctDepart}
                  onChange={(e) => setPctDepart(parseInt(e.target.value))}
                  style={{ accentColor: 'var(--primary-green)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Ajuster niveau cible</span>
                  <span>{pctCible}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={pctCible}
                  onChange={(e) => setPctCible(parseInt(e.target.value))}
                  style={{ accentColor: 'var(--primary-blue)' }}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Payment details */}
          <div className={`wizard-step ${client && momoNumber ? 'active' : ''}`}>
            <div className="step-header">
              <div className="step-number">3</div>
              <h3 className="step-title">Numéro MoMo du client</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Téléphone Mobile Money</label>
              <div className="input-icon-wrapper">
                <Phone size={18} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: +229 97 00 00 00"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns - Session Summary */}
        <div className="summary-panel animate-fade-in">
          <div className="summary-billing-card">
            <div className="summary-header">
              Récapitulatif de session
            </div>
            
            <div className="summary-price-box">
              <span className="summary-price">{livePrice} FCFA</span>
              <span className="summary-price-label">Montant à facturer</span>
            </div>

            <div className="summary-details-list">
              <div className="summary-detail-row">
                <span className="summary-detail-label">Client</span>
                <span className="summary-detail-value">{client ? client.nom : '-'}</span>
              </div>

              <div className="summary-detail-row">
                <span className="summary-detail-label">Énergie estimée</span>
                <span className="summary-detail-value">
                  {client ? `${(liveWh / 1000).toFixed(2)} kWh` : '--'}
                </span>
              </div>

              <div className="summary-detail-row">
                <span className="summary-detail-label">Temps estimé</span>
                <span className="summary-detail-value">{client ? `${liveTime} min` : '...'}</span>
              </div>

              <div className="summary-detail-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                <span className="summary-detail-label">Tarif appliqué</span>
                <span className="summary-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-green)' }}>
                  <Sparkles size={14} /> Paliers Ehu
                </span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '16px', fontSize: '1.05rem' }}
            disabled={!client || pctCible <= pctDepart || !momoNumber || creating}
            onClick={handleCreateSession}
          >
            <CreditCard size={18} />
            <span>Initier le paiement MoMo</span>
          </button>
        </div>
      </div>

      {/* Payment Processing Sandbox Overlay Modal */}
      {paymentStep !== 'idle' && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <span className="modal-title">Traitement du paiement</span>
            </div>
            
            <div className="modal-body">
              {paymentStep === 'creating_session' && (
                <>
                  <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-green)' }} />
                  <p style={{ fontWeight: 600 }}>Création de la session en cours...</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Veuillez patienter.</p>
                </>
              )}

              {paymentStep === 'initiating_payment' && (
                <>
                  <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-blue)' }} />
                  <p style={{ fontWeight: 600 }}>Finalisez le paiement dans la fenêtre KKiaPay</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Transaction de {livePrice} FCFA — saisissez le numéro {momoNumber} et validez dans le widget KKiaPay.
                  </p>
                </>
              )}

              {paymentStep === 'initiating_payment' && (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '16px' }}
                  onClick={cancelPendingPayment}
                >
                  Annuler
                </button>
              )}

              {paymentStep === 'payment_success' && (
                <>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <Check size={36} strokeWidth={3} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-heading)' }}>Recharge validée !</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Le paiement de {livePrice} FCFA a été reçu via la Sandbox KKiaPay.
                  </p>
                  <div style={{
                    backgroundColor: 'var(--bg-input)',
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '0.75rem',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    marginTop: '12px'
                  }}>
                    <div>Transaction ID: {txnId}</div>
                    <div>Statut: SUCCESS (SANDBOX)</div>
                  </div>
                </>
              )}

              {paymentStep === 'payment_failed' && (
                <>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <ShieldAlert size={36} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-danger)' }}>Échec du paiement</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Une erreur s'est produite lors de l'initiation de la transaction.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 500 }}>
                    {paymentMsg}
                  </p>
                </>
              )}
            </div>

            {(paymentStep === 'payment_success' || paymentStep === 'payment_failed') && (
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={resetForm}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSession;
