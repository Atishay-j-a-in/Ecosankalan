import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/common/BottomNav';
import Navbar from '../components/common/Navbar';
import { useLanguage } from '../i18n/LanguageContext';
import { logWaste, scanWasteImage } from '../services/api';
import '../styles/waste.css';

// Points per kg for preview (matches backend)
const PTS_MAP = { plastic: 5, organic: 3, 'e-waste': 10, metal: 6, paper: 4, other: 2 };
const CO2_MAP = { plastic: 1.5, organic: 0.5, 'e-waste': 2.0, metal: 1.8, paper: 0.9, other: 0.3 };

export default function WasteLogPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Built inside the component so labels re-render on language switch.
  // ids / icons / colours are backend & style values — never translated.
  const CATEGORIES = [
    { id: 'plastic',  label: t('waste.cat.plastic'),  icon: 'inventory_2',            bg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
    { id: 'organic',  label: t('waste.cat.organic'),  icon: 'compost',                bg: 'bg-primary-container',   iconColor: 'text-on-primary-container',  fill: true },
    { id: 'e-waste',  label: t('waste.cat.ewaste'),   icon: 'devices_other',          bg: 'bg-tertiary-fixed',      iconColor: 'text-on-tertiary-fixed-variant' },
    { id: 'metal',    label: t('waste.cat.metal'),    icon: 'precision_manufacturing', bg: 'bg-surface-container-highest', iconColor: 'text-on-surface-variant' },
    { id: 'paper',    label: t('waste.cat.paper'),    icon: 'description',            bg: 'bg-secondary-fixed',     iconColor: 'text-on-secondary-fixed-variant' },
    { id: 'other',    label: t('waste.cat.other'),    icon: 'pending',                bg: 'bg-surface-dim',         iconColor: 'text-on-surface' },
  ];

  // Hazardous waste types (backend enum ids unchanged — display labels only)
  const HAZARDS = [
    { id: 'sanitary',       label: t('waste.haz.sanitary') },
    { id: 'biomedical',     label: t('waste.haz.biomedical') },
    { id: 'e-waste-unsafe', label: t('waste.haz.ewaste') },
    { id: 'chemical',       label: t('waste.haz.chemical') },
    { id: 'sharp',          label: t('waste.haz.sharp') },
    { id: 'other-hazard',   label: t('waste.haz.other') },
  ];

  const [selected,   setSelected]   = useState('organic');
  const [qty,        setQty]        = useState(2.5);
  const [notes,      setNotes]      = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanning,   setScanning]   = useState(false);
  const [error,      setError]      = useState('');
  const [logResult,  setLogResult]  = useState(null); // holds { pointsEarned, co2Saved }
  const [isHazardous, setIsHazardous] = useState(false);
  const [hazardType,  setHazardType]  = useState('');
  const [safetyAck,   setSafetyAck]   = useState(false);

  void lang;

  const selectedLabel = CATEGORIES.find(c => c.id === selected)?.label ?? selected;

  // Clean up any active scan on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Escape closes the success modal (a11y)
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const pts = Math.round((PTS_MAP[selected] || 2) * qty);
  const co2 = ((CO2_MAP[selected] || 0.3) * qty).toFixed(2);

  // ── Manual Log Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (isHazardous && !hazardType) {
      setError(t('waste.errHazardType'));
      return;
    }
    if (isHazardous && !safetyAck) {
      setError(t('waste.errSafety'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await logWaste({
        category: selected,
        quantity: qty,
        unit: 'kg',
        description: notes,
        logMethod: 'manual',
        ...(isHazardous ? { isHazardous: true, hazardType, safetyAck: true } : {}),
      });
      setLogResult({ pointsEarned: data.pointsEarned, co2Saved: data.co2Saved });
      setShowModal(true);
    } catch (err) {
      setError(err.message || t('waste.errFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setLogResult(null);
    setNotes('');
    setIsHazardous(false);
    setHazardType('');
    setSafetyAck(false);
  };

  // ── AI Scan ──────────────────────────────────────────────────────────────
  const handleAIScan = () => {
    fileInputRef.current?.click();
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanning(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFileSelect = async (e, source) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setScanning(source);
    setError('');
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    try {
      const { data } = await scanWasteImage(formData, { signal: controller.signal });
      if (controller.signal.aborted) return;

      const parsed = data.parsed || {};
      const report = parsed.reports?.[0] || {};
      
      // Calculate preview points/co2 using 0.5kg as a default AI weight
      const inferredCat = report.wasteCategory?.toLowerCase().replace('-', '') || 'other';
      const catKey = inferredCat.includes('plastic') ? 'plastic' : 
                     inferredCat.includes('paper') ? 'paper' : 
                     inferredCat.includes('metal') ? 'metal' : 
                     inferredCat.includes('ewaste') || inferredCat.includes('electronic') ? 'e-waste' : 
                     inferredCat.includes('organic') ? 'organic' : 'other';
      
      const previewQty = 0.5;
      const previewPts = Math.round((PTS_MAP[catKey] || 2) * previewQty);
      const previewCo2 = Number(((CO2_MAP[catKey] || 0.3) * previewQty).toFixed(2));

      // Navigate to scan result page with actual AI result
      navigate('/scan-result', {
        state: {
          result: {
            label:      report.identifiedObject || t('waste.unknownItem'),
            category:   report.wasteCategory    || 'other',
            material:   report.material         || 'Unknown',
            confidence: typeof report.confidence === 'number' ? (report.confidence <= 1 ? Math.round(report.confidence * 100) : Math.round(report.confidence)) : 0,
            co2:        previewCo2,
            points:     previewPts,
            steps:      report.beforeThrowing   || [],
            reuseIdeas: report.reuseIdeas       || [],
          },
        },
      });
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
        return; // Silently exit on user cancellation
      }
      setError(err.message || t('waste.errScan'));
    } finally {
      if (abortControllerRef.current === controller && !controller.signal.aborted) {
        setScanning(null);
      }
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <div className="log-root">

      <Navbar />

      <main className="log-main">

        <section className="log-hero">
          <h1 className="log-hero-title">{t('waste.title')}</h1>
          <p className="log-hero-sub">{t('waste.subtitle')}</p>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="log-error-banner">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {/* AI Scan Card */}
        <section className="log-ai-card">
          <div className="log-ai-bg-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '6rem' }}>photo_camera</span>
          </div>
          <div className="log-ai-content">
            <div className="log-ai-badge">{t('waste.aiPowered')}</div>
            <h2 className="log-ai-title">{t('waste.aiTitle')}</h2>
            <p className="log-ai-desc">{t('waste.aiDesc')}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
              <button
                className="log-ai-btn"
                style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
              >
                <span className="material-symbols-outlined">upload_file</span>
                {t('waste.upload')}
              </button>
              <button
                className="log-ai-btn"
                style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem' }}
                onClick={() => cameraInputRef.current?.click()}
                disabled={scanning}
              >
                {scanning ? (
                  <span className="material-symbols-outlined log-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">photo_camera</span>
                )}
                {t('waste.camera')}
              </button>
            </div>

            {scanning && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.95)', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginTop: '1rem', color: 'var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined log-spin" style={{ fontSize: '1.2rem' }}>progress_activity</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('waste.analyzing')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelScan}
                  style={{ background: 'var(--surface-container-high)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}
                  aria-label={t('waste.cancelScan')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                </button>
              </div>
            )}

            {/* Hidden file input for gallery upload (no capture attribute) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'gallery')}
            />
            {/* Hidden file input for live camera (forces camera on mobile) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'camera')}
            />
          </div>
        </section>

        {/* Category Grid */}
        <section className="log-section">
          <div className="log-section-header">
            <h3 className="log-section-title">{t('waste.selectCategory')}</h3>
            <span className="log-section-tag">{t('waste.manualEntry')}</span>
          </div>
          <div className="log-category-grid">
            {CATEGORIES.map(cat => (
              <button key={cat.id} className={`log-cat-btn${selected === cat.id ? ' selected' : ''}`} onClick={() => setSelected(cat.id)} aria-pressed={selected === cat.id} aria-label={cat.label}>
                <div className={`log-cat-icon ${cat.bg}${selected === cat.id ? ' scaled' : ''}`}>
                  <span className={`material-symbols-outlined ${cat.iconColor}`} style={cat.fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{cat.icon}</span>
                </div>
                <span className={`log-cat-label${selected === cat.id ? ' active' : ''}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Quantity Slider */}
        <section className="log-qty-card">
          <div className="log-qty-header">
            <div>
              <h3 className="log-qty-title">{t('waste.qty')}</h3>
              <p className="log-qty-sub">{t('waste.qtySub')}</p>
            </div>
            <div className="log-qty-value">
              <span className="log-qty-num">{qty.toFixed(1)}</span>
              <span className="log-qty-unit">{t('waste.kg')}</span>
            </div>
          </div>
          <input
            className="log-slider"
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={qty}
            aria-label={t('waste.qty')}
            aria-valuetext={`${qty.toFixed(1)} kilograms`}
            onChange={e => setQty(parseFloat(e.target.value))}
          />
          <div className="log-slider-labels">
            <span>0.1 {t('waste.kg')}</span><span>5.0 {t('waste.kg')}</span><span>10.0 {t('waste.kg')}</span>
          </div>
        </section>

        {/* Live CO2 preview */}
        <div className="log-co2-preview">
          <div className="log-co2-preview-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            <div>
              <span className="log-co2-val">{co2} {t('waste.kg')}</span>
              <span className="log-co2-label">{t('waste.co2Saved')}</span>
            </div>
          </div>
          <div className="log-co2-preview-divider" />
          <div className="log-co2-preview-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontVariationSettings: "'FILL' 1" }}>eco</span>
            <div>
              <span className="log-co2-val">+{pts} {t('history.pts')}</span>
              <span className="log-co2-label">{t('waste.ecoPoints')}</span>
            </div>
          </div>
          <div className="log-co2-preview-hint">
            {t('waste.factor', { f: CO2_MAP[selected], cat: selectedLabel })}
          </div>
        </div>

        {/* Notes */}
        <section className="log-notes-section">
          <label className="log-notes-label">{t('waste.notes')}</label>
          <textarea
            className="log-notes-textarea"
            placeholder={t('waste.notesPh')}
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </section>

        {/* Hazardous waste flag (health & safety) */}
        <section className="log-notes-section">
          <label className="log-notes-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isHazardous}
              onChange={e => { setIsHazardous(e.target.checked); setSafetyAck(false); }}
              aria-label={t('waste.hazardous')}
            />
            ⚠️ {t('waste.hazardous')}
          </label>
          {isHazardous && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                className="log-notes-textarea"
                value={hazardType}
                onChange={e => setHazardType(e.target.value)}
                aria-label={t('waste.hazardPh')}
                style={{ padding: '0.75rem' }}
              >
                <option value="">{t('waste.hazardPh')}</option>
                {HAZARDS.map(h => (
                  <option key={h.id} value={h.id}>{h.label}</option>
                ))}
              </select>
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '12px', padding: '0.75rem', fontSize: '0.85rem', color: '#5d4037' }}>
                {t('waste.hazardSafety')}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={safetyAck}
                  onChange={e => setSafetyAck(e.target.checked)}
                  aria-label={t('waste.hazardAck')}
                  style={{ marginTop: '0.2rem' }}
                />
                {t('waste.hazardAck')}
              </label>
            </div>
          )}
        </section>

        <div className="log-submit-wrap">
          <button className="log-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <span className="material-symbols-outlined log-spin">progress_activity</span>
                {t('waste.logging')}
              </>
            ) : (
              <>
                {t('waste.submit')}
                <span className="material-symbols-outlined">auto_awesome</span>
              </>
            )}
          </button>
        </div>

      </main>

      <BottomNav />

      {/* Success Modal */}
      {showModal && (
        <div className="log-modal-overlay" role="dialog" aria-modal="true" aria-label={t('waste.modalTitle')}>
          <div className="log-modal-backdrop" onClick={handleClose} />
          <div className="log-modal-card">
            <div className="log-modal-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check_circle</span>
            </div>
            <h2 className="log-modal-title">{t('waste.modalTitle')}</h2>
            <p className="log-modal-sub">{t('waste.modalSub')}</p>
            <div className="log-modal-stats">
              <div className="log-modal-stat">
                <span className="log-modal-stat-val primary">+{logResult?.pointsEarned ?? pts}</span>
                <span className="log-modal-stat-label">{t('waste.points')}</span>
              </div>
              <div className="log-modal-stat">
                <span className="log-modal-stat-val tertiary">{logResult?.co2Saved ?? co2} {t('waste.kg')}</span>
                <span className="log-modal-stat-label">{t('waste.co2Saved')}</span>
              </div>
            </div>
            <p className="log-modal-co2-note">
              {t('waste.modalNote', { cat: selectedLabel, f: CO2_MAP[selected] })}
            </p>
            <button className="log-modal-close-btn" onClick={handleClose}>{t('waste.modalClose')}</button>
          </div>
        </div>
      )}

    </div>
  );
}
