/**
 * THAIBA PUBLIC SCHOOL ERP — Universal 3D-Badge Date Picker Engine
 * Pixel-perfect adaptation of TPSH calendar with:
 * - 3D Gold Calendar Badge with metallic white rings and selected day
 * - Pill selectors for Month (Nov ▾) and Year (2026 ▾)
 * - SUN-SAT weekday headers with Gold SUN
 * - 7-column days grid with dark gold selected day (#BF9A33) & scale animations
 * - Prominent Gold "Confirm" button
 * - Month view (Select Month YYYY) with 3x4 grid cards and Back to Days link
 * - Year view (Decade window) with 3x4 grid cards and Back to Days link
 * - Universal auto-enhancement for input[type="date"]
 */

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const CHEVRON_DOWN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
const CHEVRON_LEFT_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
const CHEVRON_RIGHT_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
const CALENDAR_INPUT_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

let activePopup = null;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tms-tps-datepicker-styles')) return;

  const style = document.createElement('style');
  style.id = 'tms-tps-datepicker-styles';
  style.textContent = `
/* Universal Date Input Field & Trigger */
.tps-date-input-wrapper {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  cursor: pointer !important;
}

.tps-date-input-field {
  cursor: pointer !important;
  background-color: #FFFFFF !important;
  border: 1.5px solid #E2E8F0 !important;
  border-radius: 9999px !important;
  padding: 10px 42px 10px 18px !important;
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  font-family: inherit !important;
  font-size: 0.92rem !important;
  font-weight: 600 !important;
  color: #0F172A !important;
  outline: none !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.tps-date-input-field:hover {
  border-color: #D4AF37 !important;
  background-color: #FAFAFA !important;
}

.tps-date-input-field:focus {
  border-color: #D4AF37 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
}

.tps-date-icon {
  position: absolute !important;
  right: 14px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: #D4AF37 !important;
  pointer-events: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Floating Date Picker Popup */
.tps-calendar-popup {
  position: absolute !important;
  z-index: 99999 !important;
  background: #FFFFFF !important;
  border-radius: 28px !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.18), 0 6px 16px rgba(15, 23, 42, 0.06) !important;
  padding: 1.6rem 1.6rem 1.4rem !important;
  width: 340px !important;
  user-select: none !important;
  animation: tpsScaleFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
  font-family: inherit !important;
  box-sizing: border-box !important;
}

@keyframes tpsScaleFadeIn {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.tps-cal-top-section {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 0.75rem !important;
  margin-bottom: 0.55rem !important;
}

.tps-cal-top-left {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.65rem !important;
}

.tps-cal-main-title {
  font-size: 1.45rem !important;
  font-weight: 800 !important;
  color: #0F172A !important;
  letter-spacing: -0.02em !important;
  line-height: 1.15 !important;
  margin: 0 !important;
}

.tps-cal-pills-row {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.tps-cal-pill-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  background: #FDF8E8 !important; border: 1.5px solid #F7E8B5 !important; color: #8C6E1E !important;
  border-radius: 12px !important;
  padding: 0.45rem 0.8rem !important;
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  color: #8C6E1E !important; cursor: pointer !important;
  transition: all 0.15s ease !important;
  outline: none !important;
  font-family: inherit !important;
}

.tps-cal-pill-btn:hover {
  background: #E2E8F0 !important;
  border-color: #CBD5E1 !important;
  color: #BF9A33 !important;
}

.tps-cal-pill-btn svg {
  color: #64748B !important;
  transition: transform 0.15s ease !important;
}

.tps-cal-pill-btn:hover svg {
  color: #BF9A33 !important;
  transform: translateY(1px) !important;
}

.tps-cal-badge-card {
  position: relative !important;
  width: 62px !important;
  height: 64px !important;
  background: linear-gradient(145deg, #D4AF37 0%, #BF9A33 55%, #8C6E1E 100%) !important;
  box-shadow: 0 8px 20px rgba(191, 154, 51, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.5) !important;
  border-radius: 16px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 10px 22px rgba(15, 81, 50, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.4) !important;
  flex-shrink: 0 !important;
  margin-top: 2px !important;
}

.tps-cal-badge-tabs {
  position: absolute !important;
  top: -6px !important;
  left: 0 !important;
  right: 0 !important;
  display: flex !important;
  justify-content: space-around !important;
  padding: 0 12px !important;
}

.tps-cal-badge-tabs .tps-cal-tab {
  width: 7px !important;
  height: 11px !important;
  background: #FFFFFF !important;
  border-radius: 3.5px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
}

.tps-cal-badge-num {
  font-size: 1.7rem !important;
  font-weight: 800 !important;
  color: #FFFFFF !important;
  letter-spacing: -0.03em !important;
  line-height: 1 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

.tps-cal-weekdays {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr) !important;
  text-align: center !important;
  margin: 1.25rem 0 0.55rem !important;
}

.tps-cal-weekdays span {
  font-size: 0.74rem !important;
  font-weight: 700 !important;
  color: #1E293B !important;
  letter-spacing: 0.03em !important;
  padding: 0.2rem 0 !important;
}

.tps-cal-weekdays span.weekday-sun {
  color: #BF9A33 !important;
  font-weight: 800 !important;
}

.tps-cal-days-grid {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr) !important;
  gap: 4px !important;
  row-gap: 6px !important;
}

.tps-cal-day {
  width: 38px !important;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.86rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  border-radius: 12px !important;
  transition: all 0.15s ease !important;
  margin: 0 auto !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.tps-cal-day.current-month {
  color: #0F172A !important;
}

.tps-cal-day.other-month {
  color: #CBD5E1 !important;
  font-weight: 400 !important;
}

.tps-cal-day.col-sun:not(.selected):not(.other-month) {
  color: #BF9A33 !important;
  font-weight: 700 !important;
}

.tps-cal-day:hover:not(.selected) {
  background: #ECFDF5 !important;
  color: #8C6E1E !important;
  transform: scale(1.06) !important;
}

.tps-cal-day.selected {
  background: linear-gradient(135deg, #D4AF37 0%, #BF9A33 100%) !important;
  color: #FFFFFF !important;
  font-weight: 800 !important;
  border-radius: 12px !important;
  box-shadow: 0 6px 16px rgba(191, 154, 51, 0.45) !important;
  transform: scale(1.04) !important;
}

.tps-cal-day.today:not(.selected) {
  color: #BF9A33 !important;
  font-weight: 800 !important;
}

.tps-cal-day.today:not(.selected):after {
  content: "" !important;
  position: absolute !important;
  bottom: 3px !important;
  width: 14px !important;
  height: 2.5px !important;
  background: #BF9A33 !important;
  border-radius: 2px !important;
}

.tps-cal-actions {
  display: flex !important;
  justify-content: center !important;
  margin-top: 1.35rem !important;
}

.tps-cal-confirm-btn {
  background: linear-gradient(135deg, #D4AF37 0%, #BF9A33 55%, #8C6E1E 100%) !important;
  box-shadow: 0 8px 22px rgba(191, 154, 51, 0.35) !important;
  color: #FFFFFF !important;
  font-family: inherit !important;
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  padding: 0.75rem 2.4rem !important;
  border-radius: 16px !important;
  border: none !important;
  cursor: pointer !important;
  box-shadow: 0 10px 24px rgba(15, 81, 50, 0.32) !important;
  transition: all 0.15s ease !important;
  min-width: 180px !important;
  text-align: center !important;
  outline: none !important;
}

.tps-cal-confirm-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 14px 28px rgba(15, 81, 50, 0.42) !important;
  background: linear-gradient(135deg, #D4AF37, #8C6E1E) !important;
}

.tps-cal-confirm-btn:active {
  transform: translateY(1px) !important;
}

/* Sub-views: Month and Year grids */
.tps-cal-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.5rem !important;
}

.tps-cal-title {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: #0F172A !important;
}

.tps-cal-nav-btn {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  border: 1px solid #E2E8F0 !important;
  background: #FFFFFF !important;
  color: #334155 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  padding: 0 !important;
}

.tps-cal-nav-btn:hover {
  background: #F1F5F9 !important;
  color: #0F172A !important;
  border-color: #CBD5E1 !important;
}

.tps-cal-divider {
  height: 1px !important;
  background: #F1F5F9 !important;
  margin: 0.75rem 0 0.5rem !important;
}

.tps-cal-grid-select {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 0.5rem !important;
  padding: 0.35rem 0 !important;
}

.tps-cal-grid-item {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0.8rem 0.5rem !important;
  font-size: 0.88rem !important;
  font-weight: 600 !important;
  color: #1E293B !important;
  background: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  text-align: center !important;
}

.tps-cal-grid-item:hover {
  background: #ECFDF5 !important;
  border-color: #A7F3D0 !important;
  color: #8C6E1E !important;
  transform: translateY(-1px) !important;
}

.tps-cal-grid-item.selected {
  background: #BF9A33 !important;
  color: #FFFFFF !important;
  border-color: #BF9A33 !important;
  box-shadow: 0 4px 10px rgba(15, 81, 50, 0.3) !important;
}

.tps-cal-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.tps-cal-today-action {
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  color: #BF9A33 !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.15s ease !important;
}

.tps-cal-today-action:hover {
  color: #8C6E1E !important;
  text-decoration: underline !important;
}
`;
  document.head.appendChild(style);
}
ensureStyles();

