/**
 * THAIBA PUBLIC SCHOOL — UI Components & Theme Engine
 */

import { enhanceSelect, enhanceAllSelects, startGlobalSelectObserver } from './dropdown-enhancer.js';
import { enhanceDatePicker, enhanceAllDatePickers, startGlobalDatePickerObserver } from './datepicker-enhancer.js';

export class UIComponents {
  /**
   * Escape untrusted values before interpolating them into HTML templates.
   * Prevents stored/reflected XSS from user- or staff-supplied data.
   */
  static escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static initTheme() {
    // Enforce Pro-Max Luxury Light Theme (Dark mode completely removed as requested)
    document.body.classList.remove('dark');
    localStorage.setItem('tms_theme', 'light');

    const savedColor = localStorage.getItem('tms_color_theme') || 'Gold';
    const activeColor = (savedColor === 'oled') ? 'Gold' : savedColor;

    document.documentElement.setAttribute('data-theme', activeColor);
    document.body.setAttribute('data-theme', activeColor);
    localStorage.setItem('tms_color_theme', activeColor);

    this.installGlobalInterceptors();
    startGlobalSelectObserver();
    startGlobalDatePickerObserver();
  }

  static enhanceSelect(el) {
    enhanceSelect(el);
  }

  static enhanceAllSelects(root = document) {
    enhanceAllSelects(root);
  }

  static initCustomSelects() {
    startGlobalSelectObserver();
  }

  static enhanceDatePicker(el) {
    enhanceDatePicker(el);
  }

  static enhanceAllDatePickers(root = document) {
    enhanceAllDatePickers(root);
  }

  static initDatePickers() {
    startGlobalDatePickerObserver();
  }

  static installGlobalInterceptors() {
    if (typeof window === 'undefined' || window._tmsPopupsInstalled) return;
    window._tmsPopupsInstalled = true;

    // Intercept native browser alert with luxury UIComponents modal
    window.alert = (message) => {
      this.alert({
        title: 'Campus Notification',
        message: String(message || ''),
        buttonText: 'Got It',
        type: 'info',
        icon: 'info'
      });
    };
  }

  static setColorTheme(themeName) {
    const valid = ['Gold', 'sapphire', 'burgundy'];
    const chosen = valid.includes(themeName) ? themeName : 'Gold';
    
    document.body.classList.remove('dark');
    localStorage.setItem('tms_theme', 'light');
    document.documentElement.setAttribute('data-theme', chosen);
    document.body.setAttribute('data-theme', chosen);
    localStorage.setItem('tms_color_theme', chosen);

    const names = {
      Gold: 'Thaiba Gold (Classic Institutional)',
      sapphire: 'Royal Sapphire (Academic Blue)',
      burgundy: 'Noble Burgundy (Regal Crimson)'
    };
    this.showToast(`Active Theme: ${names[chosen]} (Premium Light Edition)`, 'success');
  }

  static toggleTheme() {
    // Cycle between luxury light palettes
    const current = localStorage.getItem('tms_color_theme') || 'Gold';
    const next = current === 'Gold' ? 'sapphire' : (current === 'sapphire' ? 'burgundy' : 'Gold');
    this.setColorTheme(next);
  }

  static updateThemeButton() {
    // No-op for dark mode button
  }

