import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { useLanguage } from '../i18n/LanguageContext';

export default function ComingSoonPage({ title, message }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '90px' }}>
      <Navbar />
      <main style={{ padding: '2rem 1rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: 'var(--primary)' }}>
          construction
        </span>
        <h1 style={{ fontSize: '1.3rem', margin: '0.75rem 0 0.5rem' }}>{title || t('soon.title')}</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
          {message || t('soon.default')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('nav.leaderboard')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--outline-variant)', background: 'var(--surface)', color: 'var(--on-surface)', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('soon.dashboard')}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
