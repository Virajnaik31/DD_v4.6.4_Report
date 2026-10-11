const fs = require('fs');
const path = require('path');

function getReports(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (item.name === '.git' || item.name === 'node_modules') continue;
    const fullPath = path.join(dir, item.name);
    const relPath = path.join(baseDir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getReports(fullPath, relPath));
    } else if (item.name === 'index.html' && baseDir !== '' && baseDir !== '.') {
      results.push(relPath.split(path.sep).join('/'));
    }
  }
  return results;
}

const rawList = getReports(process.cwd());

const reports = rawList.map((relPath, index) => {
  const parts = relPath.split('/');
  // Expected structure:
  // CMT / brandMaster / brandMaster1_report / index.html
  // orderFulFilmentChecklist / case-001-020 / case001_report / index.html
  // orderFulFilmentChecklist / case021_report / index.html
  const mainModule = parts[0];
  let subModule = '';
  let reportFolder = '';

  if (parts.length === 4) {
    subModule = parts[1];
    reportFolder = parts[2];
  } else if (parts.length === 3) {
    subModule = parts[1].replace(/_report$/i, '');
    reportFolder = parts[1];
  } else {
    subModule = parts.slice(1, -1).join(' / ');
    reportFolder = parts[parts.length - 2];
  }

  // Format clean name
  let cleanName = reportFolder.replace(/_report$/i, '');
  cleanName = cleanName.replace(/_/g, ' ');

  // Clean submodule
  let cleanSub = subModule.replace(/_/g, ' ');

  return {
    id: index + 1,
    module: mainModule,
    subModule: cleanSub,
    reportName: cleanName,
    path: relPath,
    fullTitle: `${mainModule} • ${cleanSub} • ${cleanName}`
  };
});

// Group counts
const counts = {
  total: reports.length,
  CMT: reports.filter(r => r.module === 'CMT').length,
  superadmin: reports.filter(r => r.module === 'superadmin').length,
  orderFulfilment: reports.filter(r => r.module === 'orderFulfilment').length,
  orderFulFilmentChecklist: reports.filter(r => r.module === 'orderFulFilmentChecklist').length
};

