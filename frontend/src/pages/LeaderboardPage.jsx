import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import Loader from '../components/common/Loader';
import { getLeaderboard } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

const cardStyle = {
  background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)',
  borderRadius: '16px',
  padding: '1rem',
};

const statTile = {
  background: 'var(--surface-container)',
  borderRadius: '12px',
  padding: '0.875rem',
  textAlign: 'center',
};

function medal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLeaderboard(20);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const platform = data?.platform;
  const leaders = data?.leaders || [];
  const features = data?.features || [];

  const myId = user?._id || user?.id || null;

  const stats = platform
    ? [
        { icon: 'group', value: platform.totalUsers, label: t('board.users') },
        { icon: 'delete_sweep', value: `${platform.totalWasteKg} kg`, label: t('board.waste') },
        { icon: 'cloud_done', value: `${platform.totalCo2Saved} kg`, label: t('board.co2') },
        { icon: 'delete', value: platform.totalBins, label: t('board.bins') },
        { icon: 'event', value: platform.totalEvents, label: t('board.events') },
        { icon: 'confirmation_number', value: platform.vouchersIssued, label: t('board.vouchers') },
        { icon: 'emoji_events', value: platform.totalChallengeCompletions, label: t('board.challengesDone') },
      ]
    : [];

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '90px' }}>
      <Navbar />
      <main style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
            leaderboard
          </span>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--on-surface)' }}>{t('board.title')}</h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
          {t('board.subtitle')}
        </p>

        {!user && (
          <div style={{ ...cardStyle, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>login</span>
            <p style={{ fontSize: '0.875rem', flex: 1 }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('board.login')}</Link>
              {' / '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('board.join')}</Link>
              {' '}{t('board.loginHint')}
            </p>
          </div>
        )}

        {loading && <Loader text={t('common.loading')} />}
        {error && (
          <div className="log-error-banner">
            <span className="material-symbols-outlined">error</span>
            {error}
            <button type="button" onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <h2 style={{ fontSize: '1.05rem', margin: '0.5rem 0 0.75rem', color: 'var(--on-surface)' }}>
              {t('board.platform')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {stats.map((s) => (
                <div key={s.label} style={statTile}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>
                    {s.icon}
                  </span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--on-surface)' }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', color: 'var(--on-surface)' }}>{t('board.topWarriors')}</h2>
              <button
                type="button"
                onClick={load}
                style={{ background: 'var(--surface-variant)', border: 'none', borderRadius: '99px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', color: 'var(--on-surface-variant)' }}
              >
                {t('board.refresh')}
              </button>
            </div>
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
              {leaders.length === 0 && (
                <p style={{ padding: '1.25rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                  {t('board.empty')}
                </p>
              )}
              {leaders.map((w) => {
                const isMe = myId && String(w._id) === String(myId);
                return (
                  <div
                    key={w._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--outline-variant)',
                      background: isMe ? 'var(--primary-fixed)' : 'transparent',
                    }}
                  >
                    <span style={{ minWidth: '2.5rem', fontWeight: 800, fontSize: w.rank <= 3 ? '1.25rem' : '0.9rem' }}>
                      {medal(w.rank)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {w.name}
                        {isMe && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '99px', padding: '0.1rem 0.5rem' }}>
                            {t('board.you')}
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        {w.totalWasteKg} kg • {w.badges} badges
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, color: 'var(--primary)' }}>{w.totalPointsEarned}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>{t('board.points')}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--on-surface)' }}>
              {t('board.features')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {features.map((f) => (
                <div key={f.key} style={statTile}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>
                    {f.icon}
                  </span>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.25rem 0' }}>{t(`feat.${f.key}.t`)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{t(`feat.${f.key}.d`)}</p>
                </div>
              ))}
            </div>

            {user && (
              <button
                type="button"
                onClick={() => navigate('/report-bin')}
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <span className="material-symbols-outlined">add_location</span>
                {t('nav.reportBin')}
              </button>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
