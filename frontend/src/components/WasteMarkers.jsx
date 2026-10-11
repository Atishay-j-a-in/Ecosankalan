/**
 * WasteMarkers.jsx — Renders backend-sourced waste locations on the Leaflet map.
 *
 * Data source: GET /api/v1/markers?north=&south=&east=&west= (DB bins,
 * viewport-filtered server-side). DB bin types are mapped onto the
 * display categories below at normalisation time.
 *
 * Features:
 *  - Debounced fetch on map pan/zoom (400ms)
 *  - Cancellable in-flight requests (AbortController)
 *  - Cached markers always visible — never cleared mid-fetch
 *  - MarkerCluster when >500 markers
 *  - Category-based icon markers (trash bin, recycling, etc.)
 *  - Toggleable filters without re-fetching
 *  - Loading indicator
 *
 * Ownership: this layer is active ONLY when activeFilter === 'all'.
 * CommunityPage renders 'nearby' and 'events' itself, so exactly one
 * marker system is live per filter — no double pins.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet.markercluster';
import { getMapMarkers } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

/* ── Marker palette: color + Material Symbol icon per category ──── */
const CATEGORY_META = {
  waste_basket:           { labelKey: 'mark.wasteBaskets',     color: '#005127', icon: 'delete',           bgColor: '#e8f5e9' },
  recycling:              { labelKey: 'mark.recyclingBins',    color: '#1565C0', icon: 'recycling',        bgColor: '#e3f2fd' },
  recycling_centre:       { labelKey: 'mark.recyclingCentres', color: '#7B1FA2', icon: 'recycling',        bgColor: '#f3e5f5' },
  waste_transfer_station: { labelKey: 'mark.transfer',         color: '#E65100', icon: 'local_shipping',   bgColor: '#fff3e0' },
  landfill:               { labelKey: 'mark.landfills',         color: '#B71C1C', icon: 'terrain',          bgColor: '#ffebee' },
};

const COLOR_MAP = {
  green:  '#005127',
  blue:   '#1565C0',
  purple: '#7B1FA2',
  orange: '#E65100',
  red:    '#B71C1C',
  grey:   '#546E7A',
};

/* ── Default active categories ─────────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { key: 'waste_basket',          active: true },
  { key: 'recycling',             active: true },
  { key: 'recycling_centre',      active: true },
  { key: 'waste_transfer_station',active: true },
  { key: 'landfill',              active: true },
];

/* ── Helpers ───────────────────────────────────────────────────── */

function locationToFilterKey(loc) {
  const cat = loc.category;
  if (cat === 'Waste Basket')           return 'waste_basket';
  if (cat === 'Recycling Bin')          return 'recycling';
  if (cat === 'Recycling Centre')       return 'recycling_centre';
  if (cat === 'Waste Transfer Station') return 'waste_transfer_station';
  if (cat === 'Waste Disposal')         return 'waste_transfer_station';
  if (cat === 'Landfill')               return 'landfill';
  if (cat === 'Wastewater Plant')       return 'landfill';
  return 'other';
}

function getMeta(filterKey) {
  return CATEGORY_META[filterKey] || { labelKey: 'mark.other', color: '#546E7A', icon: 'help', bgColor: '#eceff1' };
}

function createWasteIcon(filterKey) {
  const meta = getMeta(filterKey);
  const html = `
    <div class="waste-pin" style="--pin-color:${meta.color}">
      <div class="waste-pin-head">
        <span class="material-symbols-outlined" style="font-size:16px;color:#fff;font-variation-settings:'FILL' 1">${meta.icon}</span>
      </div>
      <div class="waste-pin-tail"></div>
    </div>`;
  return L.divIcon({
    className: 'waste-marker-icon',
    html,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });
}

function buildPopupHTML(loc, filterKey) {
  const meta = getMeta(filterKey);
  const name = loc.name || loc.category;
  const tagRows = Object.entries(loc.tags || {})
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `<tr><td style="color:#666;white-space:nowrap;padding:1px 6px 1px 0">${k}</td><td style="padding:1px 0">${v}</td></tr>`)
    .join('');

  return `
    <div style="font-family:Inter,sans-serif;min-width:180px;max-width:280px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:28px;height:28px;border-radius:50%;background:${meta.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span class="material-symbols-outlined" style="font-size:16px;color:#fff;font-variation-settings:'FILL' 1">${meta.icon}</span>
        </div>
        <div>
          <div style="font-weight:700;font-size:0.95rem;line-height:1.2">${name}</div>
          <div style="font-size:0.7rem;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${loc.category}</div>
        </div>
      </div>
      <div style="font-size:0.75rem;color:#888;margin-bottom:4px">
        OSM ID: ${loc.osmId || 'N/A'} &middot; ${loc.type || 'Bin'}<br/>
        ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
      </div>
      ${tagRows ? `<div style="max-height:120px;overflow-y:auto;margin-top:6px;border-top:1px solid #eee;padding-top:4px"><table style="font-size:0.7rem;border-collapse:collapse;width:100%">${tagRows}</table></div>` : ''}
    </div>
  `;
}