const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DealsDray V4.6.4 Test Automation Reports Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0e17;
      --bg-card: rgba(18, 24, 38, 0.75);
      --bg-card-hover: rgba(26, 35, 54, 0.9);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(56, 189, 248, 0.3);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent-cyan: #38bdf8;
      --accent-blue: #3b82f6;
      --accent-indigo: #6366f1;
      --accent-purple: #a855f7;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --badge-cmt: #0284c7;
      --badge-admin: #8b5cf6;
      --badge-order: #10b981;
      --badge-checklist: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
      background-attachment: fixed;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }

    /* HEADER */
    .header {
      position: relative;
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border-color);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
    }

    .logo-icon svg {
      width: 26px;
      height: 26px;
      fill: #ffffff;
    }

    h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .version-tag {
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      padding: 0.25rem 0.65rem;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .links-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .gh-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.1rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-main);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .gh-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .gh-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    .header-sub {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 800px;
      line-height: 1.6;
    }

    /* STATS ROW */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--accent-blue);
      border-radius: 4px 0 0 4px;
    }

    .stat-card.total::before { background: linear-gradient(to bottom, #3b82f6, #8b5cf6); }
    .stat-card.cmt::before { background: #0284c7; }
    .stat-card.admin::before { background: #8b5cf6; }
    .stat-card.order::before { background: #10b981; }
    .stat-card.checklist::before { background: #f59e0b; }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
    }

    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 0.4rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
    }

    /* CONTROLS BAR */
    .controls-panel {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .search-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      fill: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.8rem 1rem 0.8rem 2.8rem;
      background: rgba(10, 14, 23, 0.8);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-main);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }

    /* FILTER TABS */
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tab-btn {
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.08);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25));
      border-color: var(--accent-blue);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }

    .tab-badge {
      font-size: 0.75rem;
      padding: 0.1rem 0.45rem;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* REPORTS GRID */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .report-card {
      background: var(--bg-card);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
      position: relative;
    }

    .report-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-accent);
      transform: translateY(-3px);
      box-shadow: 0 16px 32px -12px rgba(0, 0, 0, 0.6);
    }

    .report-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.85rem;
      gap: 0.75rem;
    }

    .module-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      white-space: nowrap;
    }

    .module-badge.CMT { background: rgba(2, 132, 199, 0.2); color: #38bdf8; border: 1px solid rgba(2, 132, 199, 0.4); }
    .module-badge.superadmin { background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.4); }
    .module-badge.orderFulfilment { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .module-badge.orderFulFilmentChecklist { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }

    .submodule-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .report-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.6rem;
      line-height: 1.4;
      word-break: break-word;
    }

    .report-path-preview {
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      color: #64748b;
      margin-bottom: 1.1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .open-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .open-btn:hover {
      background: linear-gradient(135deg, #1d4ed8, #4338ca);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      transform: translateY(-1px);
    }

    .open-btn svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      fill: none;
      stroke: var(--text-muted);
      stroke-width: 1.5;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* FOOTER */
    footer {
      margin-top: 4rem;
      padding: 2rem 0;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .reports-grid {
        grid-template-columns: 1fr;
      }
      h1 {
        font-size: 1.6rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <header class="header">
      <div class="header-top">
        <div class="brand-title">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h1>DealsDray Test Automation Portal</h1>
              <span class="version-tag">v4.6.4</span>
            </div>
            <p class="header-sub">Comprehensive interactive Playwright execution reports across CMT, SuperAdmin, Order Fulfilment, and Verification Checklist suites.</p>
          </div>
        </div>
        <div class="links-bar">
          <a href="https://github.com/Virajnaik31/DD_v4.6.4_Report" target="_blank" rel="noopener noreferrer" class="gh-btn">
            <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub Repository
          </a>
        </div>
      </div>
    </header>

    <!-- STATS ROW -->
    <div class="stats-grid">
      <div class="stat-card total" onclick="filterByModule('ALL')">
        <span class="stat-label">Total Reports</span>
        <span class="stat-value">${counts.total}</span>
      </div>
      <div class="stat-card cmt" onclick="filterByModule('CMT')">
        <span class="stat-label">CMT Suite</span>
        <span class="stat-value">${counts.CMT}</span>
      </div>
      <div class="stat-card admin" onclick="filterByModule('superadmin')">
        <span class="stat-label">SuperAdmin Suite</span>
        <span class="stat-value">${counts.superadmin}</span>
      </div>
      <div class="stat-card order" onclick="filterByModule('orderFulfilment')">
        <span class="stat-label">Order Fulfilment</span>
        <span class="stat-value">${counts.orderFulfilment}</span>
      </div>
      <div class="stat-card checklist" onclick="filterByModule('orderFulFilmentChecklist')">
        <span class="stat-label">Checklist Cases</span>
        <span class="stat-value">${counts.orderFulFilmentChecklist}</span>
      </div>
    </div>

    <!-- CONTROLS -->
    <div class="controls-panel">
      <div class="search-row">
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24"><path d="M21.71 20.29l-5.4-5.4A8.93 8.93 0 0018 9a9 9 0 10-9 9 8.93 8.93 0 005.89-1.69l5.4 5.4a1 1 0 001.42 0 1 1 0 000-1.42zM4 9a7 7 0 117 7 7 7 0 01-7-7z"/></svg>
          <input type="text" id="searchInput" class="search-input" placeholder="Search by test name, module, case ID (e.g. brandMaster, case021, CO_01)..." oninput="handleSearch()" />
        </div>
      </div>
      <div class="filter-tabs">
        <button class="tab-btn active" data-filter="ALL" onclick="filterByModule('ALL')">
          All Reports <span class="tab-badge">${counts.total}</span>
        </button>
        <button class="tab-btn" data-filter="CMT" onclick="filterByModule('CMT')">
          CMT <span class="tab-badge">${counts.CMT}</span>
        </button>
        <button class="tab-btn" data-filter="superadmin" onclick="filterByModule('superadmin')">
          SuperAdmin <span class="tab-badge">${counts.superadmin}</span>
        </button>
        <button class="tab-btn" data-filter="orderFulfilment" onclick="filterByModule('orderFulfilment')">
          Order Fulfilment <span class="tab-badge">${counts.orderFulfilment}</span>
        </button>
        <button class="tab-btn" data-filter="orderFulFilmentChecklist" onclick="filterByModule('orderFulFilmentChecklist')">
          Checklist Cases <span class="tab-badge">${counts.orderFulFilmentChecklist}</span>
        </button>
      </div>
    </div>

    <!-- REPORT LIST -->
    <div class="reports-grid" id="reportsGrid">
      <!-- Populated dynamically via JS -->
    </div>

    <!-- FOOTER -->
    <footer>
      <div>DealsDray Automation Engineering Team • UAT Version 4.6.4</div>
      <div>Hosted via GitHub Pages & Fastly CDN</div>
    </footer>
  </div>

  <script>
    const reportsData = ${JSON.stringify(reports)};
    let activeModule = 'ALL';
    let searchQuery = '';

    function renderReports() {
      const container = document.getElementById('reportsGrid');
      const filtered = reportsData.filter(item => {
        const matchesModule = (activeModule === 'ALL') || (item.module === activeModule);
        const matchesSearch = !searchQuery || 
          item.fullTitle.toLowerCase().includes(searchQuery) ||
          item.path.toLowerCase().includes(searchQuery);
        return matchesModule && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <h3>No reports matching "\${searchQuery}"</h3>
            <p>Try clearing your search query or selecting another module.</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(item => {
        let badgeClass = item.module;
        let badgeLabel = item.module;
        if (item.module === 'orderFulFilmentChecklist') badgeLabel = 'Checklist';
        if (item.module === 'orderFulfilment') badgeLabel = 'Fulfilment';

        return \`
          <div class="report-card">
            <div>
              <div class="report-card-header">
                <span class="module-badge \${badgeClass}">\${badgeLabel}</span>
                <span class="submodule-text" title="\${item.subModule}">\${item.subModule}</span>
              </div>
              <div class="report-title">\${item.reportName}</div>
              <div class="report-path-preview" title="\${item.path}">\${item.path}</div>
            </div>
            <div class="card-actions">
              <a href="\${item.path}" target="_blank" rel="noopener noreferrer" class="open-btn">
                <span>View Full Report</span>
                <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            </div>
          </div>
        \`;
      }).join('');
    }

    function filterByModule(moduleName) {
      activeModule = moduleName;
      document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === moduleName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      renderReports();
    }

    function handleSearch() {
      searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
      renderReports();
    }

    // Initial render
    renderReports();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(process.cwd(), 'index.html'), htmlContent, 'utf8');
console.log('Successfully generated index.html at root with', reports.length, 'reports!');
