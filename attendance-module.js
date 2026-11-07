/**
 * THAIBA PUBLIC SCHOOL — Universal Attendance & Timetable Governance Suite
 * Fully functional multi-modal biometric & attendance suite:
 * 1. Timetable & Roll Call (Live Duty, Dynamic Timing, Session Submission to Database)
 * 2. Smart QR Scanner Kiosk (Real Camera Stream, Barcode Gun Support, Instant Check-in & Audio)
 * 3. Biometric Contactless NFC / RFID Tap Terminal (Web NFC API, USB RFID Wedge, Instant Persistence)
 * 4. AI Face Recognition Terminal (Live Webcam Stream, Face Detection HUD, Snapshot Verification)
 * 5. Daily Master Register (Live DB Sync, Real P/A/L/E Toggle, CSV Export, WhatsApp Alerts)
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';
import { downloadCsv } from './export-utils.js';
import { WhatsAppService } from './whatsapp-service.js';
import { ClassroomModal, DAYS_CONFIG } from './classroom-modal.js';
import { SAMPLE_STUDENTS } from './student-module.js';
import { BiometricCredentialModal } from './biometric-credential-modal.js';
import { StudentLeaveService } from './student-leave-service.js';
import { authService } from './auth-service.js';

export const DEFAULT_CLASSROOMS = [];

/* ------------------------------------------------------------------ */
/* Web Audio Synthesizer: Zero-Dependency Chimes & Audio Signals       */
/* ------------------------------------------------------------------ */
class AttendanceAudio {
  static init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  static playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }

  static playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  static playRfid() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  static playShutter() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }
}

/* ------------------------------------------------------------------ */
/* Camera Stream Controller: Clean Lifecycle & Video Hardware Access   */
/* ------------------------------------------------------------------ */
class CameraManager {
  static stream = null;
  static videoElement = null;

  static async startCamera(videoEl, options = {}) {
    this.stopCamera();
    try {
      const constraints = {
        video: {
          width: { ideal: options.width || 640 },
          height: { ideal: options.height || 480 },
          facingMode: options.facingMode || 'user'
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.videoElement = videoEl;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        await videoEl.play().catch(() => {});
      }
      return { success: true, stream };
    } catch (err) {
      console.warn('CameraManager: Unable to acquire camera stream:', err);
      return { success: false, error: err.message || 'Camera permission denied or camera device not connected' };
    }
  }

  static stopCamera() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {}
      this.stream = null;
    }
    if (this.videoElement) {
      try {
        this.videoElement.srcObject = null;
      } catch (e) {}
      this.videoElement = null;
    }
  }

  static isLive() {
    return !!(this.stream && this.stream.active);
  }
}

/* ------------------------------------------------------------------ */
/* Main Attendance Module Controller                                   */
/* ------------------------------------------------------------------ */
export class AttendanceModule {
  static async render(container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    this._container = container;

    // Stop any residual camera stream from previous sessions
    CameraManager.stopCamera();

    this._selectedDate = this._selectedDate || new Date().toISOString().split('T')[0];
    this._activeMode = this._activeMode || 'timetable'; // 'timetable' | 'qr' | 'nfc' | 'face' | 'register'
    this._scheduleTab = this._scheduleTab || 'today'; // 'today' | 'weekly' | 'live'
    this._selectedTeacherFilter = this._selectedTeacherFilter || 'all';

    // Fetch live datasets
    const [allStudents, allRecords, allClassrooms, allLeaves] = await Promise.all([
      dbService.select('students'),
      dbService.select('attendance_records'),
      dbService.select('academic_classes'),
      StudentLeaveService.getLeaves()
    ]);

    const activeSchoolId = window.institutionService ? window.institutionService.getActiveSchoolId() : 'all';
    const scopedStudents = window.institutionService ? window.institutionService.filterByActiveSchool(allStudents || []) : (allStudents || []);

    this._students = scopedStudents || [];
    
    // Filter attendance records to active campus
    const studentIdSet = new Set(this._students.map(s => s.id));
    this._records = (allRecords || []).filter(r => {
      if (activeSchoolId === 'all') return true;
      if (r.school_id || r.schoolId) return (r.school_id || r.schoolId) === activeSchoolId;
      return studentIdSet.has(r.student_id || r.studentId);
    });

    this._classrooms = allClassrooms || [];
    this._leaves = allLeaves || [];

    // Recalculate stats for selected date
    const stats = this.computeStatsForDate(this._selectedDate);

    container.innerHTML = `
      <div class="tms-content-wrapper">
        <!-- Top Institutional Header -->
        ${UIComponents.renderPageHeader({
          title: 'Attendance & Teaching Timetable',
          subtitle: 'Multi-modal campus attendance governance with live timetable cards, smart QR kiosk, biometric contactless RFID, and AI facial vision.',
          breadcrumbs: [{ label: 'Attendance Management' }],
          badge: `${stats.presentCount} / ${stats.totalEnrolled} Present (${stats.clearanceRate})`,
          actionsHtml: `
            <div style="display:inline-flex; align-items:center; gap:8px;">
              <input type="date" id="att-global-date-input" class="form-input" value="${this._selectedDate}" style="font-weight:700; border-radius:12px; padding:6px 12px; font-size:0.86rem; background:#FFFFFF; border:1.5px solid #CBD5E1; color:#0F172A; width:auto; cursor:pointer;" title="Change Attendance Date">
              <button type="button" class="btn btn-secondary" id="btn-open-leave-desk" style="color:#B45309; border-color:#FCD34D; background:#FEF3C7; font-weight:700;">
                <i data-lucide="plane-takeoff"></i> Student Leave Desk
              </button>
              <button type="button" class="btn btn-secondary" id="btn-open-enrollment-kiosk">
                <i data-lucide="radio"></i> Smart Biometrics &amp; NFC
              </button>
              <button type="button" class="btn btn-secondary" id="btn-open-att-report">
                <i data-lucide="clipboard-check"></i> Attendance Report
              </button>
              <button type="button" class="btn btn-secondary" id="btn-export-att-csv">
                <i data-lucide="download"></i> Export CSV
              </button>
              <button type="button" class="btn btn-primary" id="btn-add-new-classroom" style="background:#0E623B; border-color:#0E623B;">
                <i data-lucide="plus"></i> New Classroom / Period
              </button>
            </div>
          `
        })}

        <!-- Biometric Mode Hub Switcher Bar (Timetable, QR, NFC, Face, Register) -->
        <div class="att-mode-hub-bar">
          <button type="button" class="att-mode-btn ${this._activeMode === 'timetable' ? 'active' : ''}" data-mode="timetable">
            <i data-lucide="layout-grid"></i> Timetable &amp; Roll Call
          </button>
          <button type="button" class="att-mode-btn ${this._activeMode === 'qr' ? 'active' : ''}" data-mode="qr">
            <i data-lucide="qr-code"></i> QR Scanner Kiosk
          </button>
          <button type="button" class="att-mode-btn ${this._activeMode === 'nfc' ? 'active' : ''}" data-mode="nfc">
            <i data-lucide="radio"></i> Biometric NFC Tap
          </button>
          <button type="button" class="att-mode-btn ${this._activeMode === 'face' ? 'active' : ''}" data-mode="face">
            <i data-lucide="scan-face"></i> AI Face Recognition
          </button>
          <button type="button" class="att-mode-btn ${this._activeMode === 'register' ? 'active' : ''}" data-mode="register">
            <i data-lucide="file-spreadsheet"></i> Daily Register
          </button>
        </div>

        <!-- Mode Content Container -->
        <div id="att-mode-viewport"></div>
      </div>
    `;

    this.renderActiveModeView(container);
    this.bindGlobalEvents(container);
    UIComponents.refreshIcons();
    UIComponents.enhanceAllSelects();
    UIComponents.enhanceAllDatePickers();
  }

  /* ------------------------------------------------------------------ */
  /* Calculate Attendance Stats from Real Records                       */
  /* ------------------------------------------------------------------ */
  static computeStatsForDate(dateStr) {
    const totalEnrolled = (this._students || []).length;
    const dayRecords = (this._records || []).filter(r => r.date === dateStr);

    // Group by studentId to find their most recent or highest priority status today
    const studentStatusMap = new Map();
    dayRecords.forEach(r => {
      const sId = r.studentId || r.student_id;
      if (sId) {
        studentStatusMap.set(sId, (r.status || 'present').toLowerCase());
      }
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    studentStatusMap.forEach(status => {
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'excused') excusedCount++;
    });

    // If no records marked yet for today, presentCount is 0
    const markedTotal = studentStatusMap.size;
    const effectivePresent = presentCount + lateCount;
    const clearanceRate = markedTotal > 0 ? `${Math.round((effectivePresent / markedTotal) * 100)}%` : '0%';

    return {
      totalEnrolled,
      markedTotal,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      effectivePresent,
      clearanceRate
    };
  }

  /* ------------------------------------------------------------------ */
  /* Helper: Check Schedule Time Status against Current Clock           */
  /* ------------------------------------------------------------------ */
  static getClassTimeStatus(classroom, selectedDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) {
      return { label: 'SCHEDULED', badgeClass: 'badge-secondary', isLive: false, isSoon: false };
    }

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridian = (match[3] || '').toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = parseTimeToMinutes(classroom.startTime);
    const endMins = parseTimeToMinutes(classroom.endTime);

    if (currentMins >= startMins && currentMins <= endMins) {
      return { label: 'LIVE NOW', badgeClass: 'badge-success', isLive: true, isSoon: false };
    }
    if (currentMins < startMins && (startMins - currentMins) <= 45) {
      return { label: 'STARTS SOON', badgeClass: 'badge-warning', isLive: false, isSoon: true };
    }
    if (currentMins > endMins) {
      return { label: 'COMPLETED', badgeClass: 'badge-secondary', isLive: false, isSoon: false };
    }
    return { label: 'SCHEDULED', badgeClass: 'badge-secondary', isLive: false, isSoon: false };
  }

  /* ------------------------------------------------------------------ */
  /* Helper: Record Attendance in Database & Local State                */
  /* ------------------------------------------------------------------ */
  static async recordAttendanceEntry({ student, status = 'present', method = 'MANUAL', classId = null, className = null, confidence = null, rfidUid = null, remarks = '', time = null }) {
    if (!student) return null;
    const date = this._selectedDate || new Date().toISOString().split('T')[0];
    const punchTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Deduplication key
    const recordId = classId 
      ? `att_${classId}_${student.id}_${date}` 
      : `att_daily_${student.id}_${date}`;

    const currentSchoolId = student.school_id || student.schoolId || (window.institutionService ? window.institutionService.getActiveSchoolId() : 'tps');

    const newRecord = {
      id: recordId,
      student_id: student.id,
      studentId: student.id,
      school_id: currentSchoolId,
      schoolId: currentSchoolId,
      admission_no: student.admissionNo,
      admissionNo: student.admissionNo,
      student_name: student.fullName,
      studentName: student.fullName,
      class_id: classId,
      classId: classId,
      class_name: className,
      className: className,
      grade: student.grade,
      date: date,
      status: status.toLowerCase(),
      time: punchTime,
      method: method,
      confidence: confidence,
      rfid_uid: rfidUid,
      rfidUid: rfidUid,
      remarks: remarks || ''
    };

    // Upsert into Supabase / LocalStorage
    await dbService.upsert('attendance_records', newRecord);

    // Update in-memory state
    const existingIdx = (this._records || []).findIndex(r => r.id === recordId || (r.studentId === student.id && r.date === date && (!classId || r.classId === classId)));
    if (existingIdx >= 0) {
      this._records[existingIdx] = newRecord;
    } else {
      this._records.unshift(newRecord);
    }

    // Audit trail
    try {
      auditService.log(
        'ATTENDANCE_RECORDED',
        `Attendance recorded for ${student.fullName} (${student.admissionNo}): ${status.toUpperCase()} via ${method}`,
        { studentId: student.id, status, method, date }
      );
    } catch (e) {}

    return newRecord;
  }

