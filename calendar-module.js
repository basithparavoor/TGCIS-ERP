/**
 * THAIBA PUBLIC SCHOOL — Institutional Event & Academic Calendar Planner
 * Comprehensive Executive Academic Calendar Suite
 * Features:
 * - Structural: Unified executive layout, generous full-width grid, zero header clipping
 * - Functional: Corrected weekend-off calculations, single-bar navigation, range selection,
 *               quick 1-click day inspection & override, weekly working days customizer
 * - UI: Apple/Fluent inspired cards, continuous pill tracks, live today beacon, refined chips
 * - Layout: Responsive single-column workspace flow, fluid day cells, no awkward empty columns
 * - Color Theme: Signature Thaiba Gold palette with amber holidays, crimson breaks, purple exams, cobalt PTMs
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';
import { TMS_LOGO } from './logo.js';

export const EVENT_CATEGORIES = [
  { id: 'all', name: 'All Categories', color: '#64748b', trackColor: '#f1f5f9', badgeClass: 'is-all', icon: 'layers' },
  { id: 'holiday', name: 'Official Holiday', color: '#f59e0b', trackColor: '#fef3c7', badgeClass: 'is-holiday', icon: 'sun' },
  { id: 'hostel_leave', name: 'School / Hostel Break', color: '#ef4444', trackColor: '#fee2e2', badgeClass: 'is-hostel-leave', icon: 'plane-takeoff' },
  { id: 'exam', name: 'Examinations & Tests', color: '#9333ea', trackColor: '#f3e8ff', badgeClass: 'is-exam', icon: 'award' },
  { id: 'ptm', name: 'Parent-Teacher Meeting (PTM)', color: '#2563eb', trackColor: '#eff6ff', badgeClass: 'is-ptm', icon: 'users' },
  { id: 'sports', name: 'Sports & Cultural Meet', color: '#ea580c', trackColor: '#ffedd5', badgeClass: 'is-sports', icon: 'trophy' },
  { id: 'working_day', name: 'Special Working Session', color: '#059669', trackColor: '#ecfdf5', badgeClass: 'is-special-work', icon: 'zap' },
  { id: 'fee', name: 'Fee Collection Deadline', color: '#d97706', trackColor: '#fef3c7', badgeClass: 'is-fee', icon: 'credit-card' }
];

export const DEFAULT_CALENDAR_STORE = {
  academic_year: '2026-2027',
  weekly_working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  events: [
    { id: 'cal-1', date: '2026-10-02', name: 'Gandhi Jayanti Observance', type: 'holiday', is_all_day: true },
    { id: 'cal-2a', date: '2026-10-12', name: 'Puja Vacation / Dussehra Recess', type: 'holiday', range_id: 'range-puja-26', is_all_day: true },
    { id: 'cal-2b', date: '2026-10-13', name: 'Puja Vacation / Dussehra Recess', type: 'holiday', range_id: 'range-puja-26', is_all_day: true },
    { id: 'cal-2c', date: '2026-10-14', name: 'Puja Vacation / Dussehra Recess', type: 'holiday', range_id: 'range-puja-26', is_all_day: true },
    { id: 'cal-2d', date: '2026-10-15', name: 'Puja Vacation / Dussehra Recess', type: 'holiday', range_id: 'range-puja-26', is_all_day: true },
    { id: 'cal-3a', date: '2026-10-19', name: 'Deepavali Institutional Break', type: 'hostel_leave', range_id: 'range-diwali-26', is_all_day: true },
    { id: 'cal-3b', date: '2026-10-20', name: 'Deepavali Institutional Break', type: 'hostel_leave', range_id: 'range-diwali-26', is_all_day: true },
    { id: 'cal-3c', date: '2026-10-21', name: 'Deepavali Institutional Break', type: 'hostel_leave', range_id: 'range-diwali-26', is_all_day: true },
    { id: 'cal-4a', date: '2026-11-16', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-4b', date: '2026-11-17', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-4c', date: '2026-11-18', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-4d', date: '2026-11-19', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-4e', date: '2026-11-20', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-4f', date: '2026-11-21', name: 'Term-1 Mid-Term Assessments', type: 'exam', range_id: 'range-exam-t1', is_all_day: true },
    { id: 'cal-5', date: '2026-11-28', name: 'Parent-Teacher Meeting & Progress Report Meet', type: 'ptm', is_all_day: true },
    { id: 'cal-6a', date: '2026-12-24', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6b', date: '2026-12-25', name: 'Christmas Day', type: 'holiday', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6c', date: '2026-12-26', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6d', date: '2026-12-27', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6e', date: '2026-12-28', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6f', date: '2026-12-29', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6g', date: '2026-12-30', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6h', date: '2026-12-31', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6i', date: '2027-01-01', name: 'New Year Day', type: 'holiday', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-6j', date: '2027-01-02', name: 'Winter Vacation & Hostel Exit Window', type: 'hostel_leave', range_id: 'range-winter-26', is_all_day: true },
    { id: 'cal-7', date: '2027-01-26', name: 'Republic Day Institutional Celebration', type: 'holiday', is_all_day: true },
    { id: 'cal-8a', date: '2027-02-12', name: 'Annual Sports & Athletics Meet', type: 'sports', range_id: 'range-sports-27', is_all_day: true },
    { id: 'cal-8b', date: '2027-02-13', name: 'Annual Sports & Athletics Meet', type: 'sports', range_id: 'range-sports-27', is_all_day: true },
    { id: 'cal-8c', date: '2027-02-14', name: 'Annual Sports Prize Distribution & Cultural Meet', type: 'sports', range_id: 'range-sports-27', is_all_day: true },
    { id: 'cal-9a', date: '2027-03-20', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9b', date: '2027-03-21', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9c', date: '2027-03-22', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9d', date: '2027-03-23', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9e', date: '2027-03-24', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9f', date: '2027-03-25', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9g', date: '2027-03-26', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9h', date: '2027-03-27', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9i', date: '2027-03-28', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9j', date: '2027-03-29', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9k', date: '2027-03-30', name: 'Ramadan & Eid-ul-Fitr Vacation Break', type: 'hostel_leave', range_id: 'range-eid-27', is_all_day: true },
    { id: 'cal-9l', date: '2027-03-31', name: 'Eid-ul-Fitr Observance', type: 'holiday', range_id: 'range-eid-27', is_all_day: true }
  ]
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class CalendarModule {
  static _calendarStore = null;
  static _currentDate = null;
  static _selectedCategory = 'all';
  static _rangeStart = null;
  static _rangeEnd = null;
  static _rangeMode = false;

  /**
   * Main render entrypoint for the Academic Calendar
   */
  static async render(container) {
    this._container = container;
    await this._loadCalendar();

    if (!this._currentDate) {
      this._currentDate = new Date();
    }

    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth() + 1; // 1-12
    const monthName = MONTH_NAMES[month - 1];

    // Compute metrics
    const metrics = this._computeMonthMetrics(year, month);
    const todayInfo = this._getTodaySchedule();
    const consolidatedEvents = this._getConsolidatedEvents(year, month);

    const esc = (v) => UIComponents.escapeHtml(v || '');

    container.innerHTML = `
      <div class="tms-content-wrapper cal-page-wrapper">
        
        <!-- INSTITUTIONAL EXECUTIVE PAGE HEADER -->
        <div class="cal-executive-header">
          <div class="cal-header-left">
            <div class="cal-header-brand-icon">
              <i data-lucide="calendar"></i>
            </div>
            <div class="cal-header-text">
              <div class="cal-header-title-row">
                <h1 class="cal-header-title">Academic Calendar</h1>
                <span class="cal-badge-pill">Academic Operations</span>
                <span class="cal-badge-session">Session ${esc(this._calendarStore.academic_year || TMS_CONFIG.academic?.currentYear || '2026-2027')}</span>
              </div>
              <p class="cal-header-subtitle">
                Institutional schedule, weekly working days, official holidays, assessment cycles &amp; hostel leaves
              </p>
            </div>
          </div>

          <!-- Header Toolbar Actions -->
          <div class="cal-header-actions">
            <button type="button" class="btn btn-secondary btn-sm cal-action-btn" id="btn-open-working-schedule" title="Configure weekly active working days">
              <i data-lucide="settings-2"></i> Working Days
            </button>
            <button type="button" class="btn ${this._rangeMode ? 'btn-primary active' : 'btn-secondary'} btn-sm cal-action-btn" id="btn-toggle-range-mode" title="Click start and end date to select a range">
              <i data-lucide="arrow-left-right"></i> Range Mode ${this._rangeMode ? '(ON)' : ''}
            </button>
            <button type="button" class="btn btn-secondary btn-sm cal-action-btn" id="btn-export-ics" title="Export .ics calendar for Google/Apple Calendar">
              <i data-lucide="download"></i> Sync (.ics)
            </button>
            <button type="button" class="btn btn-secondary btn-sm cal-action-btn" id="btn-print-academic-cal" title="Print official A4 academic calendar">
              <i data-lucide="printer"></i> Print A4
            </button>
            <button type="button" class="btn btn-primary btn-sm cal-action-btn btn-add-main" id="btn-add-cal-holiday">
              <i data-lucide="plus"></i> Add Event
            </button>
          </div>
        </div>

        <!-- UNIFIED WORKSPACE LAYOUT -->
        <div class="cal-workspace-layout">
          
          <!-- TOP EXECUTIVE ROW: Today's Snapshot + Monthly Breakdown -->
          <div class="cal-top-grid">
            
            <!-- 1. TODAY'S SNAPSHOT CARD (GREEN Gold HERO CARD) -->
            <div class="cal-today-card">
              <div class="cal-today-header">
                <span class="cal-today-schedule-title">
                  <span class="cal-radar-beacon"></span> TODAY'S INSTITUTIONAL SCHEDULE
                </span>
                <span class="cal-today-badge">
                  ${todayInfo.isActive ? 'Active Academic Day' : 'Campus Recess / Off'}
                </span>
              </div>
              <div class="cal-today-body">
                <span class="cal-today-num">
                  ${todayInfo.dayNumber}
                </span>
                <div class="cal-today-text">
                  <div class="cal-today-dayname">
                    ${todayInfo.dayName}, ${todayInfo.monthName} ${todayInfo.year}
                  </div>
                  <div class="cal-today-status">
                    ${todayInfo.statusHtml}
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. MONTHLY BREAKDOWN METRICS CARD -->
            <div class="cal-overview-card">
              <div class="cal-overview-header">
                <h4 class="cal-overview-title">
                  <i data-lucide="bar-chart-3"></i>
                  ${monthName} ${year} Overview
                </h4>
                <span class="badge badge-secondary cal-total-days-badge">
                  ${metrics.totalDays} Total Days
                </span>
              </div>

              <!-- 4 Metrics Chips -->
              <div class="cal-metrics-grid">
                <div class="cal-metric-chip metric-total">
                  <span class="cal-metric-label">Total Days</span>
                  <div class="cal-metric-val">${metrics.totalDays}</div>
                </div>
                <div class="cal-metric-chip metric-working">
                  <span class="cal-metric-label">Working Days</span>
                  <div class="cal-metric-val text-Gold">${metrics.workingDays}</div>
                </div>
                <div class="cal-metric-chip metric-holiday">
                  <span class="cal-metric-label">Official Holidays</span>
                  <div class="cal-metric-val text-amber">${metrics.holidays}</div>
                </div>
                <div class="cal-metric-chip metric-weekend">
                  <span class="cal-metric-label">Weekend Offs</span>
                  <div class="cal-metric-val text-slate">${metrics.weekendOffs}</div>
                </div>
              </div>

              <!-- Segmented Progress Bar -->
              <div class="cal-progress-track">
                <div class="cal-progress-bar-segment segment-working" style="width: ${metrics.workingPercent}%;" title="Working Days: ${metrics.workingPercent}%"></div>
                <div class="cal-progress-bar-segment segment-holiday" style="width: ${metrics.holidayPercent}%;" title="Holidays: ${metrics.holidayPercent}%"></div>
                <div class="cal-progress-bar-segment segment-weekend" style="width: ${metrics.weekendPercent}%;" title="Weekend Offs: ${metrics.weekendPercent}%"></div>
              </div>
              <div class="cal-progress-labels">
                <span class="label-working">⚡ ${metrics.workingPercent}% Working Days</span>
                <span class="label-holiday">🌴 ${metrics.holidayPercent}% Holidays &amp; Recesses</span>
                <span class="label-weekend">🏖️ ${metrics.weekendPercent}% Weekend Offs</span>
              </div>
            </div>

          </div>

          <!-- Category Filter Pills Rail -->
          <div class="cal-filter-rail-wrapper">
            <div class="cal-filters-rail" id="cal-filters-rail">
              ${EVENT_CATEGORIES.map(cat => {
                const isActive = this._selectedCategory === cat.id;
                let countBadge = '';
                if (cat.id === 'all') {
                  countBadge = `<span class="cal-pill-count">${(this._calendarStore.events || []).length}</span>`;
                } else {
                  const cCount = (this._calendarStore.events || []).filter(e => e.type === cat.id).length;
                  if (cCount > 0) countBadge = `<span class="cal-pill-count">${cCount}</span>`;
                }

                return `
                  <button type="button" class="cal-filter-pill ${isActive ? 'active' : ''}" data-cat="${cat.id}">
                    <i data-lucide="${cat.icon || 'tag'}"></i>
                    <span>${cat.name}</span>
                    ${countBadge}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- COMPONENT A: FLUENT MONTH CALENDAR CARD (FULL WIDTH SPACIOUS GRID) -->
          <div class="cal-fluent-grid-card">
            
            <!-- Card Top Header with Unified Navigation -->
            <div class="cal-fluent-top-header">
              <div class="cal-fluent-title-group">
                <div class="cal-fluent-icon-badge">
                  <i data-lucide="calendar-check-2"></i>
                </div>
                <div>
                  <h3 class="cal-fluent-title">Event Calendar</h3>
                  <p class="cal-fluent-desc">
                    Institutional working schedule, continuous holiday tracks, assessment windows &amp; hostel leaves
                  </p>
                </div>
              </div>

              <!-- Integrated Month & Year Jump Dropdowns -->
              <div class="cal-jump-controls">
                <div class="cal-select-wrap">
                  <select id="cal-jump-month" class="cal-nav-select" title="Jump to month">
                    ${MONTH_NAMES.map((m, idx) => `
                      <option value="${idx + 1}" ${idx + 1 === month ? 'selected' : ''}>${m}</option>
                    `).join('')}
                  </select>
                  <i data-lucide="chevron-down" class="cal-select-chevron"></i>
                </div>
                <div class="cal-select-wrap">
                  <select id="cal-jump-year" class="cal-nav-select" title="Jump to year">
                    ${[year - 1, year, year + 1, year + 2].map(y => `
                      <option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>
                    `).join('')}
                  </select>
                  <i data-lucide="chevron-down" class="cal-select-chevron"></i>
                </div>
              </div>
            </div>

            <!-- Month & Year Navigation Bar -->
            <div class="cal-month-nav-bar">
              <button type="button" class="cal-nav-btn" id="cal-btn-prev-month" title="Previous Month">
                <i data-lucide="chevron-left"></i>
              </button>
              <div class="cal-month-center-group">
                <span class="cal-month-nav-title">
                  ${monthName} ${year}
                </span>
                <button type="button" class="cal-today-pill" id="cal-btn-today" title="Jump to Today">
                  Today
                </button>
              </div>
              <button type="button" class="cal-nav-btn" id="cal-btn-next-month" title="Next Month">
                <i data-lucide="chevron-right"></i>
              </button>
            </div>

            <!-- 7-Day Weekday Header (Mon, Tue, Wed, Thu, Fri, Sat, Sun) -->
            <div class="cal-weekday-header">
              <div class="cal-wd-col"><span>Mon</span></div>
              <div class="cal-wd-col"><span>Tue</span></div>
              <div class="cal-wd-col"><span>Wed</span></div>
              <div class="cal-wd-col"><span>Thu</span></div>
              <div class="cal-wd-col"><span>Fri</span></div>
              <div class="cal-wd-col"><span>Sat</span></div>
              <div class="cal-wd-col col-sun"><span>Sun</span></div>
            </div>

            <!-- Fluent Month Grid with Continuous Pill Tracks -->
            <div class="cal-month-grid">
              ${this._renderMonthGridCells(year, month)}
            </div>

            <!-- Card Footer: Status Summary & Interactive Legend -->
            <div class="cal-fluent-footer">
              <div id="cal-range-display-text" class="cal-footer-status">
                ${this._getSelectionStatusText(year, month)}
              </div>

              <!-- Legend Indicators -->
              <div class="cal-legend-row">
                <span class="legend-item legend-holiday">
                  <span class="legend-dot dot-holiday"></span>
                  Official Holiday (Amber)
                </span>
                <span class="legend-item legend-break">
                  <span class="legend-dot dot-break"></span>
                  Hostel / Vacation (Red)
                </span>
                <span class="legend-item legend-exam">
                  <span class="legend-dot dot-exam"></span>
                  Exam Window (Purple)
                </span>
                <span class="legend-item legend-working">
                  <span class="legend-dot dot-working"></span>
                  Working Day (Green)
                </span>
              </div>
            </div>

            <!-- If Range Selected: Floating Range Action Bar -->
            ${this._rangeStart ? `
              <div class="cal-range-action-bar">
                <div class="cal-range-info">
                  <i data-lucide="check-circle-2" style="width: 16px; height: 16px; color: #2563EB;"></i>
                  <span>Selected Date Span:</span>
                  <span class="cal-range-dates font-mono">${this._rangeStart}</span>
                  <span>to</span>
                  <span class="cal-range-dates font-mono">${this._rangeEnd || this._rangeStart}</span>
                  <span class="cal-range-count-badge">(${this._getRangeSpanDays()} Days)</span>
                </div>
                <div class="cal-range-btns">
                  <button type="button" class="btn btn-primary btn-xs" id="btn-action-add-holiday-range">
                    <i data-lucide="plus"></i> Add Event for Range
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-action-clear-range">
                    Clear
                  </button>
                </div>
              </div>
            ` : ''}

          </div>

          <!-- SCHEDULED HOLIDAYS, EVENTS & BREAKS AGENDA (FULL WIDTH EXPANDING CARD) -->
          <div class="cal-agenda-card-box">
            <div class="cal-agenda-header">
              <div class="cal-agenda-title-group">
                <div class="cal-agenda-icon-wrap">
                  <i data-lucide="calendar-heart"></i>
                </div>
                <div>
                  <h4 class="cal-agenda-title">
                    <span>Scheduled Institutional Events &amp; Holidays</span>
                    <span class="cal-agenda-count-badge">${consolidatedEvents.length}</span>
                  </h4>
                  <p class="cal-agenda-subtitle">
                    ${this._selectedCategory === 'all' ? `All scheduled events for ${monthName} ${year}` : `Filtered by category: ${this._getCategoryName(this._selectedCategory)}`}
                  </p>
                </div>
              </div>
              <div class="cal-agenda-header-actions">
                ${this._selectedCategory !== 'all' ? `
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-clear-category-filter">
                    Show All
                  </button>
                ` : ''}
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-cal-holiday-inline">
                  <i data-lucide="plus"></i> Add Event
                </button>
              </div>
            </div>

            <!-- Natural list without forced scrollbars -->
            <div class="cal-agenda-list">
              ${consolidatedEvents.length > 0 ? consolidatedEvents.map(item => {
                const catObj = EVENT_CATEGORIES.find(c => c.id === item.type) || EVENT_CATEGORIES[1];
                const isMulti = item.startDate !== item.endDate;
                const daysCount = item.allDates ? item.allDates.length : 1;
                const dateDisplay = isMulti ? `${item.startDate} — ${item.endDate}` : item.startDate;

                return `
                  <div class="cal-agenda-item item-${catObj.id}" style="border-left-color: ${catObj.color};">
                    <div class="cal-agenda-item-left">
                      <div class="cal-agenda-item-title-row">
                        <span class="cal-agenda-item-dot" style="background: ${catObj.color};"></span>
                        <span class="cal-agenda-item-name">${esc(item.name)}</span>
                        <span class="cal-agenda-category-badge" style="background: ${catObj.trackColor || '#F1F5F9'}; color: ${catObj.color}; border: 1px solid ${catObj.color}35;">
                          ${esc(catObj.name)}
                        </span>
                        ${isMulti ? `<span class="cal-agenda-days-badge">(${daysCount} Days)</span>` : ''}
                      </div>
                      <div class="cal-agenda-item-meta">
                        <span class="font-mono cal-agenda-date">${dateDisplay}</span>
                        ${!item.is_all_day && item.start_time && item.end_time ? `
                          <span class="cal-agenda-time">• <i data-lucide="clock"></i> ${item.start_time} - ${item.end_time}</span>
                        ` : '<span class="cal-agenda-time">• Full Day Schedule</span>'}
                        ${item.target_audience && item.target_audience !== 'all' ? `
                          <span class="cal-agenda-audience">• Audience: <strong>${esc(item.target_audience)}</strong></span>
                        ` : ''}
                        ${item.description ? `<span class="cal-agenda-desc">• <em>${esc(item.description)}</em></span>` : ''}
                      </div>
                    </div>

                    <div class="cal-agenda-item-actions">
                      <button type="button" class="btn btn-secondary btn-xs btn-edit-cal-event" data-event-id="${esc(item.id)}" data-event-name="${esc(item.name)}" data-event-type="${esc(item.type)}" data-start-date="${esc(item.startDate)}" data-end-date="${esc(item.endDate)}" data-start-time="${esc(item.start_time || '')}" data-end-time="${esc(item.end_time || '')}" data-is-all-day="${item.is_all_day !== false ? 'true' : 'false'}" data-range-id="${esc(item.range_id || '')}" data-all-dates="${esc((item.allDates || []).join(','))}" title="Edit event">
                        <i data-lucide="edit-2"></i> Edit
                      </button>
                      <button type="button" class="btn btn-secondary btn-xs btn-del-event" data-event-id="${esc(item.id)}" data-range-id="${esc(item.range_id || '')}" data-all-dates="${esc((item.allDates || []).join(','))}" title="Delete event">
                        <i data-lucide="trash-2"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="cal-agenda-empty">
                  <div class="cal-empty-icon">
                    <i data-lucide="calendar"></i>
                  </div>
                  <div class="cal-empty-title">No events scheduled for ${monthName} ${year}</div>
                  <p class="cal-empty-desc">
                    ${this._selectedCategory !== 'all' ? `No events match the "${this._getCategoryName(this._selectedCategory)}" filter.` : 'Regular academic working days and standard timetable are in session.'}
                  </p>
                  <div class="cal-empty-actions">
                    <button type="button" class="btn btn-primary btn-sm" id="btn-add-first-event">
                      <i data-lucide="plus"></i> Schedule an Event
                    </button>
                    ${this._selectedCategory !== 'all' ? `
                      <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-filters">
                        View All Events
                      </button>
                    ` : ''}
                  </div>
                </div>
              `}
            </div>
          </div>

        </div>

      </div>
    `;

    this._bindEvents();
    UIComponents.refreshIcons();
  }

  /**
   * Builds the day cells for the month grid with continuous pill tracks
   */
  static _renderMonthGridCells(year, month) {
    const todayStr = this._formatDate(new Date());
    const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0=Mon, 6=Sun
    const totalDays = new Date(year, month, 0).getDate();
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();

    const cells = [];

    // Preceding padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayInfo = this._getCalendarDayInfo(dateStr);

      const holidayRole = this._getTrackRole(dateStr, 'holiday');
      const hostelLeaveRole = this._getTrackRole(dateStr, 'hostel_leave');
      const examRole = this._getTrackRole(dateStr, 'exam');
      const specialWorkRole = this._getTrackRole(dateStr, 'working_day');
      const ptmRole = this._getTrackRole(dateStr, 'ptm');
      const sportsRole = this._getTrackRole(dateStr, 'sports');
      const rangeRole = this._getRangeRole(dateStr);

      cells.push({
        dayNumber: day,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === todayStr,
        isWorkingDay: dayInfo.isWorkingDay,
        isHoliday: dayInfo.isHoliday,
        isHostelLeave: dayInfo.isHostelLeave,
        isExam: dayInfo.isExam,
        isPtm: dayInfo.isPtm,
        isSports: dayInfo.isSports,
        isSpecialWorking: dayInfo.isSpecialWorking,
        isWeekendOff: dayInfo.isWeekendOff,
        title: dayInfo.title || '',
        holidayRole,
        hostelLeaveRole,
        examRole,
        specialWorkRole,
        ptmRole,
        sportsRole,
        rangeRole,
        isMonthFirst: day === 1,
        isMonthLast: day === totalDays
      });
    }

    // Trailing padding days to finish 7-day grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      cells.push({
        dayNumber: day,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Render cells HTML
    return cells.map(cell => {
      if (!cell.isCurrentMonth) {
        return `
          <div class="cal-pad-cell">
            <span>${cell.dayNumber}</span>
          </div>
        `;
      }

      // Compute classes
      const classList = ['cal-inst-day-cell', 'cal-day-box'];
      if (cell.isMonthFirst) classList.push('is-month-first');
      if (cell.isMonthLast) classList.push('is-month-last');

      // Range selection takes visual precedence
      if (cell.rangeRole !== 'none') {
        classList.push(`is-range-${cell.rangeRole}`);
        if (cell.rangeRole === 'start' && this._rangeStart && !this._rangeEnd) {
          classList.push('is-range-single');
        }
      } else if (cell.hostelLeaveRole !== 'none') {
        classList.push(`is-hostel-leave-${cell.hostelLeaveRole}`);
      } else if (cell.holidayRole !== 'none') {
        classList.push(`is-holiday-${cell.holidayRole}`);
      } else if (cell.examRole !== 'none') {
        classList.push(`is-exam-${cell.examRole}`);
      } else if (cell.specialWorkRole !== 'none') {
        classList.push(`is-special-work-${cell.specialWorkRole}`);
      } else if (cell.ptmRole !== 'none') {
        classList.push(`is-ptm-${cell.ptmRole}`);
      } else if (cell.sportsRole !== 'none') {
        classList.push(`is-sports-${cell.sportsRole}`);
      } else if (cell.isWeekendOff) {
        classList.push('is-weekend-off');
      }

      const statusDesc = cell.isHoliday ? 'Official Holiday' : cell.isHostelLeave ? 'Vacation Break' : cell.isExam ? 'Assessment Window' : cell.isSpecialWorking ? 'Special Working Day' : cell.isWorkingDay ? 'Working Day' : 'Weekend Off';
      const tooltip = `${cell.dateStr}: ${cell.title ? cell.title + ' — ' : ''}${statusDesc}`;

      return `
        <div class="${classList.join(' ')}" data-date="${cell.dateStr}" role="button" tabindex="0" title="${UIComponents.escapeHtml(tooltip)}">
          <div class="cal-cell-track">
            <div class="cal-day-circle ${cell.isToday ? 'is-today' : ''}">
              ${cell.dayNumber}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Binds user events and modal triggers
   */
  static _bindEvents() {
    const c = this._container;

    // Navigation
    c.querySelector('#cal-btn-prev-month')?.addEventListener('click', () => {
      this._currentDate.setMonth(this._currentDate.getMonth() - 1);
      this._rangeStart = null;
      this._rangeEnd = null;
      this.render(c);
    });

    c.querySelector('#cal-btn-next-month')?.addEventListener('click', () => {
      this._currentDate.setMonth(this._currentDate.getMonth() + 1);
      this._rangeStart = null;
      this._rangeEnd = null;
      this.render(c);
    });

    c.querySelector('#cal-btn-today')?.addEventListener('click', () => {
      this._currentDate = new Date();
      this._rangeStart = null;
      this._rangeEnd = null;
      this.render(c);
    });

    // Jump selectors
    c.querySelector('#cal-jump-month')?.addEventListener('change', (e) => {
      this._currentDate.setMonth(parseInt(e.target.value, 10) - 1);
      this.render(c);
    });

    c.querySelector('#cal-jump-year')?.addEventListener('change', (e) => {
      this._currentDate.setFullYear(parseInt(e.target.value, 10));
      this.render(c);
    });

    // Range Mode Toggle
    c.querySelector('#btn-toggle-range-mode')?.addEventListener('click', () => {
      this._rangeMode = !this._rangeMode;
      if (!this._rangeMode) {
        this._rangeStart = null;
        this._rangeEnd = null;
      }
      this.render(c);
    });

    // Category filter pills
    c.querySelectorAll('.cal-filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._selectedCategory = e.currentTarget.dataset.cat;
        this.render(c);
      });
    });

    c.querySelector('#btn-clear-category-filter')?.addEventListener('click', () => {
      this._selectedCategory = 'all';
      this.render(c);
    });

    c.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
      this._selectedCategory = 'all';
      this.render(c);
    });

    // Day cell click: either range pick or quick day inspect modal
    c.querySelectorAll('.cal-inst-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;

        if (this._rangeMode) {
          if (!this._rangeStart || (this._rangeStart && this._rangeEnd)) {
            this._rangeStart = dateStr;
            this._rangeEnd = null;
          } else {
            if (dateStr < this._rangeStart) {
              this._rangeEnd = this._rangeStart;
              this._rangeStart = dateStr;
            } else {
              this._rangeEnd = dateStr;
            }
          }
          this.render(c);
        } else {
          this._openDayInspectModal(dateStr);
        }
      });
    });

    // Floating Range Action buttons
    c.querySelector('#btn-action-add-holiday-range')?.addEventListener('click', () => {
      this._openAddEventModal(this._rangeStart, this._rangeEnd || this._rangeStart);
    });

    c.querySelector('#btn-action-clear-range')?.addEventListener('click', () => {
      this._rangeStart = null;
      this._rangeEnd = null;
      this.render(c);
    });

    // Top buttons
    c.querySelector('#btn-open-working-schedule')?.addEventListener('click', () => {
      this._openWorkingDaysModal();
    });

    c.querySelector('#btn-add-cal-holiday')?.addEventListener('click', () => {
      this._openAddEventModal();
    });

    c.querySelector('#btn-add-cal-holiday-inline')?.addEventListener('click', () => {
      this._openAddEventModal();
    });

    c.querySelector('#btn-add-first-event')?.addEventListener('click', () => {
      this._openAddEventModal();
    });

    // Edit and Delete handlers for agenda items
    c.querySelectorAll('.btn-edit-cal-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = {
          id: btn.getAttribute('data-event-id'),
          name: btn.getAttribute('data-event-name'),
          type: btn.getAttribute('data-event-type'),
          startDate: btn.getAttribute('data-start-date'),
          endDate: btn.getAttribute('data-end-date'),
          startTime: btn.getAttribute('data-start-time') || '',
          endTime: btn.getAttribute('data-end-time') || '',
          isAllDay: btn.getAttribute('data-is-all-day') === 'true',
          range_id: btn.getAttribute('data-range-id') || null,
          allDates: (btn.getAttribute('data-all-dates') || '').split(',').filter(Boolean)
        };
        this._openEditEventModal(item);
      });
    });

    c.querySelectorAll('.btn-del-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rangeId = btn.getAttribute('data-range-id');
        const allDates = btn.getAttribute('data-all-dates');
        const id = btn.getAttribute('data-event-id');

        if (!confirm('Are you sure you want to delete this event from the academic calendar?')) return;

        await this._deleteEvent({ id, rangeId, allDates });
        UIComponents.showToast('Event removed from academic calendar.', 'info');
        await this.render(c);
      });
    });

    // Smartphone .ics sync
    c.querySelector('#btn-export-ics')?.addEventListener('click', () => {
      this.exportIcsCalendar();
    });

    // Print A4 Calendar
    c.querySelector('#btn-print-academic-cal')?.addEventListener('click', () => {
      this.openPrintCalendarModal();
    });
  }

  /**
   * Quick Day Inspection & Override Modal
   */
  static _openDayInspectModal(dateStr) {
    const dayInfo = this._getCalendarDayInfo(dateStr);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    const formatted = `${dayName}, ${dateStr}`;

    const isHoliday = dayInfo.isHoliday;
    const isLeave = dayInfo.isHostelLeave;
    const isWorking = dayInfo.isWorkingDay;

    let bannerBg = isHoliday ? '#FFFBEB' : isLeave ? '#FEF2F2' : isWorking ? '#ECFDF5' : '#F8FAFC';
    let bannerBorder = isHoliday ? '#FDE68A' : isLeave ? '#FECACA' : isWorking ? '#A7F3D0' : '#CBD5E1';
    let bannerColor = isHoliday ? '#D97706' : isLeave ? '#DC2626' : isWorking ? '#059669' : '#475569';
    let statusText = isHoliday ? 'Official Holiday' : isLeave ? 'School / Hostel Break' : isWorking ? (dayInfo.isSpecialWorking ? 'Special Working Day' : 'Standard Working Day') : 'Weekend Off';
    let statusIcon = isHoliday ? '🌴' : isLeave ? '🚪' : isWorking ? '⚡' : '🏖️';

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- Header Banner -->
        <div style="background: ${bannerBg}; border: 1.5px solid ${bannerBorder}; border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
          <div>
            <span style="font-size: 0.72rem; font-weight: 800; color: ${bannerColor}; text-transform: uppercase; letter-spacing: 0.05em;">Institutional Schedule</span>
            <h4 style="margin: 2px 0 0 0; font-size: 1.15rem; font-weight: 800; color: #0F172A;">${formatted}</h4>
          </div>
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #FFFFFF; border: 1.5px solid ${bannerBorder}; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; color: ${bannerColor}; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
            ${statusIcon}
          </div>
        </div>

        <!-- Current Schedule Information -->
        <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.95rem 1.15rem; background: #FFFFFF;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Current Schedule State</span>
            <span class="badge" style="background: ${bannerBg}; color: ${bannerColor}; border: 1.5px solid ${bannerBorder}; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 6px;">
              ${statusIcon} ${statusText}
            </span>
          </div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">
            ${dayInfo.title ? `Event: ${UIComponents.escapeHtml(dayInfo.title)}` : isHoliday ? 'Institutional Holiday' : isLeave ? 'Campus / Hostel Break' : isWorking ? 'Standard Academic Working Day' : 'Weekly Weekend Off Day'}
          </div>
          <p style="font-size: 0.82rem; color: #64748B; margin: 0; line-height: 1.45;">
            ${isHoliday ? 'Campus is officially closed for academic duties and regular class operations.' : isLeave ? 'Hostel and academic operations are in recess.' : isWorking ? 'Regular academic timetable, attendance sessions, and classes are in effect.' : 'Weekly weekend holiday observed as per institutional working calendar.'}
          </p>
        </div>

        <!-- Quick 1-Click Schedule Override Controls -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1rem 1.15rem;">
          <label style="font-size: 0.82rem; font-weight: 800; color: #1E293B; display: block; margin-bottom: 0.45rem;">
            Quick Override / Edit for this Date:
          </label>
          <input 
            type="text" 
            id="modal-quick-title" 
            class="form-input" 
            value="${UIComponents.escapeHtml(dayInfo.title || '')}" 
            placeholder="e.g. Founder's Day, Exam Prep Break, Sports Recess" 
            style="height: 38px; font-size: 0.85rem; margin-bottom: 0.75rem;" 
          />

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-set-holiday" style="color: #B45309; border-color: #FDE68A; background: #FFFBEB; font-weight: 700;">
              🌴 Set as Holiday
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-set-hostel-leave" style="color: #DC2626; border-color: #FECACA; background: #FEF2F2; font-weight: 700;">
              🚪 Set as Break / Leave
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-set-working" style="color: #059669; border-color: #A7F3D0; background: #ECFDF5; font-weight: 700;">
              ⚡ Set as Working Day
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-reset-default" style="font-weight: 700;">
              ↺ Reset to Default
            </button>
          </div>
        </div>

      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
      <button class="btn btn-primary" id="btn-quick-multi-day-extend"><i data-lucide="calendar-plus"></i> Multi-Day Range...</button>
    `;

    UIComponents.openModal({
      title: 'Institutional Day Details & Override',
      bodyHtml,
      footerHtml
    });

    // Wire up override actions
    document.getElementById('btn-quick-set-holiday')?.addEventListener('click', async () => {
      const title = document.getElementById('modal-quick-title').value.trim() || 'Official Holiday';
      await this._setDayOverride(dateStr, { type: 'holiday', name: title });
      UIComponents.closeModal();
      UIComponents.showToast(`Set ${dateStr} as Official Holiday.`, 'success');
      await this.render(this._container);
    });

    document.getElementById('btn-quick-set-hostel-leave')?.addEventListener('click', async () => {
      const title = document.getElementById('modal-quick-title').value.trim() || 'School / Hostel Break';
      await this._setDayOverride(dateStr, { type: 'hostel_leave', name: title });
      UIComponents.closeModal();
      UIComponents.showToast(`Set ${dateStr} as Hostel / Campus Break.`, 'success');
      await this.render(this._container);
    });

    document.getElementById('btn-quick-set-working')?.addEventListener('click', async () => {
      const title = document.getElementById('modal-quick-title').value.trim() || 'Special Working Session';
      await this._setDayOverride(dateStr, { type: 'working_day', name: title });
      UIComponents.closeModal();
      UIComponents.showToast(`Set ${dateStr} as Special Working Day.`, 'success');
      await this.render(this._container);
    });

    document.getElementById('btn-quick-reset-default')?.addEventListener('click', async () => {
      await this._removeDayOverride(dateStr);
      UIComponents.closeModal();
      UIComponents.showToast(`Reset ${dateStr} to standard weekly schedule.`, 'info');
      await this.render(this._container);
    });

    document.getElementById('btn-quick-multi-day-extend')?.addEventListener('click', () => {
      UIComponents.closeModal();
      this._openAddEventModal(dateStr, dateStr);
    });

    UIComponents.refreshIcons();
  }

  /**
   * Add Event / Holiday Modal with Single Day vs Date Range switcher pill
   */
  static _openAddEventModal(defaultStart = null, defaultEnd = null) {
    const isRange = !!(defaultEnd && defaultEnd !== defaultStart);
    const todayStr = this._formatDate(this._currentDate || new Date());
    const startVal = defaultStart || todayStr;
    const endVal = defaultEnd || defaultStart || todayStr;

    const bodyHtml = `
      <form id="form-add-cal-event" style="display: flex; flex-direction: column; gap: 0.95rem;">
        
        <!-- Single Day vs Date Range Switcher Pills -->
        <div class="cal-modal-tabs">
          <button type="button" class="cal-modal-tab-btn ${!isRange ? 'active' : ''}" id="tab-single-day">
            Single Day
          </button>
          <button type="button" class="cal-modal-tab-btn ${isRange ? 'active' : ''}" id="tab-multi-day">
            Multiple Days (Date Range)
          </button>
        </div>

        <!-- Single Day Input -->
        <div id="box-single-day" style="display: ${!isRange ? 'block' : 'none'};">
          <label class="form-label">Event Date *</label>
          <input type="date" class="form-input" id="ev-single-date" value="${startVal}" required>
        </div>

        <!-- Date Range Inputs -->
        <div id="box-multi-day" style="display: ${isRange ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label class="form-label">Start Date *</label>
            <input type="date" class="form-input" id="ev-start-date" value="${startVal}">
          </div>
          <div>
            <label class="form-label">End Date *</label>
            <input type="date" class="form-input" id="ev-end-date" value="${endVal}">
          </div>
        </div>

        <div>
          <label class="form-label">Event / Holiday Title *</label>
          <input type="text" class="form-input" id="ev-title" placeholder="e.g. Diwali Vacation, Annual Sports Day, Term Exams" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label class="form-label">Category / Type *</label>
            <select class="form-select" id="ev-type">
              <option value="holiday">Official Holiday (Campus Closed) - Amber</option>
              <option value="hostel_leave">School / Hostel Break - Crimson</option>
              <option value="exam">Examination &amp; Tests - Purple</option>
              <option value="ptm">Parent-Teacher Meeting (PTM) - Cobalt Blue</option>
              <option value="sports">Sports &amp; Athletics Meet - Orange</option>
              <option value="working_day">Special Working Day (Compensatory Session)</option>
              <option value="fee">Fee Collection Deadline</option>
            </select>
          </div>
          <div>
            <label class="form-label">Target Audience</label>
            <select class="form-select" id="ev-audience">
              <option value="all">All Campus (Students, Parents, Faculty)</option>
              <option value="parents">Parents Only</option>
              <option value="students">Students Only</option>
              <option value="staff">Faculty &amp; Staff Only</option>
            </select>
          </div>
        </div>

        <!-- Time Span Configuration -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.75rem 0.95rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.82rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
              <input type="checkbox" id="ev-is-all-day" checked style="width: 16px; height: 16px; accent-color: #059669;">
              <span>All Day Off / Full Day</span>
            </label>
            <span style="font-size: 0.72rem; color: #64748B;">Uncheck for specific timings</span>
          </div>
          <div id="ev-time-box" style="display: none; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: #64748B;">Start Time</label>
              <input type="time" class="form-input" id="ev-start-time" value="08:00" style="height: 36px; font-size: 0.82rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: #64748B;">End Time</label>
              <input type="time" class="form-input" id="ev-end-time" value="16:00" style="height: 36px; font-size: 0.82rem;">
            </div>
          </div>
        </div>

        <div>
          <label class="form-label">Description / Guidelines (Optional)</label>
          <textarea class="form-input" id="ev-desc" rows="2" placeholder="Details, circular notes, dress code, instructions..."></textarea>
        </div>

      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-cal-event"><i data-lucide="plus-circle"></i> Add to Calendar</button>
    `;

    UIComponents.openModal({
      title: 'Schedule Institutional Event or Holiday',
      bodyHtml,
      footerHtml
    });

    let isMulti = isRange;
    const tabSingle = document.getElementById('tab-single-day');
    const tabMulti = document.getElementById('tab-multi-day');
    const boxSingle = document.getElementById('box-single-day');
    const boxMulti = document.getElementById('box-multi-day');

    tabSingle?.addEventListener('click', () => {
      isMulti = false;
      tabSingle.classList.add('active');
      tabMulti.classList.remove('active');
      boxSingle.style.display = 'block';
      boxMulti.style.display = 'none';
    });

    tabMulti?.addEventListener('click', () => {
      isMulti = true;
      tabMulti.classList.add('active');
      tabSingle.classList.remove('active');
      boxSingle.style.display = 'none';
      boxMulti.style.display = 'grid';
    });

    const isAllDayCheck = document.getElementById('ev-is-all-day');
    const timeBox = document.getElementById('ev-time-box');
    isAllDayCheck?.addEventListener('change', () => {
      timeBox.style.display = isAllDayCheck.checked ? 'none' : 'grid';
    });

    document.getElementById('btn-save-cal-event')?.addEventListener('click', async () => {
      const title = document.getElementById('ev-title').value.trim();
      if (!title) {
        UIComponents.showToast('Please enter an event or holiday title.', 'warning');
        return;
      }

      let startDate, endDate;
      if (isMulti) {
        startDate = document.getElementById('ev-start-date').value;
        endDate = document.getElementById('ev-end-date').value || startDate;
      } else {
        startDate = document.getElementById('ev-single-date').value;
        endDate = startDate;
      }

      if (!startDate) {
        UIComponents.showToast('Please choose valid dates.', 'warning');
        return;
      }

      if (endDate < startDate) {
        const tmp = startDate;
        startDate = endDate;
        endDate = tmp;
      }

      const type = document.getElementById('ev-type').value;
      const audience = document.getElementById('ev-audience').value;
      const isAllDay = isAllDayCheck.checked;
      const startTime = isAllDay ? null : document.getElementById('ev-start-time').value;
      const endTime = isAllDay ? null : document.getElementById('ev-end-time').value;
      const desc = document.getElementById('ev-desc').value.trim();

      await this._addCalendarEventRange({
        title,
        type,
        startDate,
        endDate,
        audience,
        isAllDay,
        startTime,
        endTime,
        description: desc
      });

      UIComponents.closeModal();
      UIComponents.showToast(`Added "${title}" to the academic calendar.`, 'success');
      this._rangeStart = null;
      this._rangeEnd = null;
      await this.render(this._container);
    });

    UIComponents.refreshIcons();
  }

  /**
   * Edit Event Modal
   */
  static _openEditEventModal(item) {
    const esc = (v) => UIComponents.escapeHtml(v || '');

    const bodyHtml = `
      <form id="form-edit-cal-event" style="display: flex; flex-direction: column; gap: 0.95rem;">
        <div>
          <label class="form-label">Event / Holiday Title *</label>
          <input type="text" class="form-input" id="edit-ev-title" value="${esc(item.name)}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label class="form-label">Start Date *</label>
            <input type="date" class="form-input" id="edit-ev-start" value="${item.startDate}" required>
          </div>
          <div>
            <label class="form-label">End Date *</label>
            <input type="date" class="form-input" id="edit-ev-end" value="${item.endDate || item.startDate}" required>
          </div>
        </div>

        <div>
          <label class="form-label">Category / Type *</label>
          <select class="form-select" id="edit-ev-type">
            <option value="holiday" ${item.type === 'holiday' ? 'selected' : ''}>Official Holiday (Campus Closed) - Amber</option>
            <option value="hostel_leave" ${item.type === 'hostel_leave' ? 'selected' : ''}>School / Hostel Break - Crimson</option>
            <option value="exam" ${item.type === 'exam' ? 'selected' : ''}>Examination &amp; Tests - Purple</option>
            <option value="ptm" ${item.type === 'ptm' ? 'selected' : ''}>Parent-Teacher Meeting (PTM) - Cobalt Blue</option>
            <option value="sports" ${item.type === 'sports' ? 'selected' : ''}>Sports &amp; Athletics Meet - Orange</option>
            <option value="working_day" ${item.type === 'working_day' ? 'selected' : ''}>Special Working Day (Compensatory Session)</option>
            <option value="fee" ${item.type === 'fee' ? 'selected' : ''}>Fee Collection Deadline</option>
          </select>
        </div>

        <!-- Time Span Configuration -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.75rem 0.95rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.82rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
              <input type="checkbox" id="edit-ev-is-all-day" ${item.isAllDay !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #059669;">
              <span>All Day Off / Full Day</span>
            </label>
            <span style="font-size: 0.72rem; color: #64748B;">Uncheck for specific timings</span>
          </div>
          <div id="edit-ev-time-box" style="display: ${item.isAllDay !== false ? 'none' : 'grid'}; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: #64748B;">Start Time</label>
              <input type="time" class="form-input" id="edit-ev-start-time" value="${item.startTime || '08:00'}" style="height: 36px; font-size: 0.82rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: #64748B;">End Time</label>
              <input type="time" class="form-input" id="edit-ev-end-time" value="${item.endTime || '16:00'}" style="height: 36px; font-size: 0.82rem;">
            </div>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-secondary" id="btn-edit-del" style="color: #EF4444;"><i data-lucide="trash-2"></i> Delete Event</button>
      <button class="btn btn-primary" id="btn-edit-save"><i data-lucide="check"></i> Save Changes</button>
    `;

    UIComponents.openModal({
      title: `Edit Event — ${item.name}`,
      bodyHtml,
      footerHtml
    });

    const isAllDayCheck = document.getElementById('edit-ev-is-all-day');
    const timeBox = document.getElementById('edit-ev-time-box');
    isAllDayCheck?.addEventListener('change', () => {
      timeBox.style.display = isAllDayCheck.checked ? 'none' : 'grid';
    });

    document.getElementById('btn-edit-del')?.addEventListener('click', async () => {
      if (!confirm(`Delete "${item.name}" from calendar?`)) return;
      await this._deleteEvent(item);
      UIComponents.closeModal();
      UIComponents.showToast('Event removed.', 'info');
      await this.render(this._container);
    });

    document.getElementById('btn-edit-save')?.addEventListener('click', async () => {
      const title = document.getElementById('edit-ev-title').value.trim();
      let startDate = document.getElementById('edit-ev-start').value;
      let endDate = document.getElementById('edit-ev-end').value || startDate;

      if (!title || !startDate) {
        UIComponents.showToast('Please provide a title and start date.', 'warning');
        return;
      }

      if (endDate < startDate) {
        const t = startDate;
        startDate = endDate;
        endDate = t;
      }

      const type = document.getElementById('edit-ev-type').value;
      const isAllDay = isAllDayCheck.checked;
      const startTime = isAllDay ? null : document.getElementById('edit-ev-start-time').value;
      const endTime = isAllDay ? null : document.getElementById('edit-ev-end-time').value;

      // Delete old occurrence(s) and re-insert range cleanly
      await this._deleteEvent(item);
      await this._addCalendarEventRange({
        title,
        type,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime
      });

      UIComponents.closeModal();
      UIComponents.showToast(`Updated "${title}".`, 'success');
      await this.render(this._container);
    });

    UIComponents.refreshIcons();
  }

  /**
   * Configure Weekly Working Days Modal (Mon-Sun toggles)
   */
  static _openWorkingDaysModal() {
    const currentDays = this._calendarStore.weekly_working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 0.84rem; color: #64748B; margin: 0; line-height: 1.45;">
          Select which days of the week are official institutional working days. Any unselected day will automatically be treated as a weekend off.
        </p>

        <div style="display: flex; gap: 0.55rem; flex-wrap: wrap;" id="working-days-pills-box">
          ${allDays.map(d => {
            const isActive = currentDays.includes(d);
            return `
              <label class="cal-weekday-pill ${isActive ? 'active' : ''}">
                <input type="checkbox" value="${d}" ${isActive ? 'checked' : ''} style="cursor: pointer; accent-color: #059669;">
                <span>${d}</span>
              </label>
            `;
          }).join('')}
        </div>

        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 0.75rem 0.95rem; font-size: 0.78rem; color: #065F46;">
          <strong>Tip:</strong> Selecting Mon–Sat configures a standard 6-day institutional week with Sunday off.
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-secondary btn-xs" id="btn-restore-default-calendar" style="color: #64748B;">
            <i data-lucide="rotate-ccw"></i> Restore Default Session Events
          </button>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-working-days"><i data-lucide="check"></i> Save Schedule</button>
    `;

    UIComponents.openModal({
      title: 'Configure Weekly Working Days Schedule',
      bodyHtml,
      footerHtml
    });

    // Pill click highlight toggle
    document.querySelectorAll('#working-days-pills-box label.cal-weekday-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const input = pill.querySelector('input');
        pill.classList.toggle('active', !!input?.checked);
      });
    });

    document.getElementById('btn-save-working-days')?.addEventListener('click', async () => {
      const selected = [];
      document.querySelectorAll('#working-days-pills-box input:checked').forEach(i => selected.push(i.value));

      if (selected.length === 0) {
        UIComponents.showToast('Please select at least one working day.', 'warning');
        return;
      }

      this._calendarStore.weekly_working_days = selected;
      await this._saveCalendar();

      UIComponents.closeModal();
      UIComponents.showToast('Weekly institutional working schedule updated.', 'success');
      await this.render(this._container);
    });

    document.getElementById('btn-restore-default-calendar')?.addEventListener('click', async () => {
      if (!confirm('Reset academic calendar to verified institutional default events for session 2026-2027?')) return;
      this._calendarStore = JSON.parse(JSON.stringify(DEFAULT_CALENDAR_STORE));
      await this._saveCalendar();
      UIComponents.closeModal();
      UIComponents.showToast('Academic calendar restored to institutional defaults.', 'success');
      await this.render(this._container);
    });

    UIComponents.refreshIcons();
  }

  /**
   * Helper: returns information about today's schedule
   */
  static _getTodaySchedule() {
    const today = new Date();
    const dateStr = this._formatDate(today);
    const dayInfo = this._getCalendarDayInfo(dateStr);

    let statusHtml;
    if (dayInfo.isHoliday) {
      statusHtml = `🌴 Official Holiday: <strong>${UIComponents.escapeHtml(dayInfo.title || 'Campus Holiday')}</strong>`;
    } else if (dayInfo.isHostelLeave) {
      statusHtml = `🚪 Scheduled Break / Recess: <strong>${UIComponents.escapeHtml(dayInfo.title || 'Campus Recess')}</strong>`;
    } else if (dayInfo.isSpecialWorking) {
      statusHtml = `⚡ Special Working Session: <strong>${UIComponents.escapeHtml(dayInfo.title || 'Compensatory Class')}</strong>`;
    } else if (dayInfo.isWorkingDay) {
      statusHtml = '⚡ Regular Academic Working Session (Classes Active)';
    } else {
      statusHtml = '🏖️ Weekend Holiday Observed';
    }

    return {
      dayNumber: today.getDate(),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()],
      monthName: MONTH_NAMES[today.getMonth()],
      year: today.getFullYear(),
      isActive: dayInfo.isWorkingDay,
      statusHtml
    };
  }

  /**
   * Computes accurate metrics for the monthly overview card
   * Correctly distinguishes official holidays from weekly weekend offs
   */
  static _computeMonthMetrics(year, month) {
    const totalDays = new Date(year, month, 0).getDate();
    let workingDays = 0;
    let holidays = 0;
    let weekendOffs = 0;
    let leaves = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const info = this._getCalendarDayInfo(dateStr);

      if (info.isHoliday) {
        holidays++;
      } else if (info.isHostelLeave) {
        leaves++;
      } else if (info.isWeekendOff) {
        weekendOffs++;
      } else if (info.isWorkingDay) {
        workingDays++;
      } else {
        weekendOffs++;
      }
    }

    const workingPercent = Math.round((workingDays / totalDays) * 100);
    const holidayPercent = Math.round(((holidays + leaves) / totalDays) * 100);
    const weekendPercent = Math.max(0, 100 - workingPercent - holidayPercent);

    return {
      totalDays,
      workingDays,
      holidays: holidays + leaves,
      weekendOffs,
      workingPercent,
      holidayPercent,
      weekendPercent
    };
  }

  /**
   * Groups individual day events into consolidated cards for multi-day ranges
   */
  static _getConsolidatedEvents(year, month) {
    const events = this._calendarStore.events || [];
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    // Filter events matching the selected month and category filter
    const matching = events.filter(e => {
      if (!e.date) return false;
      if (this._selectedCategory !== 'all' && e.type !== this._selectedCategory) {
        return false;
      }
      return e.date.startsWith(monthPrefix);
    });

    // Sort by date
    matching.sort((a, b) => a.date.localeCompare(b.date));

    // Group consecutive events that share the same range_id or name+type
    const consolidated = [];
    let current = null;

    for (const ev of matching) {
      if (!current) {
        current = {
          id: ev.id,
          name: ev.name || 'Institutional Event',
          type: ev.type || 'holiday',
          range_id: ev.range_id,
          startDate: ev.date,
          endDate: ev.date,
          allDates: [ev.date],
          allIds: [ev.id],
          start_time: ev.start_time || null,
          end_time: ev.end_time || null,
          is_all_day: ev.is_all_day !== false,
          target_audience: ev.target_audience || 'all',
          description: ev.description || ''
        };
        continue;
      }

      const sameName = (current.name || '').trim().toLowerCase() === (ev.name || '').trim().toLowerCase();
      const sameType = current.type === ev.type;
      const sameRange = !!(current.range_id && ev.range_id && current.range_id === ev.range_id);

      // Check if dates are consecutive
      const prevDateObj = new Date(current.endDate + 'T00:00:00');
      prevDateObj.setDate(prevDateObj.getDate() + 1);
      const isConsecutive = this._formatDate(prevDateObj) === ev.date;

      if (sameRange || (sameName && sameType && isConsecutive)) {
        current.endDate = ev.date;
        current.allDates.push(ev.date);
        current.allIds.push(ev.id);
        if (!current.range_id && ev.range_id) current.range_id = ev.range_id;
      } else {
        consolidated.push(current);
        current = {
          id: ev.id,
          name: ev.name || 'Institutional Event',
          type: ev.type || 'holiday',
          range_id: ev.range_id,
          startDate: ev.date,
          endDate: ev.date,
          allDates: [ev.date],
          allIds: [ev.id],
          start_time: ev.start_time || null,
          end_time: ev.end_time || null,
          is_all_day: ev.is_all_day !== false,
          target_audience: ev.target_audience || 'all',
          description: ev.description || ''
        };
      }
    }

    if (current) consolidated.push(current);
    return consolidated;
  }

  /**
   * Helper: Determines day status (working day, official holiday, break, exam, weekend off)
   */
  static _getCalendarDayInfo(dateStr) {
    if (!dateStr) {
      return { isWorkingDay: false, isHoliday: false, isHostelLeave: false, isExam: false, isSpecialWorking: false, isWeekendOff: false, title: '', type: 'none' };
    }

    const events = this._calendarStore.events || [];
    const event = events.find(e => e.date === dateStr);
    const isWorking = this._isDateWorkingDay(dateStr);

    const parts = dateStr.split('-');
    let isWeeklyOff = false;
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      isWeeklyOff = !(this._calendarStore.weekly_working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).includes(dayName);
    }

    if (event) {
      const isHoli = event.type === 'holiday';
      const isLeave = event.type === 'hostel_leave';
      const isEx = event.type === 'exam';
      const isPtm = event.type === 'ptm';
      const isSports = event.type === 'sports';
      const isSpecial = event.type === 'working_day';

      return {
        date: dateStr,
        isWorkingDay: isWorking,
        isHoliday: isHoli,
        isHostelLeave: isLeave,
        isExam: isEx,
        isPtm,
        isSports,
        isSpecialWorking: isSpecial,
        isWeekendOff: isWeeklyOff && !isSpecial,
        title: event.name || '',
        type: event.type || 'holiday',
        start_time: event.start_time || null,
        end_time: event.end_time || null,
        is_all_day: event.is_all_day !== false,
        event
      };
    }

    return {
      date: dateStr,
      isWorkingDay: isWorking,
      isHoliday: false,
      isHostelLeave: false,
      isExam: false,
      isPtm: false,
      isSports: false,
      isSpecialWorking: false,
      isWeekendOff: isWeeklyOff,
      title: '',
      type: isWeeklyOff ? 'weekend_off' : 'working_day',
      start_time: null,
      end_time: null,
      is_all_day: true
    };
  }

  /**
   * Helper: tests if date is a working day
   */
  static _isDateWorkingDay(dateStr) {
    if (!dateStr) return false;
    const events = this._calendarStore.events || [];
    const ev = events.find(e => e.date === dateStr);

    if (ev) {
      if ((ev.type === 'holiday' || ev.type === 'hostel_leave') && ev.is_all_day !== false) {
        return false;
      }
      if (ev.type === 'working_day') {
        return true;
      }
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return (this._calendarStore.weekly_working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).includes(dayName);
    }

    return true;
  }

  /**
   * Helper: Computes role for multi-day continuous tracks ('start', 'middle', 'end', 'single', or 'none')
   */
  static _getTrackRole(dateStr, targetType) {
    const events = this._calendarStore.events || [];
    const current = events.find(e => e.date === dateStr && e.type === targetType);
    if (!current) return 'none';

    const [y, m, d] = dateStr.split('-').map(Number);
    const prevDate = this._formatDate(new Date(y, m - 1, d - 1));
    const nextDate = this._formatDate(new Date(y, m - 1, d + 1));

    const hasPrev = events.some(e => e.date === prevDate && e.type === targetType && (e.range_id === current.range_id || e.name === current.name));
    const hasNext = events.some(e => e.date === nextDate && e.type === targetType && (e.range_id === current.range_id || e.name === current.name));

    if (hasNext && !hasPrev) return 'start';
    if (hasPrev && hasNext) return 'middle';
    if (hasPrev && !hasNext) return 'end';
    return 'single';
  }

  /**
   * Helper: Computes range role for active user selection
   */
  static _getRangeRole(dateStr) {
    if (!this._rangeStart) return 'none';
    const s = this._rangeStart;
    const e = this._rangeEnd || s;

    if (s === e) {
      return dateStr === s ? 'single' : 'none';
    }

    if (dateStr === s) return 'start';
    if (dateStr === e) return 'end';
    if (dateStr > s && dateStr < e) return 'middle';
    return 'none';
  }

  static _getRangeSpanDays() {
    if (!this._rangeStart) return 1;
    const s = new Date(this._rangeStart + 'T00:00:00');
    const e = new Date((this._rangeEnd || this._rangeStart) + 'T00:00:00');
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  static _getCategoryName(id) {
    const c = EVENT_CATEGORIES.find(x => x.id === id);
    return c ? c.name : id;
  }

  /**
   * Status text helper
   */
  static _getSelectionStatusText(year, month) {
    if (this._rangeStart && this._rangeEnd) {
      return `Selected Span: ${this._rangeStart} to ${this._rangeEnd} (${this._getRangeSpanDays()} Days)`;
    }
    if (this._rangeStart) {
      return `Selected Start Date: ${this._rangeStart} (Click another date to complete range)`;
    }
    return `Session ${this._calendarStore.academic_year || '2026-2027'} • Standard academic timetable in effect`;
  }

  /**
   * Overrides or adds single day event
   */
  static async _setDayOverride(dateStr, { type, name }) {
    await this._removeDayOverride(dateStr);
    const newEv = {
      id: `cal-ovr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      name,
      type,
      is_all_day: true
    };
    this._calendarStore.events.push(newEv);
    await this._saveCalendar();
  }

  /**
   * Removes override or event on a given date
   */
  static async _removeDayOverride(dateStr) {
    this._calendarStore.events = (this._calendarStore.events || []).filter(e => e.date !== dateStr);
    await this._saveCalendar();
  }

  /**
   * Adds an event spanning consecutive dates
   */
  static async _addCalendarEventRange({ title, type, startDate, endDate, audience = 'all', isAllDay = true, startTime = null, endTime = null, description = '' }) {
    const startObj = new Date(startDate + 'T00:00:00');
    const endObj = new Date(endDate + 'T00:00:00');
    const rangeId = `range-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const cur = new Date(startObj);
    while (cur <= endObj) {
      const dStr = this._formatDate(cur);
      // Remove any existing event on this day if setting holiday/leave
      this._calendarStore.events = this._calendarStore.events.filter(e => e.date !== dStr);

      this._calendarStore.events.push({
        id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: dStr,
        name: title,
        type,
        range_id: rangeId,
        is_all_day: isAllDay,
        start_time: startTime,
        end_time: endTime,
        target_audience: audience,
        description
      });

      cur.setDate(cur.getDate() + 1);
    }

    await this._saveCalendar();
  }

  /**
   * Deletes event or multi-day series
   */
  static async _deleteEvent({ id, rangeId, allDates }) {
    if (rangeId) {
      this._calendarStore.events = (this._calendarStore.events || []).filter(e => e.range_id !== rangeId);
    } else if (allDates) {
      const datesArr = Array.isArray(allDates) ? allDates : allDates.split(',').filter(Boolean);
      this._calendarStore.events = (this._calendarStore.events || []).filter(e => !datesArr.includes(e.date));
    } else if (id) {
      this._calendarStore.events = (this._calendarStore.events || []).filter(e => String(e.id) !== String(id));
    }
    await this._saveCalendar();
  }

  /**
   * Loads calendar data from localStorage and syncs with Supabase
   */
  static async _loadCalendar() {
    try {
      const cached = localStorage.getItem('tps_academic_calendar');
      if (cached) {
        this._calendarStore = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed parsing cached academic calendar:', e);
    }

    if (!this._calendarStore || !Array.isArray(this._calendarStore.events) || this._calendarStore.events.length === 0) {
      this._calendarStore = JSON.parse(JSON.stringify(DEFAULT_CALENDAR_STORE));
    }

    // Try fetching from database if available
    try {
      const dbEvents = await dbService.select('calendar_events');
      if (Array.isArray(dbEvents) && dbEvents.length > 0) {
        dbEvents.forEach(dbEv => {
          const s = dbEv.start_date || dbEv.date;
          if (!s) return;

          const exists = this._calendarStore.events.some(x => x.date === s && x.name === (dbEv.title || dbEv.name));
          if (!exists) {
            this._calendarStore.events.push({
              id: dbEv.id || `db-${Date.now()}`,
              date: s,
              name: dbEv.title || dbEv.name || 'Event',
              type: dbEv.category || dbEv.type || 'holiday',
              is_all_day: dbEv.is_all_day !== false,
              start_time: dbEv.start_time || null,
              end_time: dbEv.end_time || null,
              description: dbEv.description || ''
            });
          }
        });
      }
    } catch (err) {
      // Offline or table not present; proceed with local store
    }
  }

  /**
   * Saves calendar to localStorage and database
   */
  static async _saveCalendar() {
    try {
      localStorage.setItem('tps_academic_calendar', JSON.stringify(this._calendarStore));
    } catch (e) {
      console.error('Failed saving to localStorage:', e);
    }

    try {
      if (auditService && typeof auditService.log === 'function') {
        auditService.log('UPDATE_ACADEMIC_CALENDAR', 'calendar', 'cal', 'Updated institutional calendar schedule');
      }
    } catch (e) {
      // audit log failure is non-fatal
    }
  }

  /**
   * Helper: formats Date into YYYY-MM-DD
   */
  static _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Generates and downloads RFC 5545 iCalendar (.ics) file
   */
  static exportIcsCalendar() {
    const events = this._calendarStore.events || [];
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Thaiba Public School//Academic Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Thaiba Public School Academic Calendar',
      'X-WR-TIMEZONE:Asia/Kolkata'
    ];

    events.forEach(ev => {
      const dt = (ev.date || '').replace(/-/g, '');
      if (!dt) return;

      ics.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@thaibapublicschool.edu.in`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:${ev.name || 'School Event'}`,
        `DESCRIPTION:${(ev.description || ev.name || '').replace(/\n/g, '\\n')}`,
        'LOCATION:Thaiba Public School, Kolkata, West Bengal',
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    ics.push('END:VCALENDAR');

    const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TMS_Academic_Calendar_${(this._calendarStore.academic_year || '2026-2027').replace(/\s+/g, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);

    UIComponents.showToast('Calendar exported (.ics)! Open the file to add to Google/Apple Calendar.', 'success');
  }

  /**
   * Official Printable Annual Academic Calendar Poster (A4)
   */
  static openPrintCalendarModal() {
    const esc = (v) => UIComponents.escapeHtml(v || '');
    const emblem = TMS_LOGO ? TMS_LOGO.emblemSvg(50) : '';
    const sorted = [...(this._calendarStore.events || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const bodyHtml = `
      <style>
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          #annual-cal-print, #annual-cal-print * { visibility: visible; }
          #annual-cal-print { position: fixed; left: 0; top: 0; width: 100%; border: none !important; }
        }
      </style>

      <div id="annual-cal-print" style="background:#fff; color:#0f172a; padding:20px; font-family:'Plus Jakarta Sans', sans-serif;">
        <div style="text-align:center; border-bottom:2px solid #BF9A33; padding-bottom:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:center; margin-bottom:4px;">${emblem}</div>
          <h2 style="font-size:1.35rem; font-weight:800; color:#8C6E1E; text-transform:uppercase; margin:0;">${esc(TMS_CONFIG?.institution?.name || 'Thaiba Public School')}</h2>
          <div style="font-size:0.8rem; font-weight:600; color:#8C6E1E;">Run by : Thaiba Heritage, Kolkata</div>
          <div style="font-size:0.75rem; color:#64748b;">ANNUAL INSTITUTIONAL ACADEMIC &amp; EVENT CALENDAR • SESSION ${esc(this._calendarStore.academic_year || '2026-2027')}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; border:1px solid #cbd5e1;">
          <thead>
            <tr style="background:#f1f5f9; color:#0f172a; text-align:left;">
              <th style="padding:6px 10px; border:1px solid #cbd5e1;">Date</th>
              <th style="padding:6px 10px; border:1px solid #cbd5e1;">Event &amp; Observance</th>
              <th style="padding:6px 10px; border:1px solid #cbd5e1;">Category</th>
              <th style="padding:6px 10px; border:1px solid #cbd5e1;">Audience</th>
              <th style="padding:6px 10px; border:1px solid #cbd5e1;">Details / Guidelines</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(ev => {
              const cat = EVENT_CATEGORIES.find(c => c.id === ev.type) || EVENT_CATEGORIES[1];
              return `
                <tr>
                  <td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:700;" class="font-mono">${esc(ev.date)}</td>
                  <td style="padding:6px 10px; border:1px solid #cbd5e1;"><strong>${esc(ev.name)}</strong></td>
                  <td style="padding:6px 10px; border:1px solid #cbd5e1;">
                    <span style="color:${cat.color}; font-weight:700;">${esc(cat.name)}</span>
                  </td>
                  <td style="padding:6px 10px; border:1px solid #cbd5e1; text-transform:capitalize;">${esc(ev.target_audience || 'All Campus')}</td>
                  <td style="padding:6px 10px; border:1px solid #cbd5e1; font-size:0.7rem; color:#64748b;">${esc(ev.description || '—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; margin-top:30px; font-size:0.75rem; text-align:center;">
          <div style="width:40%;">
            <div style="border-bottom:1.5px solid #0f172a; margin-bottom:4px; padding-bottom:20px;"></div>
            <strong>Academic Committee Secretary</strong>
          </div>
          <div style="width:40%;">
            <div style="border-bottom:1.5px solid #0f172a; margin-bottom:4px; padding-bottom:20px;"></div>
            <strong>Principal (Official Seal)</strong>
          </div>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: 'Annual Academic Calendar (A4)',
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
        <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Print / Save PDF Calendar</button>
      `
    });

    UIComponents.refreshIcons();
  }
}

export default CalendarModule;
