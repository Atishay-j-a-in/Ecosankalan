import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useLanguage } from '../i18n/LanguageContext';
import { logWaste } from '../services/api';
import '../styles/scan-result.css';

const DEFAULT_RESULT = {
  label: 'Plastic Bottle',
  category: 'plastic',
  material: 'PET Plastic (Type 1)',
  confidence: 92,
  icon: 'nest_eco_leaf',
  co2: 1.25,
  points: 12,
  steps: [
    'Rinse the bottle thoroughly to remove any liquid residue.',
    'Compress the bottle and place it in the plastic recycling bin.',
  ],
};

// Normalise category key from label if not provided
function inferCategory(result) {
  let cat = 'other';
  if (result.category) {
    cat = result.category.toLowerCase().replace('-', '');
  } else {
    const label = (result.label || '').toLowerCase();
    if (label.includes('plastic'))  cat = 'plastic';
    else if (label.includes('paper') || label.includes('cardboard')) cat = 'paper';
    else if (label.includes('metal') || label.includes('can')) cat = 'metal';
    else if (label.includes('e-waste') || label.includes('electronic') || label.includes('battery')) cat = 'ewaste';
    else if (label.includes('organic') || label.includes('food')) cat = 'organic';
  }
  
  // Ensure it matches backend enum
  if (cat === 'ewaste' || cat === 'e-waste') return 'e-waste';
  const valid = ['plastic', 'paper', 'metal', 'organic', 'e-waste', 'other'];
  return valid.includes(cat) ? cat : 'other';
}