export default function WasteMarkers({ map, activeFilter = 'all', onMarkerClick }) {
  const { t } = useLanguage();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [chipState, setChipState] = useState(DEFAULT_CATEGORIES);

  // This layer only owns the 'all' filter. CommunityPage renders
  // 'nearby' and 'events' itself — see the early returns below.
  const isActive = activeFilter === 'all';

  const layerRef           = useRef(null);
  const debounceRef        = useRef(null);
  const clusterEnabled     = useRef(false);
  const categoriesRef      = useRef(DEFAULT_CATEGORIES);
  const locationsRef       = useRef([]);
  const onMarkerClickRef   = useRef(onMarkerClick);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  /* ── Render all locations currently visible in viewport ─────── */
  const renderMarkers = useCallback(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      map.addLayer(layerRef.current);
    }

    layerRef.current.clearLayers();

    if (!isActive) {
      return;
    }

    const activeKeys = new Set(
      categoriesRef.current.filter(c => c.active).map(c => c.key)
    );

    const locations = locationsRef.current;
    const useCluster = locations.length > 500;

    if (useCluster && !clusterEnabled.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="waste-cluster">${count}</div>`,
            className: 'waste-cluster-icon',
            iconSize: [36, 36],
          });
        },
      });
      map.addLayer(layerRef.current);
      clusterEnabled.current = true;
    } else if (!useCluster && clusterEnabled.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = L.layerGroup();
      map.addLayer(layerRef.current);
      clusterEnabled.current = false;
    }

    for (const loc of locations) {
      const filterKey = locationToFilterKey(loc);
      if (!activeKeys.has(filterKey)) continue;

      const icon = createWasteIcon(filterKey);
      const marker = L.marker([loc.lat, loc.lng], { icon });
      marker.bindPopup(buildPopupHTML(loc, filterKey), { maxWidth: 300 });
      marker.on('click', () => {
        if (onMarkerClickRef.current) {
          onMarkerClickRef.current({
            lat: loc.lat,
            lng: loc.lng,
            name: loc.name || loc.category,
            category: loc.category,
            _lat: loc.lat,
            _lng: loc.lng,
          });
        }
      });
      layerRef.current.addLayer(marker);
    }
  }, [map, isActive]);

  /* ── Fetch backend markers — cancellable, results cached in ref ── */
  const fetchData = useCallback(async (bounds) => {
    if (!bounds || !isActive) {
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { data } = await getMapMarkers({
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
      }, { signal: controller.signal });

      if (controller.signal.aborted) return;

      // Backend returns { locations } already shaped for renderMarkers
      // (see GET /api/v1/markers). Guard coords defensively.
      const incoming = Array.isArray(data?.locations) ? data.locations : [];
      locationsRef.current = incoming
        .map((loc) => {
          const lat = Number(loc?.lat);
          const lng = Number(loc?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return loc;
        })
        .filter(Boolean);

      renderMarkers();
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || axios.isCancel?.(err)) {
        return;
      }
      console.error('[WasteMarkers] Fetch error:', err);
      setError(err.message || t('mark.errFail'));
    } finally {
      if (abortControllerRef.current === controller && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [renderMarkers, isActive, t]);

  /* ── Debounced map move handler ────────────────────────────── */
  const onMapMove = useCallback(() => {
    if (!isActive) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!map) return;
      const b = map.getBounds();
      fetchData({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    }, 400);
  }, [map, fetchData, isActive]);

  /* ── Attach map events — runs ONCE, never re-runs ────────────── */
  useEffect(() => {
    if (!map) return;

    if (!isActive) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setLoading(false);
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
      return;
    }

    map.on('moveend', onMapMove);
    map.on('zoomend', onMapMove);

    // Initial fetch
    const b = map.getBounds();
    fetchData({
      south: b.getSouth(), west: b.getWest(),
      north: b.getNorth(), east: b.getEast(),
    });

    return () => {
      map.off('moveend', onMapMove);
      map.off('zoomend', onMapMove);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [map, isActive, onMapMove, fetchData]);

  /* ── Filter toggle — updates ref + re-renders markers ──────── */
  const toggleCategory = (key) => {
    setChipState(prev => {
      const next = prev.map(c => c.key === key ? { ...c, active: !c.active } : c);
      categoriesRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    renderMarkers();
  }, [chipState, renderMarkers]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="waste-markers-ui">
      <div className="waste-filter-chips">
        {chipState.map(cat => {
          const meta = getMeta(cat.key);
          return (
            <button
              key={cat.key}
              className={`waste-chip ${cat.active ? 'active' : ''}`}
              style={cat.active ? { borderColor: meta.color, background: meta.color, color: '#fff' } : {}}
              onClick={() => toggleCategory(cat.key)}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '15px',
                color: cat.active ? '#fff' : meta.color,
                fontVariationSettings: "'FILL' 1",
              }}>{meta.icon}</span>
              {t(meta.labelKey)}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="waste-loading-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <span>{t('mark.fetching')}</span>
        </div>
      )}

      {!loading && error && (
        <div className="waste-error-badge" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
          {/bounding box/i.test(error) ? (
            <span>{t('mark.zoomIn')}</span>
          ) : (
            <>
              <span>{t('mark.fail')} </span>
              <button type="button" className="waste-retry-btn" aria-label={t('mark.retry')} onClick={() => {
                if (!map) return;
                const b = map.getBounds();
                fetchData({
                  north: b.getNorth(), south: b.getSouth(),
                  east: b.getEast(), west: b.getWest(),
                });
              }}>{t('mark.retry')}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
