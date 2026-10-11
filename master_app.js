/**
 * Master UAT Test Report Dashboard Application
 * Supports Folder-wise (grouped by subfolder) & Flat List views
 */

(function () {
  'use strict';

  // Application State
  const state = {
    data: window.MASTER_DATA || { stats: {}, reports: [] },
    activeTab: 'CMT', // 'CMT', 'orderFulFilmentChecklist', 'orderFulfilment', 'superadmin', 'FAILED', 'ALL'
    statusFilter: 'ALL', // 'ALL', 'PASSED', 'FAILED'
    sidebarGrouping: 'FOLDERWISE', // 'FOLDERWISE', 'FLAT'
    searchQuery: '',
    selectedReportId: null,
    activeViewMode: 'tree', // 'tree', 'gallery'
    isVideoCollapsed: false,
    collapsedFolders: {},
    lightbox: {
      isOpen: false,
      images: [],
      currentIndex: 0,
      title: ''
    }
  };

  // DOM Elements
  const elements = {
    // Header
    navTabs: document.getElementById('navTabs'),
    statTotal: document.getElementById('statTotal'),
    statPassed: document.getElementById('statPassed'),
    statFailed: document.getElementById('statFailed'),
    statPassRate: document.getElementById('statPassRate'),

    // Sidebar
    searchInput: document.getElementById('searchInput'),
    filterCount: document.getElementById('filterCount'),
    reportsList: document.getElementById('reportsList'),
    chipAll: document.getElementById('chipAll'),
    chipPassed: document.getElementById('chipPassed'),
    chipFailed: document.getElementById('chipFailed'),
    btnFolderwise: document.getElementById('btnFolderwise'),
    btnFlatList: document.getElementById('btnFlatList'),

    // Main Detail
    detailPanel: document.getElementById('detailPanel'),
    emptyDetailState: document.getElementById('emptyDetailState'),
    detailContent: document.getElementById('detailContent'),

    // Lightbox
    lightboxModal: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxCounter: document.getElementById('lightboxCounter'),
    lightboxPrev: document.getElementById('lightboxPrev'),
    lightboxNext: document.getElementById('lightboxNext'),
    lightboxClose: document.getElementById('lightboxClose'),
    lightboxDownload: document.getElementById('lightboxDownload')
  };

  // Step Icon Helper
  function getStepIcon(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('before hooks') || t.includes('fixture') || t.includes('launch')) return '🚀';
    if (t.includes('navigate') || t.includes('goto') || t.includes('reload')) return '🌐';
    if (t.includes('click') || t.includes('press') || t.includes('check') || t.includes('select')) return '🖱️';
    if (t.includes('fill') || t.includes('type') || t.includes('input') || t.includes('clear')) return '✍️';
    if (t.includes('wait') || t.includes('pause') || t.includes('sleep') || t.includes('timeout')) return '⏳';
    if (t.includes('expect') || t.includes('assert') || t.includes('verify') || t.includes('isvisible')) return '👁️';
    if (t.includes('screenshot') || t.includes('attach')) return '📸';
    if (t.includes('after hooks') || t.includes('teardown')) return '🏁';
    if (t.includes('evaluate') || t.includes('scroll')) return '⚡';
    return '🔹';
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Natural sort helper for names/numbers
  function naturalSort(a, b) {
    return (a.name || a.title || '').localeCompare(b.name || b.title || '', undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  // Initialize Application
  function init() {
    renderHeaderStats();
    renderNavTabs();
    setupEventListeners();

    // Select default tab: CMT
    setActiveTab('CMT');
  }

  // Render Top Stats
  function renderHeaderStats() {
    const stats = state.data.stats || {};
    const total = stats.total || 0;
    const passed = stats.passed || 0;
    const failed = stats.failed || 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    if (elements.statTotal) elements.statTotal.textContent = total;
    if (elements.statPassed) elements.statPassed.textContent = passed;
    if (elements.statFailed) elements.statFailed.textContent = failed;
    if (elements.statPassRate) elements.statPassRate.textContent = `${passRate}%`;
  }

  // Render Top Navigation Tabs
  function renderNavTabs() {
    const stats = state.data.stats.by_folder || {};
    const totalFailed = state.data.stats.failed || 0;
    const totalAll = state.data.stats.total || 0;

    const tabsConfig = [
      {
        id: 'CMT',
        label: 'CMT',
        count: stats['CMT'] ? stats['CMT'].total : 33,
        failedCount: stats['CMT'] ? stats['CMT'].failed : 0
      },
      {
        id: 'orderFulFilmentChecklist',
        label: 'Fulfilment Checklist',
        count: stats['orderFulFilmentChecklist'] ? stats['orderFulFilmentChecklist'].total : 48,
        failedCount: stats['orderFulFilmentChecklist'] ? stats['orderFulFilmentChecklist'].failed : 5
      },
      {
        id: 'orderFulfilment',
        label: 'Order Fulfilment',
        count: stats['orderFulfilment'] ? stats['orderFulfilment'].total : 22,
        failedCount: stats['orderFulfilment'] ? stats['orderFulfilment'].failed : 0
      },
      {
        id: 'superadmin',
        label: 'Super Admin',
        count: stats['superadmin'] ? stats['superadmin'].total : 55,
        failedCount: stats['superadmin'] ? stats['superadmin'].failed : 0
      },
      {
        id: 'FAILED',
        label: '🚨 Failed Tests',
        count: totalFailed,
        isFailedTab: true
      },
      {
        id: 'ALL',
        label: 'All Reports',
        count: totalAll
      }
    ];

    elements.navTabs.innerHTML = tabsConfig
      .map(tab => {
        const isFailed = tab.isFailedTab;
        const failedBadge = tab.failedCount > 0
          ? `<span class="tab-badge badge-failed" title="${tab.failedCount} Failed">${tab.failedCount} Fail</span>`
          : '';

        return `
          <button class="nav-tab-btn ${isFailed ? 'failed-tab' : ''} ${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
            <span>${tab.label}</span>
            <span class="tab-badge ${isFailed && totalFailed > 0 ? 'badge-failed' : ''}">${tab.count}</span>
            ${failedBadge}
          </button>
        `;
      })
      .join('');
  }

  // Set Active Tab
  function setActiveTab(tabId) {
    state.activeTab = tabId;
    
    // Update Tab UI
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    if (tabId === 'FAILED') {
      state.statusFilter = 'ALL';
      [elements.chipAll, elements.chipPassed, elements.chipFailed].forEach(c => c && c.classList.remove('active'));
      if (elements.chipAll) elements.chipAll.classList.add('active');
    }

    renderReportsList();
  }

  // Get Filtered Reports
  function getFilteredReports() {
    let reports = state.data.reports || [];

    // Filter by Tab
    if (state.activeTab === 'FAILED') {
      reports = reports.filter(r => r.status === 'failed');
    } else if (state.activeTab !== 'ALL') {
      reports = reports.filter(r => r.folder === state.activeTab);
    }

    // Filter by Status Chip (All / Passed / Failed)
    if (state.statusFilter === 'PASSED') {
      reports = reports.filter(r => r.status === 'passed');
    } else if (state.statusFilter === 'FAILED') {
      reports = reports.filter(r => r.status === 'failed');
    }

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      reports = reports.filter(r => {
        return (
          (r.name || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.spec_file || '').toLowerCase().includes(q) ||
          (r.subfolder || '').toLowerCase().includes(q) ||
          (r.errors && r.errors.some(e => (e.message || '').toLowerCase().includes(q)))
        );
      });
    }

    // Sort naturally
    return reports.slice().sort(naturalSort);
  }

  // Render Single Report Card HTML
  function renderReportCardHtml(report) {
    const isSelected = state.selectedReportId === report.id;
    const isFailed = report.status === 'failed';
    const screenshotsCount = (report.screenshots || []).length;
    const hasVideo = (report.videos || []).length > 0;

    return `
      <div class="report-card ${isFailed ? 'status-failed' : ''} ${isSelected ? 'active' : ''}" data-id="${report.id}">
        <div class="card-top-row">
          <span class="status-badge ${report.status}">
            <span class="dot"></span>
            ${report.status}
          </span>
          <span class="card-duration">${report.duration}s</span>
        </div>
        <div class="card-title">${escapeHtml(report.title || report.name)}</div>
        <div class="card-spec" title="${escapeHtml(report.spec_file)}">${escapeHtml(report.spec_file)}</div>
        <div class="card-meta-row">
          ${screenshotsCount > 0 ? `
            <span class="meta-chip" title="${screenshotsCount} Screenshots">
              <svg viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
              ${screenshotsCount}
            </span>` : ''}
          ${hasVideo ? `
            <span class="meta-chip" title="Video Recording Attached">
              <svg viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              Video
            </span>` : ''}
          <span class="meta-chip" style="margin-left: auto;">${escapeHtml(report.subfolder || report.folder)}</span>
        </div>
      </div>
    `;
  }

  // Render Sidebar Reports List (Folderwise or Flat)
  function renderReportsList() {
    const filtered = getFilteredReports();
    elements.filterCount.textContent = `Showing ${filtered.length} reports`;

    if (filtered.length === 0) {
      elements.reportsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p style="font-size: 0.82rem; color: var(--text-muted);">No reports match your filters</p>
        </div>
      `;
      state.selectedReportId = null;
      renderDetailPanel(null);
      return;
    }

    if (state.sidebarGrouping === 'FLAT') {
      // Flat rendering
      elements.reportsList.innerHTML = filtered.map(renderReportCardHtml).join('');
    } else {
      // Folderwise grouping
      const groups = {};
      filtered.forEach(report => {
        let groupName = report.subfolder || 'General';
        if (state.activeTab === 'ALL') {
          groupName = `${report.folder} / ${report.subfolder}`;
        }
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(report);
      });

      // Sort group names
      const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      let html = '';
      sortedGroupNames.forEach(groupName => {
        const reportsInGroup = groups[groupName];
        const isCollapsed = state.collapsedFolders[groupName] === true;
        const failedInGroup = reportsInGroup.filter(r => r.status === 'failed').length;

        html += `
          <div class="folder-group ${isCollapsed ? '' : 'expanded'}" data-folder-group="${escapeHtml(groupName)}">
            <div class="folder-group-header" onclick="toggleFolderGroup('${escapeHtml(groupName)}')">
              <div class="folder-header-left">
                <svg class="folder-chevron" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                <span class="folder-icon">📁</span>
                <span class="folder-name-text">${escapeHtml(groupName)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${failedInGroup > 0 ? `<span class="tab-badge badge-failed" style="font-size: 0.65rem;">${failedInGroup} Fail</span>` : ''}
                <span class="folder-count-badge">${reportsInGroup.length}</span>
              </div>
            </div>
            <div class="folder-items-container">
              ${reportsInGroup.map(renderReportCardHtml).join('')}
            </div>
          </div>
        `;
      });

      elements.reportsList.innerHTML = html;
    }

    // Check if selected report is valid
    const currentStillValid = filtered.some(r => r.id === state.selectedReportId);
    if (!currentStillValid && filtered.length > 0) {
      selectReport(filtered[0].id);
    }
  }

  // Toggle Folder Group in Sidebar
  window.toggleFolderGroup = function (groupName) {
    state.collapsedFolders[groupName] = !state.collapsedFolders[groupName];
    const groupEl = document.querySelector(`[data-folder-group="${groupName}"]`);
    if (groupEl) {
      groupEl.classList.toggle('expanded', !state.collapsedFolders[groupName]);
    }
  };

  // Toggle All Folder Groups (Expand/Collapse All)
  window.toggleAllFolderGroups = function (expand) {
    document.querySelectorAll('.folder-group').forEach(groupEl => {
      const gName = groupEl.getAttribute('data-folder-group');
      if (gName) state.collapsedFolders[gName] = !expand;
      groupEl.classList.toggle('expanded', expand);
    });
  };

  // Set Sidebar Grouping Mode (Folderwise vs Flat)
  window.setSidebarGrouping = function (mode) {
    state.sidebarGrouping = mode;
    if (elements.btnFolderwise) elements.btnFolderwise.classList.toggle('active', mode === 'FOLDERWISE');
    if (elements.btnFlatList) elements.btnFlatList.classList.toggle('active', mode === 'FLAT');
    renderReportsList();
  };

  // Select Report
  function selectReport(reportId) {
    state.selectedReportId = reportId;

    document.querySelectorAll('.report-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-id') === reportId);
    });

    const report = state.data.reports.find(r => r.id === reportId);
    renderDetailPanel(report);
  }

  // Render Detail Panel
  function renderDetailPanel(report) {
    if (!report) {
      elements.emptyDetailState.style.display = 'flex';
      elements.detailContent.style.display = 'none';
      return;
    }

    elements.emptyDetailState.style.display = 'none';
    elements.detailContent.style.display = 'flex';

    const isFailed = report.status === 'failed';
    const videoObj = (report.videos && report.videos.length > 0) ? report.videos[0] : null;
    const screenshots = report.screenshots || [];
    const errors = report.errors || [];
    const originalReportUrl = `./${report.rel_path}/index.html`;

    // 1. Header Card
    const headerHtml = `
      <div class="detail-header-card ${isFailed ? 'failed-header' : ''}">
        <div class="detail-title-row">
          <div class="detail-title-group">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="status-badge ${report.status}">
                <span class="dot"></span>
                ${report.status}
              </span>
              <span style="color: var(--text-muted); font-size: 0.78rem;">
                Folder: <strong>${escapeHtml(report.folder)}</strong> / <strong>${escapeHtml(report.subfolder)}</strong>
              </span>
            </div>
            <h2>${escapeHtml(report.title || report.name)}</h2>
            <div class="detail-spec-path">
              <svg style="width: 13px; height: 13px; fill: currentColor;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
              ${escapeHtml(report.spec_file)}
            </div>
          </div>
          <div class="header-actions-group">
            <button class="btn-action btn-secondary-action" onclick="switchViewModeAndScroll('gallery')" title="View all screenshots for this test report">
              <svg style="width: 15px; height: 15px; fill: currentColor;" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              📸 All Screenshots (${screenshots.length})
            </button>
            <a href="${originalReportUrl}" target="_blank" class="btn-action btn-primary-action" title="Open official Playwright report in new tab">
              <svg style="width: 15px; height: 15px; fill: currentColor;" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              Original Report
            </a>
          </div>
        </div>

        <div class="detail-metrics-row">
          <div class="metric-item">
            <span>⏱️ Duration:</span>
            <strong>${report.duration}s</strong>
          </div>
          <div class="metric-item">
            <span>📸 Screenshots:</span>
            <strong>${screenshots.length}</strong>
          </div>
          <div class="metric-item">
            <span>🎬 Video Clips:</span>
            <strong>${(report.videos || []).length}</strong>
          </div>
          ${report.startTime ? `
            <div class="metric-item">
              <span>📅 Executed:</span>
              <strong>${new Date(report.startTime).toLocaleString()}</strong>
            </div>` : ''}
        </div>
      </div>
    `;

    // 2. Video Player Card (TOP OF STEPS TREE)
    let videoHtml = '';
    if (videoObj) {
      videoHtml = `
        <div class="video-section-card">
          <div class="section-title-row">
            <div class="section-title">
              <svg viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              Execution Video Recording
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono);">
                ${escapeHtml(videoObj.name)}
              </span>
              <button class="tree-toggle-btn" onclick="toggleVideoCollapse(this)">
                ${state.isVideoCollapsed ? '👁️ Show Video' : '🙈 Hide Video'}
              </button>
            </div>
          </div>
          
          <div class="video-player-container" id="videoPlayerBox" style="display: ${state.isVideoCollapsed ? 'none' : 'flex'};">
            <video id="testVideoPlayer" controls preload="metadata">
              <source src="./${videoObj.path}" type="video/webm">
              Your browser does not support HTML5 video playback.
            </video>
          </div>

          <div class="video-toolbar" id="videoToolbarBox" style="display: ${state.isVideoCollapsed ? 'none' : 'flex'};">
            <div class="video-speed-controls">
              <span>Playback Speed:</span>
              <button class="speed-btn active" onclick="setVideoSpeed(1, this)">1x</button>
              <button class="speed-btn" onclick="setVideoSpeed(1.25, this)">1.25x</button>
              <button class="speed-btn" onclick="setVideoSpeed(1.5, this)">1.5x</button>
              <button class="speed-btn" onclick="setVideoSpeed(2, this)">2x</button>
            </div>
            <div>
              <a href="./${videoObj.path}" download class="tree-toggle-btn" style="text-decoration: none; color: inherit;">
                ⬇️ Download Video
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Error Banner (if failed)
    let errorHtml = '';
    if (isFailed && errors.length > 0) {
      errorHtml = `
        <div class="error-banner-card">
          <div class="error-banner-title">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Failure Traceback &amp; Errors (${errors.length})
          </div>
          ${errors.map(err => `
            <div class="error-box">${escapeHtml(err.message || '')}${err.stack ? '\n\n' + escapeHtml(err.stack) : ''}</div>
          `).join('')}
        </div>
      `;
    }

    // 4. View Mode Tabs (Steps Tree / Screenshots Gallery)
    const totalStepCount = countTotalSteps(report.steps);
    const viewTabsHtml = `
      <div class="view-mode-bar">
        <div class="view-tabs">
          <button class="view-tab-btn ${state.activeViewMode === 'tree' ? 'active' : ''}" onclick="switchViewMode('tree')">
            🌲 Execution Steps Tree (${totalStepCount})
          </button>
          <button class="view-tab-btn ${state.activeViewMode === 'gallery' ? 'active' : ''}" onclick="switchViewMode('gallery')">
            🖼️ Screenshots Gallery (${screenshots.length})
          </button>
        </div>
        
        <div class="tree-controls-group" id="treeControls" style="display: ${state.activeViewMode === 'tree' ? 'flex' : 'none'};">
          <button class="tree-toggle-btn" onclick="toggleAllSteps(true)">➕ Expand All</button>
          <button class="tree-toggle-btn" onclick="toggleAllSteps(false)">➖ Collapse All</button>
        </div>
      </div>
    `;

    // 5. Steps Tree Container
    const stepsTreeHtml = `
      <div class="steps-tree-card" id="stepsTreeView" style="display: ${state.activeViewMode === 'tree' ? 'flex' : 'none'};">
        <div class="steps-list">
          ${renderStepsTree(report.steps, report, true)}
        </div>
      </div>
    `;

    // 6. Screenshots Gallery Container
    const galleryHtml = `
      <div class="steps-tree-card" id="galleryView" style="display: ${state.activeViewMode === 'gallery' ? 'flex' : 'none'};">
        <div class="gallery-grid">
          ${screenshots.map((sf, idx) => `
            <div class="gallery-item" onclick="openLightboxFromGallery(${idx})">
              <div class="gallery-thumb">
                <img src="./${sf.path}" alt="${escapeHtml(sf.name)}" loading="lazy">
              </div>
              <div class="gallery-caption" title="${escapeHtml(sf.name)}">${escapeHtml(sf.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Put everything together
    elements.detailContent.innerHTML = `
      ${headerHtml}
      ${videoHtml}
      ${errorHtml}
      ${viewTabsHtml}
      ${stepsTreeHtml}
      ${galleryHtml}
    `;

    // Setup gallery images in state
    state.lightbox.images = screenshots.map(sf => ({
      path: sf.path,
      name: sf.name
    }));
  }

  // Count total steps recursively
  function countTotalSteps(steps) {
    if (!steps) return 0;
    let count = steps.length;
    for (const s of steps) {
      count += countTotalSteps(s.steps);
    }
    return count;
  }

  // Render Steps Tree HTML Recursively
  function renderStepsTree(steps, report, isRoot = false) {
    if (!steps || steps.length === 0) {
      return isRoot ? '<div style="color: var(--text-muted); padding: 10px; font-size: 0.82rem;">No execution steps recorded.</div>' : '';
    }

    return steps.map((step, idx) => {
      const hasChildren = step.steps && step.steps.length > 0;
      const hasError = !!step.error;
      const stepIcon = getStepIcon(step.title);
      
      // Filter attachments for images
      const imageAttachments = (step.attachments || []).filter(a => {
        return (a.contentType && a.contentType.startsWith('image/')) || (a.path && a.path.match(/\.(png|jpg|jpeg|webp)$/i));
      });

      const isScreenshotStep = imageAttachments.length > 0;
      const isExpanded = hasError || isScreenshotStep || (isRoot && idx < 4);

      return `
        <div class="step-node ${isExpanded ? 'expanded' : ''} ${hasError ? 'has-error' : ''} ${isScreenshotStep ? 'has-screenshot' : ''}">
          <div class="step-header" onclick="toggleStepNode(this)">
            <div class="step-left-info">
              ${hasChildren || isScreenshotStep ? `
                <svg class="step-chevron" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
              ` : `<span style="width: 14px;"></span>`}
              <span class="step-icon-badge">${stepIcon}</span>
              <span class="step-title-text">${escapeHtml(step.title)}</span>
            </div>

            <div class="step-right-meta">
              ${isScreenshotStep ? `
                <span class="step-screenshot-indicator">
                  <svg viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>
                  Screenshot
                </span>` : ''}
              ${step.duration ? `<span class="step-duration">${step.duration}ms</span>` : ''}
              ${hasError ? `
                <svg class="step-status-icon fail" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 10 10 10-4.48 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
              ` : `
                <svg class="step-status-icon pass" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              `}
            </div>
          </div>

          <div class="step-body">
            ${hasError ? `
              <div class="error-box" style="margin-top: 8px;">
                ${escapeHtml(step.error.message || '')}
                ${step.error.stack ? '\n\n' + escapeHtml(step.error.stack) : ''}
              </div>
            ` : ''}

            ${isScreenshotStep ? `
              <div class="step-inline-screenshots">
                ${imageAttachments.map(att => {
                  const imgPath = att.matched_screenshot || att.path;
                  return `
                    <div class="step-screenshot-card" onclick="event.stopPropagation(); openLightbox('./${imgPath}', '${escapeHtml(att.name)}')">
                      <div class="step-screenshot-img-box">
                        <img src="./${imgPath}" alt="${escapeHtml(att.name)}" loading="lazy">
                        <div class="step-screenshot-overlay">
                          <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>
                          Enlarge
                        </div>
                      </div>
                      <div class="step-screenshot-caption" title="${escapeHtml(att.name)}">
                        📸 ${escapeHtml(att.name)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            ${hasChildren ? `
              <div class="step-children">
                ${renderStepsTree(step.steps, report, false)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Toggle single step node
  window.toggleStepNode = function (headerEl) {
    const node = headerEl.closest('.step-node');
    if (node) {
      node.classList.toggle('expanded');
    }
  };

  // Toggle all steps
  window.toggleAllSteps = function (expand) {
    document.querySelectorAll('#stepsTreeView .step-node').forEach(node => {
      node.classList.toggle('expanded', expand);
    });
  };

  // Switch View Mode (Tree / Gallery)
  window.switchViewMode = function (mode) {
    state.activeViewMode = mode;
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(mode));
    });

    const treeView = document.getElementById('stepsTreeView');
    const galleryView = document.getElementById('galleryView');
    const treeControls = document.getElementById('treeControls');

    if (treeView) treeView.style.display = mode === 'tree' ? 'flex' : 'none';
    if (galleryView) galleryView.style.display = mode === 'gallery' ? 'flex' : 'none';
    if (treeControls) treeControls.style.display = mode === 'tree' ? 'flex' : 'none';
  };

  // Switch View Mode & Smooth Scroll to Section
  window.switchViewModeAndScroll = function (mode) {
    window.switchViewMode(mode);
    setTimeout(() => {
      const targetId = mode === 'gallery' ? 'galleryView' : 'stepsTreeView';
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 40);
  };

  // Video Speed Controller
  window.setVideoSpeed = function (speed, btn) {
    const video = document.getElementById('testVideoPlayer');
    if (video) {
      video.playbackRate = speed;
      btn.parentElement.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  };

  // Toggle Video Collapse
  window.toggleVideoCollapse = function (btn) {
    state.isVideoCollapsed = !state.isVideoCollapsed;
    const box = document.getElementById('videoPlayerBox');
    const tool = document.getElementById('videoToolbarBox');
    if (box) box.style.display = state.isVideoCollapsed ? 'none' : 'flex';
    if (tool) tool.style.display = state.isVideoCollapsed ? 'none' : 'flex';
    btn.textContent = state.isVideoCollapsed ? '👁️ Show Video' : '🙈 Hide Video';
  };

  // Open Lightbox
  window.openLightbox = function (imgPath, title) {
    state.lightbox.isOpen = true;
    state.lightbox.title = title || '';
    
    let idx = state.lightbox.images.findIndex(img => `./${img.path}` === imgPath || img.path === imgPath);
    if (idx === -1) {
      state.lightbox.images = [{ path: imgPath.replace(/^\.\//, ''), name: title }];
      idx = 0;
    }
    state.lightbox.currentIndex = idx;
    updateLightboxUI();
  };

  window.openLightboxFromGallery = function (idx) {
    state.lightbox.isOpen = true;
    state.lightbox.currentIndex = idx;
    updateLightboxUI();
  };

  function updateLightboxUI() {
    const imgObj = state.lightbox.images[state.lightbox.currentIndex];
    if (!imgObj) return;

    elements.lightboxImg.src = `./${imgObj.path}`;
    elements.lightboxTitle.textContent = imgObj.name || state.lightbox.title;
    elements.lightboxCounter.textContent = `${state.lightbox.currentIndex + 1} / ${state.lightbox.images.length}`;
    elements.lightboxDownload.href = `./${imgObj.path}`;
    elements.lightboxModal.classList.add('active');
  }

  function closeLightbox() {
    state.lightbox.isOpen = false;
    elements.lightboxModal.classList.remove('active');
    elements.lightboxImg.src = '';
  }

  function nextLightbox() {
    if (state.lightbox.images.length <= 1) return;
    state.lightbox.currentIndex = (state.lightbox.currentIndex + 1) % state.lightbox.images.length;
    updateLightboxUI();
  }

  function prevLightbox() {
    if (state.lightbox.images.length <= 1) return;
    state.lightbox.currentIndex = (state.lightbox.currentIndex - 1 + state.lightbox.images.length) % state.lightbox.images.length;
    updateLightboxUI();
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Top Nav Tabs Click
    elements.navTabs.addEventListener('click', e => {
      const btn = e.target.closest('.nav-tab-btn');
      if (btn) {
        const tabId = btn.getAttribute('data-tab');
        setActiveTab(tabId);
      }
    });

    // Search Input
    elements.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      renderReportsList();
    });

    // Filter Chips (All / Passed / Failed)
    [elements.chipAll, elements.chipPassed, elements.chipFailed].forEach(chip => {
      if (chip) {
        chip.addEventListener('click', () => {
          [elements.chipAll, elements.chipPassed, elements.chipFailed].forEach(c => c && c.classList.remove('active'));
          chip.classList.add('active');
          state.statusFilter = chip.getAttribute('data-filter');
          renderReportsList();
        });
      }
    });

    // Folderwise vs Flat Toggle Buttons
    if (elements.btnFolderwise) {
      elements.btnFolderwise.addEventListener('click', () => setSidebarGrouping('FOLDERWISE'));
    }
    if (elements.btnFlatList) {
      elements.btnFlatList.addEventListener('click', () => setSidebarGrouping('FLAT'));
    }

    // Sidebar Report Card Click
    elements.reportsList.addEventListener('click', e => {
      const card = e.target.closest('.report-card');
      if (card) {
        const reportId = card.getAttribute('data-id');
        selectReport(reportId);
      }
    });

    // Lightbox controls
    elements.lightboxClose.addEventListener('click', closeLightbox);
    elements.lightboxNext.addEventListener('click', nextLightbox);
    elements.lightboxPrev.addEventListener('click', prevLightbox);

    // Close lightbox on backdrop click
    elements.lightboxModal.addEventListener('click', e => {
      if (e.target === elements.lightboxModal || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      if (state.lightbox.isOpen) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
      }
    });
  }

  // Start app on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
