/**
 * MapLocationPicker — tap-to-set location picker for admin forms.
 *
 * Renders a small Leaflet map. Tapping the map drops/moves a marker and
 * reports { lat, lng } via onPick. "Use my location" fills from GPS.
 * Parent owns the lat/lng state; the marker follows value props.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DEFAULT_CENTER = [28.61, 77.03]; // Delhi NCR

// Number('') is 0 — guard empty inputs so they never read as [0, 0]
// (Gulf of Guinea, off Africa).
const toCoord = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

export default function MapLocationPicker({ lat, lng, onPick, locateLabel }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Init once on mount (the picker mounts fresh each time its tab opens,
  // so the container always has real dimensions here).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasPoint = Number.isFinite(toCoord(lat)) && Number.isFinite(toCoord(lng));
    const map = L.map(containerRef.current, {
      center: hasPoint ? [toCoord(lat), toCoord(lng)] : DEFAULT_CENTER,
      // Zoomed out by default so the country context stays visible.
      zoom: hasPoint ? 15 : 4,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      if (onPickRef.current) onPickRef.current(e.latlng.lat, e.latlng.lng);
    });
    // Enable scroll zoom only after the map gets focus (avoids trapping page scroll).
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker follows the parent-owned value.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const la = toCoord(lat);
    const ln = toCoord(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([la, ln]).addTo(map);
      map.setView([la, ln], Math.max(map.getZoom(), 13));
    } else {
      markerRef.current.setLatLng([la, ln]);
    }
  }, [lat, lng]);

  const handleLocate = () => {
    if (!navigator.geolocation || !onPickRef.current) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onPickRef.current(coords.latitude, coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        ref={containerRef}
        style={{ height: '220px', borderRadius: '12px', position: 'relative', zIndex: 0 }}
      />
      <button
        type="button"
        onClick={handleLocate}
        style={{
          marginTop: '0.5rem', border: '1px solid var(--outline-variant)',
          background: 'var(--surface)', color: 'var(--primary)',
          borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer',
          fontWeight: 700, fontSize: '0.8rem', display: 'flex',
          alignItems: 'center', gap: '0.4rem',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>my_location</span>
        {locateLabel || 'Use my location'}
      </button>
    </div>
  );
}
