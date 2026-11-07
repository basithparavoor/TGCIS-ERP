/**
 * THAIBA PUBLIC SCHOOL — Student Leave & Gate Pass Governance Service
 * Handles:
 * 1. Leave application from Student & Parent Portals
 * 2. Leave review, approval & gate pass issuance by Assigned Staff & Higher Authorities
 * 3. Return tracking: Locks attendance while student is ON LEAVE until marked as RETURNED
 */

import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';
import { TMS_CONFIG } from './config.js';

export const LEAVE_TYPES = [
  { id: 'medical', label: 'Medical / Health Leave', icon: 'heart-pulse' },
  { id: 'emergency', label: 'Emergency Family Outpass', icon: 'alert-triangle' },
  { id: 'family', label: 'Family Occasion / Ceremony', icon: 'users' },
  { id: 'festival', label: 'Religious / Festival Break', icon: 'moon' },
  { id: 'home_visit', label: 'Authorized Home Visit (Hostel)', icon: 'home' },
  { id: 'other', label: 'Other Permitted Absence', icon: 'file-text' }
];

export const INITIAL_STUDENT_LEAVES = [
  {
    id: 'LV-2026-001',
    studentId: 'std-5',
    studentName: 'Sultana Sarkar',
    admissionNo: 'TPS-2026-005',
    grade: 'STD-III',
    section: 'A',
    leaveType: 'Medical / Health Leave',
    fromDate: '2026-11-05',
    toDate: '2026-11-08',
    totalDays: 4,
    reason: 'Severe seasonal fever and dental treatment in Malda clinic.',
    emergencyPhone: '9800880620',
    appliedBy: 'parent',
    appliedByName: 'Golam Kibria (Guardian)',
    status: 'APPROVED_ON_LEAVE',
    issuedBy: 'Br. Abdul Basith (Academic Council)',
    issuedAt: '2026-11-05 08:30 AM',
    gatePassNo: 'GP-2026-042',
    expectedReturn: '2026-11-08 06:00 PM',
    actualReturn: null,
    returnedMarkedBy: null,
    createdAt: '2026-11-04T18:20:00Z'
  }
];

export class StudentLeaveService {
  /* ------------------------------------------------------------------ */
  /* Fetch all leaves with default fallback                             */
  /* ------------------------------------------------------------------ */
  static async getLeaves() {
    const records = await dbService.select('student_leaves');
    if (!records || !records.length) {
      // Seed default leave record so there is an active on-leave student for demo
      for (const item of INITIAL_STUDENT_LEAVES) {
        await dbService.insert('student_leaves', item);
      }
      return [...INITIAL_STUDENT_LEAVES];
    }
    return records;
  }

  /* ------------------------------------------------------------------ */
  /* Check if student is actively ON LEAVE for a specific date          */
  /* ------------------------------------------------------------------ */
  static async getActiveLeaveForStudent(studentId, date = null) {
    const leaves = await this.getLeaves();
    const targetDate = date || new Date().toISOString().split('T')[0];

    return leaves.find(l => {
      const matchStudent = l.studentId === studentId || l.admissionNo === studentId;
      if (!matchStudent) return false;

      // Status must be APPROVED_ON_LEAVE and not yet marked returned
      if (l.status !== 'APPROVED_ON_LEAVE' || l.actualReturn) return false;

      // Date comparison: must be on or after fromDate, and until marked returned
      return targetDate >= l.fromDate;
    }) || null;
  }

  /* ------------------------------------------------------------------ */
  /* Apply for student leave (Student or Parent portal)                 */
  /* ------------------------------------------------------------------ */
  static async applyLeave({
    studentId,
    studentName,
    admissionNo,
    grade,
    section = 'A',
    leaveType,
    fromDate,
    toDate,
    reason,
    emergencyPhone,
    appliedBy = 'student',
    appliedByName = 'Student'
  }) {
    const from = new Date(fromDate);
    const to = new Date(toDate || fromDate);
    const days = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);

