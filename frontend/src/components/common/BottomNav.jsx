import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import '../../styles/bottomnav.css';

export default function BottomNav() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { adminMode } = useAuth();

  // Admin mode ON (admin users only): the Profile tab becomes the Admin tab.
  const NAV_ITEMS = [
    { label: t('nav.home'),    icon: 'home',         route: '/dashboard' },
    { label: t('nav.map'),     icon: 'map',          route: '/community' },
    { label: t('nav.board'),   icon: 'leaderboard',  route: '/leaderboard' },
    { label: t('nav.shop'),    icon: 'shopping_bag', route: '/shop'      },
    adminMode
      ? { label: t('nav.admin'),   icon: 'admin_panel_settings', route: '/admin'   }
      : { label: t('nav.profile'), icon: 'person',               route: '/profile' },
  ];

  return (
    <>
      {/* Scan FAB — docked bottom-right, above the nav */}
      <button
        className="fab"
        onClick={() => navigate('/waste')}
        aria-label={t('nav.scan')}
        title={t('nav.scan')}
      >
        <span className="material-symbols-outlined">photo_camera</span>
      </button>

      {/* Bottom nav bar — always visible, full width */}
      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map(({ label, icon, route }) => {
            const active = pathname === route;
            return (
              <button
                key={route}
                className={`bottom-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(route)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`bottom-nav-icon-wrap${active ? ' active' : ''}`}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {icon}
                  </span>
                </div>
                <span className="bottom-nav-label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