export default function ScanResultPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t } = useLanguage();
  const result    = location.state?.result ?? DEFAULT_RESULT;

  const [submitting, setSubmitting] = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const [error,      setError]      = useState('');

  const { label, material, confidence, co2, points, steps, reuseIdeas } = result;
  const category = inferCategory(result);
  // Dictionary lookup: category 'e-waste' → tip key 'ewaste', all others as-is.
  const tipKey = category === 'e-waste' ? 'ewaste' : category;
  const disposalTip = t('scan.tip.' + tipKey);
  const [showModal, setShowModal] = useState(false);

  const R          = 20;
  const CIRCUM     = 2 * Math.PI * R;
  const dashOffset = CIRCUM - (confidence / 100) * CIRCUM;

  const isDryRecyclable = ['plastic', 'paper', 'metal'].includes(category);
  const dropBin = isDryRecyclable ? t('scan.blueBinFull') : category === 'organic' ? t('scan.greenBinFull') : t('scan.redBinFull');

  const handleConfirm = async () => {
    if (confirmed) { navigate('/dashboard'); return; }
    setSubmitting(true);
    setError('');
    try {
      await logWaste({
        category: category,
        quantity: typeof co2 === 'number' ? Math.max(0.1, co2 / 1.5) : 0.5,
        unit: 'kg',
        description: `AI scan: ${label} (${material})`,
        logMethod: 'ai_scan',
      });
      setConfirmed(true);
      setShowModal(true); // Show success modal
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('scan.errLog'));
    } finally {
      setSubmitting(false);
    }
  };
  const handleEdit    = () => navigate('/waste');

  return (
    <div className="scan-result-root">
      <Navbar />

      <main className="scan-result-main scanning-glow">

        {/* ── Result Image + Confidence ── */}
        <section className="scan-image-wrap">
          <div className="scan-image-placeholder">
            <span className="material-symbols-outlined scan-placeholder-icon" style={{ fontVariationSettings: "'FILL' 1" }}>nest_eco_leaf</span>
            <span className="scan-placeholder-label">{t('scan.item')}</span>
          </div>
          <div className="scan-confidence-badge">
            <div className="scan-confidence-ring">
              <svg viewBox="0 0 48 48" className="scan-ring-svg">
                <circle cx="24" cy="24" r={R} fill="transparent" stroke="var(--secondary-container)" strokeWidth="4" />
                <circle cx="24" cy="24" r={R} fill="transparent" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={CIRCUM} strokeDashoffset={dashOffset} style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
              </svg>
              <span className="scan-ring-pct">{confidence}%</span>
            </div>
            <div>
              <p className="scan-conf-label">{t('scan.confidence')}</p>
              <p className="scan-conf-level">
                {confidence >= 85 ? t('scan.high') : confidence >= 60 ? t('scan.med') : t('scan.low')}
              </p>
            </div>
          </div>
        </section>

        {/* ── Category Identity ── */}
        <section className="scan-identity">
          <div className="scan-identity-icon-wrap">
            <span className="material-symbols-outlined scan-identity-icon" style={{ fontVariationSettings: "'FILL' 1" }}>nest_eco_leaf</span>
          </div>
          <h1 className="scan-identity-title">{label}</h1>
          <p className="scan-identity-material">{t('scan.material', { m: material })}</p>
          <button className="scan-switch-btn" onClick={handleEdit}>
            <span className="material-symbols-outlined">error</span>
            {t('scan.notCorrect')}
          </button>
        </section>

        {/* ── Bin Drop Animation ── */}
        <section className="scan-bin-animation-card" style={{ background: 'var(--surface)', margin: '1rem', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--on-surface)' }}>{t('scan.guide')}</h3>
          
          <div style={{ position: 'relative', height: '110px', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: '10px' }}>
            
            {/* Falling waste item */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: ['plastic', 'paper', 'metal'].includes(category) ? '16.6%' : category === 'organic' ? '50%' : '83.3%',
              transform: 'translateX(-50%)',
              animation: 'dropWaste 2.5s infinite ease-in-out',
              zIndex: 10
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--on-surface-variant)' }}>
                {category === 'plastic' ? 'water_bottle' : category === 'paper' ? 'description' : category === 'organic' ? 'compost' : category === 'metal' ? 'settings' : 'devices'}
              </span>
            </div>

            {/* Colored Bins */}
            {[
              { id: 'blue', color: '#2196F3', label: t('scan.blueBin') },
              { id: 'green', color: '#4CAF50', label: t('scan.greenBin') },
              { id: 'red', color: '#F44336', label: t('scan.redBin') }
            ].map(bin => {
              const targetColor = ['plastic', 'paper', 'metal'].includes(category) ? 'blue' : category === 'organic' ? 'green' : 'red';
              const isTarget = targetColor === bin.id;
              
              return (
                <div key={bin.id} style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  opacity: isTarget ? 1 : 0.3,
                  transform: isTarget ? 'scale(1.15)' : 'scale(0.9)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  <div style={{
                    width: '48px', height: '60px',
                    backgroundColor: bin.color,
                    borderRadius: '4px 4px 12px 12px',
                    position: 'relative',
                    border: '3px solid rgba(0,0,0,0.1)'
                  }}>
                    {/* Bin lid */}
                    <div style={{
                      position: 'absolute', top: '-8px', left: '-6px', right: '-6px', height: '8px',
                      backgroundColor: bin.color,
                      borderRadius: '4px',
                      transformOrigin: 'left bottom',
                      animation: isTarget ? 'openLid 2.5s infinite ease-in-out' : 'none'
                    }} />
                    {/* Bin body lines */}
                    <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '12px', width: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', top: '10px', bottom: '10px', right: '12px', width: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: '1.5rem', 
            fontWeight: '600', 
            fontSize: '1.05rem',
            color: ['plastic', 'paper', 'metal'].includes(category) ? '#1565C0' : category === 'organic' ? '#2E7D32' : '#C62828',
            background: ['plastic', 'paper', 'metal'].includes(category) ? '#E3F2FD' : category === 'organic' ? '#E8F5E9' : '#FFEBEE',
            padding: '0.75rem',
            borderRadius: '8px'
          }}>
            {t('scan.dropIn', { bin: dropBin })}
          </div>

          <style>{`
            @keyframes dropWaste {
              0% { top: -20px; opacity: 0; transform: translateX(-50%) scale(0.5) rotate(-20deg); }
              15% { opacity: 1; transform: translateX(-50%) scale(1) rotate(0deg); }
              60% { top: 55px; opacity: 1; transform: translateX(-50%) scale(0.6) rotate(15deg); }
              75%, 100% { top: 75px; opacity: 0; transform: translateX(-50%) scale(0.2); }
            }
            @keyframes openLid {
              0%, 100% { transform: rotate(0deg); }
              15%, 65% { transform: rotate(-55deg); }
            }
          `}</style>
        </section>

        {/* ── Disposal Tip ── */}
        <section className="scan-disposal-card">
          <div className="scan-disposal-header">
            <div className="scan-disposal-icon-wrap">
              <span className="material-symbols-outlined">tips_and_updates</span>
            </div>
            <h3 className="scan-disposal-title">{t('scan.tipTitle')}</h3>
          </div>
          {/* Category-specific tip from dictionary */}
          <div className="scan-disposal-tip-banner">
            <span className="material-symbols-outlined scan-tip-icon" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_objects</span>
            <p className="scan-disposal-tip-text">{disposalTip}</p>
          </div>
          {/* Disposal steps */}
          {steps && steps.length > 0 && (
            <div className="scan-disposal-steps">
              {steps.map((step, i) => (
                <div className="scan-step" key={`step-${i}`}>
                  <div className="scan-step-num">{i + 1}</div>
                  <p className="scan-step-text" dangerouslySetInnerHTML={{
                    __html: step.replace(/(plastic recycling bin|recycling bin|compost bin|e-waste facility)/gi, '<strong>$1</strong>')
                  }} />
                </div>
              ))}
            </div>
          )}

          {/* Reuse Ideas (Recycling Tips) */}
          {reuseIdeas && reuseIdeas.length > 0 && (
            <div className="scan-disposal-steps" style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-dim)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--secondary)' }}>{t('scan.reuseTitle')}</h4>
              {reuseIdeas.map((idea, i) => (
                <div className="scan-step" key={`idea-${i}`}>
                  <div className="scan-step-num" style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>recycling</span>
                  </div>
                  <p className="scan-step-text">{idea}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Impact Preview ── */}
        <section className="scan-impact-grid">
          <div className="scan-impact-card">
            <span className="scan-impact-num primary">{typeof co2 === 'number' ? co2.toFixed(2) : co2}</span>
            <span className="scan-impact-label">{t('scan.co2')}</span>
          </div>
          <div className="scan-impact-card">
            <span className="scan-impact-num secondary">+{points}</span>
            <span className="scan-impact-label">{t('scan.points')}</span>
          </div>
        </section>

      </main>

      {error && (
        <div className="log-error-banner" style={{ margin: '0 1rem 0.5rem' }}>
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}
      <footer className="scan-result-footer">
        <button className="scan-confirm-btn" onClick={handleConfirm} disabled={submitting}>
          {submitting ? (
            <><span className="material-symbols-outlined log-spin">progress_activity</span> {t('scan.logging')}</>
          ) : confirmed ? (
            <><span className="material-symbols-outlined">check_circle</span> {t('scan.logged')}</>
          ) : (
            <>{t('scan.confirm')} <span className="material-symbols-outlined">check_circle</span></>
          )}
        </button>
        <button className="scan-edit-btn" onClick={handleEdit}>{t('scan.edit')}</button>
      </footer>
      
      {/* Success Modal */}
      {showModal && (
        <div className="log-modal-overlay">
          <div className="log-modal-backdrop" onClick={() => navigate('/dashboard')} />
          <div className="log-modal-card">
            <div className="log-modal-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check_circle</span>
            </div>
            <h2 className="log-modal-title">{t('scan.modalTitle')}</h2>
            <p className="log-modal-sub">{t('scan.modalSub')}</p>
            <div className="log-modal-stats">
              <div className="log-modal-stat">
                <span className="log-modal-stat-val primary">+{points}</span>
                <span className="log-modal-stat-label">{t('waste.points')}</span>
              </div>
              <div className="log-modal-stat">
                <span className="log-modal-stat-val tertiary">{typeof co2 === 'number' ? co2.toFixed(2) : co2} {t('waste.kg')}</span>
                <span className="log-modal-stat-label">{t('waste.co2Saved')}</span>
              </div>
            </div>
            <button className="log-modal-close-btn" onClick={() => navigate('/dashboard')}>{t('scan.backDash')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