function padZero(n) {
  return String(n).padStart(2, '0');
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const str = String(v).trim();
  const parts = str.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatIso(d) {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function formatDisplay(d) {
  if (!d || isNaN(d.getTime())) return '';
  return `${padZero(d.getDate())}.${MONTH_NAMES_SHORT[d.getMonth()]}.${d.getFullYear()}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function closePopup() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
}

// Global outside-click listener
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!activePopup) return;
    if (activePopup.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.tps-date-picker-trigger')) return;
    closePopup();
  });

  window.addEventListener('resize', closePopup);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });
}

function positionPopup(popup, trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = 340;
  const height = 440;
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 8;

  if (left + width > window.innerWidth - 12) {
    left = window.innerWidth - width - 12;
  }
  if (left < 12) left = 12;

  if (rect.bottom + height > window.innerHeight && rect.top > height) {
    top = rect.top + window.scrollY - height - 8;
  }

  popup.style.left = `${Math.round(left)}px`;
  popup.style.top = `${Math.round(top)}px`;
}

function openCalendar(input, trigger) {
  if (activePopup && activePopup.__forInput === input) {
    closePopup();
    return;
  }
  closePopup();

  const curDate = parseDate(input.value) || new Date();
  let viewYear = curDate.getFullYear();
  let viewMonth = curDate.getMonth();
  let selectedDate = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate());
  let currentView = 'days'; // 'days' | 'months' | 'years'
  let decadeStart = Math.floor(viewYear / 12) * 12;

  const popup = document.createElement('div');
  popup.className = 'tps-calendar-popup';
  popup.__forInput = input;

  function render() {
    if (currentView === 'years') renderYears();
    else if (currentView === 'months') renderMonths();
    else renderDays();
  }

  function renderDays() {
    const daysInCur = getDaysInMonth(viewYear, viewMonth);
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInPrev = getDaysInMonth(viewYear, viewMonth - 1);
    const today = new Date();
    const isTodayMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
    const todayDate = today.getDate();

    let gridHtml = '';

    // 1. Previous month leading days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const b = daysInPrev - i;
      gridHtml += `
        <div class="tps-cal-day other-month" data-nav="prev" data-day="${b}">
          ${padZero(b)}
        </div>
      `;
    }

    // 2. Current month days
    for (let c = 1; c <= daysInCur; c++) {
      const isSel = selectedDate.getFullYear() === viewYear &&
                    selectedDate.getMonth() === viewMonth &&
                    selectedDate.getDate() === c;
      const isTod = isTodayMonth && c === todayDate;
      const isSun = (firstDayIndex + c - 1) % 7 === 0;

      let cls = 'tps-cal-day current-month';
      if (isSel) cls += ' selected';
      if (isTod) cls += ' today';
      if (isSun) cls += ' col-sun';

      gridHtml += `
        <div class="${cls}" data-day="${c}">
          ${padZero(c)}
        </div>
      `;
    }

    // 3. Next month trailing days to complete 35 or 42 cells
    const totalCells = firstDayIndex + daysInCur;
    const targetCells = totalCells > 35 ? 42 : 35;
    const trailing = targetCells - totalCells;
    for (let c = 1; c <= trailing; c++) {
      gridHtml += `
        <div class="tps-cal-day other-month" data-nav="next" data-day="${c}">
          ${padZero(c)}
        </div>
      `;
    }

    popup.innerHTML = `
      <div class="tps-cal-top-section">
        <div class="tps-cal-top-left">
          <h3 class="tps-cal-main-title">Select Date</h3>
          <div class="tps-cal-pills-row">
            <button type="button" class="tps-cal-pill-btn btn-trigger-month">
              <span>${MONTH_NAMES_SHORT[viewMonth]}</span>
              ${CHEVRON_DOWN_SVG}
            </button>
            <button type="button" class="tps-cal-pill-btn btn-trigger-year">
              <span>${viewYear}</span>
              ${CHEVRON_DOWN_SVG}
            </button>
          </div>
        </div>

        <div class="tps-cal-badge-card" aria-hidden="true">
          <div class="tps-cal-badge-tabs">
            <div class="tps-cal-tab"></div>
            <div class="tps-cal-tab"></div>
          </div>
          <div class="tps-cal-badge-num">${padZero(selectedDate.getDate())}</div>
        </div>
      </div>

      <div class="tps-cal-weekdays">
        <span class="weekday-sun">SUN</span>
        <span>MON</span>
        <span>TUE</span>
        <span>WED</span>
        <span>THU</span>
        <span>FRI</span>
        <span>SAT</span>
      </div>

      <div class="tps-cal-days-grid">
        ${gridHtml}
      </div>

      <div class="tps-cal-actions">
        <button type="button" class="tps-cal-confirm-btn">Confirm</button>
      </div>
    `;

    // Month & Year triggers
    popup.querySelector('.btn-trigger-month').addEventListener('click', (e) => {
      e.stopPropagation();
      currentView = 'months';
      render();
    });

    popup.querySelector('.btn-trigger-year').addEventListener('click', (e) => {
      e.stopPropagation();
      decadeStart = Math.floor(viewYear / 12) * 12;
      currentView = 'years';
      render();
    });

    // Day clicks
    popup.querySelectorAll('.tps-cal-day').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const nav = cell.getAttribute('data-nav');
        const day = parseInt(cell.getAttribute('data-day'), 10);

        if (nav === 'prev') {
          viewMonth--;
          if (viewMonth < 0) { viewMonth = 11; viewYear--; }
          selectedDate = new Date(viewYear, viewMonth, day);
          render();
        } else if (nav === 'next') {
          viewMonth++;
          if (viewMonth > 11) { viewMonth = 0; viewYear++; }
          selectedDate = new Date(viewYear, viewMonth, day);
          render();
        } else {
          selectedDate = new Date(viewYear, viewMonth, day);
          popup.querySelectorAll('.tps-cal-day.selected').forEach(d => d.classList.remove('selected'));
          cell.classList.add('selected');
          const badgeNum = popup.querySelector('.tps-cal-badge-num');
          if (badgeNum) badgeNum.textContent = padZero(day);
        }
      });

      // Double-click instantly confirms
      cell.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        applySelection();
      });
    });

    // Confirm button
    popup.querySelector('.tps-cal-confirm-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      applySelection();
    });
  }

  function renderMonths() {
    let gridHtml = '';
    MONTH_NAMES_SHORT.forEach((mName, idx) => {
      const isSel = selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === idx;
      gridHtml += `
        <div class="tps-cal-grid-item ${isSel ? 'selected' : ''}" data-month="${idx}">
          ${mName}
        </div>
      `;
    });

    popup.innerHTML = `
      <div class="tps-cal-header">
        <button type="button" class="tps-cal-nav-btn btn-prev-m-year" title="Previous Year">
          ${CHEVRON_LEFT_SVG}
        </button>
        <span class="tps-cal-title">Select Month (${viewYear})</span>
        <button type="button" class="tps-cal-nav-btn btn-next-m-year" title="Next Year">
          ${CHEVRON_RIGHT_SVG}
        </button>
      </div>

      <div class="tps-cal-divider"></div>

      <div class="tps-cal-grid-select">
        ${gridHtml}
      </div>

      <div class="tps-cal-divider" style="margin-top: 0.75rem;"></div>

      <div class="tps-cal-footer">
        <button type="button" class="tps-cal-today-action btn-back-days">← Back to Days</button>
      </div>
    `;

    popup.querySelector('.btn-prev-m-year').addEventListener('click', (e) => {
      e.stopPropagation();
      viewYear--;
      render();
    });

    popup.querySelector('.btn-next-m-year').addEventListener('click', (e) => {
      e.stopPropagation();
      viewYear++;
      render();
    });

    popup.querySelector('.btn-back-days').addEventListener('click', (e) => {
      e.stopPropagation();
      currentView = 'days';
      render();
    });

    popup.querySelectorAll('.tps-cal-grid-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth = parseInt(item.getAttribute('data-month'), 10);
        // Clamp day to max in target month
        const maxDay = getDaysInMonth(viewYear, viewMonth);
        selectedDate = new Date(viewYear, viewMonth, Math.min(selectedDate.getDate(), maxDay));
        currentView = 'days';
        render();
      });
    });
  }

  function renderYears() {
    let gridHtml = '';
    for (let y = decadeStart; y < decadeStart + 12; y++) {
      const isSel = selectedDate.getFullYear() === y;
      gridHtml += `
        <div class="tps-cal-grid-item ${isSel ? 'selected' : ''}" data-year="${y}">
          ${y}
        </div>
      `;
    }

    popup.innerHTML = `
      <div class="tps-cal-header">
        <button type="button" class="tps-cal-nav-btn btn-prev-decade" title="Previous 12 Years">
          ${CHEVRON_LEFT_SVG}
        </button>
        <span class="tps-cal-title">${decadeStart} – ${decadeStart + 11}</span>
        <button type="button" class="tps-cal-nav-btn btn-next-decade" title="Next 12 Years">
          ${CHEVRON_RIGHT_SVG}
        </button>
      </div>

      <div class="tps-cal-divider"></div>

      <div class="tps-cal-grid-select">
        ${gridHtml}
      </div>

      <div class="tps-cal-divider" style="margin-top: 0.75rem;"></div>

      <div class="tps-cal-footer">
        <button type="button" class="tps-cal-today-action btn-back-days">← Back to Days</button>
      </div>
    `;

    popup.querySelector('.btn-prev-decade').addEventListener('click', (e) => {
      e.stopPropagation();
      decadeStart -= 12;
      render();
    });

    popup.querySelector('.btn-next-decade').addEventListener('click', (e) => {
      e.stopPropagation();
      decadeStart += 12;
      render();
    });

    popup.querySelector('.btn-back-days').addEventListener('click', (e) => {
      e.stopPropagation();
      currentView = 'days';
      render();
    });

    popup.querySelectorAll('.tps-cal-grid-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        viewYear = parseInt(item.getAttribute('data-year'), 10);
        const maxDay = getDaysInMonth(viewYear, viewMonth);
        selectedDate = new Date(viewYear, viewMonth, Math.min(selectedDate.getDate(), maxDay));
        currentView = 'days';
        render();
      });
    });
  }

  function applySelection() {
    const iso = formatIso(selectedDate);
    input.value = iso;
    input.setAttribute('data-date-raw', iso);
    input.setAttribute('data-date-formatted', formatDisplay(selectedDate));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closePopup();
  }

  document.body.appendChild(popup);
  activePopup = popup;
  positionPopup(popup, trigger);
  render();
}

/**
 * Enhance an input[type="date"] element with the TPSH luxury calendar picker.
 */
export function enhanceDatePicker(input) {
  if (!input) return;
  if (input.dataset.tpsDatepickerEnhanced === 'true') return;
  if (input.classList.contains('no-custom-datepicker')) return;

  input.dataset.tpsDatepickerEnhanced = 'true';
  input.dataset.datepickerEnhanced = 'true';

  // Prevent browser native calendar popup
  if (input.type === 'date') {
    input.type = 'text';
  }
  input.readOnly = true;
  input.classList.add('tps-date-input-field');

  if (input.value) {
    const parsed = parseDate(input.value);
    if (parsed) {
      input.value = formatIso(parsed);
      input.setAttribute('data-date-raw', formatIso(parsed));
      input.setAttribute('data-date-formatted', formatDisplay(parsed));
    }
  }

  // Wrap input with trigger & icon if not already wrapped
  let wrapper = input.parentElement;
  if (!wrapper || !wrapper.classList.contains('tps-date-input-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'tps-date-input-wrapper tps-date-picker-trigger';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'tps-date-icon';
    iconSpan.innerHTML = CALENDAR_INPUT_ICON_SVG;
    wrapper.appendChild(iconSpan);
  } else {
    wrapper.classList.add('tps-date-picker-trigger');
  }

  function triggerHandler(e) {
    e.stopPropagation();
    e.preventDefault();
    openCalendar(input, wrapper);
  }

  wrapper.addEventListener('click', triggerHandler);
  input.addEventListener('click', triggerHandler);

  wrapper.setAttribute('tabindex', '0');
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHandler(e);
    }
  });
}

/**
 * Enhance all date inputs in a given root container.
 */
export function enhanceAllDatePickers(root = document) {
  if (!root || !root.querySelectorAll) return;
  const inputs = root.querySelectorAll('input[type="date"], input[data-datepicker], .tps-date-input-field:not([data-tps-datepicker-enhanced])');
  inputs.forEach(enhanceDatePicker);
}

/**
 * MutationObserver to automatically enhance dynamically created date inputs.
 */
let datePickerObserver = null;
export function startGlobalDatePickerObserver() {
  if (typeof MutationObserver === 'undefined') return;
  if (datePickerObserver) return;

  datePickerObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches && (node.matches('input[type="date"]') || node.matches('input[data-datepicker]'))) {
            enhanceDatePicker(node);
          } else if (node.querySelectorAll) {
            enhanceAllDatePickers(node);
          }
        }
      }
    }
  });

  datePickerObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

// Auto-run on boot
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceAllDatePickers();
      startGlobalDatePickerObserver();
    });
  } else {
    enhanceAllDatePickers();
    startGlobalDatePickerObserver();
  }
}