    const leaveRecord = {
      id: `LV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId,
      studentName,
      admissionNo,
      grade,
      section,
      leaveType: leaveType || 'General Leave',
      fromDate,
      toDate: toDate || fromDate,
      totalDays: days,
      reason: reason || 'Personal / Medical Leave',
      emergencyPhone: emergencyPhone || '',
      appliedBy,
      appliedByName,
      status: 'PENDING',
      issuedBy: null,
      issuedAt: null,
      gatePassNo: null,
      expectedReturn: `${toDate || fromDate} 06:00 PM`,
      actualReturn: null,
      returnedMarkedBy: null,
      createdAt: new Date().toISOString()
    };

    await dbService.insert('student_leaves', leaveRecord);

    try {
      auditService.log(
        'STUDENT_LEAVE_APPLIED',
        `Leave application submitted for ${studentName} (${admissionNo}) by ${appliedByName}: ${days} days (${fromDate} to ${toDate})`,
        { leaveId: leaveRecord.id, studentId, fromDate, toDate }
      );
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('tms_student_leave_updated', { detail: leaveRecord }));
    return leaveRecord;
  }

  /* ------------------------------------------------------------------ */
  /* Approve & Issue Leave (Assigned Staff / Higher Authority)          */
  /* ------------------------------------------------------------------ */
  static async approveAndIssueLeave(leaveId, { issuedBy = 'Staff Faculty', expectedReturn = null, gatePassNo = null }) {
    const leaves = await this.getLeaves();
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) throw new Error('Leave record not found');

    const passNo = gatePassNo || `GP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toLocaleString('en-GB');

    const updates = {
      status: 'APPROVED_ON_LEAVE',
      issuedBy,
      issuedAt: nowStr,
      gatePassNo: passNo,
      expectedReturn: expectedReturn || `${leave.toDate} 06:00 PM`,
      actualReturn: null,
      updatedAt: new Date().toISOString()
    };

    await dbService.update('student_leaves', leave.id, updates);

    // Also update student record with active leave badge
    try {
      await dbService.update('students', leave.studentId, {
        leaveStatus: 'approved',
        activeLeaveId: leave.id
      });
    } catch (e) {}

    try {
      auditService.log(
        'STUDENT_LEAVE_ISSUED',
        `Leave ${leave.id} APPROVED & Gate Pass ${passNo} ISSUED for ${leave.studentName} by ${issuedBy}. Student officially marked ON LEAVE.`,
        { leaveId: leave.id, gatePassNo: passNo, issuedBy }
      );
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('tms_student_leave_updated', { detail: { id: leave.id, ...updates } }));
    return { ...leave, ...updates };
  }

  /* ------------------------------------------------------------------ */
  /* Mark Student as Returned (Concludes leave, restores attendance)    */
  /* ------------------------------------------------------------------ */
  static async markAsReturned(leaveId, { returnedMarkedBy = 'Assigned Staff', returnTimestamp = null }) {
    const leaves = await this.getLeaves();
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) throw new Error('Leave record not found');

    const returnTime = returnTimestamp || new Date().toLocaleString('en-GB');

    const updates = {
      status: 'RETURNED',
      actualReturn: returnTime,
      returnedMarkedBy,
      updatedAt: new Date().toISOString()
    };

    await dbService.update('student_leaves', leave.id, updates);

    // Clear leaveStatus from student record
    try {
      await dbService.update('students', leave.studentId, {
        leaveStatus: null,
        activeLeaveId: null
      });
    } catch (e) {}

