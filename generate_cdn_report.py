import os
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
github_username = "Virajnaik31"
github_repo = "DD_v4.6.4_Report"
gh_pages_base = f"https://{github_username.lower()}.github.io/{github_repo}/"
raw_base = f"https://raw.githubusercontent.com/{github_username}/{github_repo}/main/"
githack_base = f"https://raw.githack.com/{github_username}/{github_repo}/main/"
jsdelivr_base = f"https://cdn.jsdelivr.net/gh/{github_username}/{github_repo}@main/"

# Read master data
data_js_path = os.path.join(base_dir, 'data', 'master_data.js')
with open(data_js_path, 'r', encoding='utf-8') as f:
    master_data_content = f.read().replace('window.MASTER_DATA = ', '').rstrip(';\n ')

# Read CSS
css_path = os.path.join(base_dir, 'master_style.css')
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Read App JS
app_js_path = os.path.join(base_dir, 'master_app.js')
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js_content = f.read()

# Cloud-Powered Asset Resolver for Standalone Sharing
cdn_patch = f"""
  // Primary online media sources
  const GH_PAGES_BASE = "{gh_pages_base}";
  const RAW_BASE = "{raw_base}";
  const GITHACK_BASE = "{githack_base}";
  const JSDELIVR_BASE = "{jsdelivr_base}";
  window.GH_PAGES_BASE = GH_PAGES_BASE;
  window.RAW_BASE = RAW_BASE;

  function getMediaUrl(path) {{
    if (!path) return "";
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {{
      return path;
    }}
    const cleanPath = path.replace(/^\\.?\\//, '');
    // If running on local server/file or github pages, use relative path if local, else CDN
    if (window.location.protocol === 'file:') {{
      return './' + cleanPath;
    }}
    return GH_PAGES_BASE + cleanPath;
  }}

  // Multi-tier image fallback: GitHub Pages -> GitHub Raw -> Raw Githack -> Local -> jsDelivr
  window.handleImgError = function(img, originalPath) {{
    if (!originalPath) return;
    const cleanPath = originalPath.replace(/^\\.?\\//, '');
    
    if (!img.dataset.step) {{
      img.dataset.step = "1";
      img.src = RAW_BASE + cleanPath;
      return;
    }}
    if (img.dataset.step === "1") {{
      img.dataset.step = "2";
      img.src = GITHACK_BASE + cleanPath;
      return;
    }}
    if (img.dataset.step === "2") {{
      img.dataset.step = "3";
      img.src = './' + cleanPath;
      return;
    }}
    if (img.dataset.step === "3") {{
      img.dataset.step = "4";
      img.src = JSDELIVR_BASE + cleanPath;
      return;
    }}
  }};

  // Multi-tier video fallback
  window.handleVideoError = function(video, originalPath) {{
    if (!originalPath) return;
    const cleanPath = originalPath.replace(/^\\.?\\//, '');
    
    if (!video.dataset.step) {{
      video.dataset.step = "1";
      video.src = RAW_BASE + cleanPath;
      video.load();
      return;
    }}
    if (video.dataset.step === "1") {{
      video.dataset.step = "2";
      video.src = GITHACK_BASE + cleanPath;
      video.load();
      return;
    }}
    if (video.dataset.step === "2") {{
      video.dataset.step = "3";
      video.src = './' + cleanPath;
      video.load();
      return;
    }}
  }};
"""

# Replace in app JS with cloud-ready handlers
modified_js = app_js_content.replace(
  '<img src="./${imgPath}" alt="${escapeHtml(att.name)}" loading="lazy">',
  '<img src="${getMediaUrl(imgPath)}" data-orig="${imgPath}" onerror="handleImgError(this, \'${imgPath}\')" alt="${escapeHtml(att.name)}" loading="lazy">'
).replace(
  '<img src="./${sf.path}" alt="${escapeHtml(sf.name)}" loading="lazy">',
  '<img src="${getMediaUrl(sf.path)}" data-orig="${sf.path}" onerror="handleImgError(this, \'${sf.path}\')" alt="${escapeHtml(sf.name)}" loading="lazy">'
).replace(
  '<video id="testVideoPlayer" controls preload="metadata">\n              <source src="./${videoObj.path}" type="video/webm">\n              Your browser does not support HTML5 video playback.\n            </video>',
  f'<video id="testVideoPlayer" controls preload="metadata" src="${{getMediaUrl(videoObj.path)}}" onerror="handleVideoError(this, \'${{videoObj.path}}\')">\n              <source src="${{getMediaUrl(videoObj.path)}}" type="video/webm">\n              <source src="{raw_base}${{videoObj.path}}" type="video/webm">\n              <source src="{githack_base}${{videoObj.path}}" type="video/webm">\n              <source src="./${{videoObj.path}}" type="video/webm">\n              Your browser does not support HTML5 video playback.\n            </video>'
).replace(
  'elements.lightboxImg.src = `./${imgObj.path}`;',
  'elements.lightboxImg.src = getMediaUrl(imgObj.path); elements.lightboxImg.onerror = function() { handleImgError(this, imgObj.path); };'
).replace(
  'elements.lightboxDownload.href = `./${imgObj.path}`;',
  'elements.lightboxDownload.href = getMediaUrl(imgObj.path);'
)

# Insert CDN helper at top of IIFE
modified_js = modified_js.replace("(function () {\n  'use strict';", "(function () {\n  'use strict';" + cdn_patch)

