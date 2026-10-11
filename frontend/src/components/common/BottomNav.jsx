import { useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import '../../styles/bottomnav.css';

/* Gaussian falloff — icons swell near the cursor, settle at the edges */
const magnification = (distance) => 1 + 0.42 * Math.exp(-((distance / 90) ** 2));

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

  // Dock magnification state — cursor position tracked on the inner bar.
  const innerRef = useRef(null);
  const [focus, setFocus] = useState(null);

  const onMove = useCallback((e) => {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFocus({ x: e.clientX - rect.left, width: rect.width });
  }, []);

  const onLeave = useCallback(() => setFocus(null), []);

  const scaleFor = (index) => {
    if (!focus) return 1;
    const center = ((index + 0.5) / NAV_ITEMS.length) * focus.width;
    return magnification(Math.abs(focus.x - center));
  };

  return (
    <>
      {/* Scan FAB — docked bottom-right, above the nav (Preserved per Critical AI Scan requirement) */}
      <button
        className="fab"
        onClick={() => navigate('/waste')}
        aria-label={t('nav.scan')}
        title={t('nav.scan')}
      >
        <span className="material-symbols-outlined">photo_camera</span>
      </button>

      {/* Dock navigation — redesigned to match reference MacOS dock style */}
      <nav className="dock bottom-nav" role="navigation" aria-label="Main navigation">
        <div
          className="dock-inner bottom-nav-inner"
          ref={innerRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {NAV_ITEMS.map((item, i) => {
            const active = pathname === item.route ||
              (item.route === '/dashboard' && pathname === '/');
            const scale = scaleFor(i);
            return (
              <button
                key={item.route}
                className={`dock-item bottom-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(item.route)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                style={focus ? { transform: `scale(${scale}) translateY(${(scale - 1) * -14}px)` } : undefined}
              >
                <span className={`dock-icon-wrap bottom-nav-icon-wrap${active ? ' active' : ''}`}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </span>
                <span className="dock-label bottom-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