    try {
      auditService.log(
        'STUDENT_LEAVE_RETURNED',
        `Student ${leave.studentName} (${leave.admissionNo}) returned to campus from leave ${leave.id}. Verified by ${returnedMarkedBy}. Attendance unlocked.`,
        { leaveId: leave.id, returnedMarkedBy, returnTime }
      );
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('tms_student_leave_updated', { detail: { id: leave.id, ...updates } }));
    return { ...leave, ...updates };
  }

  /* ------------------------------------------------------------------ */
  /* Reject Leave Request                                               */
  /* ------------------------------------------------------------------ */
  static async rejectLeave(leaveId, { rejectedBy = 'Staff Faculty', rejectionReason = '' }) {
    const leaves = await this.getLeaves();
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) throw new Error('Leave record not found');

    const updates = {
      status: 'REJECTED',
      rejectedBy,
      rejectionReason: rejectionReason || 'Leave request declined by campus administration.',
      updatedAt: new Date().toISOString()
    };

    await dbService.update('student_leaves', leave.id, updates);

    window.dispatchEvent(new CustomEvent('tms_student_leave_updated', { detail: { id: leave.id, ...updates } }));
    return { ...leave, ...updates };
  }

  /* ------------------------------------------------------------------ */
  /* Modal: Apply for Leave (Student or Parent)                         */
  /* ------------------------------------------------------------------ */
  static openApplyModal({ student, appliedBy = 'student', appliedByName = 'Student', onComplete = null }) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const s = student || {};
    const today = new Date().toISOString().split('T')[0];

    const bodyHtml = `
      <div style="font-family: var(--font-sans, system-ui, -apple-system, sans-serif); color:#0F172A;">
        <!-- Student Banner -->
        <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:14px 18px; margin-bottom:18px; display:flex; align-items:center; gap:14px;">
          <div class="tms-student-avatar" style="width:48px; height:48px; border-radius:50%; background:#E2E8F0; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
            ${s.photo ? `<img src="${esc(s.photo)}" style="width:100%;height:100%;object-fit:cover;">` : (s.gender === 'Girl' ? '👧' : '👦')}
          </div>
          <div style="flex:1;">
            <div style="font-weight:800; font-size:1.1rem; color:#0F172A;">
              ${esc(s.fullName || 'Student Name')} <span class="tms-id-badge" style="font-size:0.75rem;">${esc(s.admissionNo || '—')}</span>
            </div>
            <div style="font-size:0.8rem; color:#64748B; margin-top:2px;">
              Class: <strong>${esc(s.grade || 'STD-I')} (${esc(s.section || 'A')})</strong> • Applicant: <strong>${esc(appliedByName)}</strong>
            </div>
          </div>
        </div>

        <form id="form-apply-leave">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">
                Leave Category / Nature:
              </label>
              <select id="leave-modal-type" class="form-select" required style="border-radius:10px;">
                ${LEAVE_TYPES.map(t => `<option value="${esc(t.label)}">${esc(t.label)}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">
                Emergency Contact Phone while on Leave:
              </label>
              <input type="tel" id="leave-modal-phone" class="form-input font-mono" value="${esc(s.guardianPhone || s.phone || '')}" placeholder="e.g. 9847123456" required style="border-radius:10px;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">
                Leave From Date:
              </label>
              <input type="date" id="leave-modal-from" class="form-input" value="${today}" min="${today}" required style="border-radius:10px;">
            </div>

            <div>
              <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">
                Leave To Date (Expected Return):
              </label>
              <input type="date" id="leave-modal-to" class="form-input" value="${today}" min="${today}" required style="border-radius:10px;">
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">
              Reason &amp; Detailed Explanation:
            </label>
            <textarea id="leave-modal-reason" class="form-input" rows="3" placeholder="Provide clear reason for absence / outpass request..." required style="border-radius:10px; resize:vertical;"></textarea>
          </div>

          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:10px 12px; font-size:0.78rem; color:#92400E; margin-bottom:14px;">
            <i data-lucide="info" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i>
            <strong>Important Policy:</strong> Once approved, the student will be officially marked <strong>ON LEAVE</strong>. Daily attendance call will be locked until the assigned staff or higher authority marks their campus return.
          </div>
        </form>
      </div>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <button class="btn btn-secondary" id="btn-leave-modal-cancel" style="border-radius:12px; font-weight:700; padding:10px 20px;">
          Cancel
        </button>
        <button class="btn btn-primary" id="btn-leave-modal-submit" style="border-radius:12px; font-weight:700; padding:10px 28px; background:#0E623B; border-color:#0E623B;">
          <i data-lucide="send"></i> Submit Leave Application
        </button>
      </div>
    `;

    UIComponents.openModal({
      title: 'Apply for Student Leave & Gate Pass',
      bodyHtml,
      footerHtml,
      maxWidth: '620px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    modal.querySelector('#btn-leave-modal-cancel')?.addEventListener('click', () => {
      UIComponents.closeModal();
    });

    modal.querySelector('#btn-leave-modal-submit')?.addEventListener('click', async () => {
      const type = modal.querySelector('#leave-modal-type')?.value;
      const phone = modal.querySelector('#leave-modal-phone')?.value.trim();
      const from = modal.querySelector('#leave-modal-from')?.value;
      const to = modal.querySelector('#leave-modal-to')?.value;
      const reason = modal.querySelector('#leave-modal-reason')?.value.trim();

      if (!from || !to || !reason) {
        UIComponents.showToast('Please specify leave dates and detailed reason.', 'warning');
        return;
      }

      const submitBtn = modal.querySelector('#btn-leave-modal-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

      const leave = await this.applyLeave({
        studentId: s.id,
        studentName: s.fullName,
        admissionNo: s.admissionNo,
        grade: s.grade,
        section: s.section || 'A',
        leaveType: type,
        fromDate: from,
        toDate: to,
        reason,
        emergencyPhone: phone,
        appliedBy,
        appliedByName
      });

      UIComponents.showToast(`Leave application #${leave.id} submitted for faculty approval.`, 'success');
      UIComponents.closeModal();

      if (typeof onComplete === 'function') {
        onComplete(leave);
      }
    });

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Modal: Manage & Issue Leaves (Staff / Higher Authority Desk)       */
  /* ------------------------------------------------------------------ */
  static async openManageLeavesModal({ staffUser = null, onComplete = null }) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const leaves = await this.getLeaves();
    const staffName = staffUser ? (staffUser.name || 'Assigned Staff') : 'Assigned Staff Faculty';

    const pendingLeaves = leaves.filter(l => l.status === 'PENDING');
    const activeLeaves = leaves.filter(l => l.status === 'APPROVED_ON_LEAVE' && !l.actualReturn);
    const closedLeaves = leaves.filter(l => l.status === 'RETURNED' || l.status === 'REJECTED' || (l.status === 'APPROVED_ON_LEAVE' && l.actualReturn));

    const bodyHtml = `
      <div style="font-family: var(--font-sans, system-ui, -apple-system, sans-serif); color:#0F172A;">
        <!-- Top Institutional Header -->
        <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:14px 18px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#059669; text-transform:uppercase; letter-spacing:0.04em;">
              CAMPUS DISCIPLINE &amp; WARDEN OFFICE
            </div>
            <h3 style="margin:2px 0 0 0; font-size:1.2rem; font-weight:800; color:#0F172A;">
              Student Leave &amp; Gate Pass Governance Desk
            </h3>
            <div style="font-size:0.8rem; color:#64748B; margin-top:2px;">
              Review leave requests, issue authorized gate passes, and mark student campus returns.
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <span class="badge ${activeLeaves.length ? 'badge-warning' : 'badge-info'}" style="padding:6px 14px; font-weight:800; font-size:0.78rem;">
              ${activeLeaves.length} Student(s) Currently ON LEAVE
            </span>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div style="display:flex; gap:8px; border-bottom:1.5px solid #E2E8F0; margin-bottom:16px; padding-bottom:4px;">
          <button type="button" class="btn btn-sm btn-leave-tab ${activeLeaves.length ? '' : 'active'}" data-pane="pending" style="font-weight:700; border-radius:10px;">
            Pending Approval (${pendingLeaves.length})
          </button>
          <button type="button" class="btn btn-sm btn-leave-tab ${activeLeaves.length ? 'active' : ''}" data-pane="active" style="font-weight:700; border-radius:10px; color:#D97706;">
            ★ Currently ON LEAVE (${activeLeaves.length})
          </button>
          <button type="button" class="btn btn-sm btn-leave-tab" data-pane="history" style="font-weight:700; border-radius:10px;">
            Closed / History (${closedLeaves.length})
          </button>
        </div>

        <!-- PANE 1: Pending Applications -->
        <div id="leave-pane-pending" class="leave-desk-pane" style="display:${activeLeaves.length ? 'none' : 'block'};">
          ${pendingLeaves.length ? `
            <div class="table-responsive" style="max-height:360px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
              <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
                <thead>
                  <tr style="background:#F8FAFC;">
                    <th style="padding:10px 12px;">STUDENT</th>
                    <th style="padding:10px 12px;">DATES &amp; DURATION</th>
                    <th style="padding:10px 12px;">REASON / APPLICANT</th>
                    <th style="padding:10px 12px; text-align:center;">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingLeaves.map(l => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:10px 12px;">
                        <div style="font-weight:800; color:#0F172A;">${esc(l.studentName)}</div>
                        <div style="font-size:0.75rem; color:#64748B;"><span class="tms-id-badge">${esc(l.admissionNo)}</span> • Class: ${esc(l.grade)}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <div style="font-weight:700; color:#0F172A;">${esc(l.fromDate)} – ${esc(l.toDate)}</div>
                        <div style="font-size:0.75rem; color:#059669; font-weight:700;">${esc(l.totalDays)} Day(s) • ${esc(l.leaveType)}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <div style="color:#334155;">${esc(l.reason)}</div>
                        <div style="font-size:0.74rem; color:#64748B; margin-top:2px;">By: <strong>${esc(l.appliedByName)}</strong> (${esc(l.emergencyPhone || '—')})</div>
                      </td>
                      <td style="padding:10px 12px; text-align:center;">
                        <div style="display:inline-flex; gap:6px;">
                          <button type="button" class="btn btn-sm btn-primary btn-issue-leave" data-id="${esc(l.id)}" style="background:#0E623B; border-color:#0E623B; font-weight:700; border-radius:8px; padding:4px 10px;">
                            <i data-lucide="check"></i> Approve &amp; Issue Gate Pass
                          </button>
                          <button type="button" class="btn btn-sm btn-secondary btn-reject-leave" data-id="${esc(l.id)}" style="color:#DC2626; border-radius:8px; padding:4px 10px;">
                            <i data-lucide="x"></i> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding:36px; text-align:center; color:#94A3B8; background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px;">
              <i data-lucide="inbox" style="width:36px; height:36px; margin-bottom:8px;"></i>
              <div>No pending student leave requests requiring staff approval.</div>
            </div>
          `}
        </div>

        <!-- PANE 2: Currently ON LEAVE (Active) -->
        <div id="leave-pane-active" class="leave-desk-pane" style="display:${activeLeaves.length ? 'block' : 'none'};">
          ${activeLeaves.length ? `
            <div class="table-responsive" style="max-height:360px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
              <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
                <thead>
                  <tr style="background:#FFFBEB;">
                    <th style="padding:10px 12px;">STUDENT</th>
                    <th style="padding:10px 12px;">GATE PASS &amp; ISSUED BY</th>
                    <th style="padding:10px 12px;">LEAVE PERIOD</th>
                    <th style="padding:10px 12px; text-align:center;">RETURN STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeLeaves.map(l => `
                    <tr style="border-bottom:1px solid #FEF3C7; background:#FFFFFF;">
                      <td style="padding:10px 12px;">
                        <div style="font-weight:800; color:#0F172A;">${esc(l.studentName)}</div>
                        <div style="font-size:0.75rem; color:#64748B;"><span class="tms-id-badge">${esc(l.admissionNo)}</span> • Class: ${esc(l.grade)}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <div style="font-weight:800; color:#92400E;"><span class="badge badge-warning font-mono">${esc(l.gatePassNo || 'GP-ISSUED')}</span></div>
                        <div style="font-size:0.74rem; color:#64748B; margin-top:2px;">Issued by: <strong>${esc(l.issuedBy || 'Staff')}</strong></div>
                      </td>
                      <td style="padding:10px 12px;">
                        <div style="font-weight:700; color:#0F172A;">${esc(l.fromDate)} – ${esc(l.toDate)}</div>
                        <div style="font-size:0.74rem; color:#D97706; font-weight:700;">Expected: ${esc(l.expectedReturn || l.toDate)}</div>
                      </td>
                      <td style="padding:10px 12px; text-align:center;">
                        <button type="button" class="btn btn-sm btn-primary btn-desk-mark-returned" data-id="${esc(l.id)}" style="background:#0E623B; border-color:#0E623B; font-weight:700; border-radius:10px; padding:6px 14px; box-shadow:0 2px 6px rgba(14,98,59,0.2);">
                          <i data-lucide="corner-down-left"></i> Mark as Returned
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding:36px; text-align:center; color:#94A3B8; background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:12px;">
              <i data-lucide="check-circle" style="width:36px; height:36px; color:#10B981; margin-bottom:8px;"></i>
              <div>All students are currently present on campus. Zero active leaves.</div>
            </div>
          `}
        </div>

        <!-- PANE 3: Closed / History -->
        <div id="leave-pane-history" class="leave-desk-pane" style="display:none;">
          ${closedLeaves.length ? `
            <div class="table-responsive" style="max-height:360px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
              <table class="tms-table" style="width:100%; margin:0; font-size:0.84rem;">
                <thead>
                  <tr style="background:#F8FAFC;">
                    <th style="padding:10px 12px;">STUDENT</th>
                    <th style="padding:10px 12px;">DATES</th>
                    <th style="padding:10px 12px;">GATE PASS</th>
                    <th style="padding:10px 12px; text-align:center;">OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  ${closedLeaves.map(l => `
                    <tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:10px 12px; font-weight:700; color:#0F172A;">${esc(l.studentName)} (${esc(l.admissionNo)})</td>
                      <td style="padding:10px 12px;">${esc(l.fromDate)} – ${esc(l.toDate)}</td>
                      <td style="padding:10px 12px;"><span class="font-mono">${esc(l.gatePassNo || '—')}</span></td>
                      <td style="padding:10px 12px; text-align:center;">
                        ${l.status === 'RETURNED' ? `
                          <span class="badge badge-success">✓ RETURNED (${esc(l.actualReturn ? l.actualReturn.slice(0, 10) : 'Closed')})</span>
                        ` : `
                          <span class="badge badge-danger">✕ REJECTED</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding:36px; text-align:center; color:#94A3B8;">No archived leave records yet.</div>
          `}
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()" style="border-radius:12px; font-weight:700;">
        Close Desk
      </button>
    `;

    UIComponents.openModal({
      title: 'Student Leave & Gate Pass Governance Desk',
      bodyHtml,
      footerHtml,
      maxWidth: '820px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    // Tab switcher
    modal.querySelectorAll('.btn-leave-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.btn-leave-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pane = btn.dataset.pane;
        modal.querySelectorAll('.leave-desk-pane').forEach(p => p.style.display = 'none');
        const target = modal.querySelector(`#leave-pane-${pane}`);
        if (target) target.style.display = 'block';
      });
    });

    // Action: Approve & Issue
    modal.querySelectorAll('.btn-issue-leave').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Issuing...';
        await this.approveAndIssueLeave(id, { issuedBy: staffName });
        UIComponents.showToast(`Gate Pass issued for Leave #${id}. Student marked ON LEAVE.`, 'success');
        UIComponents.closeModal();
        if (typeof onComplete === 'function') onComplete();
      });
    });

    // Action: Reject
    modal.querySelectorAll('.btn-reject-leave').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await this.rejectLeave(id, { rejectedBy: staffName });
        UIComponents.showToast(`Leave application #${id} declined.`, 'info');
        UIComponents.closeModal();
        if (typeof onComplete === 'function') onComplete();
      });
    });

    // Action: Mark as Returned
    modal.querySelectorAll('.btn-desk-mark-returned').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Marking Return...';
        await this.markAsReturned(id, { returnedMarkedBy: staffName });
        UIComponents.showToast(`Student successfully marked as RETURNED. Attendance restored.`, 'success');
        UIComponents.closeModal();
        if (typeof onComplete === 'function') onComplete();
      });
    });

    UIComponents.refreshIcons();
  }
}