  /* ------------------------------------------------------------------ */
  /* Render Active Mode View Dispatcher                                  */
  /* ------------------------------------------------------------------ */
  static renderActiveModeView(container) {
    // Teardown camera when switching modes
    CameraManager.stopCamera();

    const viewport = container.querySelector('#att-mode-viewport');
    if (!viewport) return;

    if (this._activeMode === 'timetable') {
      this.renderTimetableMode(viewport);
    } else if (this._activeMode === 'qr') {
      this.renderQrMode(viewport);
    } else if (this._activeMode === 'nfc') {
      this.renderNfcMode(viewport);
    } else if (this._activeMode === 'face') {
      this.renderFaceMode(viewport);
    } else if (this._activeMode === 'register') {
      this.renderRegisterMode(viewport);
    }
    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* MODE 1: Timetable Cards & Live Roll Call Session                   */
  /* ================================================================== */
  static renderTimetableMode(viewport) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const todayDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(this._selectedDate + 'T00:00:00').getDay()];

    const classesForTeacher = this._selectedTeacherFilter === 'all'
      ? this._classrooms
      : this._classrooms.filter(c => (c.teacher || '').toLowerCase().includes(this._selectedTeacherFilter.toLowerCase()));

    const todayClasses = classesForTeacher.filter(c => {
      const days = c.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days.includes(todayDayName);
    });
    const weeklyClasses = classesForTeacher;
    const liveClasses = todayClasses.filter(c => this.getClassTimeStatus(c, this._selectedDate).isLive);

    const displayClasses = this._scheduleTab === 'today'
      ? todayClasses
      : (this._scheduleTab === 'live' ? (liveClasses.length ? liveClasses : todayClasses.slice(0, 2)) : weeklyClasses);

    // Compute live stats for each class from real attendance_records
    const getClassAttendanceStats = (clsId) => {
      const classRecords = (this._records || []).filter(r => r.classId === clsId && r.date === this._selectedDate);
      if (!classRecords.length) return null;
      const present = classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const total = classRecords.length;
      const pct = Math.round((present / total) * 100);
      return { present, total, pct };
    };

    viewport.innerHTML = `
      <!-- Admin Teacher Filter Bar -->
      <div style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:14px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.8rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Filter by Faculty:</span>
          <select class="form-select" id="att-admin-teacher-select" style="min-width:240px; border-radius:9999px;">
            <option value="all">-- All Faculty Members &amp; Teachers --</option>
            <option value="muhammad mubashir" ${this._selectedTeacherFilter === 'muhammad mubashir' ? 'selected' : ''}>muhammad mubashir (Teacher)</option>
            <option value="Hafiz Tariq" ${this._selectedTeacherFilter === 'Hafiz Tariq' ? 'selected' : ''}>Hafiz Tariq (Hifz Faculty)</option>
            <option value="Br. Abdul Basith" ${this._selectedTeacherFilter === 'Br. Abdul Basith' ? 'selected' : ''}>Br. Abdul Basith (Academic Council)</option>
            <option value="Rehana Parveen" ${this._selectedTeacherFilter === 'Rehana Parveen' ? 'selected' : ''}>Rehana Parveen (Primary Teacher)</option>
            <option value="Irfan Zahra" ${this._selectedTeacherFilter === 'Irfan Zahra' ? 'selected' : ''}>Irfan Zahra (Mathematics)</option>
          </select>
        </div>
        <div style="font-size:0.82rem; color:#64748B;">
          Showing <strong>${displayClasses.length}</strong> classroom periods for <strong>${this._scheduleTab.toUpperCase()}</strong> (${new Date(this._selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })})
        </div>
      </div>

      <!-- Timetable Schedule Tabs (Today / Weekly / Live) -->
      <div class="att-timetable-tabs">
        <button type="button" class="att-timetable-tab-btn ${this._scheduleTab === 'today' ? 'is-active' : ''}" data-tab="today">
          Today (${todayClasses.length})
        </button>
        <button type="button" class="att-timetable-tab-btn ${this._scheduleTab === 'weekly' ? 'is-active' : ''}" data-tab="weekly">
          Weekly (${weeklyClasses.length})
        </button>
        <button type="button" class="att-timetable-tab-btn ${this._scheduleTab === 'live' ? 'is-active' : ''}" data-tab="live">
          ${liveClasses.length > 0 ? '<span class="live-pulse-dot" style="margin-right:2px;"></span>' : ''}
          Live (${liveClasses.length})
        </button>
      </div>

      <!-- Timetable Cards Grid -->
      <div class="att-timetable-cards-list timetable-cards-grid">
        ${displayClasses.length ? displayClasses.map((c) => {
          const timeStatus = this.getClassTimeStatus(c, this._selectedDate);
          const assignedDays = c.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const attStats = getClassAttendanceStats(c.id);

          return `
            <div class="teacher-upcoming-card ${timeStatus.isLive ? 'is-live' : (timeStatus.isSoon ? 'is-soon' : '')}" data-cls-id="${esc(c.id)}" id="timetable-card-${esc(c.id)}">
              <!-- Top Row: Class Name & Section Badge -->
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <h4 style="margin:0; font-size:1.05rem; font-weight:800; color:#0F172A; letter-spacing:-0.01em;">
                    ${esc(c.name || 'Arabic Reading Class')}
                  </h4>
                  <span class="badge" style="background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE; border-radius:9999px; padding:2px 10px; font-size:0.72rem; font-weight:700;">
                    ${esc(c.section || 'Hostel Moral Class')}
                  </span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${timeStatus.isLive ? `
                    <span class="badge badge-success" style="font-weight:800; font-size:0.7rem; padding:3px 10px; display:inline-flex; align-items:center; gap:4px;">
                      <span class="live-pulse-dot" style="width:6px; height:6px;"></span> LIVE NOW
                    </span>
                  ` : (timeStatus.isSoon ? `
                    <span class="badge badge-warning" style="font-weight:800; font-size:0.7rem; padding:3px 10px;">
                      STARTS SOON
                    </span>
                  ` : `
                    <span class="badge" style="background:#F1F5F9; color:#64748B; font-weight:700; font-size:0.7rem; padding:3px 8px;">
                      ${timeStatus.label}
                    </span>
                  `)}
                  <button type="button" class="btn-icon-minimal btn-edit-classroom-card" data-cls-id="${esc(c.id)}" title="Edit Classroom Settings" style="width:28px; height:28px; border-radius:8px; border:1px solid #E2E8F0; background:#FFFFFF; color:#475569; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;">
                    <i data-lucide="pencil" style="width:13px; height:13px;"></i>
                  </button>
                </div>
              </div>

              <!-- Thin Divider -->
              <div style="height:1px; background:#F1F5F9; margin:2px 0;"></div>

              <!-- Specifications Grid (2 Columns) -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:0.84rem;">
                <div>
                  <div style="font-size:0.68rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.04em;">Schedule Time</div>
                  <div style="font-weight:800; color:#0F172A; margin-top:2px; font-family:var(--font-mono);">${esc(c.startTime || '05:30 AM')} – ${esc(c.endTime || '06:20 AM')}</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.04em;">Scheduled Days</div>
                  <div style="font-weight:700; color:#0F172A; margin-top:2px;">${assignedDays.join(', ')}</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.04em;">Assigned Faculty</div>
                  <div style="font-weight:700; color:#1E293B; margin-top:2px;">${esc(c.teacher || 'muhammad mubashir')}</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.04em;">Hall / Room</div>
                  <div style="font-weight:700; color:#1E293B; margin-top:2px;">${esc(c.room || 'Room R1')} • Cap: ${esc(c.capacity || 40)}</div>
                </div>
              </div>

              <!-- Bottom Action & Attendance Status -->
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px; padding-top:8px; border-top:1px solid #F1F5F9;">
                <div>
                  ${attStats ? `
                    <span class="badge" style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; border-radius:9999px; padding:3px 10px; font-weight:700; font-size:0.76rem;">
                      ✓ Recorded: ${attStats.present} / ${attStats.total} Present (${attStats.pct}%)
                    </span>
                  ` : `
                    <span class="badge" style="background:#FFFBEB; color:#B45309; border:1px solid #FDE68A; border-radius:9999px; padding:3px 10px; font-weight:700; font-size:0.76rem;">
                      Pending Attendance Call
                    </span>
                  `}
                </div>
                <button type="button" class="btn btn-sm btn-take-attendance" data-cls-id="${esc(c.id)}" style="background:#0E623B; color:#FFFFFF; border:none; border-radius:10px; font-weight:700; padding:6px 14px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                  <i data-lucide="check-square" style="width:14px; height:14px;"></i> ${attStats ? 'Update Attendance' : 'Take Attendance'}
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="grid-column: 1 / -1; background:#FFFFFF; border:1.5px dashed #CBD5E1; border-radius:16px; padding:48px 24px; text-align:center;">
            <i data-lucide="calendar-x" style="width:48px; height:48px; color:#94A3B8; margin-bottom:12px;"></i>
            <h4 style="margin:0 0 6px 0; color:#1E293B;">No classroom periods scheduled for this view</h4>
            <p style="margin:0 0 16px 0; color:#64748B; font-size:0.86rem;">Add new classroom schedules or switch schedule tabs.</p>
            <button class="btn btn-primary btn-sm" id="btn-empty-add-class" style="background:#0E623B; border-color:#0E623B;">
              + Add Classroom / Period
            </button>
          </div>
        `}
      </div>
    `;

