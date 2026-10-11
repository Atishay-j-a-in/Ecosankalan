import { useAuth } from '../../context/AuthContext';
import { useLanguage, SUPPORTED_LANGS } from '../../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/navbar.css';

export default function Navbar() {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => navigate(user ? '/dashboard' : '/leaderboard')}>
        <img src="/logo.png" alt="EcoSankalan Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <span className="navbar-brand">EcoSankalan</span>
      </div>

      {/* Right side */}
      <div className="navbar-right">
        <button
          className="navbar-icon-btn"
          aria-label={t('nav.leaderboard')}
          title={t('nav.leaderboard')}
          onClick={() => navigate('/leaderboard')}
        >
          <span className="material-symbols-outlined">leaderboard</span>
        </button>
        <select
          aria-label="Language"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            border: '1px solid var(--outline-variant)',
            borderRadius: '99px',
            padding: '0.3rem 0.5rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: 'var(--surface)',
            color: 'var(--on-surface)',
            cursor: 'pointer',
          }}
        >
          {SUPPORTED_LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
