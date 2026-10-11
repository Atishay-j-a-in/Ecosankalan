import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import {
  getAdminStats, createBin, createEvent, bulkImportVouchers,
  getBinRequests, approveBinRequest, rejectBinRequest,
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Forms state
  const [activeTab, setActiveTab] = useState('stats'); // stats | requests | bins | events | vouchers
  const [successMsg, setSuccessMsg] = useState('');

  // Bin review queue state
  const [binRequests, setBinRequests] = useState([]);
  const [binStatusFilter, setBinStatusFilter] = useState('pending');
  const [binsLoading, setBinsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') loadBinRequests(binStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, binStatusFilter]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message || t('admin.fetching'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createBin({
        name: fd.get('name'),
        address: fd.get('address'),
        location: {
          type: 'Point',
          coordinates: [parseFloat(fd.get('lng')), parseFloat(fd.get('lat'))]
        },
        types: fd.get('types').split(',').map(s => s.trim()),
        capacityStatus: 'low'
      });
      setSuccessMsg(t('admin.binCreated'));
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createEvent({
        title: fd.get('title'),
        description: fd.get('description'),
        address: fd.get('address'),
        location: {
          type: 'Point',
          coordinates: [parseFloat(fd.get('lng')), parseFloat(fd.get('lat'))]
        },
        eventDate: fd.get('date'),
        organiser: fd.get('organiser'),
        bonusPoints: parseInt(fd.get('points'))
      });
      setSuccessMsg(t('admin.eventCreated'));
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportVouchers = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const jsonStr = fd.get('jsonPayload');
      const vouchers = JSON.parse(jsonStr);
      const { data } = await bulkImportVouchers(vouchers);
      setSuccessMsg(`Imported ${data.insertedCount} vouchers. Skipped ${data.duplicateCount} duplicates.`);
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Invalid JSON or upload failed');
    }
  };

  // ── Bin review queue ──────────────────────────────────────────
  const loadBinRequests = async (status = 'pending') => {
    setBinsLoading(true);
    try {
      const { data } = await getBinRequests(status);
      setBinRequests(data.reports || []);
    } catch (err) {
      setError(err.message || t('admin.noRequests'));
    } finally {
      setBinsLoading(false);
    }
  };

  const handleApproveBin = async (id) => {
    setReviewingId(id);
    setError('');
    try {
      const { data } = await approveBinRequest(id, reviewNote.trim() || undefined);
      setSuccessMsg(data.message || t('admin.approve'));
      setReviewNote('');
      loadBinRequests(binStatusFilter);
    } catch (err) {
      setError(err.message || t('admin.approve'));
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectBin = async (id) => {
    setReviewingId(id);
    setError('');
    try {
      const { data } = await rejectBinRequest(id, reviewNote.trim() || undefined);
      setSuccessMsg(data.message || t('admin.reject'));
      setReviewNote('');
      loadBinRequests(binStatusFilter);
    } catch (err) {
      setError(err.message || t('admin.reject'));
    } finally {
      setReviewingId(null);
    }
  };

  const cardStyle = {
    background: 'var(--surface-container)',
    padding: '1.5rem',
    borderRadius: '16px',
    marginBottom: '1rem',
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', marginBottom: '1rem',
    borderRadius: '8px', border: '1px solid var(--outline-variant)',
    background: 'var(--surface)', color: 'var(--on-surface)'
  };

  const TABS = ['stats', 'requests', 'bins', 'events', 'vouchers'];

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <Navbar />
      <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--on-surface)' }}>{t('admin.title')}</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(''); setSuccessMsg(''); }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === tab ? 'var(--primary)' : 'var(--surface-variant)',
                color: activeTab === tab ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                textTransform: 'capitalize',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'requests' ? t('admin.binRequests') : tab}
            </button>
          ))}
        </div>

        {error && <div className="log-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}
        {successMsg && <div className="vr-alert success"><span className="material-symbols-outlined">check_circle</span>{successMsg}</div>}

        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)', color: 'var(--on-primary)' }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">monitoring</span> {t('admin.overview')}
              </h2>
              <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{t('admin.overviewSub')}</p>

              {loading ? <p><span className="material-symbols-outlined log-spin">progress_activity</span> {t('admin.fetching')}</p> : stats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t('admin.totalUsers')}</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalUsers}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t('admin.wasteLogged')}</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalWasteKg} <span style={{fontSize: '1rem', fontWeight: 'normal'}}>{t('waste.kg')}</span></p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t('admin.eventsHeld')}</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalEventsConducted}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t('admin.challenges')}</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalChallengeCompletions}</p>
                  </div>
                </div>
              ) : <p>{t('admin.noData')}</p>}
            </div>

            {/* Analysis card */}
            {stats && (
              <div style={cardStyle}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>insights</span> {t('admin.engagement')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      <span>{t('admin.participation')}</span>
                      <span style={{fontWeight: 'bold'}}>{Math.min(100, Math.round((stats.totalChallengeCompletions / (stats.totalUsers || 1)) * 100))}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (stats.totalChallengeCompletions / (stats.totalUsers || 1)) * 100)}%`, height: '100%', background: 'var(--primary)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      <span>{t('admin.wastePerUser')}</span>
                      <span style={{fontWeight: 'bold'}}>{(stats.totalWasteKg / (stats.totalUsers || 1)).toFixed(1)} {t('waste.kg')}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (stats.totalWasteKg / (stats.totalUsers || 1)) * 10)}%`, height: '100%', background: 'var(--secondary)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={loadStats}
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span className={`material-symbols-outlined ${loading ? 'log-spin' : ''}`}>sync</span> {t('admin.refresh')}
            </button>

            <button
              onClick={() => navigate('/leaderboard')}
              style={{ width: '100%', padding: '0.875rem', background: 'var(--surface-container)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">leaderboard</span> {t('admin.publicBoard')}
            </button>
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button
                  key={s}
                  onClick={() => setBinStatusFilter(s)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '99px', border: 'none', cursor: 'pointer',
                    background: binStatusFilter === s ? 'var(--primary)' : 'var(--surface-variant)',
                    color: binStatusFilter === s ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    textTransform: 'capitalize', fontSize: '0.8rem', fontWeight: 700,
                  }}
                >
                  {s === 'pending' ? t('report.status.pending') : s === 'approved' ? t('report.status.approved') : s === 'rejected' ? t('report.status.rejected') : s}
                </button>
              ))}
            </div>

            <div style={{ ...cardStyle, padding: '1rem', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('admin.note')}</label>
              <input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={t('admin.rejectReason')}
                style={{ ...inputStyle, marginTop: '0.4rem', marginBottom: 0 }}
              />
            </div>

            {binsLoading ? (
              <p style={{ textAlign: 'center', opacity: 0.6 }}>
                <span className="material-symbols-outlined log-spin">progress_activity</span> {t('common.loading')}
              </p>
            ) : binRequests.length === 0 ? (
              <div style={cardStyle}><p style={{ textAlign: 'center', opacity: 0.7 }}>{t('admin.noRequests')}</p></div>
            ) : (
              binRequests.map((r) => (
                <div key={r._id} style={{ ...cardStyle, padding: '1rem' }}>
                  {r.photoUrl && (
                    <img src={r.photoUrl} alt={r.name} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.75rem' }} />
                  )}
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{r.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                    {r.address || '—'} • {(r.types || []).join(', ')}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                    📍 {r.location?.coordinates?.[1]?.toFixed?.(5)}, {r.location?.coordinates?.[0]?.toFixed?.(5)}
                    {' • '}by {r.requestedBy?.name || 'citizen'} ({r.requestedBy?.email || '—'})
                  </p>
                  {r.description && <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{r.description}</p>}
                  {r.status !== 'pending' && (
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: r.status === 'approved' ? 'var(--primary)' : 'var(--error)', marginBottom: '0.5rem' }}>
                      {t(`report.status.${r.status}`)}{r.reviewNote ? ` — ${r.reviewNote}` : ''}
                    </p>
                  )}
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveBin(r._id)}
                        disabled={reviewingId === r._id}
                        style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        onClick={() => handleRejectBin(r._id)}
                        disabled={reviewingId === r._id}
                        style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'bins' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>{t('admin.addBin')}</h2>
            <form onSubmit={handleCreateBin}>
              <input name="name" placeholder={t('admin.binName')} required style={inputStyle} />
              <input name="address" placeholder={t('admin.address')} required style={inputStyle} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder={t('admin.lat')} required style={inputStyle} />
                <input name="lng" type="number" step="any" placeholder={t('admin.lng')} required style={inputStyle} />
              </div>
              <input name="types" placeholder={t('admin.typesPh')} required style={inputStyle} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                {t('admin.createBin')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>{t('admin.addEvent')}</h2>
            <form onSubmit={handleCreateEvent}>
              <input name="title" placeholder={t('admin.eventTitle')} required style={inputStyle} />
              <textarea name="description" placeholder={t('admin.descPh')} required style={{...inputStyle, height: '80px'}} />
              <input name="address" placeholder={t('admin.address')} required style={inputStyle} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder={t('admin.lat')} required style={inputStyle} />
                <input name="lng" type="number" step="any" placeholder={t('admin.lng')} required style={inputStyle} />
              </div>
              <input name="date" type="datetime-local" required style={inputStyle} aria-label={t('admin.date')} />
              <input name="organiser" placeholder={t('admin.organiser')} required style={inputStyle} />
              <input name="points" type="number" placeholder={t('admin.bonusPts')} required style={inputStyle} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                {t('admin.createEvent')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'vouchers' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>{t('admin.importTitle')}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1rem' }}>
              {t('admin.importHelp')} <br/>
              <code>{`[{"code": "XYZ123", "partnerName": "Amazon", "discountLabel": "10% OFF"}]`}</code>
            </p>
            <form onSubmit={handleImportVouchers}>
              <textarea name="jsonPayload" placeholder={t('admin.jsonPh')} required style={{...inputStyle, height: '150px', fontFamily: 'monospace'}} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                {t('admin.importBtn')}
              </button>
            </form>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  );
}