  /**
   * Universal Tab Rail Enhancer
   * Equips every tab bar and sub-tab rail with circular < and > buttons,
   * smooth mouse-wheel horizontal scrolling, and auto-centering on click.
   */
  static initTabRails(root = document) {
    if (!root) return;
    const rails = root.querySelectorAll('.tms-segmented-tabs, .tms-subtab-rail, .user-sub-tabs-bar, .cal-filters-row, .tms-tab-scroll-rail, [data-tms-scroll-rail]');
    rails.forEach((rail) => {
      let wrapper = rail.closest('.tms-tab-scroll-wrapper, .tms-subtab-container-wrap, .tms-tab-rail-wrapper');
      
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'tms-tab-scroll-wrapper';
        rail.parentNode.insertBefore(wrapper, rail);
        wrapper.appendChild(rail);
      } else {
        wrapper.classList.add('tms-tab-scroll-wrapper');
      }

      let prevBtn = wrapper.querySelector('.tms-tab-nav-prev, .tms-subtab-nav-prev');
      let nextBtn = wrapper.querySelector('.tms-tab-nav-next, .tms-subtab-nav-next');
      let createdIcons = false;

      if (!prevBtn) {
        prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'tms-tab-nav-btn tms-tab-nav-prev';
        prevBtn.setAttribute('aria-label', 'Scroll left');
        prevBtn.setAttribute('title', 'Scroll tabs left');
        prevBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        wrapper.insertBefore(prevBtn, rail);
        createdIcons = true;
      }

      if (!nextBtn) {
        nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'tms-tab-nav-btn tms-tab-nav-next';
        nextBtn.setAttribute('aria-label', 'Scroll right');
        nextBtn.setAttribute('title', 'Scroll tabs right');
        nextBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        wrapper.appendChild(nextBtn);
        createdIcons = true;
      }

      if (createdIcons && window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons({ root: wrapper }); } catch (e) {}
      }

      const updateNavButtons = () => {
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        if (maxScroll <= 4) {
          prevBtn.style.opacity = '0.35';
          prevBtn.style.pointerEvents = 'none';
          nextBtn.style.opacity = '0.35';
          nextBtn.style.pointerEvents = 'none';
          return;
        }
        const canLeft = rail.scrollLeft > 6;
        const canRight = rail.scrollLeft < maxScroll - 6;
        prevBtn.style.pointerEvents = canLeft ? 'auto' : 'none';
        prevBtn.style.opacity = canLeft ? '1' : '0.35';
        nextBtn.style.pointerEvents = canRight ? 'auto' : 'none';
        nextBtn.style.opacity = canRight ? '1' : '0.35';
      };

      if (!rail._tmsTabBound) {
        rail._tmsTabBound = true;
        rail.addEventListener('scroll', updateNavButtons, { passive: true });
        window.addEventListener('resize', updateNavButtons, { passive: true });

        rail.addEventListener('wheel', (e) => {
          if (e.deltaY !== 0 && rail.scrollWidth > rail.clientWidth) {
            e.preventDefault();
            rail.scrollLeft += (e.deltaY * 0.9);
            updateNavButtons();
          }
        }, { passive: false });

        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          rail.scrollBy({ left: -260, behavior: 'smooth' });
          setTimeout(updateNavButtons, 300);
        });

        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          rail.scrollBy({ left: 260, behavior: 'smooth' });
          setTimeout(updateNavButtons, 300);
        });

        rail.addEventListener('click', (e) => {
          const pill = e.target.closest('.tms-tab-pill, .tms-subtab-pill, .staff-tab, .acad-tab, .hostel-sub-pill, .ops-tab, button');
          if (pill && rail.contains(pill)) {
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            setTimeout(updateNavButtons, 250);
          }
        });
      }

      setTimeout(updateNavButtons, 60);
      setTimeout(updateNavButtons, 250);
    });
  }

  static refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      if (this._iconRaf) cancelAnimationFrame(this._iconRaf);
      this._iconRaf = requestAnimationFrame(() => {
        try { 
          this.initTabRails();
          window.lucide.createIcons(); 
        } catch (e) { /* ignore */ }
      });
    }
  }

  static showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'info';
    let color = '#3b82f6';
    if (type === 'success') { icon = 'check-circle'; color = '#10b981'; }
    if (type === 'warning') { icon = 'alert-triangle'; color = '#f59e0b'; }
    if (type === 'danger' || type === 'error') { icon = 'alert-octagon'; color = '#ef4444'; }

    toast.innerHTML = `
      <i data-lucide="${icon}" style="color: ${color}; width: 20px; height: 20px;"></i>
      <span style="font-weight: 500;">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  static openModal({ title, bodyHtml, footerHtml = '', maxWidth = '' }) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-window">
          <div class="card-header modal-header-row" style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: nowrap; gap: 12px;">
            <h3 class="card-title" id="global-modal-title" style="margin: 0; display: flex; align-items: center; gap: 10px;"></h3>
            <button class="icon-btn" id="global-modal-close" title="Close" style="flex-shrink: 0;"><i data-lucide="x"></i></button>
          </div>
          <div id="global-modal-body" style="margin-bottom: 20px;"></div>
          <div id="global-modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#global-modal-close').addEventListener('click', () => {
        this.closeModal();
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    }

    const modalWin = overlay.querySelector('.modal-window');
    if (modalWin) {
      modalWin.style.maxWidth = maxWidth || '680px';
    }

    const titleEl = document.getElementById('global-modal-title');
    if (titleEl) {
      if (typeof title === 'string' && title.includes('<') && title.includes('>')) {
        titleEl.innerHTML = title;
      } else {
        titleEl.textContent = title || '';
      }
    }
    document.getElementById('global-modal-body').innerHTML = bodyHtml;
    
    const footerEl = document.getElementById('global-modal-footer');
    if (footerEl) {
      if (footerHtml && footerHtml.trim()) {
        footerEl.innerHTML = footerHtml;
        footerEl.style.display = 'flex';
      } else {
        footerEl.innerHTML = '';
        footerEl.style.display = 'none';
      }
    }

    overlay.classList.add('active');
    this.refreshIcons();
  }

  static closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  static showModal({
    title,
    content,
    bodyHtml,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showConfirm = true,
    showCancel = true,
    onConfirm = null,
    onCancel = null,
    maxWidth = '680px'
  }) {
    const finalBody = content || bodyHtml || '';
    const footerButtons = [];
    if (showCancel) {
      footerButtons.push(`<button type="button" class="btn btn-secondary" id="tms-modal-btn-cancel">${this.escapeHtml(cancelText)}</button>`);
    }
    if (showConfirm) {
      footerButtons.push(`<button type="button" class="btn btn-primary" id="tms-modal-btn-confirm">${this.escapeHtml(confirmText)}</button>`);
    }
    this.openModal({
      title,
      bodyHtml: finalBody,
      footerHtml: footerButtons.join(' '),
      maxWidth
    });

    const cancelBtn = document.getElementById('tms-modal-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeModal();
        if (typeof onCancel === 'function') onCancel();
      });
    }

    const confirmBtn = document.getElementById('tms-modal-btn-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (typeof onConfirm === 'function') {
          const res = await onConfirm();
          if (res === false) return;
        }
        this.closeModal();
      });
    }
  }

  static renderLoading(message = 'Loading verified records...') {
    return `
      <div class="tms-animated-loader" style="padding: 48px 20px; text-align: center;">
        <div class="tms-loader-emblem-wrap" style="position: relative; width: 72px; height: 72px; margin: 0 auto 16px;">
          <div class="tms-loader-aura"></div>
          <img src="./tps-logo.png" alt="Thaiba Public School" class="tms-loader-img" style="width: 58px; height: 58px; object-fit: contain; position: relative; z-index: 2;">
        </div>
        <div class="tms-loader-text" style="font-family: var(--font-display, 'Outfit', sans-serif); font-weight: 700; color: #BF9A33; font-size: 0.92rem; letter-spacing: 0.02em;">
          ${this.escapeHtml(message)}
        </div>
      </div>
    `;
  }

  static renderKpiCard({ title, value, icon, color = 'blue', subtitle = '', trend = null, progress = null }) {
    const esc = this.escapeHtml;
    let trendHtml = '';
    if (trend) {
      const isUp = trend.direction === 'up' || trend.value > 0;
      const trendColor = isUp ? 'text-success' : 'text-danger';
      const trendIcon = isUp ? 'trending-up' : 'trending-down';
      trendHtml = `
        <div class="kpi-trend ${trendColor}" style="display:inline-flex; align-items:center; gap:3px; font-size:0.75rem; font-weight:700; margin-top:4px;">
          <i data-lucide="${trendIcon}" style="width:13px; height:13px;"></i>
          <span>${esc(trend.label || (isUp ? '+' : '') + trend.value + '%')}</span>
        </div>
      `;
    }

    let progressHtml = '';
    if (progress !== null && progress !== undefined) {
      const pct = Math.min(100, Math.max(0, Number(progress) || 0));
      progressHtml = `
        <div class="kpi-progress-wrap" style="margin-top: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-secondary); margin-bottom:3px; font-weight:600;">
            <span>Progress</span>
            <span>${pct}%</span>
          </div>
          <div style="height:5px; background:var(--bg-canvas-subtle); border-radius:9999px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:var(--primary); border-radius:9999px; transition:width 0.8s ease;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="kpi-card" tabindex="0">
        <div class="kpi-icon kpi-${color}">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="kpi-meta" style="flex:1; min-width:0;">
          <h3 class="kpi-value">${esc(value)}</h3>
          <p class="kpi-title">${esc(title)}</p>
          ${subtitle ? `<span class="kpi-subtitle" style="font-size: 0.72rem; color: var(--text-secondary);">${esc(subtitle)}</span>` : ''}
          ${trendHtml}
          ${progressHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render standardized Page Header with title, breadcrumb, subtitle and action buttons.
   */
  static renderPageHeader({ title, subtitle = '', breadcrumbs = [], actionsHtml = '', actions = '', badge = '', icon = '' }) {
    const esc = this.escapeHtml;

    // Auto-detect module icon if not explicitly provided
    let headerIcon = icon;
    if (!headerIcon && title) {
      const t = title.toLowerCase();
      if (t.includes('workspace') || t.includes('my work')) headerIcon = 'briefcase';
      else if (t.includes('student')) headerIcon = 'graduation-cap';
      else if (t.includes('attendance') || t.includes('radar')) headerIcon = 'user-check';
      else if (t.includes('admission')) headerIcon = 'clipboard-pen';
      else if (t.includes('academic') || t.includes('curriculum')) headerIcon = 'book-open';
      else if (t.includes('timetable') || t.includes('schedule')) headerIcon = 'calendar';
      else if (t.includes('finance') || t.includes('fee')) headerIcon = 'credit-card';
      else if (t.includes('exam')) headerIcon = 'award';
      else if (t.includes('homework')) headerIcon = 'notebook-pen';
      else if (t.includes('staff') || t.includes('faculty') || t.includes('payroll')) headerIcon = 'users';
      else if (t.includes('id card') || t.includes('badge')) headerIcon = 'contact-2';
      else if (t.includes('certificate')) headerIcon = 'file-badge';
      else if (t.includes('report') || t.includes('analytics')) headerIcon = 'bar-chart-3';
      else if (t.includes('admin') || t.includes('security')) headerIcon = 'shield-check';
      else if (t.includes('institution') || t.includes('school')) headerIcon = 'school';
      else if (t.includes('communication') || t.includes('message')) headerIcon = 'message-square';
      else if (t.includes('operation')) headerIcon = 'truck';
      else if (t.includes('overview') || t.includes('dashboard')) headerIcon = 'layout-dashboard';
    }

    // Clean empty dashes or placeholder parentheses in subtitle
    const cleanSubtitle = subtitle ? subtitle.replace(/\s*\(\s*[—\-–\s]+\s*\)/g, '').trim() : '';
    const finalActions = actionsHtml || actions || '';

    const breadcrumbsHtml = breadcrumbs.length ? `
      <nav class="tms-breadcrumbs" aria-label="Breadcrumb">
        <ol class="tms-breadcrumbs-list">
          <li>
            <a href="#/dashboard" class="tms-breadcrumb-link">
              <span class="tms-breadcrumb-icon"><i data-lucide="home"></i></span>
              <span>TPS ERP</span>
            </a>
          </li>
          ${breadcrumbs.map((b, idx) => `
            <li class="tms-breadcrumb-item">
              <span class="tms-breadcrumb-sep"><i data-lucide="chevron-right"></i></span>
              ${b.href && idx < breadcrumbs.length - 1 
                ? `<a href="${esc(b.href)}" class="tms-breadcrumb-link">${esc(b.label)}</a>` 
                : `<span class="tms-breadcrumb-current">${esc(b.label)}</span>`
              }
            </li>
          `).join('')}
        </ol>
      </nav>
    ` : '';

    return `
      <div class="tms-page-header">
        ${breadcrumbsHtml ? `
          <div class="tms-page-header-topbar">
            ${breadcrumbsHtml}
          </div>
        ` : ''}
        <div class="tms-page-header-main">
          <div class="tms-page-header-identity">
            ${headerIcon ? `
              <div class="tms-page-header-icon" title="${esc(title)}">
                <i data-lucide="${esc(headerIcon)}"></i>
              </div>
            ` : ''}
            <div class="tms-page-header-headings">
              <div class="tms-page-title-row">
                <h1 class="tms-page-title">${esc(title)}</h1>
                ${badge ? `<span class="tms-page-badge">${badge}</span>` : ''}
              </div>
              ${cleanSubtitle ? `<p class="tms-page-subtitle">${esc(cleanSubtitle)}</p>` : ''}
            </div>
          </div>
          ${finalActions ? `<div class="tms-page-actions">${finalActions}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render standardized filter toolbar with search, filters and export actions.
   */
  static renderToolbar({ searchId = '', searchPlaceholder = 'Search records...', filtersHtml = '', actionsHtml = '' }) {
    const esc = this.escapeHtml;
    return `
      <div class="tms-filter-toolbar">
        <div class="tms-toolbar-left">
          ${searchId ? `
            <div class="tms-toolbar-search">
              <i data-lucide="search" class="tms-search-icon"></i>
              <input type="text" class="form-input tms-search-input" id="${esc(searchId)}" placeholder="${esc(searchPlaceholder)}">
            </div>
          ` : ''}
          ${filtersHtml ? `<div class="tms-toolbar-filters">${filtersHtml}</div>` : ''}
        </div>
        ${actionsHtml ? `<div class="tms-toolbar-actions">${actionsHtml}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render illustrated Empty State', title = 'No records found', description = 'There are no records matching your selected filters or criteria.', actionHtml = '' }) {
    const esc = this.escapeHtml;
    return `
      <div class="tms-empty-state" style="padding: 48px 24px; text-align: center; background: #ffffff; border-radius: 16px; border: 1.5px dashed var(--border-color); margin: 16px 0;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(191, 154, 51, 0.08); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <i data-lucide="${esc(icon)}" style="width: 32px; height: 32px;"></i>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0 0 6px;">${esc(title)}</h3>
        <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 440px; margin: 0 auto 16px;">${esc(description)}</p>
        ${actionHtml ? `<div>${actionHtml}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render modern skeleton loaders for tables and card grids.
   */
  static renderSkeletonLoader({ type = 'table', rows = 5, cols = 4 } = {}) {
    if (type === 'cards') {
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          ${Array(rows).fill(0).map(() => `
            <div class="card tms-skeleton" style="padding: 20px;">
              <div class="skeleton-line" style="width: 40%; height: 16px; margin-bottom: 12px;"></div>
              <div class="skeleton-line" style="width: 80%; height: 24px; margin-bottom: 16px;"></div>
              <div class="skeleton-line" style="width: 60%; height: 12px;"></div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="table-responsive" style="background:#fff; border-radius:12px; border:1px solid var(--border-color); padding:16px;">
        <div class="skeleton-line" style="width: 100%; height: 36px; margin-bottom: 12px; border-radius:6px;"></div>
        ${Array(rows).fill(0).map(() => `
          <div style="display:flex; gap:12px; margin-bottom:10px;">
            ${Array(cols).fill(0).map(() => `<div class="skeleton-line" style="flex:1; height: 20px; border-radius:4px;"></div>`).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render high-precision responsive SVG Area Chart.
   */
  static renderAreaChart({ id = 'chart-' + Math.random().toString(36).substr(2, 6), data = [], labels = [], height = 180, strokeColor = '#BF9A33', fillColor = 'rgba(191, 154, 51, 0.12)', title = '' }) {
    if (!data || !data.length) return '';
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = (maxVal - minVal) || 1;
    const width = 600;
    const chartHeight = height - 40;
    const padding = 30;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1 || 1)) * (width - 2 * padding);
      const y = chartHeight - ((val - minVal) / range) * (chartHeight - 30) + 15;
      return { x, y, val, label: labels[idx] || `Point ${idx + 1}` };
    });

    const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    const gradId = `grad-${id}`;

    return `
      <div class="tms-svg-chart-wrap" id="${id}" style="width:100%; overflow:hidden;">
        ${title ? `<div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:10px;">${this.escapeHtml(title)}</div>` : ''}
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;" preserveAspectRatio="none">
          <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.32" />
              <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <!-- Grid lines -->
          <line x1="${padding}" y1="15" x2="${width - padding}" y2="15" stroke="#E8EDF3" stroke-dasharray="4 4" stroke-width="1" />
          <line x1="${padding}" y1="${chartHeight / 2}" x2="${width - padding}" y2="${chartHeight / 2}" stroke="#E8EDF3" stroke-dasharray="4 4" stroke-width="1" />
          <line x1="${padding}" y1="${chartHeight}" x2="${width - padding}" y2="${chartHeight}" stroke="#E8EDF3" stroke-width="1.5" />

          <!-- Filled area -->
          <path d="${areaD}" fill="url(#${gradId})" />

          <!-- Line -->
          <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Dots & Labels -->
          ${points.map(p => `
            <g class="chart-point-group" tabindex="0">
              <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5" style="transition:transform 0.15s ease; cursor:pointer;" />
              <text x="${p.x}" y="${chartHeight + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#64748B">${this.escapeHtml(p.label)}</text>
              <title>${p.label}: ${p.val}</title>
            </g>
          `).join('')}
        </svg>
      </div>
    `;
  }

  /**
   * Render high-precision responsive SVG Bar Chart.
   */
  static renderBarChart({ id = 'bar-' + Math.random().toString(36).substr(2, 6), data = [], labels = [], height = 180, color = '#BF9A33', title = '', valuePrefix = '', valueSuffix = '' }) {
    if (!data || !data.length) return '';
    const maxVal = Math.max(...data, 1);
    const width = 600;
    const chartHeight = height - 40;
    const padding = 20;
    const barWidth = Math.max(16, Math.min(44, ((width - 2 * padding) / data.length) * 0.6));
    const gap = (width - 2 * padding) / data.length;

    return `
      <div class="tms-svg-chart-wrap" id="${id}" style="width:100%; overflow:hidden;">
        ${title ? `<div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:10px;">${this.escapeHtml(title)}</div>` : ''}
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;" preserveAspectRatio="none">
          <!-- Baseline -->
          <line x1="${padding}" y1="${chartHeight}" x2="${width - padding}" y2="${chartHeight}" stroke="#E8EDF3" stroke-width="1.5" />
          
          ${data.map((val, idx) => {
            const barH = (val / maxVal) * (chartHeight - 30);
            const x = padding + idx * gap + (gap - barWidth) / 2;
            const y = chartHeight - barH;
            return `
              <g class="chart-bar-group" tabindex="0">
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${color}" style="transition:all 0.2s ease; cursor:pointer; opacity:0.9;" />
                <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">${valuePrefix}${val.toLocaleString()}${valueSuffix}</text>
                <text x="${x + barWidth / 2}" y="${chartHeight + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#64748B">${this.escapeHtml(labels[idx] || '')}</text>
                <title>${labels[idx]}: ${valuePrefix}${val.toLocaleString()}${valueSuffix}</title>
              </g>
            `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  /**
   * Animate a numeric counter from 0 or start to target.
   */
  static animateCounter(el, target, duration = 800, prefix = '', suffix = '') {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (target - start) * ease);
      el.innerText = `${prefix}${current.toLocaleString()}${suffix}`;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /**
   * Premium Asynchronous Confirmation Modal.
   * Completely replaces native browser-side confirm(...) popups with a luxury UI dialog.
   * @param {Object} options
   * @param {string} options.title Modal title
   * @param {string} options.message Prompt / description
   * @param {string} [options.confirmText='Confirm'] Action button label
   * @param {string} [options.cancelText='Cancel'] Cancel button label
   * @param {string} [options.type='danger'] 'danger' | 'warning' | 'primary' | 'success'
   * @param {string} [options.icon='alert-triangle'] Lucide icon name
   * @returns {Promise<boolean>}
   */
  static confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    icon = 'alert-triangle'
  } = {}) {
    return new Promise((resolve) => {
      const existing = document.getElementById('tms-confirm-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'tms-confirm-overlay';
      overlay.className = 'tms-confirm-overlay';

      let iconColor = '#ef4444';
      let iconBg = 'rgba(239, 68, 68, 0.1)';
      let iconBorder = 'rgba(239, 68, 68, 0.2)';
      let confirmBtnClass = 'btn-danger';

      if (type === 'primary' || type === 'info' || type === 'success') {
        iconColor = '#BF9A33';
        iconBg = 'rgba(191, 154, 51, 0.1)';
        iconBorder = 'rgba(191, 154, 51, 0.2)';
        confirmBtnClass = 'btn-primary';
      } else if (type === 'warning') {
        iconColor = '#f59e0b';
        iconBg = 'rgba(245, 158, 11, 0.1)';
        iconBorder = 'rgba(245, 158, 11, 0.2)';
        confirmBtnClass = 'btn-warning';
      }

      overlay.innerHTML = `
        <div class="tms-confirm-box">
          <div class="tms-confirm-icon-wrap" style="background: ${iconBg}; border: 1px solid ${iconBorder}; color: ${iconColor};">
            <i data-lucide="${icon}" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 class="tms-confirm-title">${this.escapeHtml(title)}</h3>
          <p class="tms-confirm-message">${this.escapeHtml(message)}</p>
          <div class="tms-confirm-actions">
            <button type="button" class="btn btn-secondary" id="tms-confirm-cancel">${this.escapeHtml(cancelText)}</button>
            <button type="button" class="btn ${confirmBtnClass}" id="tms-confirm-ok">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.refreshIcons();

      requestAnimationFrame(() => overlay.classList.add('active'));

      const cleanup = (result) => {
        overlay.classList.remove('active');
        window.removeEventListener('keydown', handleKey);
        setTimeout(() => overlay.remove(), 220);
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      };

      window.addEventListener('keydown', handleKey);

      overlay.querySelector('#tms-confirm-cancel').addEventListener('click', () => cleanup(false));
      overlay.querySelector('#tms-confirm-ok').addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });

      setTimeout(() => {
        overlay.querySelector('#tms-confirm-ok')?.focus();
      }, 50);
    });
  }

  /**
   * Premium Asynchronous Alert Modal.
   */
  static alert({
    title = 'Notification',
    message = '',
    buttonText = 'Understood',
    type = 'info',
    icon = 'info'
  } = {}) {
    return new Promise((resolve) => {
      const existing = document.getElementById('tms-confirm-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'tms-confirm-overlay';
      overlay.className = 'tms-confirm-overlay';

      let iconColor = '#BF9A33';
      let iconBg = 'rgba(191, 154, 51, 0.1)';
      let iconBorder = 'rgba(191, 154, 51, 0.2)';

      if (type === 'danger' || type === 'error') {
        iconColor = '#ef4444';
        iconBg = 'rgba(239, 68, 68, 0.1)';
        iconBorder = 'rgba(239, 68, 68, 0.2)';
      } else if (type === 'warning') {
        iconColor = '#f59e0b';
        iconBg = 'rgba(245, 158, 11, 0.1)';
        iconBorder = 'rgba(245, 158, 11, 0.2)';
      }

      overlay.innerHTML = `
        <div class="tms-confirm-box">
          <div class="tms-confirm-icon-wrap" style="background: ${iconBg}; border: 1px solid ${iconBorder}; color: ${iconColor};">
            <i data-lucide="${icon}" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 class="tms-confirm-title">${this.escapeHtml(title)}</h3>
          <p class="tms-confirm-message">${this.escapeHtml(message)}</p>
          <div class="tms-confirm-actions" style="justify-content: center;">
            <button type="button" class="btn btn-primary" id="tms-alert-ok" style="min-width: 140px;">${this.escapeHtml(buttonText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.refreshIcons();

      requestAnimationFrame(() => overlay.classList.add('active'));

      const cleanup = () => {
        overlay.classList.remove('active');
        window.removeEventListener('keydown', handleKey);
        setTimeout(() => overlay.remove(), 220);
        resolve();
      };

      const handleKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') cleanup();
      };

      window.addEventListener('keydown', handleKey);
      overlay.querySelector('#tms-alert-ok').addEventListener('click', cleanup);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
      });
    });
  }
}

export default UIComponents;
