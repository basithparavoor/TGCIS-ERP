/**
 * THAIBA PUBLIC SCHOOL — Student Lifecycle, Admissions & Identity Module
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';
import { PermissionEngine, CAPABILITIES } from './permission-engine.js';
import { downloadCsv, formatPdfFilename } from './export-utils.js';
import { TMS_LOGO } from './logo.js';
import { admissionService } from './admission-service.js';

export class StudentModule {
  static async render(container) {
    const students = await dbService.select('students');
    const esc = (v) => UIComponents.escapeHtml(v);
    const canManage = PermissionEngine.can(CAPABILITIES.MANAGE_STUDENTS);

    const applications = await dbService.select('admissions_applications');
    const invoices = await dbService.select('invoices');
    this._students = students;
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
    const clearanceValue = totalBilled > 0 ? `${((totalCollected / totalBilled) * 100).toFixed(1)}%` : '—';

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'Student Lifecycle & Directory',
          subtitle: 'Student information system, admissions pipeline, guardian records, and printable biometric ID cards.',
          breadcrumbs: [{ label: 'Student Directory' }],
          badge: `${students.length} Enrolled`,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-infirmary-roster"><i data-lucide="cross"></i> Medical Roster</button>
            <button class="btn btn-secondary" id="btn-bulk-print-id-cards"><i data-lucide="printer"></i> Bulk Print PVC ID</button>
            <a href="/admission" target="_blank" class="btn btn-secondary"><i data-lucide="file-text"></i> Admission Form (A4)</a>
            ${canManage ? `
            <button class="btn btn-secondary" id="btn-bulk-import-students"><i data-lucide="file-up"></i> Bulk Import (CSV)</button>
            <button class="btn btn-primary" id="btn-new-admission"><i data-lucide="user-plus"></i> New Enrollment</button>` : ''}
          `
        })}

      <div class="kpi-grid">
        ${UIComponents.renderKpiCard({ title: 'Total Enrolled Students', value: `${students.length}`, icon: 'users', color: 'blue', subtitle: TMS_CONFIG.academic.currentYear })}
        ${UIComponents.renderKpiCard({ title: 'Active Students', value: `${students.filter(s => s.status === 'Active').length}`, icon: 'check-circle', color: 'emerald', subtitle: 'Regular Attendance' })}
        ${UIComponents.renderKpiCard({ title: 'New Admissions', value: `${applications.length} Applied`, icon: 'file-text', color: 'amber', subtitle: 'Submitted Applications' })}
        ${UIComponents.renderKpiCard({ title: 'Fee Clearance Ratio', value: clearanceValue, icon: 'receipt', color: 'rose', subtitle: 'Term 1 Invoices' })}
      </div>

      <!-- Students List Card -->
      <div class="card">
        <div class="card-header">
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; width: 100%;">
            <div>
              <h3 class="card-title">Enrolled Students Roster</h3>
              <p class="card-desc" style="margin-top: 2px;">Comprehensive student profiles with zero horizontal scrolling.</p>
            </div>
            <div style="margin-left: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <div class="tms-view-toggle" id="student-view-toggle">
                <button type="button" class="view-btn" data-view="cards" title="Switch to Cards View">
                  <i data-lucide="layout-grid"></i> Cards
                </button>
                <button type="button" class="view-btn" data-view="table" title="Switch to Table View">
                  <i data-lucide="table"></i> Table
                </button>
              </div>
              <input type="text" class="form-input" id="search-student-input" placeholder="Search by name or admission no..." style="width: 250px; padding: 6px 12px;">
            </div>
          </div>
        </div>

        ${canManage ? `
        <div class="bulk-actions-toolbar" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:10px;">
          <div style="font-weight:700; font-size:0.85rem; display:flex; align-items:center; gap:6px; margin-right:4px;">
            <i data-lucide="check-square" style="width:16px; height:16px; color:#2563eb;"></i>
            <span><span id="students-selected-count">0</span> Selected</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-select-all">Select All</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-clear">Clear</button>
          
          <span style="height:18px; width:1px; background:var(--border-color); margin:0 4px;"></span>

          <button type="button" class="btn btn-primary btn-sm" id="btn-students-bulk-edit" title="Batch edit any data field across selected students">
            <i data-lucide="sliders"></i> Bulk Edit Fields
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-bulk-class" title="Reassign Grade / Class & Section">
            <i data-lucide="arrow-up-right"></i> Move Class
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-bulk-status" title="Batch change enrollment status">
            <i data-lucide="shield-check"></i> Status
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-bulk-roll" title="Renumber roll numbers sequentially">
            <i data-lucide="list-ordered"></i> Auto Roll
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-bulk-export" title="Export all fields of selected students">
            <i data-lucide="download"></i> Export CSV
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-students-bulk-delete" style="color:#ef4444;" title="Delete selected students">
            <i data-lucide="trash-2"></i> Delete
          </button>
        </div>` : ''}

        <!-- Cards View (Default on Mobile, zero side scroll) -->
        <div id="students-cards-view-container" class="tms-cards-grid">
          ${students.length ? students.map(s => `
            <div class="tms-data-card student-card" data-student-card="${esc(s.id)}">
              <div class="tms-data-card-header">
                <div style="display: flex; gap: 10px; align-items: center;">
                  ${canManage ? `<input type="checkbox" class="student-row-check" value="${esc(s.id)}">` : ''}
                  <div>
                    <div class="tms-data-card-title">${esc(s.fullName)}</div>
                    <div class="tms-data-card-subtitle font-mono">${esc(s.admissionNo)} • Roll: ${esc(s.rollNo || '—')}</div>
                  </div>
                </div>
                <span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-warning'}">${esc(s.status)}</span>
              </div>
              <div class="tms-data-card-body">
                <div class="tms-data-card-row">
                  <span class="tms-data-card-label">Class & Section</span>
                  <span class="tms-data-card-value">${esc(s.grade)} - ${esc(s.section)}</span>
                </div>
                <div class="tms-data-card-row">
                  <span class="tms-data-card-label">Blood Group</span>
                  <span class="tms-data-card-value">${esc(s.bloodGroup || s.blood_group || '—')}</span>
                </div>
                <div class="tms-data-card-row">
                  <span class="tms-data-card-label">Guardian</span>
                  <span class="tms-data-card-value">${esc(s.guardianName || '—')}</span>
                </div>
                <div class="tms-data-card-row">
                  <span class="tms-data-card-label">Contact</span>
                  <span class="tms-data-card-value">
                    ${s.guardianPhone ? `<a href="tel:${esc(s.guardianPhone)}" style="color: #16a34a; text-decoration: none; font-family: var(--font-mono);">${esc(s.guardianPhone)}</a>` : '—'}
                  </span>
                </div>
                ${(s.allergies || s.medical_conditions) ? `
                  <div class="tms-data-card-row full-width">
                    <span class="badge badge-danger" style="font-size: 0.72rem; align-self: flex-start;">
                      <i data-lucide="alert-circle" style="width: 12px; height: 12px; display: inline;"></i> ${esc(s.allergies ? `Allergy: ${s.allergies}` : s.medical_conditions)}
                    </span>
                  </div>
                ` : ''}
              </div>
              <div class="tms-data-card-actions">
                <button class="btn btn-secondary btn-sm btn-print-id" data-id="${esc(s.id)}" title="Print ID Card"><i data-lucide="id-card"></i> ID</button>
                <button class="btn btn-secondary btn-sm btn-merit-log" data-id="${esc(s.id)}" title="Merits &amp; Conduct" style="color: #16a34a;"><i data-lucide="shield-check"></i> Merit</button>
                <button class="btn btn-secondary btn-sm btn-view-profile" data-id="${esc(s.id)}" title="View Details"><i data-lucide="eye"></i> View</button>
                ${canManage ? `
                  <button class="btn btn-secondary btn-sm btn-edit-student" data-id="${esc(s.id)}" title="Edit student"><i data-lucide="pencil"></i></button>
                  <button class="btn btn-secondary btn-sm btn-del-student" data-id="${esc(s.id)}" title="Delete student" style="color:#ef4444;"><i data-lucide="trash-2"></i></button>
                ` : ''}
              </div>
            </div>
          `).join('') : '<p style="text-align:center; color:var(--text-muted); padding:30px; grid-column: 1 / -1;">No students enrolled yet.</p>'}
        </div>

        <!-- Table View -->
        <div class="table-responsive" id="students-table-view-container" style="display: none; margin-top: 14px;">
          <table class="tms-table" id="students-table">
            <thead>
              <tr>
                ${canManage ? '<th style="width:34px;"><input type="checkbox" id="students-select-all-cb"></th>' : ''}
                <th>Admission No</th>
                <th>Roll</th>
                <th>Student Full Name</th>
                <th>Class & Section</th>
                <th>Guardian Contact</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.length ? students.map(s => `
                <tr data-student-row="${esc(s.id)}">
                  ${canManage ? `<td><input type="checkbox" class="student-row-check" value="${esc(s.id)}"></td>` : ''}
                  <td><span class="font-mono" style="font-weight: 600;">${esc(s.admissionNo)}</span></td>
                  <td><strong>${esc(s.rollNo)}</strong></td>
                  <td>
                    <strong>${esc(s.fullName)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${esc(s.gender)} • DOB: ${esc(s.dob)}</div>
                    ${s.allergies || s.medical_conditions ? `
                      <div style="margin-top: 3px;">
                        <span class="badge badge-danger" style="font-size: 0.65rem; padding: 1px 5px;" title="${esc(s.allergies || s.medical_conditions)}">
                          <i data-lucide="alert-circle" style="width: 10px; height: 10px; display: inline;"></i> ${esc(s.allergies ? `Allergy: ${s.allergies}` : s.medical_conditions)}
                        </span>
                      </div>
                    ` : ''}
                  </td>
                  <td>${esc(s.grade)} - ${esc(s.section)}</td>
                  <td>
                    <div>${esc(s.guardianName)}</div>
                    <small style="color: var(--text-muted); font-family: var(--font-mono);">${esc(s.guardianPhone)}</small>
                  </td>
                  <td><span class="badge ${s.bloodGroup ? 'badge-info' : 'badge-secondary'}" style="font-weight: 700;">${esc(s.bloodGroup || s.blood_group || '—')}</span></td>
                  <td><span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-warning'}">${esc(s.status)}</span></td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap:wrap;">
                      <button class="btn btn-secondary btn-sm btn-print-id" data-id="${esc(s.id)}" title="Print ID Card"><i data-lucide="id-card"></i> ID</button>
                      <button class="btn btn-secondary btn-sm btn-merit-log" data-id="${esc(s.id)}" title="Merits &amp; Demerits / Conduct" style="color: #16a34a;"><i data-lucide="shield-check"></i> Merit</button>
                      <button class="btn btn-secondary btn-sm btn-view-profile" data-id="${esc(s.id)}" title="View Details"><i data-lucide="eye"></i> View</button>
                      ${canManage ? `
                      <button class="btn btn-secondary btn-sm btn-edit-student" data-id="${esc(s.id)}" title="Edit student"><i data-lucide="pencil"></i></button>
                      <button class="btn btn-secondary btn-sm btn-del-student" data-id="${esc(s.id)}" title="Delete student" style="color:#ef4444;"><i data-lucide="trash-2"></i></button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="${canManage ? 9 : 8}" style="text-align: center; color: var(--text-muted); padding: 30px;">No records available yet.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

    this.bindEvents(container);
    UIComponents.refreshIcons();
  }

  static openStudentEditModal(student, container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const s = student || {};
    const bodyHtml = `
      <form id="form-edit-student">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Admission No</label>
            <input class="form-input font-mono" id="ed-admission" value="${esc(s.admissionNo || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Roll No</label>
            <input class="form-input" id="ed-roll" value="${esc(s.rollNo || '')}">
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label">Full Name *</label>
            <input class="form-input" id="ed-name" value="${esc(s.fullName || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Gender</label>
            <select class="form-select" id="ed-gender">
              <option ${s.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option ${s.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option ${s.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input type="date" class="form-input" id="ed-dob" value="${esc((s.dob || '').slice(0, 10))}">
          </div>
          <div class="form-group">
            <label class="form-label">Class / Grade</label>
            <select class="form-select" id="ed-grade">
              ${TMS_CONFIG.academic.classes.map((c) => `<option ${s.grade === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Section</label>
            <select class="form-select" id="ed-section">
              ${TMS_CONFIG.academic.sections.map((sec) => `<option ${s.section === sec ? 'selected' : ''}>${esc(sec)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Guardian Name</label>
            <input class="form-input" id="ed-guardian" value="${esc(s.guardianName || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Guardian Phone</label>
            <input class="form-input" id="ed-phone" value="${esc(s.guardianPhone || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Blood Group</label>
            <select class="form-select" id="ed-blood">
              ${['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => `<option value="${b}" ${(s.bloodGroup === b || s.blood_group === b) ? 'selected' : ''}>${b || 'Not Recorded'}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="ed-status">
              <option ${s.status === 'Active' || !s.status ? 'selected' : ''}>Active</option>
              <option ${s.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              <option ${s.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
              <option ${s.status === 'Transferred' ? 'selected' : ''}>Transferred</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label">Address</label>
            <input class="form-input" id="ed-address" value="${esc(s.address || '')}">
          </div>

          <!-- Medical & Emergency Information -->
          <div style="grid-column:1/-1; border-top:1px dashed var(--border-color); padding-top:10px; margin-top:4px;">
            <div style="font-weight:700; color:#dc2626; font-size:0.85rem; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="cross"></i> Medical, Health &amp; Emergency Alert Records
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Known Allergies (Food / Medication)</label>
            <input class="form-input" id="ed-allergies" placeholder="e.g. Peanuts, Penicillin, Dust" value="${esc(s.allergies || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Chronic Conditions / Physical Limitations</label>
            <input class="form-input" id="ed-conditions" placeholder="e.g. Asthma (Inhaler), Type 1 Diabetes, Epilepsy" value="${esc(s.medical_conditions || s.medicalConditions || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Emergency Physician / Clinic</label>
            <input class="form-input" id="ed-physician" placeholder="e.g. Dr. B. Sen (Kolkata)" value="${esc(s.emergency_physician || s.emergencyPhysician || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Emergency Hospital / Ambulance Contact</label>
            <input class="form-input font-mono" id="ed-hospital-phone" placeholder="e.g. +91 98300 12345" value="${esc(s.emergency_hospital_phone || s.emergencyHospitalPhone || '')}">
          </div>
        </div>
      </form>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="ed-cancel">Cancel</button>
      <button class="btn btn-secondary" id="ed-delete" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete</button>
      <button class="btn btn-primary" id="ed-save"><i data-lucide="save"></i> Save Changes</button>
    `;
    UIComponents.openModal({ title: `Edit Student — ${s.fullName || ''}`, bodyHtml, footerHtml });

    document.getElementById('ed-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('ed-delete').addEventListener('click', () => {
      UIComponents.closeModal();
      this.deleteStudents([s], container);
    });
    document.getElementById('ed-save').addEventListener('click', async () => {
      const name = document.getElementById('ed-name').value.trim();
      if (!name) { UIComponents.showToast('Student name is required.', 'warning'); return; }
      const res = await dbService.update('students', s.id, {
        admissionNo: document.getElementById('ed-admission').value.trim(),
        rollNo: document.getElementById('ed-roll').value.trim(),
        fullName: name,
        gender: document.getElementById('ed-gender').value,
        dob: document.getElementById('ed-dob').value || null,
        grade: document.getElementById('ed-grade').value,
        section: document.getElementById('ed-section').value,
        guardianName: document.getElementById('ed-guardian').value.trim(),
        guardianPhone: document.getElementById('ed-phone').value.trim(),
        bloodGroup: document.getElementById('ed-blood').value.trim(),
        blood_group: document.getElementById('ed-blood').value.trim(),
        allergies: document.getElementById('ed-allergies').value.trim(),
        medical_conditions: document.getElementById('ed-conditions').value.trim(),
        emergency_physician: document.getElementById('ed-physician').value.trim(),
        emergency_hospital_phone: document.getElementById('ed-hospital-phone').value.trim(),
        address: document.getElementById('ed-address').value.trim(),
        status: document.getElementById('ed-status').value
      });
      if (res && res._syncError) { UIComponents.showToast(`Could not save: ${res._syncError}`, 'danger'); return; }
      await auditService.log('STUDENT_UPDATED', 'STUDENTS', { studentId: s.id, name }, s.id);
      UIComponents.showToast('Student details updated.', 'success');
      UIComponents.closeModal();
      await StudentModule.render(container);
    });
    UIComponents.refreshIcons();
  }

  static async deleteStudents(rows, container) {
    const label = rows.length === 1 ? `Delete ${rows[0].fullName}?` : `Delete ${rows.length} selected students?`;
    const ok = await UIComponents.confirm({
      title: 'Delete Student Record(s)',
      message: `Are you sure you want to proceed? ${label} This removes student records, guardian links, and credentials permanently.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'trash-2'
    });
    if (!ok) return;
    for (const s of rows) {
      // eslint-disable-next-line no-await-in-loop
      await dbService.delete('students', s.id);
      // eslint-disable-next-line no-await-in-loop
      await auditService.log('STUDENT_DELETED', 'STUDENTS', { studentId: s.id, admissionNo: s.admissionNo, name: s.fullName }, s.id);
    }
    UIComponents.showToast(`${rows.length} student(s) deleted.`, 'success');
    await StudentModule.render(container);
  }

  static bindEvents(container) {
    // View Switcher (Cards vs Table)
    const viewToggle = container.querySelector('#student-view-toggle');
    const cardsContainer = container.querySelector('#students-cards-view-container');
    const tableContainer = container.querySelector('#students-table-view-container');
    const savedView = localStorage.getItem('tms_student_view_mode') || (window.innerWidth <= 768 ? 'cards' : 'cards');

    const setView = (mode) => {
      localStorage.setItem('tms_student_view_mode', mode);
      if (viewToggle) {
        viewToggle.querySelectorAll('.view-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.view === mode);
        });
      }
      if (cardsContainer) cardsContainer.style.display = mode === 'cards' ? 'grid' : 'none';
      if (tableContainer) tableContainer.style.display = mode === 'table' ? 'block' : 'none';
    };

    if (viewToggle) {
      viewToggle.querySelectorAll('.view-btn').forEach((b) => {
        b.addEventListener('click', () => setView(b.dataset.view));
      });
    }
    setView(savedView);

    const searchInput = container.querySelector('#search-student-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        // Filter table rows
        const rows = container.querySelectorAll('#students-table tbody tr');
        rows.forEach(row => {
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
        // Filter cards
        const cards = container.querySelectorAll('.student-card');
        cards.forEach(card => {
          const text = card.innerText.toLowerCase();
          card.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }

    /* ---- Selection, bulk actions, edit & delete ---- */
    const students = this._students || [];
    const canManage = PermissionEngine.can(CAPABILITIES.MANAGE_STUDENTS);
    const checked = () => Array.from(container.querySelectorAll('.student-row-check:checked')).map((c) => c.value);
    const syncCount = () => {
      const el = container.querySelector('#students-selected-count');
      if (el) el.innerText = checked().length;
    };
    const selectedStudents = () => students.filter((s) => checked().includes(s.id));

    container.querySelectorAll('.student-row-check').forEach((c) => c.addEventListener('change', syncCount));
    const selectAllCb = container.querySelector('#students-select-all-cb');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        container.querySelectorAll('.student-row-check').forEach((c) => { c.checked = selectAllCb.checked; });
        syncCount();
      });
    }
    const selectAllBtn = container.querySelector('#btn-students-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        container.querySelectorAll('.student-row-check').forEach((c) => { c.checked = true; });
        syncCount();
      });
    }
    const clearBtn = container.querySelector('#btn-students-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        container.querySelectorAll('.student-row-check').forEach((c) => { c.checked = false; });
        syncCount();
      });
    }
    const bulkDelete = container.querySelector('#btn-students-bulk-delete');
    if (bulkDelete) {
      bulkDelete.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Select at least one student.', 'warning'); return; }
        this.deleteStudents(rows, container);
      });
    }
    const bulkImportBtn = container.querySelector('#btn-bulk-import-students');
    if (bulkImportBtn) {
      bulkImportBtn.addEventListener('click', () => StudentModule.openBulkImportModal(container));
    }

    const bulkEditBtn = container.querySelector('#btn-students-bulk-edit');
    if (bulkEditBtn) {
      bulkEditBtn.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Please select at least one student.', 'warning'); return; }
        StudentModule.openBulkEditModal(rows, container);
      });
    }

    const bulkClassBtn = container.querySelector('#btn-students-bulk-class');
    if (bulkClassBtn) {
      bulkClassBtn.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Please select at least one student.', 'warning'); return; }
        StudentModule.openBulkClassModal(rows, container);
      });
    }

    const bulkStatusBtn = container.querySelector('#btn-students-bulk-status');
    if (bulkStatusBtn) {
      bulkStatusBtn.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Please select at least one student.', 'warning'); return; }
        StudentModule.openBulkStatusModal(rows, container);
      });
    }

    const bulkRollBtn = container.querySelector('#btn-students-bulk-roll');
    if (bulkRollBtn) {
      bulkRollBtn.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Please select at least one student.', 'warning'); return; }
        StudentModule.openBulkRollModal(rows, container);
      });
    }
    const bulkExport = container.querySelector('#btn-students-bulk-export');
    if (bulkExport) {
      bulkExport.addEventListener('click', () => {
        const rows = selectedStudents();
        if (!rows.length) { UIComponents.showToast('Select at least one student.', 'warning'); return; }
        const header = ['Admission No', 'Roll', 'Name', 'Gender', 'DOB', 'Class', 'Section', 'Guardian', 'Phone', 'Blood', 'Status'];
        const data = rows.map((s) => [s.admissionNo, s.rollNo, s.fullName, s.gender, s.dob, s.grade, s.section, s.guardianName, s.guardianPhone, s.bloodGroup, s.status]);
        downloadCsv(`TMS-Students-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
        UIComponents.showToast('Selected students exported.', 'success');
      });
    }
    container.querySelectorAll('.btn-edit-student').forEach((b) =>
      b.addEventListener('click', () => {
        const s = students.find((x) => x.id === b.dataset.id);
        if (s) this.openStudentEditModal(s, container);
      }));
    container.querySelectorAll('.btn-del-student').forEach((b) =>
      b.addEventListener('click', () => {
        const s = students.find((x) => x.id === b.dataset.id);
        if (s) this.deleteStudents([s], container);
      }));

    const newAdmBtn = container.querySelector('#btn-new-admission');
    if (newAdmBtn) {
      newAdmBtn.addEventListener('click', () => {
        UIComponents.openModal({
          title: 'Enroll Student — New or Previous Years',
          maxWidth: '720px',
          bodyHtml: `
            <form id="form-enroll-student">
              <div style="margin-bottom:14px; padding:12px 14px; background:rgba(37,99,235,0.06); border:1.5px solid rgba(37,99,235,0.25); border-radius:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-weight:700; font-size:0.88rem; color:#1e40af; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="history" style="width:16px;height:16px;"></i> Previous Year / Already Admitted Student?
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Check this to manually enter their original historical Admission Number and Roll Number.</div>
                </div>
                <label style="display:inline-flex; align-items:center; cursor:pointer; gap:6px; font-weight:700; font-size:0.85rem; color:#1e40af;">
                  <input type="checkbox" id="adm-is-historical" style="width:18px; height:18px; cursor:pointer;">
                  <span>Manual Admission No</span>
                </label>
              </div>

              <div id="historical-fields-container" style="display:none; margin-bottom:14px; padding:12px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight:700; color:#1e40af;">Original Admission Number *</label>
                    <input class="form-input font-mono" id="adm-manual-no" placeholder="e.g. TMS/2022/045 or 1042">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Original Roll Number</label>
                    <input class="form-input font-mono" id="adm-manual-roll" placeholder="e.g. 14">
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Full Name *</label>
                  <input class="form-input" id="adm-fullname" required placeholder="e.g. Adil Mansoor">
                </div>
                <div class="form-group">
                  <label class="form-label">Date of Birth</label>
                  <input type="date" class="form-input" id="adm-dob">
                </div>
                <div class="form-group">
                  <label class="form-label">Gender</label>
                  <select class="form-select" id="adm-gender">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Blood Group</label>
                  <select class="form-select" id="adm-blood">
                    <option value="">Not Recorded</option>
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Current Grade / Class *</label>
                  <select class="form-select" id="adm-grade">
                    ${TMS_CONFIG.academic.classes.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Section *</label>
                  <select class="form-select" id="adm-section">
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Guardian / Father Name</label>
                  <input class="form-input" id="adm-guardian" placeholder="Father / Mother Name">
                </div>
                <div class="form-group">
                  <label class="form-label">Guardian Phone</label>
                  <input class="form-input" id="adm-phone" placeholder="+91 98300 00000">
                </div>
              </div>
              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Residential Address / Village</label>
                <textarea class="form-textarea" id="adm-address" rows="2" placeholder="Full residential address"></textarea>
              </div>
            </form>
          `,
          footerHtml: `
            <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-enrollment">Confirm Enrollment</button>
          `
        });

        const histCb = document.getElementById('adm-is-historical');
        const histContainer = document.getElementById('historical-fields-container');
        if (histCb && histContainer) {
          histCb.addEventListener('change', () => {
            histContainer.style.display = histCb.checked ? 'block' : 'none';
          });
        }

        document.getElementById('btn-save-enrollment').addEventListener('click', async () => {
          const fullName = document.getElementById('adm-fullname').value.trim();
          const dob = document.getElementById('adm-dob').value;
          const gender = document.getElementById('adm-gender').value;
          const bloodGroup = document.getElementById('adm-blood').value;
          const grade = document.getElementById('adm-grade').value;
          const section = document.getElementById('adm-section').value;
          const guardianName = document.getElementById('adm-guardian').value.trim();
          const guardianPhone = document.getElementById('adm-phone').value.trim();
          const address = document.getElementById('adm-address').value.trim();

          if (!fullName) {
            UIComponents.showToast('Please enter student full name', 'warning');
            return;
          }

          const isHistorical = document.getElementById('adm-is-historical')?.checked;
          let admissionNo = '';
          let rollNo = '';

          if (isHistorical) {
            admissionNo = document.getElementById('adm-manual-no')?.value.trim();
            rollNo = document.getElementById('adm-manual-roll')?.value.trim();
            if (!admissionNo) {
              UIComponents.showToast('Please enter the historical admission number.', 'warning');
              return;
            }
          } else {
            const existing = await dbService.select('students');
            const maxSeq = existing.reduce((max, s) => {
              const m = String(s.admissionNo || '').match(/(\d+)\s*$/);
              return m ? Math.max(max, parseInt(m[1], 10)) : max;
            }, 0);
            const nextSeq = maxSeq + 1;
            admissionNo = `TMS/${new Date().getFullYear()}/${nextSeq.toString().padStart(3, '0')}`;
            rollNo = nextSeq.toString().padStart(2, '0');
          }

          const newStudent = await dbService.insert('students', {
            admissionNo,
            rollNo,
            fullName,
            dob: dob || null,
            gender,
            bloodGroup,
            grade,
            section,
            guardianName,
            guardianPhone,
            address,
            status: 'Active',
            leaveStatus: null
          });

          if (newStudent._syncError) {
            UIComponents.showToast(`Enrollment could not be saved: ${newStudent._syncError}`, 'danger');
            return;
          }

          await auditService.log('STUDENT_ENROLLED', 'ACADEMIC', { admissionNo, fullName, grade, isHistorical: !!isHistorical }, newStudent.id);
          UIComponents.closeModal();
          UIComponents.showToast(`Student ${fullName} enrolled (${admissionNo})!`, 'success');
          StudentModule.render(container);
        });
      });
    }

    // Bulk ID Card generator button
    const bulkIdBtn = container.querySelector('#btn-bulk-print-id-cards');
    if (bulkIdBtn) {
      bulkIdBtn.addEventListener('click', () => StudentModule.openBulkIdCardModal());
    }

    // Medical & Infirmary Roster Button
    const infirmaryBtn = container.querySelector('#btn-infirmary-roster');
    if (infirmaryBtn) {
      infirmaryBtn.addEventListener('click', () => StudentModule.openInfirmaryRosterModal(this._students || []));
    }

    // Individual ID Card generator
    container.querySelectorAll('.btn-print-id').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const students = await dbService.select('students');
        const s = students.find(item => item.id === id);
        if (!s) return;
        await StudentModule.openStudentIdCardModal(s);
      });
    });

    // Merit & Demerit Log Modal
    container.querySelectorAll('.btn-merit-log').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const students = await dbService.select('students');
        const s = students.find(item => item.id === id);
        if (!s) return;
        await StudentModule.openMeritModal(s, container);
      });
    });

    // Comprehensive Student Profile Modal
    container.querySelectorAll('.btn-view-profile').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const students = await dbService.select('students');
        const s = students.find(item => item.id === id);
        if (!s) return;
        await StudentModule.openStudentProfileModal(s, container);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Student Behavioral Merit & Demerit Conduct Ledger                  */
  /* ------------------------------------------------------------------ */
  static async openMeritModal(student, container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const allMerits = await dbService.select('student_merits') || [];
    const studentMerits = allMerits.filter(m => m.studentId === student.id || m.admissionNo === student.admissionNo);

    // Compute Net Points
    let netScore = 0;
    studentMerits.forEach(m => {
      const pts = parseInt(m.points, 10) || 0;
      if (m.type === 'merit') netScore += pts;
      else netScore -= Math.abs(pts);
    });

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Student Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${esc(student.fullName)}</div>
            <div style="font-size: 0.8rem; color: #64748b;">Adm: <strong class="font-mono">${esc(student.admissionNo)}</strong> • Roll: <strong>${esc(student.rollNo || '—')}</strong> • Class: <strong>${esc(student.grade)} ${esc(student.section || 'A')}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Conduct Score</div>
            <span class="badge ${netScore >= 20 ? 'badge-success' : netScore >= 0 ? 'badge-info' : 'badge-danger'}" style="font-size: 1.05rem; padding: 4px 12px; margin-top: 2px;">
              ${netScore > 0 ? '+' : ''}${netScore} Points
            </span>
          </div>
        </div>

        <!-- Add Award / Demerit Form -->
        <div style="background: #ffffff; border: 1.5px solid #16a34a; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.88rem; font-weight: 700; color: #166534; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i> Award Merit Badge or Record Disciplinary Notice
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr 100px; gap: 10px; margin-bottom: 10px;">
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Action Type</label>
              <select class="form-select" id="inp-merit-type" style="padding: 6px 10px; font-size: 0.82rem;">
                <option value="merit">🌟 Merit Badge</option>
                <option value="demerit">⚠️ Demerit / Notice</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Category / Recognition</label>
              <select class="form-select" id="inp-merit-cat" style="padding: 6px 10px; font-size: 0.82rem;">
                <option value="Quranic Adab & Sunnah Etiquette|10">🌟 Quranic Adab & Sunnah Etiquette (+10 pts)</option>
                <option value="Academic Excellence & Olympiad|15">📚 Academic Excellence & Olympiad (+15 pts)</option>
                <option value="100% Punctuality & Perfect Attendance|10">⏰ 100% Punctuality & Attendance (+10 pts)</option>
                <option value="Peer Assistance & Campus Service|10">🤝 Peer Assistance & Campus Service (+10 pts)</option>
                <option value="Co-Curricular, Arts & Speech Contest|10">🎨 Co-Curricular & Speech (+10 pts)</option>
                <option value="Late Arrival to Morning Assembly|5">⚠️ Late Arrival to Morning Assembly (-5 pts)</option>
                <option value="Homework Incompletion / Neglect|5">⚠️ Homework Incompletion (-5 pts)</option>
                <option value="Uniform / Dress Code Infraction|5">⚠️ Uniform / Dress Code Infraction (-5 pts)</option>
                <option value="Classroom Disruptive Behavior|10">⚠️ Classroom Disruptive Behavior (-10 pts)</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Points</label>
              <input type="number" class="form-input font-mono" id="inp-merit-points" value="10" style="padding: 6px 10px; font-size: 0.82rem; text-align: center;">
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-end;">
            <div style="flex: 1;">
              <label class="form-label" style="font-size: 0.75rem;">Teacher's Note / Context</label>
              <input type="text" class="form-input" id="inp-merit-notes" placeholder="e.g. Demonstrated exceptional humility and kindness helping Grade 1 students." style="padding: 6px 10px; font-size: 0.82rem;">
            </div>
            <button class="btn btn-primary" id="btn-save-merit-entry" style="padding: 6px 16px; font-size: 0.82rem;">
              <i data-lucide="check"></i> Record Entry
            </button>
          </div>
        </div>

        <!-- History Ledger -->
        <div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
            Conduct &amp; Merit History Timeline:
          </div>
          <div style="max-height: 240px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            ${studentMerits.length ? `
              <table class="tms-table" style="font-size: 0.8rem;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="width: 80px;">Type</th>
                    <th>Category</th>
                    <th>Teacher's Note</th>
                    <th style="width: 75px; text-align: center;">Points</th>
                    <th style="width: 90px;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentMerits.map(m => `
                    <tr>
                      <td>
                        <span class="badge ${m.type === 'merit' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.7rem;">
                          ${m.type === 'merit' ? 'MERIT' : 'DEMERIT'}
                        </span>
                      </td>
                      <td><strong>${esc(m.category)}</strong></td>
                      <td style="color: #64748b;">${esc(m.reason || '—')}</td>
                      <td style="text-align: center; font-weight: 700; color: ${m.type === 'merit' ? '#16a34a' : '#dc2626'};" class="font-mono">
                        ${m.type === 'merit' ? '+' : '-'}${Math.abs(m.points)}
                      </td>
                      <td style="font-size: 0.75rem; color: #64748b;">${esc(m.date || (m.createdAt || '').slice(0, 10))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 0.85rem;">
                No merit or discipline events recorded yet for this student. Student is in perfect standing.
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: `Student Behavioral & Merit Log — ${student.fullName}`,
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
      `
    });

    UIComponents.refreshIcons();

    // Auto-update points when category changes
    const catSelect = document.getElementById('inp-merit-cat');
    const ptsInput = document.getElementById('inp-merit-points');
    const typeSelect = document.getElementById('inp-merit-type');
    if (catSelect && ptsInput) {
      catSelect.addEventListener('change', () => {
        const parts = catSelect.value.split('|');
        if (parts[1]) ptsInput.value = parts[1];
        if (parts[0].startsWith('⚠️')) {
          typeSelect.value = 'demerit';
        } else {
          typeSelect.value = 'merit';
        }
      });
    }

    // Save entry
    const saveBtn = document.getElementById('btn-save-merit-entry');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const catVal = catSelect.value.split('|')[0];
        const points = parseInt(ptsInput.value, 10) || 10;
        const notes = document.getElementById('inp-merit-notes').value.trim();
        const type = typeSelect.value;

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        await dbService.insert('student_merits', {
          studentId: student.id,
          studentName: student.fullName,
          admissionNo: student.admissionNo,
          grade: student.grade,
          type,
          category: catVal,
          points,
          reason: notes,
          date: new Date().toISOString().split('T')[0]
        });

        await auditService.log('MERIT_AWARDED', 'STUDENTS', {
          student: student.fullName,
          admissionNo: student.admissionNo,
          type,
          category: catVal,
          points
        });

        UIComponents.showToast(`${type === 'merit' ? '🌟 Merit badge' : '⚠️ Disciplinary note'} saved!`, 'success');
        StudentModule.openMeritModal(student, container);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Comprehensive 360-Degree Student Profile Viewer                    */
  /* ------------------------------------------------------------------ */
  static async openStudentProfileModal(student, container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const [allMerits, allInvoices, allAttendance] = await Promise.all([
      dbService.select('student_merits'),
      dbService.select('invoices'),
      dbService.select('attendance_records')
    ]);

    const merits = (allMerits || []).filter(m => m.studentId === student.id || m.admissionNo === student.admissionNo);
    const invoices = (allInvoices || []).filter(i => i.studentId === student.id || i.admissionNo === student.admissionNo || (i.studentName && i.studentName.toLowerCase() === (student.fullName || '').toLowerCase()));
    const attList = (allAttendance || []).filter(a => a.studentId === student.id || a.admissionNo === student.admissionNo);

    const totalDue = invoices.reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);
    const presentCount = attList.filter(a => a.status === 'present').length;
    const attRate = attList.length ? `${Math.round((presentCount / attList.length) * 100)}%` : '100%';

    let netMerit = 0;
    merits.forEach(m => {
      netMerit += (m.type === 'merit' ? 1 : -1) * (parseInt(m.points, 10) || 0);
    });

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Header Banner -->
        <div style="display: flex; gap: 16px; align-items: center; background: linear-gradient(135deg, #064e3b, #0f172a); color: #fff; padding: 18px; border-radius: 12px; margin-bottom: 20px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; overflow: hidden; background: #e2e8f0; border: 3px solid #16a34a; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            ${student.photo ? `<img src="${esc(student.photo)}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 1.8rem; font-weight: 800; color: #0f172a;">${(student.fullName || 'S').slice(0, 1)}</span>`}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 1.35rem; font-weight: 800; color: #4ade80;">${esc(student.fullName)}</div>
            <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 2px;">
              Admission: <strong class="font-mono" style="color: #fff;">${esc(student.admissionNo)}</strong> • Roll: <strong>${esc(student.rollNo || '—')}</strong> • Class: <strong>${esc(student.grade)} ${esc(student.section || 'A')}</strong>
            </div>
            <div style="margin-top: 6px; display: flex; gap: 8px;">
              <span class="badge badge-success">${esc(student.status || 'Active')}</span>
              <span class="badge badge-info">Session ${esc(TMS_CONFIG.academic.currentYear)}</span>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Attendance Rate</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #16a34a; margin-top: 2px;">${attRate}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Conduct Score</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: ${netMerit >= 0 ? '#16a34a' : '#dc2626'}; margin-top: 2px;">${netMerit > 0 ? '+' : ''}${netMerit} Pts</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Outstanding Fee</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: ${totalDue > 0 ? '#dc2626' : '#16a34a'}; margin-top: 2px;">₹ ${totalDue.toLocaleString()}</div>
          </div>
        </div>

        <!-- Particulars & Emergency Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 0.85rem; margin-bottom: 16px;">
          <div><strong>Date of Birth:</strong> ${esc(student.dob || student.dateOfBirth || '—')}</div>
          <div><strong>Gender:</strong> ${esc(student.gender || '—')}</div>
          <div><strong>Blood Group:</strong> <span class="badge badge-info">${esc(student.bloodGroup || student.blood_group || '—')}</span></div>
          <div><strong>Father / Guardian:</strong> ${esc(student.guardianName || student.parentName || '—')}</div>
          <div><strong>Guardian Phone:</strong> <span class="font-mono">${esc(student.guardianPhone || '—')}</span></div>
          <div><strong>Address:</strong> ${esc(student.address || '—')}</div>
          <div style="grid-column: 1/-1; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 4px;">
            <strong style="color: #dc2626;">Allergies / Medical Notes:</strong>
            <span style="color: #475569;">${esc(student.allergies || student.medical_conditions || 'None recorded.')}</span>
          </div>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: `Student 360° Profile — ${student.fullName}`,
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
        <button class="btn btn-secondary" id="btn-profile-open-merit" style="color: #16a34a;"><i data-lucide="shield-check"></i> Merit Ledger</button>
        <button class="btn btn-primary" id="btn-profile-print-id"><i data-lucide="id-card"></i> Print ID Badge</button>
      `
    });

    UIComponents.refreshIcons();

    document.getElementById('btn-profile-open-merit')?.addEventListener('click', () => {
      UIComponents.closeModal();
      StudentModule.openMeritModal(student, container);
    });

    document.getElementById('btn-profile-print-id')?.addEventListener('click', () => {
      UIComponents.closeModal();
      StudentModule.openStudentIdCardModal(student);
    });
  }

  static renderIdCardMarkup(s, photoUrl, cardPrefix = 'id-card-qr') {
    const esc = (v) => UIComponents.escapeHtml(v);
    const photoHtml = photoUrl
      ? `<img src="${esc(photoUrl)}" alt="Photo" style="width:100%; height:100%; object-fit:cover; display:block;">`
      : `<div style="width:100%; height:100%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:9px; text-align:center;"><i data-lucide="user" style="width:28px;height:28px;color:#94a3b8;"></i></div>`;

    const qrContainerId = `${cardPrefix}-${String(s.id || s.admissionNo).replace(/[^a-zA-Z0-9]/g, '-')}`;

    return `
      <div class="pvc-id-card-pair" style="display:inline-flex; gap:16px; margin:10px; font-family:'Plus Jakarta Sans', sans-serif; text-align:left;">
        <!-- FRONT SIDE -->
        <div class="pvc-card-side" style="width:336px; height:212px; border-radius:12px; background:linear-gradient(135deg, #064e3b 0%, #0f172a 100%); color:#fff; position:relative; overflow:hidden; border:2px solid #16a34a; box-shadow:0 6px 20px rgba(0,0,0,0.25); display:flex; flex-direction:column; justify-content:space-between; padding:12px; box-sizing:border-box;">
          <div style="position:absolute; top:-35px; right:-35px; width:110px; height:110px; border-radius:50%; background:radial-gradient(circle, rgba(34,197,94,0.22) 0%, transparent 70%); pointer-events:none;"></div>
          
          <!-- Header -->
          <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:6px;">
            <div style="flex-shrink:0;">${TMS_LOGO.emblemSvg(32)}</div>
            <div style="flex:1; line-height:1.15;">
              <div style="font-family:'Outfit', sans-serif; font-size:11.5px; font-weight:800; letter-spacing:0.04em; color:#4ade80; text-transform:uppercase;">
                ${esc(TMS_CONFIG.institution.name)}
              </div>
              <div style="font-size:7px; color:#cbd5e1; letter-spacing:0.02em;">
                Run by : Thaiba Heritage, Kolkata
              </div>
            </div>
            <span style="font-size:7px; background:#16a34a; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Student</span>
          </div>

          <!-- Body -->
          <div style="display:flex; gap:10px; align-items:center; margin:4px 0;">
            <div style="width:68px; height:82px; border:2px solid #22c55e; border-radius:6px; overflow:hidden; background:#fff; flex-shrink:0;">
              ${photoHtml}
            </div>
            <div style="flex:1; min-width:0; line-height:1.25;">
              <div style="font-size:13px; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${esc(s.fullName || 'Student Name')}
              </div>
              <div style="font-size:9.5px; color:#38bdf8; font-weight:700; margin-bottom:4px;">
                ${esc(s.grade || '')} • Sec ${esc(s.section || 'A')} • Roll #${esc(s.rollNo || '—')}
              </div>
              <div style="font-size:8px; color:#cbd5e1; background:rgba(255,255,255,0.08); padding:4px 6px; border-radius:4px;">
                <div><strong>Adm No:</strong> <span class="font-mono" style="color:#fde047; font-weight:700;">${esc(s.admissionNo || '—')}</span></div>
                <div><strong>Blood:</strong> <span style="color:#ef4444; font-weight:800;">${esc(s.bloodGroup || 'O+')}</span> &nbsp;•&nbsp; <strong>DOB:</strong> ${esc((s.dob || '').slice(0, 10))}</div>
                <div><strong>Emergency:</strong> <span class="font-mono">${esc(s.guardianPhone || '—')}</span></div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.15); padding-top:4px; font-size:7px; color:#94a3b8;">
            <div>Session 2027 - 2028 • Smart Campus Pass</div>
            <div id="${qrContainerId}" class="qr-target" data-value="TMS-VERIFY:${esc(s.admissionNo)}:${esc(s.fullName)}" style="width:28px; height:28px; background:#fff; padding:1px; border-radius:3px; display:inline-block;"></div>
          </div>
        </div>

        <!-- BACK SIDE -->
        <div class="pvc-card-side" style="width:336px; height:212px; border-radius:12px; background:#0f172a; color:#cbd5e1; position:relative; overflow:hidden; border:2px solid #334155; box-shadow:0 6px 20px rgba(0,0,0,0.25); display:flex; flex-direction:column; justify-content:space-between; padding:12px; font-size:8px; line-height:1.35; box-sizing:border-box;">
          <div style="border-bottom:1px solid #334155; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#38bdf8; font-size:8.5px; text-transform:uppercase;">Institutional Smart Card</strong>
            <span style="font-size:7px; color:#64748b;">Terms of Issue</span>
          </div>

          <ul style="list-style:disc; margin:4px 0 4px 14px; padding:0; font-size:7.5px; color:#94a3b8;">
            <li>This card is institutional property and must be worn inside campus.</li>
            <li>If found, please return to THAIBA PUBLIC SCHOOL, Baghait, Tapan.</li>
            <li>Lost cards must be reported to the school office immediately.</li>
          </ul>

          <div style="background:rgba(255,255,255,0.04); padding:4px 6px; border-radius:4px; font-size:7.5px; color:#cbd5e1;">
            <div><strong>Parent / Guardian:</strong> ${esc(s.guardianName || '—')}</div>
            <div><strong>Residential Address:</strong> ${esc((s.address || '').slice(0, 50))}</div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #334155; padding-top:4px;">
            <div style="font-size:7px; color:#64748b; line-height:1.2;">
              ${esc(TMS_CONFIG.institution.name)}<br>
              Baghait, Tapan, Dakshin Dinajpur - 733127<br>
              Helpline: +91 8653382851, +91 8167782851
            </div>
            <div style="text-align:center;">
              <div style="font-family:'Brush Script MT', cursive, sans-serif; font-size:12px; color:#22c55e; margin-bottom:1px;">Thaiba Authority</div>
              <div style="font-size:7px; font-weight:700; color:#fff; border-top:1px dashed #64748b; padding-top:1px;">Principal / Controller</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static async openStudentIdCardModal(s) {
    let photoUrl = '';
    if (s.photo) {
      photoUrl = (await admissionService.getSignedUrl('admission-docs', s.photo, 3600)) || '';
    }

    const cardMarkup = StudentModule.renderIdCardMarkup(s, photoUrl, 'single-id-qr');

    UIComponents.openModal({
      title: `Printable Smart PVC ID Card — ${s.fullName}`,
      bodyHtml: `
        <div style="text-align:center; margin-bottom:14px; font-size:0.85rem; color:var(--text-muted);">
          Official CR-80 PVC dimensions (Front &amp; Back). Includes scannable verification QR Code.
        </div>
        <div id="single-id-print-area" style="text-align:center;">
          ${cardMarkup}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
        <button class="btn btn-primary" id="btn-print-single-card"><i data-lucide="printer"></i> Print PVC Card</button>
      `,
      maxWidth: '780px'
    });

    // Generate real QR code in target element
    setTimeout(() => {
      const qrTarget = document.querySelector('#single-id-print-area .qr-target');
      if (qrTarget && window.QRCode) {
        qrTarget.innerHTML = '';
        new window.QRCode(qrTarget, {
          text: qrTarget.dataset.value || s.admissionNo,
          width: 26,
          height: 26,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      }
      UIComponents.refreshIcons();
    }, 50);

    const printBtn = document.getElementById('btn-print-single-card');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const printContent = document.getElementById('single-id-print-area').innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${formatPdfFilename("Student_ID_Card", `${s.admissionNo || ""}_${s.fullName}`.replace(/\s+/g, "_"))}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
            <style>
              body { margin: 20px; background: #fff; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${printContent}
            <script>window.onload = function() { window.print(); window.close(); }<\/script>
          </body>
          </html>
        `);
        win.document.close();
      });
    }

    UIComponents.refreshIcons();
  }

  static async openBulkIdCardModal() {
    const students = await dbService.select('students');
    const classes = TMS_CONFIG.academic.classes;

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <label style="font-size:0.85rem; font-weight:700; margin-right:8px;">Filter by Class:</label>
          <select class="form-select" id="bulk-id-grade-select" style="width:160px; display:inline-block;">
            <option value="all">All Classes (${students.length})</option>
            ${classes.map(c => {
              const count = students.filter(s => s.grade === c).length;
              return `<option value="${c}">${c} (${count})</option>`;
            }).join('')}
          </select>
        </div>
        <div style="font-size:0.82rem; color:var(--text-muted);">
          Generates batch PVC ID card print sheet for cutting and laminating.
        </div>
      </div>
      <div id="bulk-id-preview-container" style="max-height:60vh; overflow-y:auto; text-align:center; padding:10px; background:var(--bg-subtle); border-radius:10px; border:1px solid var(--border-color);">
        <p style="color:var(--text-muted); font-size:0.85rem;">Loading student cards…</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
      <button class="btn btn-primary" id="btn-print-bulk-sheet"><i data-lucide="printer"></i> Print Batch ID Sheet</button>
    `;

    UIComponents.openModal({
      title: 'Bulk PVC Student ID Card Generator',
      bodyHtml,
      footerHtml,
      maxWidth: '920px'
    });

    const container = document.getElementById('bulk-id-preview-container');
    const select = document.getElementById('bulk-id-grade-select');

    const renderBatch = (list) => {
      if (!list.length) {
        container.innerHTML = '<p style="color:var(--text-muted); padding:30px;">No students enrolled in this selection.</p>';
        return;
      }
      container.innerHTML = list.map((s, idx) => StudentModule.renderIdCardMarkup(s, null, `bulk-qr-${idx}`)).join('');

      // Generate QR codes
      setTimeout(() => {
        container.querySelectorAll('.qr-target').forEach((el) => {
          if (window.QRCode) {
            el.innerHTML = '';
            new window.QRCode(el, {
              text: el.dataset.value || 'TMS',
              width: 26,
              height: 26,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: window.QRCode.CorrectLevel.M
            });
          }
        });
        UIComponents.refreshIcons();
      }, 50);
    };

    renderBatch(students);

    if (select) {
      select.addEventListener('change', (e) => {
        const val = e.target.value;
        const filtered = val === 'all' ? students : students.filter(s => s.grade === val);
        renderBatch(filtered);
      });
    }

    const printBulkBtn = document.getElementById('btn-print-bulk-sheet');
    if (printBulkBtn) {
      printBulkBtn.addEventListener('click', () => {
        const printContent = container.innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${formatPdfFilename("Student_ID_Cards_Batch", (select ? select.value : "All"))}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
            <style>
              body { margin: 10px; background: #fff; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .pvc-id-card-pair { page-break-inside: avoid; margin-bottom: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">
              ${printContent}
            </div>
            <script>window.onload = function() { window.print(); window.close(); }<\/script>
          </body>
          </html>
        `);
        win.document.close();
      });
    }

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Campus Medical, Allergy & Infirmary Roster (A4 Printable)          */
  /* ------------------------------------------------------------------ */
  static openInfirmaryRosterModal(students) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const dateStr = new Date().toLocaleDateString('en-GB');
    const emblem = TMS_LOGO.emblemSvg(50);

    const bodyHtml = `
      <div id="infirmary-roster-print" style="background:#fff; color:#0f172a; padding:20px; font-family:'Plus Jakarta Sans', sans-serif;">
        <!-- Header -->
        <div style="text-align:center; border-bottom:2px solid #dc2626; padding-bottom:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:center; margin-bottom:4px;">${emblem}</div>
          <h2 style="font-size:1.3rem; font-weight:800; color:#991b1b; text-transform:uppercase; margin:0;">${esc(TMS_CONFIG.institution.name)}</h2>
          <div style="font-size:0.75rem; color:#64748b; font-weight:600;">CAMPUS HEALTH SERVICES • OFFICIAL STUDENT INFIRMARY &amp; EMERGENCY ROSTER</div>
          <div style="display:inline-block; margin-top:6px; background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:2px 10px; border-radius:4px; font-size:0.75rem; font-weight:700;">
            Academic Session ${TMS_CONFIG.academic.currentYear} • Confidential Medical Document
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:0.8rem;">
          <div>Total Pupils Enrolled: <strong>${students.length}</strong></div>
          <div>Report Generated: <strong>${dateStr}</strong></div>
        </div>

        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.76rem; border:1px solid #cbd5e1; width:100%;">
            <thead>
              <tr style="background:#fef2f2; color:#991b1b;">
                <th>Adm No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Blood</th>
                <th>Allergies &amp; Alerts</th>
                <th>Chronic Conditions</th>
                <th>Emergency Physician</th>
                <th>Guardian Phone</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const hasAlert = s.allergies || s.medical_conditions;
                return `
                  <tr style="${hasAlert ? 'background:#fff5f5; font-weight:600;' : ''}">
                    <td><span class="font-mono">${esc(s.admissionNo || '—')}</span></td>
                    <td><strong>${esc(s.fullName)}</strong></td>
                    <td>${esc(s.grade || '')} - ${esc(s.section || 'A')}</td>
                    <td><span class="badge ${s.bloodGroup || s.blood_group ? 'badge-info' : 'badge-secondary'}">${esc(s.bloodGroup || s.blood_group || '—')}</span></td>
                    <td>
                      ${s.allergies ? `<span style="color:#dc2626; font-weight:700;">⚠️ ${esc(s.allergies)}</span>` : '<span style="color:#64748b;">None reported</span>'}
                    </td>
                    <td>
                      ${s.medical_conditions ? `<span style="color:#b45309; font-weight:700;">${esc(s.medical_conditions)}</span>` : '<span style="color:#64748b;">None</span>'}
                    </td>
                    <td>${esc(s.emergency_physician || 'Campus Infirmary')}</td>
                    <td><span class="font-mono">${esc(s.phone || s.guardianPhone || '—')}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:24px; font-size:0.72rem; text-align:center;">
          <div style="width:30%;">
            <div style="border-bottom:1px solid #0f172a; padding-bottom:20px; margin-bottom:4px;"></div>
            <strong>Campus Medical Officer</strong>
          </div>
          <div style="width:30%;">
            <div style="border-bottom:1px solid #0f172a; padding-bottom:20px; margin-bottom:4px;"></div>
            <strong>Physical Education In-Charge</strong>
          </div>
          <div style="width:30%;">
            <div style="border-bottom:1px solid #0f172a; padding-bottom:20px; margin-bottom:4px;"></div>
            <strong>Principal (Official Seal)</strong>
          </div>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: 'Campus Medical & Infirmary Emergency Roster',
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
        <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Print Medical Roster (A4)</button>
      `
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* BULK ACTIONS FOR ALL DATA FIELDS & IMPORT TOOLS                    */
  /* ================================================================== */

  /**
   * Universal Bulk Edit: Update any selected data fields across multiple students
   */
  static openBulkEditModal(rows, container) {
    const esc = UIComponents.escapeHtml;
    const bodyHtml = `
      <div style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:14px;">
        Batch update selected fields for <strong>${rows.length}</strong> student(s). Check the box next to any field you wish to update; unchecked fields will remain unchanged.
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:60vh; overflow-y:auto; padding-right:4px;">
        <!-- Class / Grade -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-grade" style="width:16px; height:16px;">
            <span>Update Class / Grade</span>
          </label>
          <select class="form-select form-select-sm" id="bulk-fld-grade" disabled style="width:100%;">
            ${TMS_CONFIG.academic.classes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>

        <!-- Section -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-section" style="width:16px; height:16px;">
            <span>Update Section</span>
          </label>
          <select class="form-select form-select-sm" id="bulk-fld-section" disabled style="width:100%;">
            ${TMS_CONFIG.academic.sections.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </div>

        <!-- Status -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-status" style="width:16px; height:16px;">
            <span>Update Enrollment Status</span>
          </label>
          <select class="form-select form-select-sm" id="bulk-fld-status" disabled style="width:100%;">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Transferred">Transferred</option>
            <option value="Alumni">Alumni / Graduated</option>
          </select>
        </div>

        <!-- Blood Group -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-blood" style="width:16px; height:16px;">
            <span>Update Blood Group</span>
          </label>
          <select class="form-select form-select-sm" id="bulk-fld-blood" disabled style="width:100%;">
            <option value="">Not Recorded</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
          </select>
        </div>

        <!-- Gender -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-gender" style="width:16px; height:16px;">
            <span>Update Gender</span>
          </label>
          <select class="form-select form-select-sm" id="bulk-fld-gender" disabled style="width:100%;">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Address / Village -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-address" style="width:16px; height:16px;">
            <span>Update Residential Address / Village</span>
          </label>
          <input class="form-input form-input-sm" id="bulk-fld-address" disabled placeholder="e.g. Vill: Harirampur, PO: Malda">
        </div>

        <!-- Emergency Hospital / Physician Contact -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-emergency" style="width:16px; height:16px;">
            <span>Update Emergency Hospital / Clinic Phone</span>
          </label>
          <input class="form-input form-input-sm font-mono" id="bulk-fld-emergency" disabled placeholder="e.g. +91 98300 12345">
        </div>

        <!-- Medical Alerts / Allergies -->
        <div style="padding:10px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin-bottom:6px;">
            <input type="checkbox" id="chk-bulk-allergies" style="width:16px; height:16px;">
            <span>Update Known Allergies / Health Alert Note</span>
          </label>
          <input class="form-input form-input-sm" id="bulk-fld-allergies" disabled placeholder="e.g. Asthma, Penicillin allergy">
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-bulk-edit"><i data-lucide="check"></i> Apply to ${rows.length} Students</button>
    `;

    UIComponents.openModal({
      title: `Bulk Edit Data Fields (${rows.length} Students Selected)`,
      bodyHtml,
      footerHtml,
      maxWidth: '680px'
    });

    // Wire up checkbox toggles
    const pairs = [
      ['chk-bulk-grade', 'bulk-fld-grade'],
      ['chk-bulk-section', 'bulk-fld-section'],
      ['chk-bulk-status', 'bulk-fld-status'],
      ['chk-bulk-blood', 'bulk-fld-blood'],
      ['chk-bulk-gender', 'bulk-fld-gender'],
      ['chk-bulk-address', 'bulk-fld-address'],
      ['chk-bulk-emergency', 'bulk-fld-emergency'],
      ['chk-bulk-allergies', 'bulk-fld-allergies']
    ];

    pairs.forEach(([chkId, fldId]) => {
      const chk = document.getElementById(chkId);
      const fld = document.getElementById(fldId);
      if (chk && fld) {
        chk.addEventListener('change', () => { fld.disabled = !chk.checked; });
      }
    });

    document.getElementById('btn-save-bulk-edit').addEventListener('click', async () => {
      const patch = {};
      if (document.getElementById('chk-bulk-grade')?.checked) patch.grade = document.getElementById('bulk-fld-grade').value;
      if (document.getElementById('chk-bulk-section')?.checked) patch.section = document.getElementById('bulk-fld-section').value;
      if (document.getElementById('chk-bulk-status')?.checked) patch.status = document.getElementById('bulk-fld-status').value;
      if (document.getElementById('chk-bulk-blood')?.checked) patch.bloodGroup = document.getElementById('bulk-fld-blood').value;
      if (document.getElementById('chk-bulk-gender')?.checked) patch.gender = document.getElementById('bulk-fld-gender').value;
      if (document.getElementById('chk-bulk-address')?.checked) patch.address = document.getElementById('bulk-fld-address').value.trim();
      if (document.getElementById('chk-bulk-emergency')?.checked) patch.emergency_hospital_phone = document.getElementById('bulk-fld-emergency').value.trim();
      if (document.getElementById('chk-bulk-allergies')?.checked) patch.allergies = document.getElementById('bulk-fld-allergies').value.trim();

      const keys = Object.keys(patch);
      if (!keys.length) {
        UIComponents.showToast('Please check at least one field to update.', 'warning');
        return;
      }

      const saveBtn = document.getElementById('btn-save-bulk-edit');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Applying updates...';

      let count = 0;
      for (const s of rows) {
        // eslint-disable-next-line no-await-in-loop
        await dbService.update('students', s.id, patch);
        count++;
      }

      await auditService.log('STUDENTS_BULK_UPDATED', 'ACADEMIC', { studentCount: count, fields: keys });
      UIComponents.closeModal();
      UIComponents.showToast(`Updated ${keys.join(', ')} for ${count} student(s)!`, 'success');
      StudentModule.render(container);
    });

    UIComponents.refreshIcons();
  }

  /**
   * Fast Class & Section reassign modal (Promotion / Section Transfer)
   */
  static openBulkClassModal(rows, container) {
    const esc = UIComponents.escapeHtml;
    const bodyHtml = `
      <div style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:14px;">
        Reassign class grade and section for <strong>${rows.length}</strong> selected student(s).
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Target Class / Grade</label>
          <select class="form-select" id="bulk-reassign-grade">
            ${TMS_CONFIG.academic.classes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Target Section</label>
          <select class="form-select" id="bulk-reassign-section">
            ${TMS_CONFIG.academic.sections.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-bulk-class"><i data-lucide="check"></i> Reassign ${rows.length} Students</button>
    `;

    UIComponents.openModal({
      title: `Move Class & Section (${rows.length} Students)`,
      bodyHtml,
      footerHtml
    });

    document.getElementById('btn-save-bulk-class').addEventListener('click', async () => {
      const grade = document.getElementById('bulk-reassign-grade').value;
      const section = document.getElementById('bulk-reassign-section').value;
      for (const s of rows) {
        // eslint-disable-next-line no-await-in-loop
        await dbService.update('students', s.id, { grade, section });
      }
      await auditService.log('STUDENTS_CLASS_PROMOTED', 'ACADEMIC', { studentCount: rows.length, grade, section });
      UIComponents.closeModal();
      UIComponents.showToast(`Moved ${rows.length} student(s) to ${grade} - ${section}.`, 'success');
      StudentModule.render(container);
    });
    UIComponents.refreshIcons();
  }

  /**
   * Fast Status change modal (Active, Inactive, Transferred, Alumni)
   */
  static openBulkStatusModal(rows, container) {
    const bodyHtml = `
      <div style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:14px;">
        Update enrollment status for <strong>${rows.length}</strong> selected student(s).
      </div>
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">New Status</label>
        <select class="form-select" id="bulk-reassign-status">
          <option value="Active">Active (Regular Student)</option>
          <option value="Inactive">Inactive (Suspended / Paused)</option>
          <option value="On Leave">On Leave</option>
          <option value="Transferred">Transferred (TC Issued)</option>
          <option value="Alumni">Alumni (Graduated / Passed Out)</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-bulk-status"><i data-lucide="check"></i> Update Status</button>
    `;

    UIComponents.openModal({
      title: `Change Status (${rows.length} Students)`,
      bodyHtml,
      footerHtml
    });

    document.getElementById('btn-save-bulk-status').addEventListener('click', async () => {
      const status = document.getElementById('bulk-reassign-status').value;
      for (const s of rows) {
        // eslint-disable-next-line no-await-in-loop
        await dbService.update('students', s.id, { status });
      }
      await auditService.log('STUDENTS_STATUS_CHANGED', 'ACADEMIC', { studentCount: rows.length, status });
      UIComponents.closeModal();
      UIComponents.showToast(`Status updated to "${status}" for ${rows.length} student(s).`, 'success');
      StudentModule.render(container);
    });
    UIComponents.refreshIcons();
  }

  /**
   * Auto-Sequence Roll Numbers: Renumbers roll numbers 1, 2, 3...
   */
  static openBulkRollModal(rows, container) {
    const bodyHtml = `
      <div style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:14px;">
        Renumber roll numbers sequentially across <strong>${rows.length}</strong> selected student(s).
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Starting Roll Number</label>
          <input type="number" class="form-input font-mono" id="bulk-roll-start" value="1" min="1" style="width:100%;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Format Style</label>
          <select class="form-select" id="bulk-roll-format">
            <option value="pad">Two Digits (01, 02, 03...)</option>
            <option value="plain">Normal (1, 2, 3...)</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;">
        <label style="display:inline-flex; align-items:center; gap:8px; font-weight:600; font-size:0.84rem; cursor:pointer;">
          <input type="checkbox" id="bulk-roll-sort-alpha" checked style="width:16px; height:16px;">
          <span>Sort students alphabetically by Full Name before numbering</span>
        </label>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-save-bulk-roll"><i data-lucide="check"></i> Renumber Roll Numbers</button>
    `;

    UIComponents.openModal({
      title: `Auto-Sequence Roll Numbers (${rows.length} Students)`,
      bodyHtml,
      footerHtml
    });

    document.getElementById('btn-save-bulk-roll').addEventListener('click', async () => {
      const startNum = parseInt(document.getElementById('bulk-roll-start').value, 10) || 1;
      const isPad = document.getElementById('bulk-roll-format').value === 'pad';
      const sortAlpha = document.getElementById('bulk-roll-sort-alpha').checked;

      let list = [...rows];
      if (sortAlpha) {
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      }

      for (let i = 0; i < list.length; i++) {
        const num = startNum + i;
        const rollNo = isPad ? num.toString().padStart(2, '0') : num.toString();
        // eslint-disable-next-line no-await-in-loop
        await dbService.update('students', list[i].id, { rollNo });
      }

      await auditService.log('STUDENTS_ROLL_SEQUENCED', 'ACADEMIC', { studentCount: list.length, startNum });
      UIComponents.closeModal();
      UIComponents.showToast(`Assigned roll numbers (${startNum} - ${startNum + list.length - 1}) across ${list.length} student(s).`, 'success');
      StudentModule.render(container);
    });
    UIComponents.refreshIcons();
  }

  /**
   * RFC4180-compliant CSV Parser handling quotes, commas, and line breaks
   */
  static parseCsv(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        if (row.length > 1 || row[0] !== '') lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') lines.push(row);
    return lines;
  }

  /**
   * Download CSV Import Template
   */
  static downloadImportTemplate() {
    const header = [
      'Admission No',
      'Roll No',
      'Full Name',
      'Grade',
      'Section',
      'Gender',
      'DOB',
      'Guardian Name',
      'Guardian Phone',
      'Blood Group',
      'Address',
      'Status',
      'Allergies'
    ];
    const sample1 = [
      'TMS/2022/012',
      '01',
      'Aayan Khan',
      'Grade 4',
      'A',
      'Male',
      '2015-04-12',
      'Tariq Khan',
      '+91 98311 00001',
      'O+',
      'Malda Town',
      'Active',
      'None'
    ];
    const sample2 = [
      'TMS/2023/045',
      '02',
      'Fatima Zahra',
      'Grade 2',
      'B',
      'Female',
      '2017-08-23',
      'Irfan Zahra',
      '+91 98311 00002',
      'A+',
      'Harirampur',
      'Active',
      'Asthma'
    ];
    downloadCsv('TMS_Students_Import_Template.csv', [header, sample1, sample2]);
    UIComponents.showToast('Import template downloaded.', 'success');
  }

  /**
   * Bulk CSV Import Modal: Parse, validate, preview, and batch-insert historical records
   */
  static openBulkImportModal(container) {
    const bodyHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:12px;">
          Import students who took admission in previous years or fresh batches from an Excel/CSV spreadsheet.
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 14px; background:rgba(37,99,235,0.06); border:1px solid #bfdbfe; border-radius:8px;">
          <div>
            <div style="font-weight:700; font-size:0.86rem; color:#1e40af;">Need the standard format?</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Download the sample template with pre-filled headers and examples.</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-dl-import-template">
            <i data-lucide="download"></i> Download CSV Template
          </button>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label class="form-label" style="font-weight:700;">Select or Drag CSV File (.csv)</label>
        <input type="file" id="bulk-import-file-input" accept=".csv,text/csv" class="form-input" style="padding:10px;">
      </div>

      <div id="import-preview-area" style="display:none;">
        <div id="import-stats-bar" style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;"></div>
        <div style="font-weight:700; font-size:0.85rem; margin-bottom:6px;">Preview First 10 Records:</div>
        <div class="table-responsive" style="max-height:260px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px;">
          <table class="tms-table" style="font-size:0.78rem;" id="import-preview-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Admission No</th>
                <th>Full Name</th>
                <th>Grade & Section</th>
                <th>Roll</th>
                <th>Guardian</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody id="import-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
      <button class="btn btn-primary" id="btn-confirm-bulk-import" disabled><i data-lucide="upload-cloud"></i> Import Students</button>
    `;

    UIComponents.openModal({
      title: 'Bulk Import Students (Previous Years / New Batches)',
      bodyHtml,
      footerHtml,
      maxWidth: '850px'
    });

    document.getElementById('btn-dl-import-template').addEventListener('click', () => {
      StudentModule.downloadImportTemplate();
    });

    let parsedStudentsToImport = [];

    const fileInput = document.getElementById('bulk-import-file-input');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const rows = StudentModule.parseCsv(text);
      if (rows.length < 2) {
        UIComponents.showToast('CSV file is empty or missing headers.', 'warning');
        return;
      }

      const headers = rows[0].map(h => (h || '').toLowerCase().trim());
      const findIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

      const idxAdm = findIdx(['admission no', 'adm no', 'admission', 'id']);
      const idxRoll = findIdx(['roll', 'roll no']);
      const idxName = findIdx(['full name', 'name', 'student name']);
      const idxGrade = findIdx(['grade', 'class']);
      const idxSec = findIdx(['section', 'sec']);
      const idxGender = findIdx(['gender', 'sex']);
      const idxDob = findIdx(['dob', 'date of birth', 'birth']);
      const idxGuard = findIdx(['guardian name', 'parent name', 'father', 'guardian']);
      const idxPhone = findIdx(['guardian phone', 'phone', 'contact', 'mobile']);
      const idxBlood = findIdx(['blood group', 'blood']);
      const idxAddr = findIdx(['address', 'village', 'city']);
      const idxStatus = findIdx(['status']);
      const idxAllergies = findIdx(['allergies', 'medical']);

      const existingStudents = await dbService.select('students');
      const existingAdmNos = new Set(existingStudents.map(s => String(s.admissionNo || '').toLowerCase().trim()));

      parsedStudentsToImport = [];
      let duplicateCount = 0;
      let missingCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r.length || (r.length === 1 && !r[0].trim())) continue;

        let admNo = idxAdm !== -1 ? (r[idxAdm] || '').trim() : '';
        const name = idxName !== -1 ? (r[idxName] || '').trim() : '';
        const grade = idxGrade !== -1 ? (r[idxGrade] || '').trim() : 'Grade 1';
        const sec = idxSec !== -1 ? (r[idxSec] || '').trim() : 'A';
        const roll = idxRoll !== -1 ? (r[idxRoll] || '').trim() : '';
        const gender = idxGender !== -1 ? (r[idxGender] || '').trim() : 'Male';
        const dob = idxDob !== -1 ? (r[idxDob] || '').trim() : null;
        const guard = idxGuard !== -1 ? (r[idxGuard] || '').trim() : '';
        const phone = idxPhone !== -1 ? (r[idxPhone] || '').trim() : '';
        const blood = idxBlood !== -1 ? (r[idxBlood] || '').trim() : '';
        const address = idxAddr !== -1 ? (r[idxAddr] || '').trim() : '';
        const status = idxStatus !== -1 ? (r[idxStatus] || '').trim() || 'Active' : 'Active';
        const allergies = idxAllergies !== -1 ? (r[idxAllergies] || '').trim() : '';

        // If no admission no provided, assign temporary sequential ID
        if (!admNo) {
          admNo = `TMS-IMP-${Date.now().toString(36).toUpperCase()}-${i}`;
        }

        let isDuplicate = existingAdmNos.has(admNo.toLowerCase());
        let isInvalid = !name || !grade;

        if (isDuplicate) duplicateCount++;
        if (isInvalid) missingCount++;

        parsedStudentsToImport.push({
          admissionNo: admNo,
          rollNo: roll,
          fullName: name,
          grade,
          section: sec,
          gender,
          dob,
          guardianName: guard,
          guardianPhone: phone,
          bloodGroup: blood,
          address,
          status,
          allergies,
          isDuplicate,
          isInvalid
        });
      }

      const validList = parsedStudentsToImport.filter(p => !p.isInvalid && !p.isDuplicate);
      const previewArea = document.getElementById('import-preview-area');
      const statsBar = document.getElementById('import-stats-bar');
      const tbody = document.getElementById('import-preview-tbody');
      const confirmBtn = document.getElementById('btn-confirm-bulk-import');

      if (previewArea) previewArea.style.display = 'block';
      if (statsBar) {
        statsBar.innerHTML = `
          <span class="badge badge-success" style="font-size:0.82rem; padding:4px 10px;">✓ ${validList.length} Ready to Import</span>
          ${duplicateCount ? `<span class="badge badge-warning" style="font-size:0.82rem; padding:4px 10px;">⚠ ${duplicateCount} Duplicate Admission Nos</span>` : ''}
          ${missingCount ? `<span class="badge badge-danger" style="font-size:0.82rem; padding:4px 10px;">✕ ${missingCount} Incomplete Rows</span>` : ''}
        `;
      }

      if (tbody) {
        tbody.innerHTML = parsedStudentsToImport.slice(0, 10).map(p => `
          <tr>
            <td>
              ${p.isInvalid ? '<span class="badge badge-danger">Missing Name</span>'
                : p.isDuplicate ? '<span class="badge badge-warning">Duplicate ID</span>'
                : '<span class="badge badge-success">Valid</span>'}
            </td>
            <td class="font-mono">${UIComponents.escapeHtml(p.admissionNo)}</td>
            <td style="font-weight:600;">${UIComponents.escapeHtml(p.fullName)}</td>
            <td>${UIComponents.escapeHtml(p.grade)} - ${UIComponents.escapeHtml(p.section)}</td>
            <td class="font-mono">${UIComponents.escapeHtml(p.rollNo || '—')}</td>
            <td>${UIComponents.escapeHtml(p.guardianName || '—')}</td>
            <td class="font-mono">${UIComponents.escapeHtml(p.guardianPhone || '—')}</td>
          </tr>
        `).join('');
      }

      if (confirmBtn) {
        confirmBtn.disabled = validList.length === 0;
        confirmBtn.innerHTML = `<i data-lucide="upload-cloud"></i> Import ${validList.length} Valid Students`;
        UIComponents.refreshIcons();
      }
    });

    document.getElementById('btn-confirm-bulk-import').addEventListener('click', async () => {
      const validList = parsedStudentsToImport.filter(p => !p.isInvalid && !p.isDuplicate);
      if (!validList.length) return;

      const btn = document.getElementById('btn-confirm-bulk-import');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Importing batch...';

      let successCount = 0;
      for (const p of validList) {
        const record = {
          admissionNo: p.admissionNo,
          rollNo: p.rollNo,
          fullName: p.fullName,
          grade: p.grade,
          section: p.section,
          gender: p.gender,
          dob: p.dob || null,
          guardianName: p.guardianName,
          guardianPhone: p.guardianPhone,
          bloodGroup: p.bloodGroup,
          address: p.address,
          status: p.status,
          allergies: p.allergies
        };
        // eslint-disable-next-line no-await-in-loop
        await dbService.insert('students', record);
        successCount++;
      }

      await auditService.log('STUDENTS_BULK_IMPORTED', 'ACADEMIC', { importedCount: successCount });
      UIComponents.closeModal();
      UIComponents.showToast(`Successfully imported ${successCount} student(s) into database!`, 'success');
      StudentModule.render(container);
    });

    UIComponents.refreshIcons();
  }

}


export default StudentModule;