# Parse stats for initial SSR markup
manifest_json = json.loads(master_data_content)
stats = manifest_json.get('stats', {})
total_count = stats.get('total', 145)
passed_count = stats.get('passed', 138)
failed_count = stats.get('failed', 7)
pass_rate = f"{round((passed_count / total_count * 100), 1)}%" if total_count else "100%"

html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DD 4.6.4 Master Test Reports</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
{css_content}
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Top Master Header / Navigation Bar -->
    <header class="master-header">
      <div class="brand-section">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        </div>
        <div class="brand-info">
          <h1>
            DD Test Reports
            <span class="tag-version">v4.6.4</span>
          </h1>
          <div class="subtitle">Unified Test Execution &amp; Artifacts Hub</div>
        </div>
      </div>

      <!-- Quick Navigation Bar for 4 Main Folders + 1 Failed -->
      <nav class="nav-tabs" id="navTabs">
        <!-- Rendered dynamically -->
      </nav>

      <!-- Suite Metrics -->
      <div class="header-stats">
        <div class="stat-pill" title="Total test reports executed">
          <span class="label">Total:</span>
          <span class="value" id="statTotal">{total_count}</span>
        </div>
        <div class="stat-pill" title="Passed tests">
          <span class="label">Passed:</span>
          <span class="value pass" id="statPassed">{passed_count}</span>
        </div>
        <div class="stat-pill" title="Failed tests">
          <span class="label">Failed:</span>
          <span class="value fail" id="statFailed">{failed_count}</span>
        </div>
        <div class="stat-pill" title="Overall pass rate">
          <span class="label">Rate:</span>
          <span class="value rate" id="statPassRate">{pass_rate}</span>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="main-workspace">
      <!-- Left Sidebar: Filtered Reports List -->
      <aside class="reports-sidebar">
        <div class="sidebar-filter-bar">
          <div class="search-box">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>
            <input type="text" id="searchInput" class="search-input" placeholder="Search tests, specs, folders...">
          </div>

          <!-- Grouping Controls Row -->
          <div class="sidebar-view-toggle-row">
            <div style="display: flex; gap: 4px;">
              <button class="folder-mode-btn active" id="btnFolderwise" title="Group reports by subfolders">
                📁 Folder-wise
              </button>
              <button class="folder-mode-btn" id="btnFlatList" title="Show flat list of reports">
                📋 Flat List
              </button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="tree-toggle-btn" onclick="toggleAllFolderGroups(true)" title="Expand all subfolders">➕</button>
              <button class="tree-toggle-btn" onclick="toggleAllFolderGroups(false)" title="Collapse all subfolders">➖</button>
            </div>
          </div>

          <div class="filter-meta-row">
            <span class="filter-count-badge" id="filterCount">Showing 0 reports</span>
            <div class="filter-tags">
              <button class="filter-chip active" id="chipAll" data-filter="ALL">All</button>
              <button class="filter-chip" id="chipPassed" data-filter="PASSED">Passed</button>
              <button class="filter-chip chip-fail" id="chipFailed" data-filter="FAILED">Failed</button>
            </div>
          </div>
        </div>

        <div class="reports-list" id="reportsList">
          <!-- Rendered dynamically -->
        </div>
      </aside>

      <!-- Right Detail Panel -->
      <section class="report-detail-panel" id="detailPanel">
        <!-- Empty State -->
        <div class="empty-state" id="emptyDetailState" style="margin: auto; display: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3>Select a test report from the left sidebar</h3>
          <p>Choose any case to inspect execution video, steps tree, attached screenshots, and logs.</p>
        </div>

        <!-- Populated Detail Content -->
        <div class="detail-content-wrapper" id="detailContent">
          <!-- Rendered dynamically -->
        </div>
      </section>
    </main>

    <!-- Fullscreen Lightbox Modal for Screenshots -->
    <div class="lightbox-modal" id="lightboxModal">
      <div class="lightbox-header">
        <div class="lightbox-title" id="lightboxTitle">Screenshot Preview</div>
        <div class="lightbox-controls">
          <span style="color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-mono);" id="lightboxCounter">1 / 1</span>
          <a href="#" download id="lightboxDownload" class="lightbox-btn" title="Download screenshot">
            ⬇️ Download
          </a>
          <button class="lightbox-btn" id="lightboxClose" title="Close (Esc)">
            ✕ Close
          </button>
        </div>
      </div>

      <button class="lightbox-nav-btn lightbox-prev" id="lightboxPrev" title="Previous screenshot (Left Arrow)">◀</button>
      <div class="lightbox-content">
        <img src="" id="lightboxImg" alt="Enlarged screenshot">
      </div>
      <button class="lightbox-nav-btn lightbox-next" id="lightboxNext" title="Next screenshot (Right Arrow)">▶</button>
    </div>
  </div>

  <!-- Embedded Master Data -->
  <script>
    window.MASTER_DATA = {master_data_content};
  </script>

  <!-- Application Logic -->
  <script>
{modified_js}
  </script>
</body>
</html>
"""

# Write to index.html (Root portal for GitHub Pages & CDN)
index_html_path = os.path.join(base_dir, 'index.html')
with open(index_html_path, 'w', encoding='utf-8') as f:
    f.write(html_template)
print(f"Generated index.html: {index_html_path} ({os.path.getsize(index_html_path)/1024/1024:.2f} MB)")

# Write to DD_4.6.4_Reports.html (Matching reference naming)
named_html_path = os.path.join(base_dir, 'DD_4.6.4_Reports.html')
with open(named_html_path, 'w', encoding='utf-8') as f:
    f.write(html_template)
print(f"Generated {named_html_path} ({os.path.getsize(named_html_path)/1024/1024:.2f} MB)")
