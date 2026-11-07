/**
 * THAIBA PUBLIC SCHOOL — Universal Classroom & Period Modal Builder
 * Matches the reference design with 7-Day circle toggles, tenure window, and custom inputs.
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';

export const DAYS_CONFIG = [
  { key: 'Sun', short: 'S', full: 'Sunday' },
  { key: 'Mon', short: 'M', full: 'Monday' },
  { key: 'Tue', short: 'T', full: 'Tuesday' },
  { key: 'Wed', short: 'W', full: 'Wednesday' },
  { key: 'Thu', short: 'T', full: 'Thursday' },
  { key: 'Fri', short: 'F', full: 'Friday' },
  { key: 'Sat', short: 'S', full: 'Saturday' }
];

export class ClassroomModal {
  /**
   * Opens the Add/Edit Classroom or Period modal matching the reference design.
   * @param {Object} options
   * @param {Object} [options.classroom] - Existing data if editing
   * @param {Function} [options.onSave] - Callback with saved data
   * @param {HTMLElement} [options.container] - Context container
   */
  static async open(options = {}) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const cls = options.classroom || {};
    const isEdit = Boolean(cls.id || cls.name || cls.grade);

    // Fetch teachers/staff for dropdown
    let staff = [];
    try {
      staff = (await dbService.select('staff')) || [];
    } catch (e) {
      staff = [];
    }
    if (!staff.length) {
      staff = [
        { id: 'st-1', name: 'muhammad mubashir', designation: 'Teacher' },
        { id: 'st-2', name: 'Hafiz Tariq', designation: 'Hifz Faculty' },
        { id: 'st-3', name: 'Br. Abdul Basith', designation: 'Academic Council' },
        { id: 'st-4', name: 'Rehana Parveen', designation: 'Primary Teacher' },
        { id: 'st-5', name: 'Irfan Zahra', designation: 'Mathematics Faculty' }
      ];
    }

    // Default sections
    const defaultSections = [
      'Hostel Moral Class',
      'Primary Section (Nursery - Grade 5)',
      'Middle Section (Grade 6 - Grade 8)',
      'Secondary Section (Grade 9 - Grade 10)',
      'Senior Secondary (Grade 11 - Grade 12)',
      'Hifz & Islamic Studies',
      'Special Coaching'
    ];

    const currentSection = cls.section || cls.program || 'Hostel Moral Class';
    const currentName = cls.name || cls.classroomName || cls.grade || (isEdit ? '' : 'Arabic Reding Class');
    const currentTeacher = cls.teacher || cls.teacherName || cls.assignedTeacher || 'muhammad mubashir';
    const currentStartDate = cls.startDate || cls.assignmentStartDate || '2026-11-01';
    const currentEndDate = cls.endDate || cls.removalDate || '';
    const currentStartTime = cls.startTime || cls.start_time || '05:30 AM';
    const currentEndTime = cls.endTime || cls.end_time || '06:20 AM';
    const currentGender = cls.gender || cls.gender_eligibility || 'Boys';
    const currentRoom = cls.room || cls.room_number || cls.roomNo || 'R1';
    const currentCapacity = cls.capacity || 40;

    // Active days list
    let activeDays = cls.days;
    if (!activeDays || !Array.isArray(activeDays) || !activeDays.length) {
      activeDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    const title = isEdit ? `Edit Classroom — ${currentName || 'Arabic Reding Class'}` : 'Add New Classroom / Period';

    const bodyHtml = `
      <div style="font-family: var(--font-sans, system-ui, -apple-system, sans-serif); padding: 4px 2px;">
        <form id="form-manage-classroom" onsubmit="return false;">
          <!-- Section Dropdown -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
              Section <span style="color: #EF4444;">*</span>
            </label>
            <select class="form-select" id="cls-modal-section" required>
              ${defaultSections.map(s => `
                <option value="${esc(s)}" ${currentSection === s ? 'selected' : ''}>${esc(s)}</option>
              `).join('')}
            </select>
          </div>

          <!-- Classroom Name -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
              Classroom Name <span style="color: #EF4444;">*</span>
            </label>
            <input type="text" class="form-input" id="cls-modal-name" value="${esc(currentName)}" required placeholder="e.g. Arabic Reding Class, Moral Studies" style="border-radius: 12px; font-weight: 600;">
          </div>

          <!-- Assign Teacher with Remove Button -->
          <div class="form-group" style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B; margin-bottom: 0;">
                Assign Teacher (Optional)
              </label>
              <button type="button" id="btn-cls-remove-teacher" style="color: #EF4444; border: 1.5px solid #FECACA; background: #FFF5F5; font-size: 0.72rem; font-weight: 700; border-radius: 9999px; padding: 3px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;">
                ✕ Remove Teacher from Class
              </button>
            </div>
            <select class="form-select" id="cls-modal-teacher">
              <option value="">-- No Teacher Assigned --</option>
              ${staff.map(st => {
                const sName = st.fullName || st.name;
                const isSelected = currentTeacher && sName && sName.toLowerCase().includes(currentTeacher.toLowerCase());
                return `
                  <option value="${esc(sName)}" ${isSelected ? 'selected' : ''}>
                    ${esc(sName)} (${esc(st.designation || st.role || 'Teacher')})
                  </option>
                `;
              }).join('')}
            </select>
          </div>

          <!-- Faculty Duty Tenure & Attendance Window Card -->
          <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 14px 16px; margin-bottom: 18px;">
            <div style="font-size: 0.84rem; font-weight: 800; color: #1E293B; margin-bottom: 10px; letter-spacing: 0.01em;">
              Faculty Duty Tenure &amp; Attendance Window
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label class="form-label" style="font-size: 0.76rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
                  Assignment Start Date
                </label>
                <input type="date" class="form-input" id="cls-modal-start-date" value="${esc(currentStartDate)}" style="border-radius: 10px;">
              </div>
              <div>
                <label class="form-label" style="font-size: 0.76rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
                  Removal / End Date
                </label>
                <input type="date" class="form-input" id="cls-modal-end-date" value="${esc(currentEndDate)}" placeholder="Active" style="border-radius: 10px;">
              </div>
            </div>
            <div style="font-size: 0.74rem; color: #64748B; margin-top: 8px; line-height: 1.4;">
              Attendance duties are tracked only between assignment start and removal dates. If removed, duties end immediately on the removal date.
            </div>
          </div>

          <!-- Class Days of Week (7-Day Circle Buttons) -->
          <div class="form-group" style="margin-bottom: 18px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B; margin-bottom: 0;">
                Class Days of Week
              </label>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-xs btn-outline" id="btn-quick-all" style="padding: 3px 10px; font-size: 0.74rem; font-weight: 700; border-radius: 8px;">
                  All
                </button>
                <button type="button" class="btn btn-xs btn-outline" id="btn-quick-mon-sat" style="padding: 3px 10px; font-size: 0.74rem; font-weight: 700; border-radius: 8px;">
                  Mon–Sat
                </button>
                <button type="button" class="btn btn-xs btn-outline" id="btn-quick-clear" style="padding: 3px 10px; font-size: 0.74rem; font-weight: 700; border-radius: 8px;">
                  Clear
                </button>
              </div>
            </div>
            <div class="cls-days-picker-row">
              ${DAYS_CONFIG.map(d => `
                <button type="button" class="cls-day-round-btn ${activeDays.includes(d.key) ? 'active' : ''}" data-day="${d.key}" title="${d.full}">
                  <span class="day-char">${d.short}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Time Inputs Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
                Class Starting Time <span style="color: #EF4444;">*</span>
              </label>
              <div style="position: relative;">
                <input type="text" class="form-input font-mono" id="cls-modal-start-time" value="${esc(currentStartTime)}" required placeholder="05:30 AM" style="border-radius: 12px; padding-right: 36px; font-weight: 600;">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #64748B; pointer-events: none;">
                  <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                </span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
                Class Ending Time <span style="color: #EF4444;">*</span>
              </label>
              <div style="position: relative;">
                <input type="text" class="form-input font-mono" id="cls-modal-end-time" value="${esc(currentEndTime)}" required placeholder="06:20 AM" style="border-radius: 12px; padding-right: 36px; font-weight: 600;">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #64748B; pointer-events: none;">
                  <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                </span>
              </div>
            </div>
          </div>

          <!-- Gender Dropdown -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
              Gender <span style="color: #EF4444;">*</span>
            </label>
            <select class="form-select" id="cls-modal-gender" required>
              <option value="Boys" ${currentGender === 'Boys' ? 'selected' : ''}>Boys</option>
              <option value="Girls" ${currentGender === 'Girls' ? 'selected' : ''}>Girls</option>
              <option value="Mixed / Co-Ed" ${currentGender === 'Mixed / Co-Ed' || currentGender === 'Mixed' ? 'selected' : ''}>Mixed / Co-Ed</option>
            </select>
          </div>

          <!-- Room / Hall & Capacity -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
                Room / Hall (Optional)
              </label>
              <input type="text" class="form-input font-mono" id="cls-modal-room" value="${esc(currentRoom)}" placeholder="R1, Hall A" style="border-radius: 12px; font-weight: 600;">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.88rem; color: #1E293B;">
                Capacity (Optional)
              </label>
              <input type="number" class="form-input font-mono" id="cls-modal-capacity" value="${esc(currentCapacity)}" placeholder="40" style="border-radius: 12px; font-weight: 600;">
            </div>
          </div>
        </form>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="btn-cls-modal-cancel" style="border-radius: 12px; padding: 10px 22px; font-weight: 700;">
        Cancel
      </button>
      <button class="btn btn-primary" id="btn-cls-modal-save" style="border-radius: 12px; padding: 10px 30px; font-weight: 700; background: #0E623B; border-color: #0E623B; color: #FFFFFF;">
        Save Changes
      </button>
    `;

    UIComponents.openModal({
      title,
      bodyHtml,
      footerHtml,
      maxWidth: '680px'
    });

    // Wire Days Round Buttons
    const dayButtons = document.querySelectorAll('.cls-day-round-btn');
    dayButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.toggle('active');
      });
    });

    // Quick Day Filters
    document.getElementById('btn-quick-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      dayButtons.forEach(b => b.classList.add('active'));
    });

    document.getElementById('btn-quick-mon-sat')?.addEventListener('click', (e) => {
      e.preventDefault();
      dayButtons.forEach(b => {
        if (b.dataset.day === 'Sun') b.classList.remove('active');
        else b.classList.add('active');
      });
    });

    document.getElementById('btn-quick-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      dayButtons.forEach(b => b.classList.remove('active'));
    });

    // Remove Teacher Button
    document.getElementById('btn-cls-remove-teacher')?.addEventListener('click', (e) => {
      e.preventDefault();
      const teacherSelect = document.getElementById('cls-modal-teacher');
      if (teacherSelect) {
        teacherSelect.value = '';
        teacherSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const endDate = document.getElementById('cls-modal-end-date');
      if (endDate) {
        endDate.value = new Date().toISOString().split('T')[0];
        endDate.dispatchEvent(new Event('change', { bubbles: true }));
      }
      UIComponents.showToast('Teacher marked for removal effective today.', 'info');
    });

    // Cancel Button
    document.getElementById('btn-cls-modal-cancel')?.addEventListener('click', () => {
      UIComponents.closeModal();
    });

    // Save Button
    document.getElementById('btn-cls-modal-save')?.addEventListener('click', async () => {
      const section = document.getElementById('cls-modal-section')?.value;
      const name = document.getElementById('cls-modal-name')?.value?.trim();
      const teacher = document.getElementById('cls-modal-teacher')?.value;
      const startDate = document.getElementById('cls-modal-start-date')?.value;
      const endDate = document.getElementById('cls-modal-end-date')?.value;
      const startTime = document.getElementById('cls-modal-start-time')?.value?.trim();
      const endTime = document.getElementById('cls-modal-end-time')?.value?.trim();
      const gender = document.getElementById('cls-modal-gender')?.value;
      const room = document.getElementById('cls-modal-room')?.value?.trim();
      const capacity = parseInt(document.getElementById('cls-modal-capacity')?.value, 10) || 40;

      const chosenDays = Array.from(document.querySelectorAll('.cls-day-round-btn.active')).map(b => b.dataset.day);

      if (!name) {
        UIComponents.showToast('Classroom Name is required.', 'warning');
        return;
      }
      if (!startTime || !endTime) {
        UIComponents.showToast('Class Start Time and End Time are required.', 'warning');
        return;
      }

      const recordData = {
        id: cls.id || `cls-${Date.now()}`,
        name,
        section,
        program: section,
        teacher,
        startDate,
        endDate,
        days: chosenDays.length ? chosenDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        startTime,
        endTime,
        gender,
        room,
        capacity,
        status: 'Active'
      };

      if (typeof options.onSave === 'function') {
        await options.onSave(recordData);
      }

      UIComponents.showToast(`Classroom "${name}" saved successfully.`, 'success');
      UIComponents.closeModal();
    });

    UIComponents.refreshIcons();
    UIComponents.enhanceAllSelects();
    UIComponents.enhanceAllDatePickers();
  }
}
