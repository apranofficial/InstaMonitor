export default function Dashboard() {
  const accounts = [
    { name: "panjeta_jazz", postsThisMonth: 12 },
    { name: "apran_khunger", postsThisMonth: 8 },
    { name: "meme_gods", postsThisMonth: 45 },
    { name: "fitness_journey", postsThisMonth: 3 },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="sidebar-logo">F</div>
          <h2>Fleet</h2>
        </div>
        
        <div style={{ marginTop: "24px" }}>
          <p className="widget-title" style={{ marginBottom: "12px" }}>Your Accounts</p>
          <ul className="account-list">
            <li className="account-item active">
              <span className="account-name">All Accounts</span>
              <span className="account-meta">50</span>
            </li>
            {accounts.map((acc, i) => (
              <li key={i} className="account-item">
                <span className="account-name">@{acc.name}</span>
                <span className="account-meta">{acc.postsThisMonth}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Dashboard Overview</h1>
            <p>August 2026</p>
          </div>
          <button style={{
            background: "var(--accent-color)", 
            color: "#fff", 
            border: "none", 
            padding: "10px 20px", 
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500"
          }}>
            Force Sync Now
          </button>
        </header>

        {/* Widgets */}
        <div className="widgets-grid">
          <div className="widget glass-panel">
            <span className="widget-title">Total Posts</span>
            <span className="widget-value">342</span>
          </div>
          <div className="widget glass-panel">
            <span className="widget-title">Active Accounts</span>
            <span className="widget-value">48 / 50</span>
          </div>
          <div className="widget glass-panel">
            <span className="widget-title">Most Active</span>
            <span className="widget-value" style={{ fontSize: "24px" }}>@meme_gods</span>
          </div>
        </div>

        {/* Heatmap Area */}
        <div className="heatmap-container glass-panel">
          <h3 style={{ marginBottom: "16px" }}>Posting Activity (Last 30 Days)</h3>
          
          <div className="heatmap-grid">
            {/* Generating mock heatmap columns (approx 30 columns for days) */}
            {Array.from({ length: 30 }).map((_, colIndex) => (
              <div key={colIndex} className="heatmap-column">
                {/* 4 rows for 4 different time blocks or top accounts */}
                {Array.from({ length: 5 }).map((_, rowIndex) => {
                  const randomHeat = Math.floor(Math.random() * 5); // 0 to 4
                  return (
                    <div 
                      key={rowIndex} 
                      className={`heat-cell heat-${randomHeat}`}
                      title={`Activity Level ${randomHeat}`}
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="heatmap-container glass-panel" style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
           <h2 style={{ color: "var(--text-secondary)" }}>Detailed Calendar View Coming Soon</h2>
        </div>

      </main>
    </div>
  );
}
