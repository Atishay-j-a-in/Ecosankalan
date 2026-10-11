import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { useLanguage } from '../i18n/LanguageContext';
import { getProducts, getMyVouchers, getProfile, getProductRedirectUrl } from '../services/api';
import '../styles/shop.css';

const PARTNERS = [
  { name: 'IKEA',      logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcojhNb1tYMY1-v6eRbvJILqIwb2Cn-CP3YvtquBvkdKMYgMZJxLMbhX7lbVXLTAdvXYEwulNdmlXohGbWRhKqLHIADNw1hYAHDeAajQV3G_N14RdEzCz-WootC7J1nj6Qn_r19ySTzcaT0zoL5R2vxZKOGqV7N8yiBKorfb29FzygeKCgg8k4jl6JevgXNgnIYlpLOCk9yOl_TNsMKvTOUJojbqRc6g3W__ROI8vZ3K7o3Ui1HtSYwVQ43QZiaVjMW9DUNuMsrbnY' },
  { name: 'Amazon',    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuNwp13D2GVapRliA0KsLo4B-Os1eyfKpeWvvHYzVH557YZ-v2TjydkdfZ2JjBatHbXU_KZChdz3E4eeW9AMey4ctP0MkWZkIyjol8SKKJVTqO0FvbL75qP5UeTBDvE0SnPdLjPEV710IlanlS1f2E5m2V6xThYaSXdpyZQ9HjFMVYWtzPMnmwxkZ_M0IaOSx7VX5UCF7sxSrAyqOEiu5ZRaEAvff5ukn8rnX1pD4eLyOZCuovbDBFy9IS8Ulyrjmd-GDkbJniRuA5' },
  { name: 'Decathlon', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHlbudSqV7DRX5ag4LK5dxcG3oNWtDupwbLbkkPr3vPkSEzHCWeAw1eA3pvTyO_UWwTAug_LQF2RBrih4Qpgd-kxZ5rt7zw3uS8WOaxCQaxaAxv0lVeNdiHxVrjObDaC7u4ZbngKwIJYn75BO1KaLxOmK8WeNTvy9Zc9Hkjm2vI4L4LiRwAd_AwtfTn9k3-CuCj1riMCFA2elGDXu_IZlLjYScaKocck7hNrmt-Igr1x5lJCi1qnjcNJpIcUXhGxY6sVouPvk8v6mJ' },
];

// Fallback products if backend returns empty
const FALLBACK_PRODUCTS = [
  { _id: '1', name: 'Bamboo Travel Set',      partnerName: 'IKEA',      ecoPointsCost: 450, category: 'Home',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfiSL1MuBMWm7RNu9yqMvHLSUrHOT66R0_SSVlnkLLLd2JSKF8UW1otoFZc25BjVmQCL-_J9O76BBsDxWb4Uvd3DlmuOvtQCgHewaqEkVDIUsygPNr5ECXRLlKaimaP_thAlLBMx16kVc8Fu7nLEdH7kGKiek8yjirR05KpOEyDqMcxxkNwb9Po0UCUDfIrVyL564RZzABv3KLG8ABmDKNl1tysyrsRgtG8et97Cb2uyv47Pj67IVykleoAjdLFy4pUYJjTG5ef8mo' },
  { _id: '2', name: 'Stainless Steel Bottle', partnerName: 'Amazon',    ecoPointsCost: 850, category: 'Reusable',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCWfvdvXmQaNQISlOp_Ir-U1vz_esYatMo7Az1oaXv1bDO1CCxeDyQVsS_EPP_EjOEF66mit_Jqb9J4BD-kdTkcGtPXHE2m_tPqcnqCRZr46lg-4lYJRteNM5WPa0nJi9oOr7NplC_iOvUAdR0YG4YJ-vkkMiEBTOItbHVXNNcnNohODBjFhWs1LC5dGib-6ZWuqHt-6aT8kbCgsdi13razrBy6io8o0gDOq5A91wEqPPYJJ8MaI2J38N8WwpHiDism6hsZzggyOM0' },
  { _id: '3', name: 'Cork Yoga Mat',           partnerName: 'Decathlon', ecoPointsCost: 1200, category: 'Zero Waste',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYq_ChRfJ4BcXv-CO0xQaYMolp_gjwK9sO19FXVxW4YAii6t-7ibylveUc6lXgsP9ghtMID_dWkQP2P6gYs4RjERwPqscel7UGYxHKFLKTOj8VI4Ob0G_FxNbcdSo6POaEq65I4qniwsqCpPzpdbts53UeYk74mLIS-FrnBJOjOfN1LEe-tuNlK9Nv7jU1FDvKoAk6sz2SZDEf6Osys0ZyKVX-01DCbqy7XT247AC0TE710dSGMplPkspJ3zdUfLLDouNuT3OSNRRQ' },
];

const FILTER_CHIPS = ['All', 'Home', 'Kitchen', 'Reusable', 'Zero Waste', 'Electronics'];

export default function ShopPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [myVouchers,    setMyVouchers]    = useState([]);
  const [userPoints,    setUserPoints]    = useState(0);
  const [activeChip,    setActiveChip]    = useState('All');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [revealedCodes, setRevealedCodes] = useState({});

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const pRes = await getProducts();
      const list = Array.isArray(pRes.data) ? pRes.data : (pRes.data?.products || []);
      return list.length > 0 ? list : FALLBACK_PRODUCTS;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vRes, uRes] = await Promise.all([
          getMyVouchers(),
          getProfile(),
        ]);
        setMyVouchers(Array.isArray(vRes.data) ? vRes.data : []);
        setUserPoints(uRes.data?.user?.ecoPoints ?? uRes.data?.ecoPoints ?? 0);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[shop] failed to load profile/vouchers:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleCode = (id) => setRevealedCodes(p => ({ ...p, [id]: !p[id] }));

  const handleProductClick = (product) => {
    navigate('/product-detail', { state: { product } });
  };

  const handleBuyOnPartner = (e, product) => {
    e.stopPropagation();
    if (product._id === '1') return window.open('https://www.ikea.com/in/en/', '_blank');
    if (product._id === '2') return window.open('https://www.amazon.in/', '_blank');
    if (product._id === '3') return window.open('https://www.decathlon.in/', '_blank');
    
    if (product._id && !product._id.startsWith('fallback')) {
      window.open(getProductRedirectUrl(product._id), '_blank', 'noopener,noreferrer');
    } else {
      navigate('/product-detail', { state: { product } });
    }
  };

  const filtered = products.filter(p => {
    const matchesChip = activeChip === 'All' || (p.category || '').toLowerCase() === activeChip.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChip && matchesSearch;
  });

  const maskCode = (code) => {
    if (!code) return '••••••••';
    return code.slice(0, 3) + '•'.repeat(Math.max(0, code.length - 5)) + code.slice(-2);
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return t('shop.validUntil', { date: d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' }) });
  };

  const activeVouchers = myVouchers.filter(v => !v.expiresAt || new Date(v.expiresAt) > new Date());

  return (
    <div className="shop-root">
      <Navbar />
      <main className="shop-main">

        {/* Search Input Bar - Navigates to dedicated /shop/search page */}
        <div 
          className="shop-search-wrap" 
          onClick={() => navigate('/shop/search')}
          style={{ cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined shop-search-icon">search</span>
          <input 
            className="shop-search-input" 
            placeholder={t('shop.searchPh')} 
            type="text" 
            value={searchQuery}
            readOnly
            style={{ cursor: 'pointer' }}
          />
        </div>

        {/* Hero */}
        <section className="shop-hero">
          <div className="shop-hero-left">
            <h1 className="shop-hero-title">{t('shop.heroA')} <span className="shop-hero-accent">{t('shop.heroAccent')}</span></h1>
            <p className="shop-hero-desc">{t('shop.heroDesc')}</p>
          </div>

          <div className="shop-balance-card">
            <div className="shop-balance-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            </div>
            <div>
              <span className="shop-balance-label">{t('shop.balance')}</span>
              <span className="shop-balance-amount">{loading ? '…' : userPoints.toLocaleString('en-IN')} EP</span>
            </div>
          </div>
        </section>

        {/* My Vouchers */}
        {activeVouchers.length > 0 && (
          <section className="shop-section">
            <div className="shop-section-header">
              <h2 className="shop-section-title">{t('shop.myVouchers')}</h2>
              <button className="shop-view-all" onClick={() => navigate('/vouchers')}>{t('common.viewAll')}</button>
            </div>
            <div className="shop-vouchers-list">
              {activeVouchers.slice(0, 3).map(v => (
                <div className="shop-voucher-card" key={v._id}>
                  <div className="shop-voucher-left">
                    <div className="shop-voucher-logo-wrap">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                    </div>
                    <span className="shop-voucher-brand">{v.partnerName}</span>
                  </div>
                  <div className="shop-voucher-dash" />
                  <div className="shop-voucher-right">
                    <div>
                      <h3 className="shop-voucher-discount">{v.discountLabel || t('vr.voucher')}</h3>
                      <p className="shop-voucher-valid">{formatExpiry(v.expiresAt)}</p>
                    </div>
                    <div className="shop-voucher-code-row">
                      <code className="shop-voucher-code" onClick={() => toggleCode(v._id)}>
                        {revealedCodes[v._id] ? v.code : maskCode(v.code)}
                      </code>
                      <button className="shop-copy-btn" onClick={() => toggleCode(v._id)}>
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter Chips */}
        <div className="shop-chips-wrap">
          <div className="shop-chips-scroll">
            {FILTER_CHIPS.map(chip => (
              <button key={chip} className={`shop-chip${activeChip === chip ? ' active' : ''}`} onClick={() => setActiveChip(chip)}>{chip === 'All' ? t('shop.chipAll') : chip}</button>
            ))}
          </div>
        </div>

        {/* Featured Partners */}
        <section className="shop-section">
          <h3 className="shop-section-title" style={{ marginBottom: '1rem' }}>{t('shop.partners')}</h3>
          <div className="shop-partners-scroll">
            {PARTNERS.map(p => (
              <div className="shop-partner-tile" key={p.name}>
                <img src={p.logo} alt={p.name} className="shop-partner-logo" />
              </div>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section className="shop-section">
          <div className="shop-section-header">
            <h3 className="shop-section-title">{t('shop.picks')}</h3>
            <button 
              className="shop-view-all" 
              onClick={() => navigate('/shop/search')}
            >
              {t('shop.seeAll')}
            </button>
          </div>

          {(productsLoading || loading) ? (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }}>progress_activity</span>
            </div>
          ) : (
            <div className="shop-grid">
              {filtered.map(product => (
                <div className="shop-card" key={product._id} onClick={() => handleProductClick(product)}>
                  <div className="shop-card-img-wrap">
                    <img className="shop-card-img" src={product.imageUrl || product.img} alt={product.name} />
                    <div className="shop-card-partner-badge">
                      <span className="material-symbols-outlined shop-verified-icon">verified</span>
                      <span className="shop-partner-name">{product.partnerName || product.partner}</span>
                    </div>
                  </div>
                  <div className="shop-card-body">
                    <h4 className="shop-card-name">{product.name}</h4>
                    <div className="shop-card-pts-row">
                      <span className="material-symbols-outlined shop-star-icon" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                      <span className="shop-card-pts">{product.ecoPointsCost || product.points} {t('shop.pts')}</span>
                    </div>
                      <button className="shop-buy-btn" onClick={e => handleBuyOnPartner(e, product)}>
                      {t('shop.buyPartner')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