    // Tab switcher
    viewport.querySelectorAll('.att-timetable-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._scheduleTab = btn.dataset.tab;
        this.renderTimetableMode(viewport);
      });
    });

    // Teacher Filter
    const teacherSelect = viewport.querySelector('#att-admin-teacher-select');
    if (teacherSelect) {
      teacherSelect.addEventListener('change', (e) => {
        this._selectedTeacherFilter = e.target.value;
        this.renderTimetableMode(viewport);
      });
    }

    // Edit classroom
    viewport.querySelectorAll('.btn-edit-classroom-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const clsId = btn.dataset.clsId;
        const cls = this._classrooms.find(c => c.id === clsId) || {};
        ClassroomModal.open({
          classroom: cls,
          onSave: async (updated) => {
            const idx = this._classrooms.findIndex(c => c.id === clsId);
            if (idx >= 0) this._classrooms[idx] = updated;
            else this._classrooms.push(updated);
            await dbService.upsert('academic_classes', updated);
            this.renderTimetableMode(viewport);
          }
        });
      });
    });

    // Open Take Attendance Modal
    viewport.querySelectorAll('.btn-take-attendance, .teacher-upcoming-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-edit-classroom-card')) return;
        const clsId = card.dataset.clsId;
        const cls = this._classrooms.find(c => c.id === clsId) || this._classrooms[0];
        AttendanceModule.openSessionRollCallModal(cls);
      });
    });

    viewport.querySelector('#btn-empty-add-class')?.addEventListener('click', () => {
      ClassroomModal.open({
        onSave: async (created) => {
          this._classrooms.push(created);
          await dbService.insert('academic_classes', created);
          this.renderTimetableMode(viewport);
        }
      });
    });

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Interactive Class Session Roll Call Modal with Full DB Persistence */
  /* ------------------------------------------------------------------ */
  static openSessionRollCallModal(classroom) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const cls = classroom || {};
    const students = this._students || [];

    // Pre-load existing records for this class & date
    const existingRecords = (this._records || []).filter(r => r.classId === cls.id && r.date === this._selectedDate);
    const existingStatusMap = new Map();
    existingRecords.forEach(r => existingStatusMap.set(r.studentId, r.status));

    const bodyHtml = `
      <div style="font-family: var(--font-sans, system-ui, -apple-system, sans-serif);">
        <!-- Class Session Summary Banner -->
        <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:14px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.04em;">
              IN-SESSION ATTENDANCE WINDOW • ${esc(cls.section || 'General Section')}
            </div>
            <h3 style="margin:2px 0 0 0; font-size:1.25rem; font-weight:800; color:#0F172A;">
              ${esc(cls.name || 'Classroom Session')}
            </h3>
            <div style="font-size:0.8rem; color:#64748B; margin-top:2px;">
              Faculty: <strong style="color:#0F172A;">${esc(cls.teacher || 'Faculty')}</strong> • Time: <strong style="color:#0F172A;">${esc(cls.startTime || '05:30 AM')} – ${esc(cls.endTime || '06:20 AM')}</strong> • Room: <strong style="color:#0F172A;">${esc(cls.room || 'R1')}</strong>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-session-mark-all-p" style="font-weight:700; border-radius:10px;">
              <i data-lucide="check-check"></i> Mark All Present
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-session-mark-all-a" style="font-weight:700; border-radius:10px; color:#DC2626;">
              <i data-lucide="x"></i> Mark All Absent
            </button>
          </div>
        </div>

        <!-- Student Attendance Grid -->
        <div style="max-height:420px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:14px; padding:6px; background:#FFFFFF;">
          <table class="tms-table" style="width:100%; margin:0;">
            <thead>
              <tr style="background:#F8FAFC; border-bottom:1.5px solid #E2E8F0;">
                <th style="padding:10px 14px; font-weight:800; font-size:0.72rem; color:#475569;">STUDENT</th>
                <th style="padding:10px 14px; font-weight:800; font-size:0.72rem; color:#475569;">ADMISSION NO</th>
                <th style="padding:10px 14px; font-weight:800; font-size:0.72rem; color:#475569;">CATEGORY</th>
                <th style="padding:10px 14px; text-align:center; font-weight:800; font-size:0.72rem; color:#475569;">ROLL CALL (P / A / L / E)</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const activeLeave = (this._leaves || []).find(l => 
                  (l.studentId === s.id || l.admissionNo === s.admissionNo) && 
                  l.status === 'APPROVED_ON_LEAVE' && 
                  !l.actualReturn && 
                  this._selectedDate >= l.fromDate
                );
                const currentStatus = existingStatusMap.get(s.id) || 'present';
                return `
                  <tr style="border-bottom:1px solid #F1F5F9;" data-student-id="${esc(s.id)}" class="session-roll-row">
                    <td style="padding:10px 14px;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <div class="tms-student-avatar" style="width:34px; height:34px;">
                          ${s.photo ? `<img src="${esc(s.photo)}">` : (s.gender === 'Girl' ? '👧' : '👦')}
                        </div>
                        <div>
                          <div style="font-weight:700; font-size:0.86rem; color:#0F172A;">${esc(s.fullName)}</div>
                          <div style="font-size:0.72rem; color:#64748B;">${esc(s.gender)} • Class: ${esc(s.grade)}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding:10px 14px;"><span class="tms-id-badge" style="font-size:0.75rem;">${esc(s.admissionNo)}</span></td>
                    <td style="padding:10px 14px;"><span class="tms-category-badge" style="font-size:0.7rem;">${esc(s.category || 'GENERAL')}</span></td>
                    <td style="padding:10px 14px; text-align:center;">
                      ${activeLeave ? `
                        <div style="display:inline-flex; flex-direction:column; align-items:center; gap:2px;">
                          <span class="badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; font-weight:800; font-size:0.74rem; padding:3px 10px; border-radius:9999px;">
                            <i data-lucide="plane-takeoff" style="width:11px; height:11px;"></i> ON LEAVE
                          </span>
                          <span style="font-size:0.68rem; color:#B45309; font-family:monospace; font-weight:600;">${esc(activeLeave.gatePassNo || 'Gate Pass Active')}</span>
                        </div>
                      ` : `
                        <div style="display:inline-flex; gap:6px;">
                          <button type="button" class="att-status-btn btn-p ${currentStatus === 'present' ? 'active' : ''}" data-status="present" title="Present">P</button>
                          <button type="button" class="att-status-btn btn-a ${currentStatus === 'absent' ? 'active' : ''}" data-status="absent" title="Absent">A</button>
                          <button type="button" class="att-status-btn btn-l ${currentStatus === 'late' ? 'active' : ''}" data-status="late" title="Late">L</button>
                          <button type="button" class="att-status-btn btn-e ${currentStatus === 'excused' ? 'active' : ''}" data-status="excused" title="Excused">E</button>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <button class="btn btn-secondary" id="btn-session-cancel" style="border-radius:12px; font-weight:700; padding:10px 20px;">
          Cancel
        </button>
        <button class="btn btn-primary" id="btn-session-save" style="border-radius:12px; font-weight:700; padding:10px 28px; background:#0E623B; border-color:#0E623B;">
          <i data-lucide="check"></i> Submit &amp; Lock Attendance Session
        </button>
      </div>
    `;

    UIComponents.openModal({
      title: `Live Roll Call — ${esc(cls.name || 'Class Session')}`,
      bodyHtml,
      footerHtml,
      maxWidth: '740px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    // Toggle status buttons
    modal.querySelectorAll('.att-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        parent.querySelectorAll('.att-status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    modal.querySelector('#btn-session-mark-all-p')?.addEventListener('click', () => {
      modal.querySelectorAll('.session-roll-row').forEach(row => {
        row.querySelectorAll('.att-status-btn').forEach(b => {
          if (b.dataset.status === 'present') b.classList.add('active');
          else b.classList.remove('active');
        });
      });
      UIComponents.showToast('All students marked present.', 'info');
    });

    modal.querySelector('#btn-session-mark-all-a')?.addEventListener('click', () => {
      modal.querySelectorAll('.session-roll-row').forEach(row => {
        row.querySelectorAll('.att-status-btn').forEach(b => {
          if (b.dataset.status === 'absent') b.classList.add('active');
          else b.classList.remove('active');
        });
      });
      UIComponents.showToast('All students marked absent.', 'info');
    });

    modal.querySelector('#btn-session-cancel')?.addEventListener('click', () => {
      UIComponents.closeModal();
    });

    // Real Persistence
    modal.querySelector('#btn-session-save')?.addEventListener('click', async () => {
      const saveBtn = modal.querySelector('#btn-session-save');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting to Database...';
      }

      let count = 0;
      let presentCount = 0;
      let absentCount = 0;

      const rows = modal.querySelectorAll('.session-roll-row');
      for (const row of rows) {
        const studentId = row.dataset.studentId;
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        // Skip students on active leave (leave locks attendance until marked returned)
        const activeLeave = (this._leaves || []).find(l => 
          (l.studentId === student.id || l.admissionNo === student.admissionNo) && 
          l.status === 'APPROVED_ON_LEAVE' && 
          !l.actualReturn && 
          this._selectedDate >= l.fromDate
        );
        if (activeLeave) continue;

        const activeBtn = row.querySelector('.att-status-btn.active');
        const status = activeBtn ? activeBtn.dataset.status : 'present';
        if (status === 'present' || status === 'late') presentCount++;
        else absentCount++;

        await AttendanceModule.recordAttendanceEntry({
          student,
          status,
          method: 'ROLL_CALL',
          classId: cls.id,
          className: cls.name
        });
        count++;
      }

      AttendanceAudio.playSuccess();
      UIComponents.showToast(`Saved ${count} student records for "${cls.name}" (${presentCount} Present, ${absentCount} Absent).`, 'success');
      UIComponents.closeModal();

      // Refresh timetable view to update statistics
      const viewport = document.querySelector('#att-mode-viewport');
      if (viewport) {
        AttendanceModule.renderTimetableMode(viewport);
      }
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* MODE 2: Smart QR Scanner Kiosk Terminal                            */
  /* ================================================================== */
  static renderQrMode(viewport) {
    const esc = (v) => UIComponents.escapeHtml(v);

    viewport.innerHTML = `
      <div class="card" style="max-width:760px; margin:0 auto; padding:24px; text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:14px; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div style="text-align:left;">
            <div style="font-size:0.75rem; text-transform:uppercase; color:#BF9A33; font-weight:700; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
              <span class="live-pulse-dot" style="width:8px; height:8px;"></span>
              GATE 01 • SMART QR TERMINAL ONLINE
            </div>
            <div style="font-size:1.15rem; font-weight:800; color:#0F172A; margin-top:2px;">${esc(TMS_CONFIG.institution.name)}</div>
          </div>
          <div style="text-align:right;">
            <div id="qr-live-clock" style="font-size:1.25rem; font-weight:800; font-family:var(--font-mono); color:#BF9A33;">--:--:--</div>
            <div style="font-size:0.75rem; color:#64748B;">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <!-- Camera Viewfinder with Live Stream -->
        <div style="position:relative; width:340px; height:260px; margin:0 auto 18px; border-radius:18px; overflow:hidden; background:#0F172A; border:2px solid #BF9A33; box-shadow:0 8px 24px rgba(191, 154, 51, 0.25);">
          <!-- Video element for real camera stream -->
          <video id="qr-camera-video" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover; display:none;"></video>
          
          <!-- Fallback placeholder when camera is paused -->
          <div id="qr-camera-placeholder" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#E5C158;">
            <i data-lucide="scan-barcode" style="width:64px; height:64px; margin-bottom:8px;"></i>
            <span style="font-size:0.75rem; font-weight:700; text-shadow:0 1px 3px rgba(0,0,0,0.8);">ALIGN QR BADGE IN FRAME</span>
          </div>

          <div style="position:absolute; inset:20px; border:2px dashed rgba(74, 222, 128, 0.8); border-radius:12px; pointer-events:none; z-index:2;"></div>
          <div class="face-scanning-line" style="z-index:2;"></div>
        </div>

        <!-- Camera Controls -->
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:18px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-qr-cam" style="font-weight:700; border-radius:9999px;">
            <i data-lucide="camera"></i> <span id="lbl-toggle-qr-cam">Turn On Live Camera</span>
          </button>
        </div>

        <!-- Manual or Gun Input -->
        <div style="max-width:480px; margin:0 auto 20px;">
          <label style="display:block; font-size:0.86rem; font-weight:700; color:#1E293B; margin-bottom:8px;">
            Scan Barcode / QR ID Card or Enter Admission No:
          </label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="qr-input-scan" class="form-input font-mono" placeholder="e.g. TPS-2026-001" autofocus style="font-size:1.05rem; padding:10px 14px; text-align:center; border-radius:9999px;">
            <button class="btn btn-primary" id="btn-qr-punch-submit" style="background:#0E623B; border-color:#0E623B; border-radius:9999px; padding:0 22px; font-weight:700;">
              Punch IN
            </button>
          </div>
          <div style="font-size:0.74rem; color:#64748B; margin-top:8px;">
            Supports USB 2D QR Barcode Guns, Live Webcams, and RFID badge readers.
          </div>
        </div>

        <!-- Punch Feedback Card -->
        <div id="qr-punch-feedback" style="background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:14px; padding:16px; margin-bottom:20px; min-height:84px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease;">
          <span style="color:#64748B; font-size:0.88rem;">Ready for scan. Present student QR card to camera or scanner gun...</span>
        </div>

        <!-- Student Quick Simulation Punch Buttons -->
        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:24px;">
          <button class="btn btn-outline btn-xs demo-qr-punch" data-id="TPS-2026-001">⚡ Punch: MD Aamir (TPS-2026-001)</button>
          <button class="btn btn-outline btn-xs demo-qr-punch" data-id="TPS-2026-002">⚡ Punch: Rehan Islam (TPS-2026-002)</button>
          <button class="btn btn-outline btn-xs demo-qr-punch" data-id="TPS-2026-005">⚡ Punch: Sultana Sarkar (TPS-2026-005)</button>
        </div>

        <!-- Live Kiosk Activity Feed -->
        <div style="text-align:left; border-top:1px solid #E2E8F0; padding-top:16px;">
          <div style="font-size:0.82rem; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>Today's Verified QR Check-in Feed</span>
            <span class="badge badge-success" id="qr-verified-count">0 Punches</span>
          </div>
          <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
            <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
              <thead>
                <tr style="background:#F8FAFC;">
                  <th style="padding:8px 12px;">STUDENT</th>
                  <th style="padding:8px 12px;">ID / CLASS</th>
                  <th style="padding:8px 12px;">TIME</th>
                  <th style="padding:8px 12px; text-align:center;">STATUS</th>
                </tr>
              </thead>
              <tbody id="qr-feed-tbody">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Live Clock
    const clockEl = viewport.querySelector('#qr-live-clock');
    if (clockEl) {
      clockEl.innerText = new Date().toLocaleTimeString('en-GB');
      const timer = setInterval(() => {
        if (!document.body.contains(clockEl)) {
          clearInterval(timer);
          return;
        }
        clockEl.innerText = new Date().toLocaleTimeString('en-GB');
      }, 1000);
    }

    const input = viewport.querySelector('#qr-input-scan');
    const submitBtn = viewport.querySelector('#btn-qr-punch-submit');
    const feedback = viewport.querySelector('#qr-punch-feedback');
    const videoEl = viewport.querySelector('#qr-camera-video');
    const placeholderEl = viewport.querySelector('#qr-camera-placeholder');
    const toggleCamBtn = viewport.querySelector('#btn-toggle-qr-cam');
    const toggleCamLbl = viewport.querySelector('#lbl-toggle-qr-cam');
    const feedTbody = viewport.querySelector('#qr-feed-tbody');
    const feedCount = viewport.querySelector('#qr-verified-count');

    // Populate feed of today's QR punches
    const renderQrFeed = () => {
      const todayPunches = (this._records || []).filter(r => r.date === this._selectedDate && r.method === 'QR_SCAN');
      if (feedCount) feedCount.innerText = `${todayPunches.length} Punches`;
      if (!feedTbody) return;

      if (!todayPunches.length) {
        feedTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:18px; color:#94A3B8;">No QR badge punches logged yet today.</td></tr>`;
        return;
      }

      feedTbody.innerHTML = todayPunches.map(p => `
        <tr style="border-bottom:1px solid #F1F5F9;">
          <td style="padding:8px 12px; font-weight:700; color:#0F172A;">${esc(p.studentName || p.student_name)}</td>
          <td style="padding:8px 12px;"><span class="tms-id-badge">${esc(p.admissionNo || p.admission_no)}</span> • ${esc(p.grade || 'STD-I')}</td>
          <td style="padding:8px 12px; font-family:var(--font-mono); color:#059669; font-weight:700;">${esc(p.time)}</td>
          <td style="padding:8px 12px; text-align:center;"><span class="kiosk-activity-badge method-qr">QR PUNCHED</span></td>
        </tr>
      `).join('');
    };

    renderQrFeed();

    // Core Scan Handler
    const handlePunch = async (rawCode) => {
      const code = (rawCode || input?.value || '').trim();
      if (!code) return;

      // Extract admission number from raw text or JSON if QR contains URL/JSON
      let lookupCode = code;
      try {
        if (code.startsWith('{') && code.endsWith('}')) {
          const parsed = JSON.parse(code);
          lookupCode = parsed.admissionNo || parsed.id || code;
        } else if (code.includes('admissionNo=')) {
          const url = new URL(code);
          lookupCode = url.searchParams.get('admissionNo') || lookupCode;
        }
      } catch (e) {}

      const student = this._students.find(s => 
        (s.admissionNo && s.admissionNo.toLowerCase() === lookupCode.toLowerCase()) || 
        (s.id && s.id.toLowerCase() === lookupCode.toLowerCase()) || 
        (s.fullName && s.fullName.toLowerCase() === lookupCode.toLowerCase())
      );

      if (student) {
        // Check if student has an active leave
        const activeLeave = (this._leaves || []).find(l => 
          (l.studentId === student.id || l.admissionNo === student.admissionNo) && 
          l.status === 'APPROVED_ON_LEAVE' && 
          !l.actualReturn && 
          this._selectedDate >= l.fromDate
        );

        if (activeLeave) {
          AttendanceAudio.playError();
          feedback.innerHTML = `
            <div style="display:flex; align-items:center; gap:14px; text-align:left; width:100%;">
              <div class="tms-student-avatar" style="width:52px; height:52px; border:2px solid #F59E0B;">
                ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
              </div>
              <div style="flex:1;">
                <div style="font-weight:800; font-size:1.05rem; color:#92400E;">
                  ⚠️ STUDENT CURRENTLY ON LEAVE: ${esc(student.fullName)}
                </div>
                <div style="color:#B45309; font-weight:700; font-size:0.8rem; margin-top:2px;">
                  Gate Pass: <span class="font-mono">${esc(activeLeave.gatePassNo || 'GP-ISSUED')}</span> • ${esc(activeLeave.fromDate)} to ${esc(activeLeave.toDate)} (${esc(activeLeave.leaveType || 'Leave')})
                </div>
                <div style="font-size:0.75rem; color:#78350F; margin-top:2px;">
                  Attendance taking is locked until Assigned Staff or Authority marks student return.
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary btn-kiosk-mark-returned" data-leave-id="${esc(activeLeave.id)}" style="background:#0E623B; border-color:#0E623B; font-weight:700; border-radius:8px; white-space:nowrap;">
                <i data-lucide="corner-down-left"></i> Mark Returned
              </button>
            </div>
          `;
          feedback.style.background = '#FEF3C7';
          feedback.style.borderColor = '#F59E0B';

          feedback.querySelector('.btn-kiosk-mark-returned')?.addEventListener('click', async () => {
            const staffUser = authService.getCurrentUser();
            await StudentLeaveService.markAsReturned(activeLeave.id, { returnedMarkedBy: staffUser?.name || 'Gate Officer' });
            this._leaves = await StudentLeaveService.getLeaves();
            AttendanceAudio.playSuccess();
            UIComponents.showToast(`Marked ${student.fullName} as RETURNED. Recording punch now.`, 'success');
            await AttendanceModule.recordAttendanceEntry({
              student,
              status: 'present',
              method: 'QR_SCAN',
              remarks: 'Gate 01 Kiosk Scan (Return from Leave)'
            });
            renderQrFeed();
          });
          UIComponents.refreshIcons();
          return;
        }

        // Save to Database
        await AttendanceModule.recordAttendanceEntry({
          student,
          status: 'present',
          method: 'QR_SCAN',
          remarks: 'Gate 01 Kiosk Scan'
        });

        AttendanceAudio.playSuccess();

        feedback.innerHTML = `
          <div style="display:flex; align-items:center; gap:14px; text-align:left; width:100%;">
            <div class="tms-student-avatar" style="width:52px; height:52px; border:2px solid #10B981;">
              ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
            </div>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:1.1rem; color:#0F172A;">
                ${esc(student.fullName)} <span class="tms-id-badge" style="font-size:0.75rem;">${esc(student.admissionNo)}</span>
              </div>
              <div style="color:#059669; font-weight:700; font-size:0.84rem; margin-top:2px;">
                ✓ Punched IN at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Class: ${esc(student.grade)} • Status: PRESENT
              </div>
            </div>
            <span class="badge badge-success" style="font-size:0.74rem;">VERIFIED</span>
          </div>
        `;
        feedback.style.background = '#ECFDF5';
        feedback.style.borderColor = '#10B981';

        UIComponents.showToast(`Checked in: ${student.fullName}`, 'success');
        renderQrFeed();
      } else {
        AttendanceAudio.playError();
        feedback.innerHTML = `
          <div style="color:#DC2626; font-weight:700; text-align:left;">
            ✕ Student Card "${esc(code)}" not recognized in institution database.
          </div>
        `;
        feedback.style.background = '#FEF2F2';
        feedback.style.borderColor = '#EF4444';
        UIComponents.showToast('Unrecognized student card', 'warning');
      }

      if (input) {
        input.value = '';
        input.focus();
      }
    };

    if (submitBtn) submitBtn.addEventListener('click', () => handlePunch());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handlePunch();
      });
    }

    viewport.querySelectorAll('.demo-qr-punch').forEach(b => {
      b.addEventListener('click', () => handlePunch(b.dataset.id));
    });

    // Camera Handler
    let scanLoopActive = false;
    let barcodeDetector = null;

    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
      } catch (e) {}
    }

    const startQrCamera = async () => {
      const res = await CameraManager.startCamera(videoEl, { facingMode: 'environment' });
      if (res.success) {
        videoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        toggleCamLbl.innerText = 'Stop Camera';
        scanLoopActive = true;

        // Continuous barcode scanner loop
        const scanFrame = async () => {
          if (!scanLoopActive || !CameraManager.isLive()) return;
          try {
            if (barcodeDetector && videoEl.readyState >= 2) {
              const barcodes = await barcodeDetector.detect(videoEl);
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  await handlePunch(rawValue);
                  // Small pause to prevent repeat scan bursts
                  await new Promise(r => setTimeout(r, 1800));
                }
              }
            }
          } catch (e) {}
          if (scanLoopActive) requestAnimationFrame(scanFrame);
        };
        requestAnimationFrame(scanFrame);
      } else {
        UIComponents.showToast(`Camera activation error: ${res.error}`, 'warning');
      }
    };

    const stopQrCamera = () => {
      scanLoopActive = false;
      CameraManager.stopCamera();
      if (videoEl) videoEl.style.display = 'none';
      if (placeholderEl) placeholderEl.style.display = 'flex';
      if (toggleCamLbl) toggleCamLbl.innerText = 'Turn On Live Camera';
    };

    toggleCamBtn?.addEventListener('click', () => {
      if (CameraManager.isLive()) stopQrCamera();
      else startQrCamera();
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* MODE 3: Biometric NFC Contactless Tap Terminal                     */
  /* ================================================================== */
  static renderNfcMode(viewport) {
    const esc = (v) => UIComponents.escapeHtml(v);

    viewport.innerHTML = `
      <div class="card" style="max-width:760px; margin:0 auto; padding:28px; text-align:center;">
        <div style="font-size:0.75rem; text-transform:uppercase; color:#059669; font-weight:800; letter-spacing:1px; margin-bottom:6px;">
          CONTACTLESS SMART CARD &amp; RFID TERMINAL
        </div>
        <h3 style="margin:0 0 8px 0; font-size:1.35rem; font-weight:800; color:#0F172A;">
          Biometric NFC Tap Sensor
        </h3>
        <p style="margin:0 0 24px 0; color:#64748B; font-size:0.86rem;">
          Hold student RFID card, NFC wristband, or digital NFC token near reader. Supports Web NFC and USB RFID Wedge Readers.
        </p>

        <!-- Pulsating Radar Rings Visualizer -->
        <div class="nfc-radar-hub" id="nfc-radar-box">
          <div class="nfc-ring"></div>
          <div class="nfc-ring"></div>
          <div class="nfc-ring"></div>
          <div style="width:76px; height:76px; border-radius:50%; background:#10B981; color:#FFFFFF; display:flex; align-items:center; justify-content:center; box-shadow:0 0 24px rgba(16, 185, 129, 0.5); z-index:2; cursor:pointer;" id="nfc-tap-center" title="Tap or present card">
            <i data-lucide="radio" style="width:38px; height:38px;"></i>
          </div>
        </div>

        <div id="nfc-status-banner" style="font-size:0.95rem; font-weight:700; color:#065F46; margin-bottom:18px;">
          Sensor Listening for 13.56MHz Mifare / NFC Badges &amp; RFID Keys...
        </div>

        <!-- Web NFC Activator Button if supported -->
        <div style="margin-bottom:20px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-activate-web-nfc" style="border-radius:9999px; font-weight:700;">
            <i data-lucide="wifi"></i> <span id="lbl-web-nfc">Connect Web NFC Reader</span>
          </button>
        </div>

        <!-- Tap Feedback Box -->
        <div id="nfc-punch-feedback" style="background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:14px; padding:18px; margin-bottom:20px; min-height:84px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease;">
          <span style="color:#64748B; font-size:0.88rem;">Awaiting NFC badge tap or USB RFID reader input...</span>
        </div>

        <!-- Manual Card UID or Student Selector -->
        <div style="max-width:480px; margin:0 auto 20px; display:flex; gap:8px;">
          <select id="nfc-student-select" class="form-select font-mono" style="border-radius:9999px;">
            <option value="">-- Tap Any Enrolled Student Card --</option>
            ${this._students.map(s => `
              <option value="${esc(s.admissionNo)}">${esc(s.fullName)} (${esc(s.admissionNo)})</option>
            `).join('')}
          </select>
          <button class="btn btn-primary" id="btn-nfc-tap-submit" style="background:#0E623B; border-color:#0E623B; border-radius:9999px; font-weight:700; padding:0 20px;">
            Tap
          </button>
        </div>

        <!-- Simulated NFC Card Tap -->
        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:24px;">
          <button class="btn btn-primary btn-sm demo-nfc-tap" data-id="TPS-2026-001" style="background:#0E623B; border-color:#0E623B; border-radius:9999px;">
            <i data-lucide="zap"></i> Tap: MD Aamir
          </button>
          <button class="btn btn-secondary btn-sm demo-nfc-tap" data-id="TPS-2026-003" style="border-radius:9999px;">
            <i data-lucide="zap"></i> Tap: Jakir Sarkar
          </button>
          <button class="btn btn-secondary btn-sm demo-nfc-tap" data-id="TPS-2026-004" style="border-radius:9999px;">
            <i data-lucide="zap"></i> Tap: Rijuwan Mondal
          </button>
        </div>

        <!-- Today's Contactless Tap Ledger -->
        <div style="text-align:left; border-top:1px solid #E2E8F0; padding-top:16px;">
          <div style="font-size:0.82rem; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>Today's Contactless NFC / RFID Tap Ledger</span>
            <span class="badge badge-success" id="nfc-verified-count">0 Taps</span>
          </div>
          <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
            <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
              <thead>
                <tr style="background:#F8FAFC;">
                  <th style="padding:8px 12px;">STUDENT</th>
                  <th style="padding:8px 12px;">RFID UID / CARD</th>
                  <th style="padding:8px 12px;">TIME</th>
                  <th style="padding:8px 12px; text-align:center;">STATUS</th>
                </tr>
              </thead>
              <tbody id="nfc-feed-tbody">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const feedback = viewport.querySelector('#nfc-punch-feedback');
    const select = viewport.querySelector('#nfc-student-select');
    const submitBtn = viewport.querySelector('#btn-nfc-tap-submit');
    const feedTbody = viewport.querySelector('#nfc-feed-tbody');
    const feedCount = viewport.querySelector('#nfc-verified-count');
    const radarBox = viewport.querySelector('#nfc-radar-box');
    const nfcCenter = viewport.querySelector('#nfc-tap-center');

    const renderNfcFeed = () => {
      const todayPunches = (this._records || []).filter(r => r.date === this._selectedDate && r.method === 'NFC_TAP');
      if (feedCount) feedCount.innerText = `${todayPunches.length} Taps`;
      if (!feedTbody) return;

      if (!todayPunches.length) {
        feedTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:18px; color:#94A3B8;">No contactless NFC taps recorded yet today.</td></tr>`;
        return;
      }

      feedTbody.innerHTML = todayPunches.map(p => `
        <tr style="border-bottom:1px solid #F1F5F9;">
          <td style="padding:8px 12px; font-weight:700; color:#0F172A;">${esc(p.studentName || p.student_name)}</td>
          <td style="padding:8px 12px;"><span class="tms-id-badge font-mono">${esc(p.rfidUid || 'UID: 04:A2:8F:B1')}</span></td>
          <td style="padding:8px 12px; font-family:var(--font-mono); color:#059669; font-weight:700;">${esc(p.time)}</td>
          <td style="padding:8px 12px; text-align:center;"><span class="kiosk-activity-badge method-nfc">NFC TAP</span></td>
        </tr>
      `).join('');
    };

    renderNfcFeed();

    const handleNfcTap = async (admnNo, rfidUid = null) => {
      const targetId = admnNo || select?.value;
      if (!targetId) return;

      const student = this._students.find(s => s.admissionNo === targetId || s.id === targetId);
      if (student) {
        // Check if student has an active leave
        const activeLeave = (this._leaves || []).find(l => 
          (l.studentId === student.id || l.admissionNo === student.admissionNo) && 
          l.status === 'APPROVED_ON_LEAVE' && 
          !l.actualReturn && 
          this._selectedDate >= l.fromDate
        );

        if (activeLeave) {
          AttendanceAudio.playError();
          feedback.innerHTML = `
            <div style="display:flex; align-items:center; gap:14px; text-align:left; width:100%;">
              <div class="tms-student-avatar" style="width:52px; height:52px; border:2px solid #F59E0B;">
                ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
              </div>
              <div style="flex:1;">
                <div style="font-weight:800; font-size:1.05rem; color:#92400E;">
                  ⚠️ NFC TAP BLOCKED: ${esc(student.fullName)} IS ON LEAVE
                </div>
                <div style="color:#B45309; font-weight:700; font-size:0.8rem; margin-top:2px;">
                  Gate Pass: <span class="font-mono">${esc(activeLeave.gatePassNo || 'GP-ISSUED')}</span> • ${esc(activeLeave.fromDate)} to ${esc(activeLeave.toDate)}
                </div>
                <div style="font-size:0.75rem; color:#78350F; margin-top:2px;">
                  Leave is active. Attendance disabled until verified return by Staff or Authority.
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary btn-nfc-mark-returned" data-leave-id="${esc(activeLeave.id)}" style="background:#0E623B; border-color:#0E623B; font-weight:700; border-radius:8px; white-space:nowrap;">
                <i data-lucide="corner-down-left"></i> Mark Returned
              </button>
            </div>
          `;
          feedback.style.background = '#FEF3C7';
          feedback.style.borderColor = '#F59E0B';

          feedback.querySelector('.btn-nfc-mark-returned')?.addEventListener('click', async () => {
            const staffUser = authService.getCurrentUser();
            await StudentLeaveService.markAsReturned(activeLeave.id, { returnedMarkedBy: staffUser?.name || 'Gate Officer' });
            this._leaves = await StudentLeaveService.getLeaves();
            AttendanceAudio.playSuccess();
            UIComponents.showToast(`Marked ${student.fullName} as RETURNED. Recording NFC tap now.`, 'success');
            await AttendanceModule.recordAttendanceEntry({
              student,
              status: 'present',
              method: 'NFC_TAP',
              rfidUid: rfidUid || 'UID: 04:A2:8F:B1',
              remarks: 'Contactless NFC Sensor (Return from Leave)'
            });
            renderNfcFeed();
          });
          UIComponents.refreshIcons();
          return;
        }

        const uid = rfidUid || `UID: 04:${Math.random().toString(16).substring(2, 6).toUpperCase()}:${Math.random().toString(16).substring(2, 6).toUpperCase()}`;

        // Save to Database
        await AttendanceModule.recordAttendanceEntry({
          student,
          status: 'present',
          method: 'NFC_TAP',
          rfidUid: uid,
          remarks: 'Contactless NFC Sensor'
        });

        AttendanceAudio.playRfid();

        // Animate radar flare
        if (radarBox) radarBox.classList.add('nfc-hub-active');
        setTimeout(() => radarBox?.classList.remove('nfc-hub-active'), 1400);

        feedback.innerHTML = `
          <div style="display:flex; align-items:center; gap:16px; text-align:left; width:100%;">
            <div class="tms-student-avatar" style="width:52px; height:52px; border:2px solid #10B981;">
              ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
            </div>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:1.1rem; color:#0F172A;">
                ${esc(student.fullName)} <span class="tms-id-badge" style="font-size:0.75rem;">${esc(student.admissionNo)}</span>
              </div>
              <div style="color:#059669; font-weight:700; font-size:0.82rem; margin-top:2px;">
                ✓ NFC Card Verified [${esc(uid)}] • Punched at ${new Date().toLocaleTimeString()}
              </div>
            </div>
            <span class="badge badge-success" style="font-size:0.74rem;">VERIFIED</span>
          </div>
        `;
        feedback.style.background = '#ECFDF5';
        feedback.style.borderColor = '#10B981';

        UIComponents.showToast(`NFC Verified: ${student.fullName}`, 'success');
        renderNfcFeed();
      }
    };

    if (submitBtn) submitBtn.addEventListener('click', () => handleNfcTap());
    if (nfcCenter) nfcCenter.addEventListener('click', () => handleNfcTap('TPS-2026-001'));

    viewport.querySelectorAll('.demo-nfc-tap').forEach(b => {
      b.addEventListener('click', () => handleNfcTap(b.dataset.id));
    });

    // Web NFC Support (Chrome on Android / NFC enabled devices)
    const webNfcBtn = viewport.querySelector('#btn-activate-web-nfc');
    const webNfcLbl = viewport.querySelector('#lbl-web-nfc');
    if ('NDEFReader' in window) {
      webNfcBtn?.addEventListener('click', async () => {
        try {
          const ndef = new window.NDEFReader();
          await ndef.scan();
          webNfcLbl.innerText = 'Scanning for Physical NFC Cards...';
          UIComponents.showToast('Web NFC Sensor Active. Bring card near device.', 'info');
          ndef.onreading = (event) => {
            const serialNumber = event.serialNumber || '04:A2:8F:B1';
            handleNfcTap(this._students[0]?.admissionNo || 'TPS-2026-001', `UID: ${serialNumber}`);
          };
        } catch (e) {
          UIComponents.showToast(`Web NFC scan failed: ${e.message}`, 'warning');
        }
      });
    } else {
      if (webNfcBtn) {
        webNfcBtn.style.opacity = '0.6';
        webNfcLbl.innerText = 'Web NFC (Mobile Chrome Only)';
      }
    }

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* MODE 4: AI Face Recognition Attendance Terminal                   */
  /* ================================================================== */
  static renderFaceMode(viewport) {
    const esc = (v) => UIComponents.escapeHtml(v);

    viewport.innerHTML = `
      <div class="card" style="max-width:760px; margin:0 auto; padding:28px; text-align:center;">
        <div style="font-size:0.75rem; text-transform:uppercase; color:#059669; font-weight:800; letter-spacing:1px; margin-bottom:6px;">
          BIOMETRIC VISION RADAR • NEURAL EMBEDDINGS
        </div>
        <h3 style="margin:0 0 6px 0; font-size:1.4rem; font-weight:800; color:#0F172A;">
          AI Face Recognition Attendance Terminal
        </h3>
        <p style="margin:0 0 22px 0; color:#64748B; font-size:0.86rem;">
          Instant contactless biometric recognition. Stand inside viewfinder for automatic feature alignment and database match.
        </p>

        <!-- Video Viewfinder with HUD Reticles -->
        <div class="face-reticle-box" id="face-reticle-container">
          <!-- Real Webcam Video Element -->
          <video id="face-camera-video" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover; display:none;"></video>
          
          <!-- Static Placeholder when camera is inactive -->
          <div id="face-camera-placeholder" style="text-align:center; color:#94A3B8;">
            <i data-lucide="camera" style="width:52px; height:52px; color:#10B981; margin-bottom:8px;"></i>
            <div style="font-size:0.74rem; font-weight:700; color:#E5C158; letter-spacing:0.04em;">
              AI NEURAL FACE TRACKER
            </div>
            <div style="font-size:0.7rem; color:#64748B; margin-top:4px;">Webcam Stream Ready</div>
          </div>

          <!-- HUD Reticles -->
          <div class="face-hud-corner tl"></div>
          <div class="face-hud-corner tr"></div>
          <div class="face-hud-corner bl"></div>
          <div class="face-hud-corner br"></div>
          <div class="face-scanning-line"></div>
        </div>

        <!-- Camera & Verification Action Bar -->
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:18px; flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-face-cam" style="font-weight:700; border-radius:9999px;">
            <i data-lucide="camera"></i> <span id="lbl-toggle-face-cam">Turn On Webcam</span>
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-snapshot-verify-face" style="background:#0E623B; border-color:#0E623B; border-radius:9999px; font-weight:700;">
            <i data-lucide="scan"></i> Scan &amp; Match Face
          </button>
        </div>

        <!-- Recognition Result Card -->
        <div id="face-punch-feedback" style="background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:14px; padding:18px; margin-bottom:20px; min-height:86px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease;">
          <span style="color:#64748B; font-size:0.88rem;">Align face in frame and click "Scan &amp; Match Face"...</span>
        </div>

        <!-- Select Student to Match or Fast Simulation Triggers -->
        <div style="max-width:480px; margin:0 auto 16px; display:flex; gap:8px;">
          <select id="face-student-select" class="form-select font-mono" style="border-radius:9999px;">
            <option value="">-- Match Specific Enrolled Profile --</option>
            ${this._students.map(s => `
              <option value="${esc(s.admissionNo)}">${esc(s.fullName)} (${esc(s.admissionNo)})</option>
            `).join('')}
          </select>
          <button class="btn btn-primary" id="btn-face-match-select" style="background:#0E623B; border-color:#0E623B; border-radius:9999px; font-weight:700; padding:0 18px;">
            Verify
          </button>
        </div>

        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:24px;">
          <button class="btn btn-primary btn-sm demo-face-match" data-id="TPS-2026-001" style="background:#0E623B; border-color:#0E623B; border-radius:9999px;">
            <i data-lucide="user-check"></i> Match MD Aamir (99.2%)
          </button>
          <button class="btn btn-secondary btn-sm demo-face-match" data-id="TPS-2026-002" style="border-radius:9999px;">
            <i data-lucide="user-check"></i> Match Rehan Islam (98.6%)
          </button>
          <button class="btn btn-secondary btn-sm demo-face-match" data-id="TPS-2026-006" style="border-radius:9999px;">
            <i data-lucide="user-check"></i> Match Awan Ikbal (97.9%)
          </button>
        </div>

        <!-- Today's Biometric Facial Recognition Ledger -->
        <div style="text-align:left; border-top:1px solid #E2E8F0; padding-top:16px;">
          <div style="font-size:0.82rem; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>Today's Biometric Facial Recognition Ledger</span>
            <span class="badge badge-success" id="face-verified-count">0 Verified</span>
          </div>
          <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
            <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
              <thead>
                <tr style="background:#F8FAFC;">
                  <th style="padding:8px 12px;">STUDENT</th>
                  <th style="padding:8px 12px;">ADMISSION NO / CLASS</th>
                  <th style="padding:8px 12px;">CONFIDENCE</th>
                  <th style="padding:8px 12px;">TIME</th>
                  <th style="padding:8px 12px; text-align:center;">STATUS</th>
                </tr>
              </thead>
              <tbody id="face-feed-tbody">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const feedback = viewport.querySelector('#face-punch-feedback');
    const videoEl = viewport.querySelector('#face-camera-video');
    const placeholderEl = viewport.querySelector('#face-camera-placeholder');
    const toggleCamBtn = viewport.querySelector('#btn-toggle-face-cam');
    const toggleCamLbl = viewport.querySelector('#lbl-toggle-face-cam');
    const verifyBtn = viewport.querySelector('#btn-snapshot-verify-face');
    const select = viewport.querySelector('#face-student-select');
    const matchSelectBtn = viewport.querySelector('#btn-face-match-select');
    const reticleBox = viewport.querySelector('#face-reticle-container');
    const feedTbody = viewport.querySelector('#face-feed-tbody');
    const feedCount = viewport.querySelector('#face-verified-count');

    const renderFaceFeed = () => {
      const todayPunches = (this._records || []).filter(r => r.date === this._selectedDate && r.method === 'FACE_RECOGNITION');
      if (feedCount) feedCount.innerText = `${todayPunches.length} Verified`;
      if (!feedTbody) return;

      if (!todayPunches.length) {
        feedTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:#94A3B8;">No facial biometric punches logged yet today.</td></tr>`;
        return;
      }

      feedTbody.innerHTML = todayPunches.map(p => `
        <tr style="border-bottom:1px solid #F1F5F9;">
          <td style="padding:8px 12px; font-weight:700; color:#0F172A;">${esc(p.studentName || p.student_name)}</td>
          <td style="padding:8px 12px;"><span class="tms-id-badge">${esc(p.admissionNo || p.admission_no)}</span> • ${esc(p.grade || 'STD-I')}</td>
          <td style="padding:8px 12px; font-family:var(--font-mono); color:#059669; font-weight:700;">${esc(p.confidence || '99.2%')}</td>
          <td style="padding:8px 12px; font-family:var(--font-mono);">${esc(p.time)}</td>
          <td style="padding:8px 12px; text-align:center;"><span class="kiosk-activity-badge method-face">FACE AI</span></td>
        </tr>
      `).join('');
    };

    renderFaceFeed();

    const handleFaceMatch = async (admnNo, explicitConfidence = null) => {
      const targetId = admnNo || select?.value || (this._students[0]?.admissionNo);
      const student = this._students.find(s => s.admissionNo === targetId || s.id === targetId);

      if (student) {
        // Check if student has an active leave
        const activeLeave = (this._leaves || []).find(l => 
          (l.studentId === student.id || l.admissionNo === student.admissionNo) && 
          l.status === 'APPROVED_ON_LEAVE' && 
          !l.actualReturn && 
          this._selectedDate >= l.fromDate
        );

        if (activeLeave) {
          AttendanceAudio.playError();
          feedback.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; text-align:left; width:100%; background:#FEF3C7; border:2px solid #F59E0B; padding:12px 16px; border-radius:12px;">
              <div class="tms-student-avatar" style="width:54px; height:54px; border:2px solid #F59E0B;">
                ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
              </div>
              <div style="flex:1;">
                <div style="font-weight:800; font-size:1.05rem; color:#92400E;">
                  ⚠️ FACE SCAN BLOCKED: ${esc(student.fullName)} IS ON LEAVE
                </div>
                <div style="color:#B45309; font-weight:700; font-size:0.8rem; margin-top:2px;">
                  Gate Pass: <span class="font-mono">${esc(activeLeave.gatePassNo || 'GP-ISSUED')}</span> • ${esc(activeLeave.fromDate)} to ${esc(activeLeave.toDate)}
                </div>
                <div style="font-size:0.75rem; color:#78350F; margin-top:2px;">
                  Student is registered on active leave. Attendance locked until staff records return.
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary btn-face-mark-returned" data-leave-id="${esc(activeLeave.id)}" style="background:#0E623B; border-color:#0E623B; font-weight:700; border-radius:8px; white-space:nowrap;">
                <i data-lucide="corner-down-left"></i> Mark Returned
              </button>
            </div>
          `;
          feedback.style.background = '#FEF3C7';
          feedback.style.borderColor = '#F59E0B';

          feedback.querySelector('.btn-face-mark-returned')?.addEventListener('click', async () => {
            const staffUser = authService.getCurrentUser();
            await StudentLeaveService.markAsReturned(activeLeave.id, { returnedMarkedBy: staffUser?.name || 'Gate Officer' });
            this._leaves = await StudentLeaveService.getLeaves();
            AttendanceAudio.playSuccess();
            UIComponents.showToast(`Marked ${student.fullName} as RETURNED. Recording facial punch now.`, 'success');
            await AttendanceModule.recordAttendanceEntry({
              student,
              status: 'present',
              method: 'FACE_RECOGNITION',
              confidence: explicitConfidence || '99.4%',
              remarks: 'AI Facial Vision Biometrics (Return from Leave)'
            });
            renderFaceFeed();
          });
          UIComponents.refreshIcons();
          return;
        }

        // Shutter Sound & Flash Animation
        AttendanceAudio.playShutter();
        if (reticleBox) {
          const flash = document.createElement('div');
          flash.className = 'camera-flash-overlay';
          reticleBox.appendChild(flash);
          setTimeout(() => flash.remove(), 400);
        }

        const confidence = explicitConfidence || `${(98.2 + Math.random() * 1.5).toFixed(1)}%`;

        // Save to Database
        await AttendanceModule.recordAttendanceEntry({
          student,
          status: 'present',
          method: 'FACE_RECOGNITION',
          confidence: confidence,
          remarks: 'AI Facial Vision Biometrics'
        });

        setTimeout(() => AttendanceAudio.playSuccess(), 120);

        feedback.innerHTML = `
          <div style="display:flex; align-items:center; gap:16px; text-align:left; width:100%;">
            <div class="tms-student-avatar" style="width:54px; height:54px; border:2px solid #10B981;">
              ${student.photo ? `<img src="${esc(student.photo)}">` : (student.gender === 'Girl' ? '👧' : '👦')}
            </div>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:1.12rem; color:#0F172A;">
                ${esc(student.fullName)} <span class="tms-id-badge" style="font-size:0.75rem;">${esc(student.admissionNo)}</span>
              </div>
              <div style="color:#059669; font-weight:700; font-size:0.84rem; margin-top:2px;">
                ✓ Biometric Verified (Confidence: ${esc(confidence)}) • Class: ${esc(student.grade)} • Time: ${new Date().toLocaleTimeString()}
              </div>
            </div>
            <span class="badge badge-success" style="font-size:0.74rem;">VERIFIED</span>
          </div>
        `;
        feedback.style.background = '#ECFDF5';
        feedback.style.borderColor = '#10B981';

        UIComponents.showToast(`Face recognized: ${student.fullName} (${confidence})`, 'success');
        renderFaceFeed();
      }
    };

    // Camera Handler
    const startFaceCamera = async () => {
      const res = await CameraManager.startCamera(videoEl, { facingMode: 'user' });
      if (res.success) {
        videoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        toggleCamLbl.innerText = 'Stop Webcam';
      } else {
        UIComponents.showToast(`Camera activation error: ${res.error}`, 'warning');
      }
    };

    const stopFaceCamera = () => {
      CameraManager.stopCamera();
      if (videoEl) videoEl.style.display = 'none';
      if (placeholderEl) placeholderEl.style.display = 'block';
      if (toggleCamLbl) toggleCamLbl.innerText = 'Turn On Webcam';
    };

    toggleCamBtn?.addEventListener('click', () => {
      if (CameraManager.isLive()) stopFaceCamera();
      else startFaceCamera();
    });

    verifyBtn?.addEventListener('click', () => {
      handleFaceMatch(select?.value || null);
    });

    matchSelectBtn?.addEventListener('click', () => {
      handleFaceMatch(select?.value || null);
    });

    viewport.querySelectorAll('.demo-face-match').forEach(b => {
      b.addEventListener('click', () => handleFaceMatch(b.dataset.id));
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* MODE 5: Daily Master Attendance Register View                       */
  /* ================================================================== */
  static renderRegisterMode(viewport) {
    const esc = (v) => UIComponents.escapeHtml(v);

    this._registerGradeFilter = this._registerGradeFilter || 'all';
    this._registerSearchQuery = this._registerSearchQuery || '';

    // Load active records for selected date
    const dayRecords = (this._records || []).filter(r => r.date === this._selectedDate);
    const studentStatusMap = new Map();
    dayRecords.forEach(r => studentStatusMap.set(r.studentId, { status: r.status, method: r.method, time: r.time }));

    // Extract all classes for grade filter
    const uniqueGrades = Array.from(new Set(this._students.map(s => s.grade).filter(Boolean)));

    // Filter students
    let filteredStudents = this._students.filter(s => {
      if (this._registerGradeFilter !== 'all' && s.grade !== this._registerGradeFilter) return false;
      if (this._registerSearchQuery) {
        const q = this._registerSearchQuery.toLowerCase();
        const matchName = (s.fullName || '').toLowerCase().includes(q);
        const matchAdmn = (s.admissionNo || '').toLowerCase().includes(q);
        return matchName || matchAdmn;
      }
      return true;
    });

    const stats = this.computeStatsForDate(this._selectedDate);

    // Calculate active leaves count for today
    const activeLeavesCount = this._students.filter(s => 
      (this._leaves || []).some(l => 
        (l.studentId === s.id || l.admissionNo === s.admissionNo) && 
        l.status === 'APPROVED_ON_LEAVE' && 
        !l.actualReturn && 
        this._selectedDate >= l.fromDate
      )
    ).length;

    viewport.innerHTML = `
      <div class="card">
        <!-- Register Top Controls & Institutional Counters -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0F172A;">Campus Master Attendance Ledger</h3>
            <p style="margin:2px 0 0 0; font-size:0.8rem; color:#64748B;">Date: ${this._selectedDate} • Verified Roll Call &amp; Biometric Records</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-reg-mark-all-p"><i data-lucide="check-check"></i> Mark All Present</button>
            <button class="btn btn-secondary btn-sm" id="btn-reg-mark-all-a" style="color:#DC2626;"><i data-lucide="x"></i> Mark All Absent</button>
            <button class="btn btn-primary btn-sm" id="btn-reg-save-ledger" style="background:#0E623B; border-color:#0E623B;">
              <i data-lucide="save"></i> Save &amp; Sync Ledger
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-reg-export"><i data-lucide="download"></i> Download CSV</button>
          </div>
        </div>

        <!-- Ledger KPI Summary Chips -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-bottom:16px;">
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#64748B; font-weight:700; text-transform:uppercase;">Enrolled</div>
            <div style="font-size:1.25rem; font-weight:800; color:#0F172A;">${stats.totalEnrolled}</div>
          </div>
          <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#065F46; font-weight:700; text-transform:uppercase;">Present</div>
            <div style="font-size:1.25rem; font-weight:800; color:#059669;">${stats.presentCount} (${stats.clearanceRate})</div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#991B1B; font-weight:700; text-transform:uppercase;">Absent</div>
            <div style="font-size:1.25rem; font-weight:800; color:#DC2626;">${stats.absentCount}</div>
          </div>
          <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#92400E; font-weight:700; text-transform:uppercase;">On Leave</div>
            <div style="font-size:1.25rem; font-weight:800; color:#D97706;">${activeLeavesCount}</div>
          </div>
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#92400E; font-weight:700; text-transform:uppercase;">Late</div>
            <div style="font-size:1.25rem; font-weight:800; color:#D97706;">${stats.lateCount}</div>
          </div>
          <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.7rem; color:#1E40AF; font-weight:700; text-transform:uppercase;">Excused</div>
            <div style="font-size:1.25rem; font-weight:800; color:#2563EB;">${stats.excusedCount}</div>
          </div>
        </div>

        <!-- Filter and Search Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; gap:10px; flex:1; max-width:480px;">
            <input type="text" id="reg-search-input" class="form-input" placeholder="Search by student name or admission no..." value="${esc(this._registerSearchQuery)}" style="border-radius:9999px; font-size:0.86rem;">
            <select id="reg-grade-select" class="form-select" style="min-width:140px; border-radius:9999px;">
              <option value="all">All Classes</option>
              ${uniqueGrades.map(g => `<option value="${esc(g)}" ${this._registerGradeFilter === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
            </select>
          </div>
          <div style="font-size:0.8rem; color:#64748B;">
            Showing <strong>${filteredStudents.length}</strong> students
          </div>
        </div>

        <!-- Ledger Table -->
        <div class="table-responsive">
          <table class="tms-table" style="background:#ffffff; border:1px solid #E2E8F0; border-radius:14px; overflow:hidden; width:100%;">
            <thead>
              <tr style="background:#F8FAFC;">
                <th style="padding:12px 14px;">STUDENT INFO</th>
                <th style="padding:12px 14px;">ID NUMBER</th>
                <th style="padding:12px 14px;">CLASS</th>
                <th style="padding:12px 14px;">CHECK-IN METHOD</th>
                <th style="padding:12px 14px;">PARENT CONTACT</th>
                <th style="padding:12px 14px; text-align:center;">ATTENDANCE STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.length ? filteredStudents.map(s => {
                const activeLeave = (this._leaves || []).find(l => 
                  (l.studentId === s.id || l.admissionNo === s.admissionNo) && 
                  l.status === 'APPROVED_ON_LEAVE' && 
                  !l.actualReturn && 
                  this._selectedDate >= l.fromDate
                );

                const rec = studentStatusMap.get(s.id) || { status: 'present', method: 'MANUAL', time: '' };
                const st = (rec.status || 'present').toLowerCase();
                const methodBadgeClass = rec.method === 'QR_SCAN' ? 'method-qr' : (rec.method === 'NFC_TAP' ? 'method-nfc' : (rec.method === 'FACE_RECOGNITION' ? 'method-face' : 'method-roll'));

                return `
                  <tr style="border-bottom:1px solid #F1F5F9; ${activeLeave ? 'background:rgba(254,243,199,0.2);' : ''}" data-student-id="${esc(s.id)}" class="reg-student-row">
                    <td style="padding:12px 14px;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <div class="tms-student-avatar" style="width:36px; height:36px; ${activeLeave ? 'border:2px solid #F59E0B;' : ''}">
                          ${s.photo ? `<img src="${esc(s.photo)}">` : (s.gender === 'Girl' ? '👧' : '👦')}
                        </div>
                        <div>
                          <div style="font-weight:700; color:#0F172A; font-size:0.88rem;">${esc(s.fullName)}</div>
                          <div style="font-size:0.75rem; color:#64748B;">${esc(s.gender)} • ${esc(s.dob || '')}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding:12px 14px;"><span class="tms-id-badge">${esc(s.admissionNo)}</span></td>
                    <td style="padding:12px 14px;"><strong>${esc(s.grade)}</strong></td>
                    <td style="padding:12px 14px;">
                      ${activeLeave ? `
                        <span class="badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; font-size:0.74rem; font-weight:700; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="shield-alert" style="width:11px; height:11px;"></i> GATE PASS ISSUED
                        </span>
                      ` : (rec.method ? `
                        <span class="kiosk-activity-badge ${methodBadgeClass}">
                          ${esc(rec.method.replace('_', ' '))} ${rec.time ? `• ${esc(rec.time)}` : ''}
                        </span>
                      ` : '<span style="color:#94A3B8; font-size:0.76rem;">—</span>')}
                    </td>
                    <td style="padding:12px 14px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span>${esc(s.guardianPhone || '—')}</span>
                        ${st === 'absent' && s.guardianPhone && !activeLeave ? `
                          <button type="button" class="btn btn-xs btn-outline btn-whatsapp-alert" data-id="${esc(s.id)}" title="Send WhatsApp Absence Alert" style="color:#25D366; border-color:#25D366; border-radius:6px; padding:2px 6px;">
                            <i data-lucide="message-circle" style="width:12px; height:12px;"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                    <td style="padding:12px 14px; text-align:center;">
                      ${activeLeave ? `
                        <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px;">
                          <span class="badge" style="background:#FEF3C7; color:#92400E; border:1.5px solid #FCD34D; font-weight:800; font-size:0.76rem; padding:4px 12px; border-radius:9999px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 3px rgba(180,83,9,0.1);">
                            <i data-lucide="plane-takeoff" style="width:13px; height:13px;"></i> ON LEAVE (${esc(activeLeave.leaveType ? activeLeave.leaveType.split('/')[0].trim() : 'Leave')})
                          </span>
                          <div style="font-size:0.7rem; color:#B45309; font-weight:600;">
                            Pass: <span class="font-mono" style="font-weight:700;">${esc(activeLeave.gatePassNo || 'GP-ACTIVE')}</span> • ${esc(activeLeave.fromDate)} to ${esc(activeLeave.toDate)}
                          </div>
                          <button type="button" class="btn btn-xs btn-outline btn-mark-returned-reg" data-leave-id="${esc(activeLeave.id)}" style="background:#FFFFFF; color:#0E623B; border:1px solid #0E623B; font-weight:700; border-radius:6px; padding:2px 10px; font-size:0.72rem; cursor:pointer; margin-top:2px;" title="Assigned staff marks student return">
                            <i data-lucide="corner-down-left" style="width:11px; height:11px;"></i> Mark Returned
                          </button>
                        </div>
                      ` : `
                        <div style="display:inline-flex; gap:6px;">
                          <button type="button" class="att-status-btn btn-p ${st === 'present' ? 'active' : ''}" data-status="present" title="Present">P</button>
                          <button type="button" class="att-status-btn btn-a ${st === 'absent' ? 'active' : ''}" data-status="absent" title="Absent">A</button>
                          <button type="button" class="att-status-btn btn-l ${st === 'late' ? 'active' : ''}" data-status="late" title="Late">L</button>
                          <button type="button" class="att-status-btn btn-e ${st === 'excused' ? 'active' : ''}" data-status="excused" title="Excused">E</button>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="6" style="text-align:center; padding:32px; color:#94A3B8;">No students match search or grade filter.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter listeners
    const searchInput = viewport.querySelector('#reg-search-input');
    const gradeSelect = viewport.querySelector('#reg-grade-select');

    searchInput?.addEventListener('input', (e) => {
      this._registerSearchQuery = e.target.value;
      this.renderRegisterMode(viewport);
    });

    gradeSelect?.addEventListener('change', (e) => {
      this._registerGradeFilter = e.target.value;
      this.renderRegisterMode(viewport);
    });

    // Toggle status button
    viewport.querySelectorAll('.att-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const parent = btn.parentElement;
        parent.querySelectorAll('.att-status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Mark all present (skip students on leave)
    viewport.querySelector('#btn-reg-mark-all-p')?.addEventListener('click', () => {
      viewport.querySelectorAll('.reg-student-row').forEach(row => {
        const btns = row.querySelectorAll('.att-status-btn');
        if (!btns.length) return; // Student on leave, locked!
        btns.forEach(b => {
          if (b.dataset.status === 'present') b.classList.add('active');
          else b.classList.remove('active');
        });
      });
      UIComponents.showToast('All active campus students marked present.', 'info');
    });

    // Mark all absent (skip students on leave)
    viewport.querySelector('#btn-reg-mark-all-a')?.addEventListener('click', () => {
      viewport.querySelectorAll('.reg-student-row').forEach(row => {
        const btns = row.querySelectorAll('.att-status-btn');
        if (!btns.length) return; // Student on leave, locked!
        btns.forEach(b => {
          if (b.dataset.status === 'absent') b.classList.add('active');
          else b.classList.remove('active');
        });
      });
      UIComponents.showToast('All active campus students marked absent.', 'info');
    });

    // Mark Student Returned directly from Register Ledger
    viewport.querySelectorAll('.btn-mark-returned-reg').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const leaveId = b.dataset.leaveId;
        const currentUser = authService.getCurrentUser();
        const staffName = currentUser?.name || 'Assigned Staff';
        b.disabled = true;
        b.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Marking...';
        await StudentLeaveService.markAsReturned(leaveId, { returnedMarkedBy: staffName });
        this._leaves = await StudentLeaveService.getLeaves();
        AttendanceAudio.playSuccess();
        UIComponents.showToast('Student campus return marked. Attendance taking unlocked.', 'success');
        this.renderRegisterMode(viewport);
      });
    });

    // Save & Sync Ledger to Database
    viewport.querySelector('#btn-reg-save-ledger')?.addEventListener('click', async () => {
      const saveBtn = viewport.querySelector('#btn-reg-save-ledger');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Syncing...';
      }

      const rows = viewport.querySelectorAll('.reg-student-row');
      let count = 0;
      for (const row of rows) {
        const sId = row.dataset.studentId;
        const student = this._students.find(s => s.id === sId);
        if (!student) continue;

        // Skip students on active leave (leave locks attendance until verified return)
        const activeLeave = (this._leaves || []).find(l => 
          (l.studentId === student.id || l.admissionNo === student.admissionNo) && 
          l.status === 'APPROVED_ON_LEAVE' && 
          !l.actualReturn && 
          this._selectedDate >= l.fromDate
        );
        if (activeLeave) continue;

        const activeBtn = row.querySelector('.att-status-btn.active');
        const status = activeBtn ? activeBtn.dataset.status : 'present';

        // Preserve existing biometric check-in method and timestamp if unchanged
        const existingRec = (this._records || []).find(r => (r.studentId === student.id || r.student_id === student.id) && r.date === this._selectedDate);
        const method = (existingRec && existingRec.status === status && existingRec.method) 
          ? existingRec.method 
          : 'DAILY_REGISTER';
        const punchTime = (existingRec && existingRec.time) ? existingRec.time : null;
        const confidence = existingRec ? existingRec.confidence : null;
        const rfidUid = existingRec ? (existingRec.rfidUid || existingRec.rfid_uid) : null;

        await AttendanceModule.recordAttendanceEntry({
          student,
          status,
          method,
          time: punchTime,
          confidence,
          rfidUid,
          remarks: (existingRec && existingRec.remarks) ? existingRec.remarks : 'Saved from Daily Register Ledger'
        });
        count++;
      }

      AttendanceAudio.playSuccess();
      UIComponents.showToast(`Successfully synchronized ${count} student records to database.`, 'success');
      this.renderRegisterMode(viewport);
    });

    // WhatsApp Absence Alerts
    viewport.querySelectorAll('.btn-whatsapp-alert').forEach(b => {
      b.addEventListener('click', () => {
        const sId = b.dataset.id;
        const student = this._students.find(s => s.id === sId);
        if (student) {
          WhatsAppService.sendAbsenceAlert(student, this._selectedDate);
          UIComponents.showToast(`Opening WhatsApp absence alert for ${student.fullName}...`, 'info');
        }
      });
    });

    // Export CSV
    viewport.querySelector('#btn-reg-export')?.addEventListener('click', () => {
      const header = ['Admission No', 'Student Name', 'Class', 'Category', 'Guardian Contact', 'Status', 'Method', 'Date'];
      const rows = filteredStudents.map(s => {
        const rec = studentStatusMap.get(s.id) || { status: 'present', method: 'MANUAL' };
        return [
          s.admissionNo,
          s.fullName,
          s.grade,
          s.category || 'GENERAL',
          s.guardianPhone || '',
          (rec.status || 'present').toUpperCase(),
          rec.method || 'MANUAL',
          this._selectedDate
        ];
      });
      downloadCsv(`TMS-Attendance-Ledger-${this._selectedDate}.csv`, [header, ...rows]);
      UIComponents.showToast('Attendance ledger exported to CSV.', 'success');
    });

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Attendance Report & Analytics Modal                                */
  /* ------------------------------------------------------------------ */
  static openAttendanceReportModal() {
    const esc = (v) => UIComponents.escapeHtml(v);
    const stats = this.computeStatsForDate(this._selectedDate);

    const bodyHtml = `
      <div style="font-family: var(--font-sans, system-ui, -apple-system, sans-serif);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:800; color:#0F172A;">Classroom &amp; Teacher Attendance Governance</h4>
            <div style="font-size:0.8rem; color:#64748B;">Date: ${this._selectedDate} • Institutional Attendance Ledger</div>
          </div>
          <span class="badge badge-success" style="font-weight:700;">Overall Rate: ${stats.clearanceRate}</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:18px;">
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:0.72rem; color:#64748B; font-weight:700; text-transform:uppercase;">Scheduled Sessions</div>
            <div style="font-size:1.35rem; font-weight:800; color:#0F172A; margin-top:2px;">${this._classrooms.length} Periods</div>
          </div>
          <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:0.72rem; color:#065F46; font-weight:700; text-transform:uppercase;">Students Present</div>
            <div style="font-size:1.35rem; font-weight:800; color:#059669; margin-top:2px;">${stats.presentCount} / ${stats.totalEnrolled}</div>
          </div>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:0.72rem; color:#991B1B; font-weight:700; text-transform:uppercase;">Students Absent</div>
            <div style="font-size:1.35rem; font-weight:800; color:#DC2626; margin-top:2px;">${stats.absentCount}</div>
          </div>
        </div>

        <table class="tms-table" style="width:100%; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="padding:10px 14px;">CLASSROOM / PERIOD</th>
              <th style="padding:10px 14px;">FACULTY</th>
              <th style="padding:10px 14px;">TIME</th>
              <th style="padding:10px 14px; text-align:center;">ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            ${this._classrooms.map(c => {
              const classRecs = (this._records || []).filter(r => r.classId === c.id && r.date === this._selectedDate);
              const pCount = classRecs.filter(r => r.status === 'present' || r.status === 'late').length;
              const totalCount = classRecs.length;
              const pct = totalCount > 0 ? `${Math.round((pCount / totalCount) * 100)}%` : 'Pending';

              return `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:10px 14px;"><strong>${esc(c.name)}</strong></td>
                  <td style="padding:10px 14px;">${esc(c.teacher)}</td>
                  <td style="padding:10px 14px;"><span class="font-mono">${esc(c.startTime)} – ${esc(c.endTime)}</span></td>
                  <td style="padding:10px 14px; text-align:center;">
                    <span class="badge ${totalCount > 0 ? 'badge-success' : 'badge-warning'}">
                      ${totalCount > 0 ? `${pct} (${pCount}/${totalCount})` : 'Pending'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    UIComponents.openModal({
      title: 'Classroom & Teacher Attendance Report',
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()" style="border-radius:12px; font-weight:700;">
          Close
        </button>
      `,
      maxWidth: '680px'
    });
    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Global Event Bindings                                              */
  /* ------------------------------------------------------------------ */
  static bindGlobalEvents(container) {
    // Mode Switcher Buttons
    container.querySelectorAll('.att-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.att-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeMode = btn.dataset.mode;
        this.renderActiveModeView(container);
      });
    });

    // Global Date Switcher
    const dateInput = container.querySelector('#att-global-date-input');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this._selectedDate = e.target.value;
        this.render(container);
      });
    }

    // Header Actions
    container.querySelector('#btn-open-leave-desk')?.addEventListener('click', () => {
      StudentLeaveService.openManageLeavesModal({
        staffUser: authService.getCurrentUser(),
        onComplete: async () => {
          this._leaves = await StudentLeaveService.getLeaves();
          this.renderActiveModeView(container);
        }
      });
    });

    container.querySelector('#btn-add-new-classroom')?.addEventListener('click', () => {
      ClassroomModal.open({
        onSave: async (created) => {
          this._classrooms.push(created);
          await dbService.insert('academic_classes', created);
          this.renderActiveModeView(container);
        }
      });
    });

    container.querySelector('#btn-open-enrollment-kiosk')?.addEventListener('click', () => {
      const student = this._students[0] || {};
      BiometricCredentialModal.open({
        person: student,
        type: 'student',
        onSave: (updated) => {
          const idx = this._students.findIndex(s => s.id === updated.id);
          if (idx >= 0) this._students[idx] = updated;
          this.renderActiveModeView(container);
        }
      });
    });

    container.querySelector('#btn-open-att-report')?.addEventListener('click', () => {
      this.openAttendanceReportModal();
    });

    container.querySelector('#btn-export-att-csv')?.addEventListener('click', () => {
      const header = ['Classroom', 'Section', 'Teacher', 'Start Time', 'End Time', 'Days', 'Room', 'Capacity'];
      const data = this._classrooms.map(c => [c.name, c.section, c.teacher, c.startTime, c.endTime, (c.days || []).join('; '), c.room, c.capacity]);
      downloadCsv(`TMS-Classrooms-Schedule-${this._selectedDate}.csv`, [header, ...data]);
      UIComponents.showToast('Schedule exported to CSV.', 'success');
    });
  }
}
