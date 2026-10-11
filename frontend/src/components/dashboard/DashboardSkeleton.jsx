export default function DashboardSkeleton() {
  return (
    <main className="dashboard-main" aria-busy="true" aria-label="Loading dashboard">
      <section className="hero-grid">
        <div className="eco-score-card" style={{ minHeight: '220px', opacity: 0.6 }} />
        <div className="impact-bento" style={{ opacity: 0.6 }}>
          <div className="bento-points" style={{ minHeight: '110px' }} />
          <div className="bento-fact" style={{ minHeight: '110px' }} />
        </div>
      </section>
      <section className="feed-grid">
        <div className="feed-col">
          <div className="activity-list">
            {[0, 1, 2].map((i) => (
              <div className="activity-item" key={i} style={{ opacity: 0.5 }}>
                <div className="activity-left">
                  <div className="activity-icon-wrap" />
                  <div className="activity-info">
                    <h4 className="activity-title">Loading…</h4>
                    <p className="activity-meta">Fetching your impact</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
