import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Identifiants incorrects ou serveur injoignable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <img
              src="/logo.png"
              alt="EhuMotors"
              style={{ height: '65px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div className="login-header-subtitle">
            Plateforme de gestion des stations
          </div>
        </div>

        <div className="login-body">
          <div className="login-title-section">
            <h2 className="login-title">Connexion</h2>
            <div className="login-subtitle">Accédez à votre tableau de bord</div>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="identifier">Station / identifiant</label>
              <div className="input-icon-wrapper">
                <MapPin size={18} />
                <input
                  id="identifier"
                  type="text"
                  className="form-control"
                  placeholder="ex: Godomey"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <div className="input-icon-wrapper">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: 'var(--border-radius-sm)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>
          
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            IDs démo : <strong style={{ color: 'var(--text-main)' }}>vodje@ehumotors.com</strong> (Vodjè) ou <strong style={{ color: 'var(--text-main)' }}>godomey@ehumotors.com</strong> (Godomey) | mot de passe : <strong style={{ color: 'var(--text-main)' }}>password123</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
