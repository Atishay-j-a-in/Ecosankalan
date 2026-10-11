import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useLanguage } from '../i18n/LanguageContext';
import '../styles/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="login-root">
      {/* Decorative background blobs */}
      <div className="blob blob-tl" />
      <div className="blob blob-br" />

      <main className="login-card">

        {/* ── LEFT: Brand panel ─────────────────────────────── */}
        <section className="brand-panel">
          <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="EcoSankalan Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <span className="brand-name">EcoSankalan</span>
          </div>

          <div className="brand-headline">
            <h2>{t('auth.heroA')}</h2>
            <p>
              {t('auth.heroSubA')}
            </p>
          </div>

          <div className="brand-stats">
            <div className="stat-box stat-box--dark">
              <span className="stat-number">1.2k</span>
              <span className="stat-label">{t('auth.co2Stat')}</span>
            </div>
            <div className="stat-box stat-box--chart">
              <div className="mini-chart">
                <div className="bar" style={{ height: '40%' }} />
                <div className="bar" style={{ height: '70%' }} />
                <div className="bar" style={{ height: '55%' }} />
                <div className="bar bar--full" style={{ height: '90%' }} />
              </div>
            </div>
          </div>

          <img
            className="brand-bg-img"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA084cuLZj6PfHBbe_UHPbjY3TeWns8yHFjbfGJ2d3odjXhOFv3Qx5zR2ZHKvdZoupS9f7XcKMXa7O34fxkajlwSFzGG9FqroLQQUPfamU-ee22RayqagqF65en2qIjgDoi51FGqm3enLT7brK9IeHKFNucK_zN3yAnYZb70ze5n5fzPmjS9Z4QpQ9E5J9ul0yvu_0VkiVylSQtCNrfD08GW-AFH4IQIrQbL0i0I40ljxx8EKVcbvLCRhg6Nokj3BZaCg2a0_eUgGvh"
            alt="Green leaves"
          />
        </section>

        {/* ── RIGHT: Auth form ──────────────────────────────── */}
        <section className="form-panel">

          {/* Mobile logo (hidden on desktop) */}
          <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="EcoSankalan Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span className="brand-name" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>EcoSankalan</span>
          </div>

          <div className="form-heading">
            <h3>{t('auth.welcomeBack')}</h3>
            <p>{t('auth.welcomeSub')}</p>
          </div>

          {/* LoginForm handles all form logic + API call */}
          <LoginForm />

          {/* Footer — "Create an account" is static (Month 1) */}
          <footer className="form-footer">
            <p>
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="create-account-link">
                {t('auth.createAccount')}
              </Link>
            </p>
          </footer>

        </section>
      </main>
    </div>
  );
}
