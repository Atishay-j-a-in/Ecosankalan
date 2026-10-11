import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { reportBin, getMyBinReports } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

const BIN_TYPES = ['plastic', 'organic', 'eWaste', 'metal', 'paper', 'general'];

const inputStyle = {
  width: '100%', padding: '0.75rem', marginBottom: '0.9rem',
  borderRadius: '10px', border: '1px solid var(--outline-variant)',
  background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '0.9rem',
};

export default function ReportBinPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fileRef = useRef(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [types, setTypes] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mine, setMine] = useState([]);

  useEffect(() => {
    getMyBinReports()
      .then((res) => setMine(res.data?.reports || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const toggleType = (type) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  };

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocError('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. Allow location access and retry.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!photo) return setError(t('report.errPhoto'));
    if (!coords) return setError(t('report.errLocation'));
    if (!name.trim()) return setError(t('report.errName'));
    if (types.length === 0) return setError(t('report.errTypes'));

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('name', name.trim());
    formData.append('address', address.trim());
    formData.append('description', description.trim());
    formData.append('types', types.join(','));
    formData.append('lat', String(coords.lat));
    formData.append('lng', String(coords.lng));

    setSubmitting(true);
    try {
      const res = await reportBin(formData);
      setSuccess(t('report.success'));
      const created = res.data?.report;
      if (created) setMine((prev) => [created, ...prev]);
      setName('');
      setAddress('');
      setDescription('');
      setTypes([]);
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = '';
      // keep coords — user may report another bin at the same spot
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s) =>
    s === 'approved' ? 'var(--primary)' : s === 'rejected' ? 'var(--error)' : 'var(--outline)';

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '90px' }}>
      <Navbar />
      <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', fontWeight: 700 }}
        >
          <span className="material-symbols-outlined">arrow_back</span> {t('common.back')}
        </button>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', color: 'var(--on-surface)' }}>{t('report.title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>{t('report.subtitle')}</p>

        {error && <div className="log-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}
        {success && <div className="vr-alert success"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

        <form
          onSubmit={handleSubmit}
          style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem' }}
        >
          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.name')} *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('report.namePh')} style={{ ...inputStyle, marginTop: '0.35rem' }} />

          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.address')}</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('report.addressPh')} style={{ ...inputStyle, marginTop: '0.35rem' }} />

          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.types')} *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0 0.9rem' }}>
            {BIN_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: '99px', cursor: 'pointer',
                  border: types.includes(type) ? 'none' : '1px solid var(--outline-variant)',
                  background: types.includes(type) ? 'var(--primary)' : 'var(--surface)',
                  color: types.includes(type) ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  fontSize: '0.8rem', fontWeight: 700,
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.desc')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('report.descPh')} style={{ ...inputStyle, marginTop: '0.35rem', minHeight: '70px' }} />

          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.photo')} *</label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--outline-variant)', borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer', margin: '0.5rem 0 0.35rem', background: 'var(--surface)' }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Bin site" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px' }} />
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>add_a_photo</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{t('report.photoHint')}</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          />

          <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>{t('report.location')} *</label>
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--primary)', background: coords ? 'var(--primary-fixed)' : 'var(--surface)', color: coords ? 'var(--on-primary-fixed)' : 'var(--primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <span className="material-symbols-outlined">my_location</span>
            {locating ? t('report.locating') : coords ? `${t('report.located')} (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})` : t('report.locate')}
          </button>
          {locError && <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.4rem' }}>{locError}</p>}
          {coords?.accuracy > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.3rem' }}>{t('report.accuracy', { m: coords.accuracy })}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 800, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? t('report.submitting') : t('report.submit')}
          </button>
        </form>

        {mine.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--on-surface)' }}>{t('report.myReports')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mine.map((r) => (
                <div key={r._id} style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                  {r.photoUrl && <img src={r.photoUrl} alt={r.name} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{(r.types || []).join(', ')}</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor(r.status) }}>
                      {t(`report.status.${r.status}`) || r.status}
                      {r.reviewNote ? ` — ${r.reviewNote}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
