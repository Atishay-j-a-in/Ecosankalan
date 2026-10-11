import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import TutorialOverlay from '../components/common/TutorialOverlay';
import { getActiveChallenges, getProfile } from '../services/api';
import { useStats } from '../context/StatsContext';
import { useLanguage } from '../i18n/LanguageContext';
import '../styles/dashboard.css';

// Derive Eco Score from stats (simple formula for now)
const computeEcoScore = (stats) => {
  if (!stats) return 0;
  const score = Math.min(100, Math.round(
    (stats.totalKg || 0) * 2 +
    (stats.totalCo2Saved || 0) * 1.5 +
    (stats.totalPointsEarned || 0) * 0.1
  ));
  return Math.max(10, score);
};

const FACT_KEYS = ['home.fact1', 'home.fact2', 'home.fact3', 'home.fact4', 'home.fact5'];

const CHALLENGE_BG = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80',
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
  'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&q=80',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [factIndex,   setFactIndex]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);

  // Real data state — stats via StatsContext, challenges via React Query
  const { statsData } = useStats();
  // Hero metrics are lifetime totals — the week range reads 0 for any
  // account whose activity is older than 7 days.
  const stats = statsData?.all ?? statsData?.week;
  const recentLogs = stats?.recentLogs || [];

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: async () => {
      const res = await getActiveChallenges();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [profile, setProfile] = useState(null);

  // Daily Check-in Badge — shows ONCE per session via sessionStorage
  const [showBadge, setShowBadge] = useState(() => {
    try {
      return !sessionStorage.getItem('badge_shown');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const loadAll = async () => {
      try {
        const profileRes = await getProfile();
        if (profileRes?.data) setProfile(profileRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Auto-dismiss badge after 35s
  useEffect(() => {
    if (!showBadge) return;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem('badge_shown', '1'); } catch { /* ignore */ }
      setShowBadge(false);
    }, 35000);
    return () => clearTimeout(timer);
  }, [showBadge]);

  const handleCloseBadge = () => {
    try { sessionStorage.setItem('badge_shown', '1'); } catch { /* ignore */ }
    setShowBadge(false);
  };

  // Auto-rotate facts every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex(i => (i + 1) % FACT_KEYS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextFact = () => setFactIndex(i => (i + 1) % FACT_KEYS.length);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveSlide(Math.round(el.scrollLeft / el.offsetWidth));
  };

  const scrollToSlide = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
    setActiveSlide(idx);
  };

  // Computed values from real data
  const ecoScore  = computeEcoScore(stats);
  const ecoPoints = profile?.ecoPoints ?? stats?.totalPointsEarned ?? 0;
  const wasteKg   = stats?.totalKg ?? 0;
  const co2Saved  = stats?.totalCo2Saved ?? 0;
  const userName  = profile?.name?.split(' ')[0] || t('home.defaultName');
  const level     = Math.floor(ecoScore / 20) + 1;
  const dateLocale = lang === 'hi' ? 'hi-IN' : 'en-IN';

  const quickActions = [
    { icon: 'photo_camera', title: t('home.actScan'),   sub: t('home.actScanSub'),   route: '/waste',       primary: true },
    { icon: 'add_location', title: t('home.actBin'),    sub: t('home.actBinSub'),    route: '/report-bin',  primary: false },
    { icon: 'leaderboard',  title: t('home.actBoard'),  sub: t('home.actBoardSub'),  route: '/leaderboard', primary: false },
    { icon: 'map',          title: t('nav.map'),        sub: t('map.myArea'),        route: '/community',   primary: false },
  ];

  // Use active challenges for the carousel
  const carouselItems = challenges.map((ch, i) => ({
    id: ch._id,
    tag: t('home.weeklyMission'),
    title: ch.title,
    desc: ch.description || t('ch.taskDesc', { n: ch.tasks?.length || 0 }),
    progress: ch.userProgress?.percentCompleted || 0,
    participants: '—',
    img: CHALLENGE_BG[i % CHALLENGE_BG.length],
    _raw: ch,
  }));

  // Build activity feed from recent logs (empty when none — no fake data)
  const activityFeed = recentLogs.map((log) => ({
    id: log._id,
    icon: 'recycling',
    iconColor: 'var(--primary)',
    title: `${log.category} ${t('history.waste')}`,
    meta: `${log.unit === 'g' ? (log.quantity / 1000).toFixed(2) : log.quantity.toFixed(1)} ${t('waste.kg')} • ${new Date(log.createdAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}`,
    points: `+${log.pointsEarned} ${t('history.pts')}`,
    pointsType: 'positive',
  }));

  return (
    <div className="dashboard-root">
      <TutorialOverlay />
      <Navbar />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <main className="dashboard-main">

          {/* ── Daily Check-in Badge */}
          {showBadge && (
            <div className="daily-badge-wrap" onClick={handleCloseBadge}>
              <div className="eco-badge" onClick={e => e.stopPropagation()}>
                <div className="eco-icon-wrap">
                  <div className="eco-icon-ring">
                    <span className="material-symbols-outlined eco-badge-logo" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>eco</span>
                  </div>
                </div>
                <div className="eco-content">
                  <h2>{t('home.checkinTitle')}</h2>
                  <h4>{t('home.greeting', { name: userName })}</h4>
                  <p>{t('home.checkinText')}</p>
                  <div className="eco-points">
                    <span className="points-dot">✤</span>
                    {t('home.checkinPoints')}
                  </div>
                </div>
                <button className="eco-badge-close" onClick={handleCloseBadge} aria-label={t('common.dismiss')}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Immersive hero: greeting + eco score + lifetime stats */}
          <section className="hero-immersive">
            <div className="hero-immersive-bg" />
            <div className="hero-glass-sun" />
            <div className="hero-immersive-content">
              <div className="hero-immersive-top">
                <div className="hi-text-content">
                  <span className="hi-greeting">{t('home.ecoScore')}</span>
                  <h1 className="hi-title">{t('home.greeting', { name: userName })}</h1>
                  <p className="hi-subtitle">
                    {co2Saved > 0
                      ? t('home.scoreSaved', { kg: co2Saved.toFixed(1) })
                      : t('home.scoreEmpty')}
                  </p>
                  <span className="hi-level-badge">{t('home.level', { n: level })} • {t('home.levelName')}</span>
                </div>
                <div className="hi-score-ring">
                  <span className="hi-score-val">{ecoScore}</span>
                  <span className="hi-score-lbl">{t('home.ecoScore')}</span>
                </div>
              </div>
              <div className="hero-immersive-stats">
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon">savings</span>
                  <span className="hi-stat-val">{ecoPoints.toLocaleString('en-IN')}</span>
                  <span className="hi-stat-lbl">{t('home.ecoPoints')}</span>
                </div>
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon">delete_sweep</span>
                  <span className="hi-stat-val">{wasteKg.toFixed(1)}</span>
                  <span className="hi-stat-lbl">{t('home.wasteLogged')} ({t('waste.kg')})</span>
                </div>
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon">cloud_done</span>
                  <span className="hi-stat-val">{co2Saved.toFixed(1)}</span>
                  <span className="hi-stat-lbl">{t('home.co2Saved')} ({t('waste.kg')})</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Quick actions (scanner lives here now) */}
          <section className="qa-section">
            <h2 className="section-title">{t('home.quickActions')}</h2>
            <div className="qa-grid">
              {quickActions.map(a => (
                <button
                  key={a.route + a.title}
                  className={`qa-card${a.primary ? ' primary' : ''}`}
                  onClick={() => navigate(a.route)}
                >
                  <span className="material-symbols-outlined qa-icon">{a.icon}</span>
                  <span className="qa-title">{a.title}</span>
                  <span className="qa-sub">{a.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Fact strip */}
          <div className="daily-fact-strip">
            <span className="material-symbols-outlined fact-icon">lightbulb</span>
            <p className="fact-text">{t(FACT_KEYS[factIndex])}</p>
            <button type="button" className="fact-nav-btn" onClick={nextFact} aria-label={t('home.anotherFact')}>
              <span className="material-symbols-outlined fact-arrow">chevron_right</span>
            </button>
          </div>

          {/* ── Activity Feed + Challenge Carousel */}
          <section className="feed-grid">
            <div className="feed-col">
              <div className="feed-header">
                <h2 className="section-title">{t('home.recentActivity')}</h2>
                <button className="view-all-btn" onClick={() => navigate('/waste-history')}>{t('common.viewAll')}</button>
              </div>
              <div className="activity-list">
                {activityFeed.length === 0 && (
                  <div className="activity-item" onClick={() => navigate('/waste')} style={{ cursor: 'pointer' }}>
                    <div className="activity-left">
                      <div className="activity-icon-wrap">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--primary)' }}>photo_camera</span>
                      </div>
                      <div className="activity-info">
                        <h4 className="activity-title">{t('home.actScan')}</h4>
                        <p className="activity-meta">{t('home.actScanSub')}</p>
                      </div>
                    </div>
                  </div>
                )}
                {activityFeed.map(item => (
                  <div className="activity-item" key={item.id}>
                    <div className="activity-left">
                      <div className="activity-icon-wrap">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: item.iconColor }}>{item.icon}</span>
                      </div>
                      <div className="activity-info">
                        <h4 className="activity-title">{item.title}</h4>
                        <p className="activity-meta">{item.meta}</p>
                      </div>
                    </div>
                    <div className="activity-right">
                      <span className="activity-points">{item.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="challenge-col">
              <div className="challenge-col-header">
                <h2 className="section-title">{t('home.currentChallenges')}</h2>
                <span className="challenge-counter">{carouselItems.length > 0 ? `${activeSlide + 1} / ${carouselItems.length}` : '0 / 0'}</span>
              </div>
              {carouselItems.length > 0 ? (
                <>
                  <div className="challenge-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
                    {carouselItems.map((ch) => (
                      <div className="challenge-slide" key={ch.id}>
                        <div className="challenge-card">
                          <div className="challenge-image-wrapper">
                            <img className="challenge-bg" src={ch.img} alt={ch.title} />
                            <span className="challenge-tag">{ch.tag}</span>
                          </div>
                          <div className="challenge-content">
                            <h3 className="challenge-title">{ch.title}</h3>
                            <p className="challenge-desc">{ch.desc}</p>
                            <div className="challenge-progress-bar">
                              <div className="challenge-progress-fill" style={{ width: `${ch.progress}%` }} />
                            </div>
                            <button className="challenge-btn" onClick={() => navigate('/weekly-challenges')}>
                              {t('home.acceptChallenge')}
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="challenge-dots">
                    {carouselItems.map((_, i) => (
                      <button key={i} className={`challenge-dot${activeSlide === i ? ' active' : ''}`} onClick={() => scrollToSlide(i)} aria-label={`${i + 1}`} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="wc-preview-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate('/weekly-challenges')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', marginBottom: '8px' }}>emoji_events</span>
                  <h4 className="wc-preview-title" style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('home.noChallenges')}</h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>{t('home.checkBackSoon')}</p>
                  <span className="wc-preview-status not-started">{t('home.exploreChallenges')}</span>
                </div>
              )}
            </div>
          </section>

          {/* Weekly Challenges Section */}
          <section className="weekly-challenges-section">
            <div className="feed-header">
              <h2 className="section-title">{t('home.weeklyChallenges')}</h2>
              <button className="view-all-btn" onClick={() => navigate('/weekly-challenges')}>{t('common.viewAll')}</button>
            </div>
            <div className="weekly-challenges-preview">
              {challenges.slice(0, 2).map((ch, i) => (
                <div key={ch._id} className="wc-preview-card" onClick={() => navigate('/weekly-challenges')}>
                  <div className={`wc-preview-icon-wrap${i > 0 ? ' secondary' : ''}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>recycling</span>
                  </div>
                  <div className="wc-preview-info">
                    <h4 className="wc-preview-title">{ch.title}</h4>
                    <div className="wc-preview-bar-wrap">
                      <div className="wc-preview-bar"><div className="wc-preview-fill" style={{ width: `${ch.userProgress?.percentCompleted || 0}%` }} /></div>
                      <span className="wc-preview-pct">{ch.userProgress?.percentCompleted || 0}%</span>
                    </div>
                  </div>
                  <span className={`wc-preview-status ${ch.joined ? 'in-progress' : 'not-started'}`}>
                    {ch.joined ? t('home.inProgress') : t('home.notStarted')}
                  </span>
                </div>
              ))}

              {challenges.length === 0 && (
                <div className="wc-preview-card" style={{ padding: '16px', justifyContent: 'center' }} onClick={() => navigate('/weekly-challenges')}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{t('home.noActiveNow')}</span>
                </div>
              )}

              <button className="wc-see-all-btn" onClick={() => navigate('/weekly-challenges')}>
                <span className="material-symbols-outlined">grid_view</span>
                {t('home.seeAllChallenges')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </section>

        </main>
      )}

      <BottomNav />
    </div>
  );
}
