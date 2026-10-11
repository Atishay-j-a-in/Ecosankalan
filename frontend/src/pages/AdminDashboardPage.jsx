import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import {
  getAdminStats, createBin, createEvent, bulkImportVouchers,
  getBinRequests, approveBinRequest, rejectBinRequest,
  getAdminChallenges, createChallenge, updateChallenge, deleteChallenge,
} from '../services/api';
import MapLocationPicker from '../components/admin/MapLocationPicker';
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

  // Challenges state (weekly model: tasks[] + rewards + weekStartDate)
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [taskRows, setTaskRows] = useState([{ action: '', targetCount: 1, category: '' }]);

  // Map-picked locations for the bin / event forms (tap the mini map).
  const [binLoc, setBinLoc] = useState({ lat: '', lng: '' });
  const [eventLoc, setEventLoc] = useState({ lat: '', lng: '' });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') loadBinRequests(binStatusFilter);
    if (activeTab === 'challenges') loadChallenges();
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
          coordinates: [parseFloat(binLoc.lng), parseFloat(binLoc.lat)]
        },
        types: fd.get('types').split(',').map(s => s.trim()),
        capacityStatus: 'low'
      });
      setSuccessMsg(t('admin.binCreated'));
      e.target.reset();
      setBinLoc({ lat: '', lng: '' });
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
          coordinates: [parseFloat(eventLoc.lng), parseFloat(eventLoc.lat)]
        },
        eventDate: fd.get('date'),
        organiser: fd.get('organiser'),
        bonusPoints: parseInt(fd.get('points'))
      });
      setSuccessMsg(t('admin.eventCreated'));
      e.target.reset();
      setEventLoc({ lat: '', lng: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Challenges (admin CRUD over the weekly Challenge model) ──
  const loadChallenges = async () => {
    setChallengesLoading(true);
    try {
      const { data } = await getAdminChallenges();
      setChallenges(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || t('admin.noChallenges'));
    } finally {
      setChallengesLoading(false);
    }
  };

  const resetChallengeForm = (form) => {
    if (form) form.reset();
    setTaskRows([{ action: '', targetCount: 1, category: '' }]);
  };

  const buildTasks = () =>
    taskRows
      .map((r) => ({
        action: (r.action || '').trim(),
        targetCount: Number(r.targetCount) || 1,
        category: (r.category || '').trim() || undefined,
      }))
      .filter((r) => r.action);

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tasks = buildTasks();
    if (tasks.length === 0) {
      setError(t('admin.taskRequired'));
      return;
    }
    try {
      await createChallenge({
        title: fd.get('title'),
        description: fd.get('description'),
        weekStartDate: fd.get('weekStart') || undefined,
        tasks,
        rewardPoints: Number(fd.get('rewardPoints')) || 0,
        rewardVoucherPartner: fd.get('rewardVoucherPartner') || undefined,
      });
      setSuccessMsg(t('admin.challengeCreated'));
      resetChallengeForm(e.target);
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateChallenge = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tasks = buildTasks();
    if (tasks.length === 0) {
      setError(t('admin.taskRequired'));
      return;
    }
    try {
      await updateChallenge(editingChallenge._id, {
        title: fd.get('title'),
        description: fd.get('description'),
        weekStartDate: fd.get('weekStart') || undefined,
        tasks,
        rewardPoints: Number(fd.get('rewardPoints')) || 0,
        rewardVoucherPartner: fd.get('rewardVoucherPartner') || undefined,
      });
      setSuccessMsg(t('admin.challengeUpdated'));
      setEditingChallenge(null);
      resetChallengeForm();
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditChallenge = (ch) => {
    setEditingChallenge(ch);
    setTaskRows(
      (ch.tasks || []).length > 0
        ? ch.tasks.map((task) => ({
            action: task.action || '',
            targetCount: task.targetCount || 1,
            category: task.category || '',
          }))
        : [{ action: '', targetCount: 1, category: '' }]
    );
  };

  const cancelEditChallenge = () => {
    setEditingChallenge(null);
    resetChallengeForm();
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm(t('admin.confirmDeactivate'))) return;
    try {
      await deleteChallenge(id);
      setSuccessMsg(t('admin.challengeDeactivated'));
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateTaskRow = (index, field, value) => {
    setTaskRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
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

  const TABS = ['stats', 'requests', 'bins', 'challenges', 'events', 'vouchers'];

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
              <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>{t('admin.pickOnMap')}</p>
              <MapLocationPicker
                lat={binLoc.lat}
                lng={binLoc.lng}
                onPick={(la, ln) => setBinLoc({ lat: String(la.toFixed(6)), lng: String(ln.toFixed(6)) })}
                locateLabel={t('admin.useMyLocation')}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder={t('admin.lat')} required style={inputStyle}
                  value={binLoc.lat} onChange={(e) => setBinLoc((p) => ({ ...p, lat: e.target.value }))} />
                <input name="lng" type="number" step="any" placeholder={t('admin.lng')} required style={inputStyle}
                  value={binLoc.lng} onChange={(e) => setBinLoc((p) => ({ ...p, lng: e.target.value }))} />
              </div>
              <input name="types" placeholder={t('admin.typesPh')} required style={inputStyle} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                {t('admin.createBin')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={cardStyle}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
                {editingChallenge ? t('admin.editChallenge') : t('admin.addChallenge')}
              </h2>
              <form onSubmit={editingChallenge ? handleUpdateChallenge : handleCreateChallenge}>
                <input name="title" placeholder={t('admin.challengeTitle')} defaultValue={editingChallenge?.title || ''} required style={inputStyle} />
                <textarea name="description" placeholder={t('admin.descPh')} defaultValue={editingChallenge?.description || ''} required style={{ ...inputStyle, height: '80px' }} />
                <label style={{ fontSize: '0.75rem', color: 'var(--outline)', display: 'block', marginBottom: '0.25rem' }}>{t('admin.weekStart')}</label>
                <input
                  name="weekStart"
                  type="date"
                  defaultValue={editingChallenge?.weekStartDate ? String(editingChallenge.weekStartDate).slice(0, 10) : ''}
                  style={inputStyle}
                />

                <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>{t('admin.tasks')}</p>
                {taskRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      placeholder={t('admin.taskAction')}
                      value={row.action}
                      onChange={(e) => updateTaskRow(i, 'action', e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0, flex: 2 }}
                    />
                    <input
                      type="number"
                      placeholder={t('admin.taskTarget')}
                      value={row.targetCount}
                      onChange={(e) => updateTaskRow(i, 'targetCount', e.target.value)}
                      min="1"
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <input
                      placeholder={t('admin.taskCategory')}
                      value={row.category}
                      onChange={(e) => updateTaskRow(i, 'category', e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    {taskRows.length > 1 && (
                      <button
                        type="button"
                        aria-label={t('admin.removeTask')}
                        onClick={() => setTaskRows((prev) => prev.filter((_, j) => j !== i))}
                        style={{ border: 'none', background: 'none', color: 'var(--error)', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTaskRows((prev) => [...prev, { action: '', targetCount: 1, category: '' }])}
                  style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}
                >
                  + {t('admin.addTask')}
                </button>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--outline)', display: 'block', marginBottom: '0.25rem' }}>{t('admin.rewardPts')}</label>
                    <input name="rewardPoints" type="number" min="0" defaultValue={editingChallenge?.rewardPoints ?? 0} style={{ ...inputStyle, marginBottom: 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--outline)', display: 'block', marginBottom: '0.25rem' }}>{t('admin.voucherPartner')}</label>
                    <input name="rewardVoucherPartner" placeholder={t('admin.voucherPartner')} defaultValue={editingChallenge?.rewardVoucherPartner || ''} style={{ ...inputStyle, marginBottom: 0 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {editingChallenge ? t('admin.updateChallenge') : t('admin.createChallenge')}
                  </button>
                  {editingChallenge && (
                    <button type="button" onClick={cancelEditChallenge} style={{ padding: '0.75rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      {t('admin.cancel')}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>list</span> {t('admin.allChallenges')}
              </h3>

              {challengesLoading ? (
                <p><span className="material-symbols-outlined log-spin">progress_activity</span> {t('common.loading')}</p>
              ) : challenges.length === 0 ? (
                <p style={{ color: 'var(--outline)' }}>{t('admin.noChallenges')}</p>
              ) : (
                challenges.map((ch) => (
                  <div key={ch._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem', marginBottom: '0.5rem',
                    background: ch.isActive ? 'var(--surface-container)' : 'var(--surface-variant)',
                    borderRadius: '8px', opacity: ch.isActive ? 1 : 0.6,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ch.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                        {String(ch.weekStartDate).slice(0, 10)} | {(ch.tasks || []).length} {t('admin.tasks')} | {ch.rewardPoints ?? 0} pts
                        {!ch.isActive && <span style={{ color: 'var(--error)', marginLeft: '0.5rem' }}>({t('admin.inactive')})</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEditChallenge(ch)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} aria-label={t('admin.editChallenge')}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      {ch.isActive && (
                        <button onClick={() => handleDeleteChallenge(ch._id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }} aria-label={t('admin.challengeDeactivated')}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>{t('admin.addEvent')}</h2>
            <form onSubmit={handleCreateEvent}>
              <input name="title" placeholder={t('admin.eventTitle')} required style={inputStyle} />
              <textarea name="description" placeholder={t('admin.descPh')} required style={{...inputStyle, height: '80px'}} />
              <input name="address" placeholder={t('admin.address')} required style={inputStyle} />
              <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>{t('admin.pickOnMap')}</p>
              <MapLocationPicker
                lat={eventLoc.lat}
                lng={eventLoc.lng}
                onPick={(la, ln) => setEventLoc({ lat: String(la.toFixed(6)), lng: String(ln.toFixed(6)) })}
                locateLabel={t('admin.useMyLocation')}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder={t('admin.lat')} required style={inputStyle}
                  value={eventLoc.lat} onChange={(e) => setEventLoc((p) => ({ ...p, lat: e.target.value }))} />
                <input name="lng" type="number" step="any" placeholder={t('admin.lng')} required style={inputStyle}
                  value={eventLoc.lng} onChange={(e) => setEventLoc((p) => ({ ...p, lng: e.target.value }))} />
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
              <code>{`[{"code": "XYZ123", "partnerName": "Amazon", "discountDescription": "10% OFF", "partnerPortalUrl": "https://amazon.in", "ecoPointsCost": 500, "expiresAt": "2026-12-31T00:00:00.000Z"}]`}</code>
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
