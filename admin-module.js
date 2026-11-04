/**
 * THAIBA PUBLIC SCHOOL — School Administration & Governance Module
 * Admission form builder, fee & payment configuration, application review
 * workflow (approve / reject / resend), notifications and audit trail.
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { authService } from './auth-service.js';
import { auditService } from './audit-service.js';
import { UIComponents } from './ui-components.js';
import { TMS_LOGO } from './logo.js';
import { admissionService, DEFAULT_INSTRUCTIONS, DEFAULT_POPUP_INSTRUCTIONS, getEmbedVideoUrl, renderVideoPlayerHtml } from './admission-service.js';
import { notificationService } from './notification-service.js';
import { brandingService } from './branding-service.js';
import { WhatsAppService } from './whatsapp-service.js';
import { downloadCsv, exportPdf, formatPdfFilename, kvTable } from './export-utils.js';

const esc = (v) => UIComponents.escapeHtml(v);
const safeOn = (id, event, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
};

const STATUS_BADGE = {
  'Submitted': 'badge-info',
  'Under Verification': 'badge-warning',
  'Approved': 'badge-success',
  'Rejected': 'badge-danger'
};

const ROLE_LABELS = {
  super_admin: '👑 Super Administrator',
  admin: 'Administrator',
  principal: 'Principal',
  coordinator: 'Coordinator',
  teacher: 'Teacher',
  finance: 'Finance Officer',
  hr: 'HR Manager',
  librarian: 'Librarian',
  operations: 'Operations',
  office_boy: 'Office Boy (Data Entry)',
  student: 'Student',
  parent: 'Parent / Guardian',
  pending: 'Pending Assignment',
  rejected: 'Access Rejected'
};

function parseUserAgent(ua) {
  if (!ua) return 'Web Client';
  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';

  let os = 'Device';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iPhone / iOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

function statusBadge(status) {
  return `<span class="badge ${STATUS_BADGE[status] || 'badge-info'}">${esc(status || '—')}</span>`;
}

function payBadge(status) {
  const map = { Paid: 'badge-success', Pending: 'badge-warning', 'Not Required': 'badge-info' };
  return `<span class="badge ${map[status] || 'badge-info'}">${esc(status || 'Pending')}</span>`;
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB');
}

function fmtMoney(value) {
  return `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
}

export class AdminModule {
  /* ================================================================== */
  /* Shell                                                              */
  /* ================================================================== */

  static async render(container) {
    const stats = await admissionService.getStats();
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'School Administration & Governance',
          subtitle: 'Admission form builder, fee & payment configuration, application review, notifications and audit trail.',
          breadcrumbs: [{ label: 'Administration' }],
          badge: isSuperAdmin ? 'Super Admin' : 'Admin Console',
          actionsHtml: `
            <a href="/admission" target="_blank" class="btn btn-secondary"><i data-lucide="external-link"></i> Public Admission Gateway</a>
            <button class="btn btn-primary" id="btn-new-notification"><i data-lucide="bell-plus"></i> New Notification</button>
          `
        })}

      <div class="kpi-grid" style="margin-bottom: 22px;">
        ${UIComponents.renderKpiCard({ title: 'Total Applications', value: stats.total, icon: 'file-text', color: 'blue' })}
        ${UIComponents.renderKpiCard({ title: 'Awaiting Verification', value: stats.submitted, icon: 'clock', color: 'amber' })}
        ${UIComponents.renderKpiCard({ title: 'Approved', value: stats.approved, icon: 'check-circle', color: 'emerald' })}
        ${UIComponents.renderKpiCard({ title: 'Fee Collected', value: fmtMoney(stats.collected), icon: 'indian-rupee', color: 'rose' })}
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <div style="flex-shrink: 0;">${TMS_LOGO.emblemSvg(64)}</div>
          <div style="flex: 1; min-width: 260px;">
            <h2 style="font-size: 1.3rem; letter-spacing: 0.02em;">${esc(TMS_CONFIG.institution.name)}</h2>
            <div style="color: #16a34a; font-weight: 700; font-size: 0.85rem; text-transform: uppercase;">
              ${esc(TMS_CONFIG.institution.tagline)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              ${esc(TMS_CONFIG.institution.address.campus)}, ${esc(TMS_CONFIG.institution.address.district)}, ${esc(TMS_CONFIG.institution.address.state)} • Regd. No.: ${esc(TMS_CONFIG.institution.regNo)}
            </div>
          </div>
        </div>
      </div>

      <div id="admin-auth-warning"></div>

      <!-- Primary Segmented Tabs Rail (Modern Showcase Style) -->
      <div class="tms-tab-rail-wrapper">
        <div class="tms-segmented-tabs" id="admin-primary-tabs">
          <button class="tms-tab-pill active" data-group="admissions">
            <i data-lucide="clipboard-list"></i>
            <span>Admissions Hub</span>
            <span class="tab-badge" id="admin-apps-badge">${stats.total}</span>
          </button>
          <button class="tms-tab-pill" data-group="users">
            <i data-lucide="shield-check"></i>
            <span>Access & Security</span>
            <span class="tab-badge" id="admin-pending-users-badge" style="display:none; background:#f59e0b; color:#fff;">0</span>
          </button>
          <button class="tms-tab-pill" data-group="notices">
            <i data-lucide="bell"></i>
            <span>Notifications</span>
          </button>
          <button class="tms-tab-pill" data-group="system">
            <i data-lucide="sliders"></i>
            <span>Governance & Backup</span>
          </button>
          ${isSuperAdmin ? `
          <button class="tms-tab-pill super-admin-pill" data-group="superadmin" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(239, 68, 68, 0.12)); border: 1.5px solid rgba(245, 158, 11, 0.45); color: #b45309; font-weight: 800;">
            <i data-lucide="crown" style="color: #f59e0b;"></i>
            <span>Super Admin &amp; Dev</span>
            <span class="tab-badge" id="superadmin-pending-badge" style="display:none; background:#ef4444; color:#fff;">0</span>
          </button>
          ` : ''}
        </div>
      </div>

      <!-- Secondary Subtabs Rail -->
      <div class="tms-subtab-rail" id="admin-subtab-rail"></div>

      <div id="admin-tab-content"></div>
    </div>
  `;

    this.bindEvents(container);
    this.refreshPendingBadges();
    this.switchGroup('admissions', 'applications');
  }

  static async refreshPendingBadges() {
    try {
      const profiles = await dbService.select('profiles');
      const pending = (profiles || []).filter(p => p.role === 'pending' || p.approvalStatus === 'pending');
      this._pendingApprovalsCount = pending.length;

      const userBadge = document.getElementById('admin-pending-users-badge');
      if (userBadge) {
        if (pending.length > 0) {
          userBadge.innerText = pending.length;
          userBadge.style.display = 'inline-block';
        } else {
          userBadge.style.display = 'none';
        }
      }

      const superBadge = document.getElementById('superadmin-pending-badge');
      if (superBadge) {
        if (pending.length > 0) {
          superBadge.innerText = pending.length;
          superBadge.style.display = 'inline-block';
        } else {
          superBadge.style.display = 'none';
        }
      }
    } catch (e) { /* ignore */ }
  }

  static switchGroup(groupKey, targetSubtab = null) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    const SUBTABS = {
      admissions: [
        { key: 'applications', label: 'Applications Roster', icon: 'file-text' },
        { key: 'form-builder', label: 'Form Field Builder', icon: 'layout-template' },
        { key: 'fees', label: 'Fee Structure Master', icon: 'receipt' },
        { key: 'payment-settings', label: 'Portal Rules & Video', icon: 'settings' }
      ],
      users: [
        { key: 'google-approvals', label: 'User Authentication (Google)', icon: 'user-check', showPendingBadge: true },
        { key: 'users', label: 'User Logins & Roles', icon: 'users' },
        ...(isSuperAdmin ? [{ key: 'user-sessions', label: 'Login & Logout Sessions', icon: 'history' }] : []),
        { key: 'audit', label: 'Security Audit Trail', icon: 'shield-alert' }
      ],
      notices: [
        { key: 'notifications', label: 'Broadcast Bulletins', icon: 'bell' }
      ],
      system: [
        { key: 'branding', label: 'Institute Logo & Emblem', icon: 'image' },
        { key: 'backup', label: 'JSON Disaster Recovery', icon: 'database' }
      ],
      superadmin: [
        { key: 'google-approvals', label: '🛡️ Google Auth Approvals', icon: 'user-check', showPendingBadge: true },
        { key: 'system-doctor', label: '🩺 System Doctor (Find & Fix)', icon: 'wrench' },
        { key: 'user-sessions', label: '👤 User Login / Logout Sessions', icon: 'history' },
        { key: 'audit', label: '🛡️ Security Audit Logs', icon: 'shield-alert' },
        { key: 'developer-tools', label: '⚡ Developer DB Explorer', icon: 'terminal' }
      ]
    };

    const subList = SUBTABS[groupKey] || SUBTABS.admissions;
    const subRail = document.getElementById('admin-subtab-rail');
    if (!subRail) return;

    const activeSubKey = targetSubtab || subList[0].key;
    const pendingCount = this._pendingApprovalsCount || 0;

    subRail.innerHTML = subList.map(st => `
      <button class="tms-subtab-pill ${st.key === activeSubKey ? 'active' : ''}" data-tab="${st.key}">
        <i data-lucide="${st.icon}" style="width: 14px; height: 14px;"></i>
        <span>${st.label}</span>
        ${st.showPendingBadge && pendingCount > 0 ? `<span class="badge" style="background:#ef4444; color:#fff; font-size:0.68rem; padding:1px 6px; border-radius:10px; margin-left:4px;">${pendingCount}</span>` : ''}
      </button>
    `).join('');

    subRail.querySelectorAll('.tms-subtab-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        subRail.querySelectorAll('.tms-subtab-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderTab(e.currentTarget.dataset.tab);
      });
    });

    UIComponents.refreshIcons();
    this.renderTab(activeSubKey);
  }

  static bindEvents(container) {
    container.querySelectorAll('#admin-primary-tabs .tms-tab-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('#admin-primary-tabs .tms-tab-pill').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.switchGroup(e.currentTarget.dataset.group);
      });
    });

    const bell = container.querySelector('#btn-new-notification');
    if (bell) bell.addEventListener('click', () => this.openNotificationModal());
  }

  static async renderTab(tabKey) {
    const tabContent = document.getElementById('admin-tab-content');
    if (!tabContent) return;

    try {
      if (tabKey === 'applications') await this.renderApplicationsTab(tabContent);
      else if (tabKey === 'form-builder') await this.renderFormBuilderTab(tabContent);
      else if (tabKey === 'fees') await this.renderFeesTab(tabContent);
      else if (tabKey === 'payment-settings') await this.renderPaymentSettingsTab(tabContent);
      else if (tabKey === 'notifications') await this.renderNotificationsTab(tabContent);
      else if (tabKey === 'users') await this.renderUsersTab(tabContent);
      else if (tabKey === 'google-approvals') await this.renderGoogleApprovalsTab(tabContent);
      else if (tabKey === 'branding') await this.renderBrandingTab(tabContent);
      else if (tabKey === 'audit') await this.renderAuditTab(tabContent);
      else if (tabKey === 'backup') await this.renderBackupTab(tabContent);
      else if (tabKey === 'user-sessions') await this.renderUserSessionsTab(tabContent);
      else if (tabKey === 'system-doctor') await this.renderSystemDoctorTab(tabContent);
      else if (tabKey === 'developer-tools') await this.renderDeveloperToolsTab(tabContent);
    } catch (e) {
      console.error('Admin tab failed:', e);
      tabContent.innerHTML = `<div class="card"><p style="color:#dc2626;">Failed to load this section: ${esc(e.message)}</p></div>`;
    }

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Applications                                                       */
  /* ================================================================== */

  static async renderApplicationsTab(tabContent) {
    const apps = await admissionService.listApplications();
    this._apps = apps;
    this._selected = new Set();

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">Submitted Admission Applications</h3>
            <p class="card-desc">Select rows for bulk approve / reject / delete, or open an application to review, print the form and record payments.</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-view-merit-list"><i data-lucide="award"></i> Merit List</button>
            <button class="btn btn-secondary btn-sm" id="btn-export-csv"><i data-lucide="file-spreadsheet"></i> Export CSV</button>
            <button class="btn btn-secondary btn-sm" id="btn-export-pdf"><i data-lucide="file-text"></i> Export PDF</button>
            <button class="btn btn-secondary btn-sm" id="btn-delete-pending" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete Pending</button>
            <a href="/admission" target="_blank" class="btn btn-primary btn-sm"><i data-lucide="plus"></i> New Entry</a>
          </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; align-items:center;">
          <input class="form-input" id="app-search" placeholder="Search name, form no, phone…" style="max-width: 280px;">
          <select class="form-select" id="app-status-filter" style="max-width: 200px;">
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Verification">Under Verification</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Enrolled">Enrolled</option>
          </select>
          <button class="btn btn-secondary" id="btn-select-visible"><i data-lucide="check-square"></i> Select All Shown</button>
          <button class="btn btn-secondary" id="btn-clear-selection">Clear</button>
        </div>

        <div id="app-bulk-bar" style="display:none; align-items:center; gap:10px; flex-wrap:wrap; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; margin-bottom:12px;">
          <strong id="app-bulk-count">0 selected</strong>
          <button class="btn btn-primary btn-sm" id="bulk-approve"><i data-lucide="check-circle"></i> Approve</button>
          <button class="btn btn-secondary btn-sm" id="bulk-reject"><i data-lucide="x-circle"></i> Reject</button>
          <button class="btn btn-secondary btn-sm" id="bulk-export"><i data-lucide="download"></i> Export Selected</button>
          <button class="btn btn-secondary btn-sm" id="bulk-delete" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete</button>
        </div>

        <div class="table-responsive">
          <table class="tms-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th style="width: 34px;"><input type="checkbox" id="app-select-all" title="Select all shown"></th>
                <th>Photo</th>
                <th>Form No</th>
                <th>Candidate</th>
                <th>Class</th>
                <th>Guardian</th>
                <th>Phone</th>
                <th>Entered By</th>
                <th>Fees</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="app-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderApplicationRows(tabContent);

    safeOn('app-search', 'input', () => this.renderApplicationRows(tabContent));
    safeOn('app-status-filter', 'change', () => this.renderApplicationRows(tabContent));
    safeOn('btn-view-merit-list', 'click', () => this.openMeritListModal());
    safeOn('btn-export-csv', 'click', () => this.exportApplicationsCsv());
    safeOn('btn-export-pdf', 'click', () => this.exportApplicationsPdf());
    safeOn('btn-delete-pending', 'click', () => this.deletePendingApplications());
    safeOn('btn-select-visible', 'click', () => this.toggleSelectAll(true, tabContent));
    safeOn('btn-clear-selection', 'click', () => this.toggleSelectAll(false, tabContent));
    safeOn('app-select-all', 'change', (e) => this.toggleSelectAll(e.target.checked, tabContent));
    safeOn('bulk-approve', 'click', () => this.bulkStatus('Approved'));
    safeOn('bulk-reject', 'click', () => this.bulkStatus('Rejected'));
    safeOn('bulk-export', 'click', () => this.exportSelectedCsv());
    safeOn('bulk-delete', 'click', () => this.bulkDelete());
  }

  static filteredApplications() {
    const search = (document.getElementById('app-search')?.value || '').toLowerCase().trim();
    const status = document.getElementById('app-status-filter')?.value || '';
    return (this._apps || []).filter((a) => {
      if (status && a.status !== status) return false;
      if (!search) return true;
      const haystack = [a.appId, a.studentName, a.guardianName, a.phone, a.parentUsername]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  static renderApplicationRows(tabContent) {
    const body = document.getElementById('app-table-body');
    if (!body) return;
    const rows = this.filteredApplications();
    if (!this._selected) this._selected = new Set();

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 30px;">No applications match the current filters.</td></tr>';
      this.updateBulkBar();
      return;
    }

    body.innerHTML = rows.map((a) => {
      const photoName = (a.payload || {}).photo;
      const photoCell = photoName
        ? `<img class="app-photo-thumb" data-path="${esc(photoName)}" alt="Applicant photo"
             style="width:30px;height:36px;object-fit:cover;border:1px solid var(--border-color);border-radius:4px;background:#f1f5f9;cursor:pointer;"
             title="Click to view the photographed applicant">`
        : '<span style="color:var(--text-subtle);">—</span>';
      return `
      <tr>
        <td><input type="checkbox" class="app-row-check" data-id="${esc(a.id)}" ${this._selected.has(a.id) ? 'checked' : ''}></td>
        <td>${photoCell}</td>
        <td><strong class="font-mono">${esc(a.appId || a.id)}</strong></td>
        <td style="font-weight: 700;">${esc(a.studentName || '—')}</td>
        <td><span class="badge badge-info">${esc(a.grade || '—')}</span></td>
        <td>${esc(a.guardianName || '—')}</td>
        <td class="font-mono">${esc(a.phone || '—')}</td>
        <td>${esc(a.submittedByName || 'Self / Public')}</td>
        <td>${fmtMoney(a.feeTotal)}</td>
        <td>${payBadge(a.paymentStatus)}</td>
        <td>${statusBadge(a.status)}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-secondary btn-sm btn-view-app" data-id="${esc(a.id)}" title="Open Review"><i data-lucide="eye"></i></button>
          <button class="btn btn-secondary btn-sm btn-edit-app" data-id="${esc(a.id)}" title="Edit Application Data" style="color:#0284c7;"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-secondary btn-sm btn-form-app" data-id="${esc(a.id)}" title="View as Form"><i data-lucide="file-text"></i></button>
          <button class="btn btn-secondary btn-sm btn-print-app" data-id="${esc(a.id)}" title="Print PDF"><i data-lucide="printer"></i></button>
          <button class="btn btn-secondary btn-sm btn-del-single-app" data-id="${esc(a.id)}" title="Delete Application" style="color:var(--danger, #ef4444);"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.app-row-check').forEach((cb) =>
      cb.addEventListener('change', () => {
        if (cb.checked) this._selected.add(cb.dataset.id);
        else this._selected.delete(cb.dataset.id);
        this.updateBulkBar();
      }));
    body.querySelectorAll('.btn-view-app').forEach((b) =>
      b.addEventListener('click', () => this.openApplicationModal(b.dataset.id)));
    body.querySelectorAll('.btn-edit-app').forEach((b) =>
      b.addEventListener('click', () => this.openEditApplicationModal(b.dataset.id)));
    body.querySelectorAll('.btn-form-app').forEach((b) =>
      b.addEventListener('click', () => this.showApplicationForm(b.dataset.id)));
    body.querySelectorAll('.btn-print-app').forEach((b) =>
      b.addEventListener('click', () => this.showApplicationForm(b.dataset.id, true)));
    body.querySelectorAll('.btn-del-single-app').forEach((b) =>
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const app = (this._apps || []).find((a) => a.id === id);
        const name = app ? (app.studentName || app.appId || id) : id;
        if (!confirm(`Permanently delete application for "${name}" (${app?.appId || id})? This cannot be undone.`)) return;
        await this.deleteApplications([id]);
      }));

    // Hydrate applicant photo thumbnails with signed URLs (private bucket).
    body.querySelectorAll('.app-photo-thumb').forEach((img) =>
      admissionService.getSignedUrl('admission-docs', img.dataset.path, 3600).then((url) => {
        if (url) img.src = url;
        else img.style.display = 'none';
      }));
    body.querySelectorAll('.app-photo-thumb').forEach((img) =>
      img.addEventListener('click', () => {
        const app = rows.find((a) => (a.payload || {}).photo === img.dataset.path);
        this.openFilePreviewModal({
          title: (app ? (app.studentName || app.appId) : 'Applicant') + ' - Photograph',
          path: img.dataset.path
        });
      }));

    this.updateBulkBar();
    UIComponents.refreshIcons();
  }

  static updateBulkBar() {
    const bar = document.getElementById('app-bulk-bar');
    if (!bar) return;
    const count = (this._selected || new Set()).size;
    bar.style.display = count ? 'flex' : 'none';
    const countEl = document.getElementById('app-bulk-count');
    if (countEl) countEl.innerText = `${count} selected`;
    const selectAll = document.getElementById('app-select-all');
    if (selectAll) {
      const visible = this.filteredApplications();
      selectAll.checked = visible.length > 0 && visible.every((a) => this._selected.has(a.id));
    }
  }

  static toggleSelectAll(checked, tabContent) {
    if (!this._selected) this._selected = new Set();
    const visible = this.filteredApplications();
    if (checked) visible.forEach((a) => this._selected.add(a.id));
    else this._selected.clear();
    this.renderApplicationRows(tabContent);
  }

  static async bulkStatus(status) {
    const ids = Array.from(this._selected || []);
    if (!ids.length) return;
    if (status === 'Rejected' && !confirm(`Reject ${ids.length} application(s) without individual remarks?`)) return;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await admissionService.verifyApplication(id, { status, remarks: '' });
      if (status === 'Approved') {
        const app = (this._apps || []).find((a) => a.id === id);
        // eslint-disable-next-line no-await-in-loop
        if (app) await admissionService.resendCredentials(app);
      }
    }
    await auditService.log('ADMISSION_BULK_STATUS', 'ADMISSIONS', { status, count: ids.length });
    UIComponents.showToast(`${ids.length} application(s) marked ${status}.`, 'success');
    this._selected.clear();
    await this.refreshApplications(document.getElementById('admin-tab-content'));
  }

  static async bulkDelete() {
    const ids = Array.from(this._selected || []);
    if (!ids.length) return;
    if (!confirm(`Permanently delete ${ids.length} application(s) and their parent credentials? This cannot be undone.`)) return;
    await this.deleteApplications(ids);
  }

  static async deletePendingApplications() {
    const pending = (this._apps || []).filter((a) => a.status === 'Submitted' || a.status === 'Under Verification');
    if (!pending.length) { UIComponents.showToast('No pending applications to delete.', 'info'); return; }
    if (!confirm(`Delete ALL ${pending.length} pending application(s) (Submitted / Under Verification)? This cannot be undone.`)) return;
    await this.deleteApplications(pending.map((a) => a.id));
  }

  static async deleteApplications(ids) {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const cred = await admissionService.getCredentials(id);
      // eslint-disable-next-line no-await-in-loop
      if (cred) await dbService.delete('parent_credentials', cred.id);
      // eslint-disable-next-line no-await-in-loop
      await dbService.delete('admissions_applications', id);
    }
    await auditService.log('ADMISSION_DELETED', 'ADMISSIONS', { count: ids.length });
    UIComponents.showToast(`${ids.length} application(s) deleted.`, 'success');
    this._selected = new Set();
    await this.refreshApplications(document.getElementById('admin-tab-content'));
  }

  static exportSelectedCsv() {
    const rows = (this._apps || []).filter((a) => (this._selected || new Set()).has(a.id));
    if (!rows.length) { UIComponents.showToast('Select at least one application first.', 'warning'); return; }
    const header = ['Form No', 'Candidate', 'Class', 'Guardian', 'Phone', 'Entered By', 'Fees', 'Payment', 'Status', 'Remarks'];
    const data = rows.map((a) => [
      a.appId || a.id, a.studentName, a.grade, a.guardianName, a.phone,
      a.submittedByName || 'Self / Public', a.feeTotal, a.paymentStatus, a.status, a.remarks || ''
    ]);
    downloadCsv(`TMS-Admissions-Selected-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
    UIComponents.showToast('Selected rows exported.', 'success');
  }

  static async openApplicationModal(id) {
    const app = (this._apps || []).find((a) => a.id === id);
    if (!app) return;

    const fields = await admissionService.listFields();
    const credential = await admissionService.getCredentials(id);

    const docFields = fields.filter((f) => (f.fieldType || 'text') === 'file');
    const textFields = fields.filter((f) => (f.fieldType || 'text') !== 'file');

    const detailsRows = textFields.map((f) => {
      const raw = (app.payload || {})[f.fieldKey];
      return `
        <tr>
          <th style="width:36%; background:#f8fafc; font-weight:700; color:#475569; font-size:0.75rem; border-bottom:1px solid #f1f5f9; padding:8px 12px; white-space:normal;">${esc(f.label)}</th>
          <td style="font-size:0.82rem; color:#1e293b; border-bottom:1px solid #f1f5f9; padding:8px 12px;">${esc(raw || '—')}</td>
        </tr>
      `;
    }).join('');

    const docsListHtml = docFields.length ? docFields.map((f) => {
      const raw = (app.payload || {})[f.fieldKey];
      const ver = (app.docVerifications || {})[f.fieldKey];
      const verBadge = ver
        ? `<span class="badge badge-success" style="font-size:0.7rem; padding:3px 8px; font-weight:700;"><i data-lucide="shield-check" style="width:12px;height:12px;"></i> Verified &amp; Stamped</span>`
        : `<span class="badge badge-warning" style="font-size:0.7rem; padding:3px 8px;">Pending Verification</span>`;
      const stampBtn = (raw && !ver)
        ? `<button type="button" class="btn btn-secondary btn-sm btn-verify-doc" data-key="${esc(f.fieldKey)}" style="padding:2px 8px; font-size:0.72rem; color:#15803d; border-color:#86efac; font-weight:600;"><i data-lucide="check"></i> Verify &amp; Stamp</button>`
        : '';
      
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <div>
            <div style="font-weight:700; font-size:0.8rem; color:#1e293b;">${esc(f.label)}</div>
            ${raw ? `
              <div style="display:flex; gap:8px; align-items:center; margin-top:4px; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm btn-preview-doc-file" data-path="${esc(raw)}" data-title="${esc(f.label)}" style="font-size:0.74rem; padding:2px 8px; color:#2563eb; border-color:#bfdbfe; font-weight:600;">
                  <i data-lucide="eye" style="width:12px;height:12px;"></i> Preview File
                </button>
                <a href="#" class="btn btn-secondary btn-sm btn-download-doc-file" data-path="${esc(raw)}" style="font-size:0.74rem; padding:2px 8px; color:#475569; text-decoration:none;">
                  <i data-lucide="download" style="width:12px;height:12px;"></i> Download
                </a>
                <span class="font-mono" style="font-size:0.7rem; color:#64748b; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(String(raw).split('/').pop())}</span>
              </div>
            ` : '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">Not attached</span>'}
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${verBadge}
            ${stampBtn}
          </div>
        </div>
      `;
    }).join('') : '<p style="font-size:0.8rem; color:var(--text-muted); margin:0;">No document upload requirements defined.</p>';

    const photoPath = (app.payload || {}).photo;
    const payments = Array.isArray(app.payments) ? app.payments : [];
    const paymentRows = payments.length
      ? payments.map((p) => `<tr>
          <td style="font-size:0.78rem;">${fmtDate(p.date)}</td>
          <td style="font-size:0.78rem;"><span class="badge badge-info" style="font-size:0.7rem;">${esc(p.mode)}</span></td>
          <td style="font-size:0.78rem;" class="font-mono">${esc(p.reference || '—')}</td>
          <td style="text-align:right; font-weight:700; font-size:0.82rem; color:#16a34a;">${fmtMoney(p.amount)}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px; font-size:0.8rem;">No payment transactions recorded.</td></tr>';

    const exam = app.entranceExam || {};
    const isEnrolled = app.status === 'Enrolled';
    const totalPaidCalc = app.paymentStatus === 'Paid' ? (app.feeTotal || 0) : payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDueCalc = Math.max(0, (app.feeTotal || 0) - totalPaidCalc);

    const bodyHtml = `
      <!-- Top Candidate Profile Banner -->
      <div style="background:linear-gradient(135deg, rgba(22, 163, 74, 0.05), rgba(37, 99, 235, 0.06)); border:1.5px solid var(--border-color); border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          ${photoPath
            ? `<img id="app-photo-img" alt="Applicant photo" style="width:72px; height:88px; object-fit:cover; border-radius:8px; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.06); background:#f1f5f9;">`
            : `<div style="width:72px; height:88px; border-radius:8px; border:1.5px dashed var(--border-color); display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; color:var(--text-muted); font-size:0.68rem; gap:4px;"><i data-lucide="user" style="width:24px;height:24px;opacity:0.35;"></i>No Photo</div>`
          }
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin:0;">${esc(app.studentName || 'Candidate')}</h3>
              <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:800; font-size:0.78rem; border:1px solid #bfdbfe;">Class ${esc(app.grade || '—')}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin:4px 0 8px; font-size:0.8rem; color:var(--text-muted); flex-wrap:wrap;">
              <span class="font-mono" style="font-weight:700; color:#334155;">${esc(app.appId || app.id)}</span>
              <span>•</span>
              <span>Submitted ${fmtDate(app.createdAt)}</span>
              <span>•</span>
              <span>Entered by: <strong>${esc(app.submittedByName || 'Self / Public')}</strong></span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-edit-modal-top" style="color:#0284c7; border-color:#bae6fd; font-weight:700;"><i data-lucide="edit-3"></i> Edit Application</button>
              ${statusBadge(app.status)}
              ${payBadge(app.paymentStatus)}
              ${isEnrolled ? `<span class="badge badge-success" style="font-weight:700;"><i data-lucide="graduation-cap"></i> Enrolled: ${esc(app.enrolledAdmissionNo || 'Student')}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- KPI Quick Metric Pill -->
        <div style="display:flex; gap:16px; align-items:center; background:#ffffff; padding:10px 18px; border-radius:10px; border:1px solid var(--border-color); box-shadow:0 2px 5px rgba(0,0,0,0.03);">
          <div style="text-align:right; padding-right:14px; border-right:1px solid var(--border-color);">
            <div style="font-size:0.68rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Total Fees</div>
            <div style="font-size:1.15rem; font-weight:800; color:#1e293b;">${fmtMoney(app.feeTotal)}</div>
          </div>
          <div style="text-align:right; padding-right:14px; border-right:1px solid var(--border-color);">
            <div style="font-size:0.68rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Paid Amount</div>
            <div style="font-size:1.15rem; font-weight:800; color:#16a34a;">${fmtMoney(totalPaidCalc)}</div>
          </div>
          <div style="text-align:right; padding-right:14px; border-right:1px solid var(--border-color);">
            <div style="font-size:0.68rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Balance Due</div>
            <div style="font-size:1.15rem; font-weight:800; color:${balanceDueCalc > 0 ? '#ef4444' : '#64748b'};">${fmtMoney(balanceDueCalc)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.68rem; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">Exam Score</div>
            <div style="font-size:1.15rem; font-weight:800; color:#2563eb;">${exam.totalScore != null ? `${exam.totalScore}/100` : '—'}</div>
          </div>
        </div>
      </div>

      <!-- Main Master-Detail 2-Column Grid -->
      <div style="display:grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap:20px; align-items:start;">
        
        <!-- Left Column: Dossier & Documentation -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Profile Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <span style="display:flex; align-items:center; gap:8px;"><i data-lucide="user-check" style="width:16px; height:16px;"></i> Applicant &amp; Family Dossier</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-edit-dossier-card" style="font-size:0.75rem; padding:2px 8px; color:#0284c7; border-color:#bae6fd; font-weight:700;"><i data-lucide="edit-3"></i> Edit Data</button>
            </div>
            <div class="table-responsive" style="max-height:480px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px;">
              <table class="tms-table" style="font-size:0.82rem; margin:0;">
                <tbody>
                  <tr>
                    <th style="width:36%; background:#f8fafc; font-weight:700; color:#475569; font-size:0.75rem; border-bottom:1px solid #f1f5f9; padding:8px 12px;">Form Number</th>
                    <td class="font-mono" style="font-weight:700; color:#1e293b; border-bottom:1px solid #f1f5f9; padding:8px 12px;">${esc(app.appId || app.id)}</td>
                  </tr>
                  <tr>
                    <th style="background:#f8fafc; font-weight:700; color:#475569; font-size:0.75rem; border-bottom:1px solid #f1f5f9; padding:8px 12px;">Submitted Date</th>
                    <td style="font-size:0.82rem; border-bottom:1px solid #f1f5f9; padding:8px 12px;">${fmtDate(app.createdAt)}</td>
                  </tr>
                  ${detailsRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Uploaded Documents Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="files" style="width:16px; height:16px;"></i> Attached Documents &amp; Verification
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${docsListHtml}
            </div>
          </div>
        </div>

        <!-- Right Column: Administrative Workflows, Ledger, Entrance Exam, Parent Login -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Fee Structure & Payment Ledger Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
              <span style="display:flex; align-items:center; gap:6px;"><i data-lucide="receipt" style="width:16px;height:16px;"></i> Fee Assessment &amp; Ledger</span>
              <span style="font-size:0.85rem; font-weight:800; color:#1e293b;">Total: ${fmtMoney(app.feeTotal)}</span>
            </div>
            
            <table class="tms-table" style="font-size:0.8rem; margin-bottom:12px; border:1px solid var(--border-color); border-radius:8px;">
              <tbody>
                ${(app.feeItems || []).map((f) => `<tr><th style="background:#f8fafc; font-size:0.75rem; padding:6px 10px;">${esc(f.name)}</th><td style="text-align:right; font-weight:700; padding:6px 10px;">${fmtMoney(f.amount)}</td></tr>`).join('') || '<tr><td style="color:var(--text-muted); padding:8px 10px;">No fees configured.</td></tr>'}
              </tbody>
            </table>

            <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Payment History</div>
            <div class="table-responsive" style="max-height:140px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; margin-bottom:14px;">
              <table class="tms-table" style="font-size:0.78rem; margin:0;">
                <thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th style="text-align:right;">Amount</th></tr></thead>
                <tbody>${paymentRows}</tbody>
              </table>
            </div>

            <!-- Record a Payment Form (Spacious 2-row layout) -->
            <div style="background:var(--bg-subtle, #f8fafc); padding:12px 14px; border-radius:8px; border:1px solid var(--border-color);">
              <div style="font-weight:700; font-size:0.82rem; margin-bottom:8px; color:#1e293b; display:flex; align-items:center; gap:5px;">
                <i data-lucide="plus-circle" style="width:14px; height:14px; color:#16a34a;"></i> Record Payment Transaction
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px;">
                <div>
                  <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:2px; font-weight:600;">Amount (₹) *</label>
                  <input type="number" class="form-input form-input-sm" id="pay-amount" placeholder="e.g. 500" style="width:100%;">
                </div>
                <div>
                  <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:2px; font-weight:600;">Payment Mode</label>
                  <select class="form-select form-select-sm" id="pay-mode" style="width:100%;">
                    <option>Cash</option><option>UPI</option><option>Cheque</option><option>Card</option><option>Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <input class="form-input form-input-sm" id="pay-ref" placeholder="Reference / Receipt No / Note" style="flex:1;">
                <button type="button" class="btn btn-primary btn-sm" id="btn-record-payment" style="white-space:nowrap; padding:5px 12px;">
                  <i data-lucide="plus"></i> Add
                </button>
              </div>
            </div>
          </div>

          <!-- Entrance Exam & Interview Marks Card -->
          <div class="card" style="padding:16px 18px; border:1.5px solid #bfdbfe; border-radius:10px; background:rgba(37,99,235,0.02); margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#2563eb; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="award" style="width:16px; height:16px;"></i> Entrance Examination &amp; Evaluation
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
              <div style="background:#ffffff; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color);">
                <label style="font-size:0.7rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:2px;">Written (50)</label>
                <input type="number" class="form-input form-input-sm font-mono" id="exam-written" value="${esc(exam.writtenScore ?? '')}" placeholder="0" min="0" max="50" style="font-weight:700; width:100%;">
              </div>
              <div style="background:#ffffff; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color);">
                <label style="font-size:0.7rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:2px;">Interview (50)</label>
                <input type="number" class="form-input form-input-sm font-mono" id="exam-interview" value="${esc(exam.interviewScore ?? '')}" placeholder="0" min="0" max="50" style="font-weight:700; width:100%;">
              </div>
              <div style="background:#eff6ff; padding:8px 10px; border-radius:8px; border:1.5px solid #bfdbfe; text-align:center;">
                <label style="font-size:0.7rem; color:#1d4ed8; font-weight:800; display:block; margin-bottom:2px;">Total (100)</label>
                <input type="text" class="form-input form-input-sm font-mono" id="exam-total" value="${exam.totalScore != null ? exam.totalScore : ''}" readonly style="background:transparent; border:none; font-weight:800; font-size:1.15rem; color:#1d4ed8; text-align:center; padding:0; width:100%;">
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center;">
              <input class="form-input form-input-sm" id="exam-remarks" value="${esc(exam.examinerRemarks || '')}" placeholder="Examiner remarks (e.g. Recommended, Strong in Math)" style="flex:1;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-save-entrance-score" style="white-space:nowrap; padding:5px 12px;">
                <i data-lucide="save"></i> Save Scores
              </button>
            </div>
          </div>

          <!-- Parent Portal Account Credentials Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#b45309; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="key-round" style="width:16px; height:16px;"></i> Parent Portal Access Credentials
            </div>
            ${credential ? `
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <div>
                  <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:2px; font-weight:600;">Username</label>
                  <input class="form-input form-input-sm font-mono" id="cred-username" value="${esc(credential.username)}" style="width:100%;">
                </div>
                <div>
                  <label style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:2px; font-weight:600;">Password</label>
                  <input class="form-input form-input-sm font-mono" id="cred-password" value="${esc(credential.password)}" style="width:100%;">
                </div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-save-credential"><i data-lucide="save"></i> Save</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-parent-cred" style="color:#0284c7;"><i data-lucide="share-2"></i> Copy Login Message</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-wa-parent-cred" style="color:#16a34a;"><i data-lucide="send"></i> WhatsApp</button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-resend-credential"><i data-lucide="send"></i> Resend</button>
                ${(credential.userId || app.parentUserId) ? '' : '<button type="button" class="btn btn-primary btn-sm" id="btn-activate-credential"><i data-lucide="key-round"></i> Activate Login</button>'}
                <button type="button" class="btn btn-secondary btn-sm" id="btn-delete-credential" style="color:#ef4444; margin-left:auto;"><i data-lucide="trash-2"></i> Delete</button>
              </div>
              ${(credential.userId || app.parentUserId) ? '' : '<p style="font-size:0.74rem; color:#b45309; margin-top:8px;">Account awaiting activation. Click <strong>Activate Login</strong> to create cloud auth user.</p>'}
            ` : '<p style="font-size:0.8rem; color:var(--text-muted); margin:0;">No credentials generated for this application yet.</p>'}
          </div>

          <!-- Official Verification Remarks Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#475569; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="message-square" style="width:16px; height:16px;"></i> Administrative Verification Remarks
            </div>
            <textarea class="form-textarea" id="app-remarks" rows="2" placeholder="Official remarks visible to applicant (e.g. Original TC required during interview)..." style="font-size:0.82rem;">${esc(app.remarks || '')}</textarea>
          </div>
        </div>

      </div>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-close">Close</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-form"><i data-lucide="file-text"></i> View as Form</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-print"><i data-lucide="printer"></i> Print Form</button>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-verifying" style="color:#b45309; border-color:#fde68a;">
            <i data-lucide="clock"></i> Mark Under Verification
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-reject" style="color:#ef4444; border-color:#fca5a5;">
            <i data-lucide="x-circle"></i> Reject
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-app-approve">
            <i data-lucide="check-circle"></i> Approve
          </button>
          ${isEnrolled
            ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-view-enrolled" style="color:#16a34a; font-weight:700;"><i data-lucide="graduation-cap"></i> Enrolled: ${esc(app.enrolledAdmissionNo || 'Student')}</button>`
            : `<button type="button" class="btn btn-success btn-sm" id="btn-app-enroll" style="background:#16a34a; color:#fff;"><i data-lucide="graduation-cap"></i> Enroll as Official Student</button>`
          }
          <button type="button" class="btn btn-secondary btn-sm" id="btn-app-delete-modal" style="color:#ef4444;" title="Delete Application">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;

    UIComponents.openModal({ title: `Application ${app.appId || app.id}`, bodyHtml, footerHtml, maxWidth: '1140px' });

    document.getElementById('btn-app-close').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('btn-app-approve').addEventListener('click', () => this.setApplicationStatus(app, 'Approved'));
    document.getElementById('btn-app-reject').addEventListener('click', () => this.setApplicationStatus(app, 'Rejected'));
    document.getElementById('btn-app-verifying').addEventListener('click', () => this.setApplicationStatus(app, 'Under Verification'));

    const enrollBtn = document.getElementById('btn-app-enroll');
    if (enrollBtn) {
      enrollBtn.addEventListener('click', () => this.openEnrollmentModal(app));
    }
    const viewEnrolledBtn = document.getElementById('btn-view-enrolled');
    if (viewEnrolledBtn) {
      viewEnrolledBtn.addEventListener('click', () => {
        UIComponents.closeModal();
        window.location.hash = '#/students';
      });
    }

    // Save entrance exam scores
    const saveScoreBtn = document.getElementById('btn-save-entrance-score');
    if (saveScoreBtn) {
      saveScoreBtn.addEventListener('click', async () => {
        const writtenScore = parseFloat(document.getElementById('exam-written').value) || 0;
        const interviewScore = parseFloat(document.getElementById('exam-interview').value) || 0;
        const examinerRemarks = document.getElementById('exam-remarks').value.trim();
        await admissionService.recordEntranceScore(app.id, { writtenScore, interviewScore, examinerRemarks });
        document.getElementById('exam-total').value = writtenScore + interviewScore;
        UIComponents.showToast('Entrance exam marks recorded successfully!', 'success');
      });
    }

    // Auto-sum exam marks
    const calcExamTotal = () => {
      const w = parseFloat(document.getElementById('exam-written')?.value) || 0;
      const i = parseFloat(document.getElementById('exam-interview')?.value) || 0;
      const tot = document.getElementById('exam-total');
      if (tot) tot.value = w + i;
    };
    document.getElementById('exam-written')?.addEventListener('input', calcExamTotal);
    document.getElementById('exam-interview')?.addEventListener('input', calcExamTotal);

    // Document stamp listeners
    document.querySelectorAll('.btn-verify-doc').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const key = e.currentTarget.dataset.key;
        await admissionService.verifyDocument(app.id, key);
        UIComponents.showToast('Document verified and officially stamped!', 'success');
        UIComponents.closeModal();
        const tabContent = document.getElementById('admin-tab-content');
        await this.refreshApplications(tabContent);
        this.openApplicationModal(app.id);
      });
    });
    // Edit application button listeners
    document.getElementById('btn-edit-modal-top')?.addEventListener('click', () => {
      UIComponents.closeModal();
      this.openEditApplicationModal(app.id);
    });
    document.getElementById('btn-edit-dossier-card')?.addEventListener('click', () => {
      UIComponents.closeModal();
      this.openEditApplicationModal(app.id);
    });

    // Applicant photo click opens File Preview modal
    document.getElementById('app-photo-img')?.addEventListener('click', () => {
      if (photoPath) {
        this.openFilePreviewModal({
          title: `${app.studentName || 'Candidate'} — Photograph`,
          path: photoPath
        });
      }
    });

    // Document preview buttons
    document.querySelectorAll('.btn-preview-doc-file').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openFilePreviewModal({
          title: btn.dataset.title,
          path: btn.dataset.path
        });
      });
    });

    // Document direct download buttons
    document.querySelectorAll('.btn-download-doc-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = await admissionService.getSignedUrl('admission-docs', btn.dataset.path, 3600) ||
                    admissionService.getPublicUrl('admission-docs', btn.dataset.path);
        if (url) window.open(url, '_blank');
        else UIComponents.showToast('Storage link unavailable.', 'warning');
      });
    });

    // Parent login credentials copy & WhatsApp share
    document.getElementById('btn-copy-parent-cred')?.addEventListener('click', () => {
      const u = document.getElementById('cred-username')?.value.trim() || credential?.username;
      const p = document.getElementById('cred-password')?.value || credential?.password;
      this.copyCredentialMessageToClipboard({
        name: app.guardianName || app.studentName || 'Parent',
        role: 'parent',
        username: u,
        password: p,
        customUrl: `${this.getCredentialShareConfig().domain}/login.html`
      });
    });

    document.getElementById('btn-wa-parent-cred')?.addEventListener('click', () => {
      const u = document.getElementById('cred-username')?.value.trim() || credential?.username;
      const p = document.getElementById('cred-password')?.value || credential?.password;
      const msg = this.compileCredentialMessage({
        name: app.guardianName || app.studentName || 'Parent',
        role: 'parent',
        username: u,
        password: p,
        customUrl: `${this.getCredentialShareConfig().domain}/login.html`
      });
      const ph = WhatsAppService.cleanPhone(app.phone);
      if (ph) {
        window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
    });

    const delModalBtn = document.getElementById('btn-app-delete-modal');
    if (delModalBtn) {
      delModalBtn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete application ${app.appId || app.id}? This cannot be undone.`)) return;
        UIComponents.closeModal();
        await this.deleteApplications([app.id]);
      });
    }

    // Applicant photo (signed URL from the private bucket).
    if (photoPath) {
      admissionService.getSignedUrl('admission-docs', photoPath).then((url) => {
        const img = document.getElementById('app-photo-img');
        if (img && url) img.src = url;
      });
    }

    // Document links open via short-lived signed URLs.
    document.querySelectorAll('.doc-link').forEach((link) =>
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = await admissionService.getSignedUrl('admission-docs', link.dataset.path);
        if (url) window.open(url, '_blank');
        else UIComponents.showToast('Could not open the document (storage not configured).', 'warning');
      }));

    const formBtn = document.getElementById('btn-app-form');
    if (formBtn) {
      formBtn.addEventListener('click', async () => {
        const formHtml = await this.buildApplicationFormHtml(app, fields, credential);
        document.getElementById('global-modal-body').innerHTML = `<div style="max-height:62vh; overflow:auto;">${formHtml}</div>`;
        UIComponents.refreshIcons();
      });
    }
    const printBtn = document.getElementById('btn-app-print');
    if (printBtn) {
      printBtn.addEventListener('click', async () => {
        const formHtml = await this.buildApplicationFormHtml(app, fields, credential);
        const filename = formatPdfFilename('Admission_Form', app.appId || app.id);
        exportPdf(filename, formHtml, { filename, title: `Admission Application Form — ${app.appId || app.id}`, subtitle: `Candidate: ${app.studentName || 'Student'} • Class: ${app.grade || '—'}`, showHeader: false, showFooter: true });
      });
    }

    const recBtn = document.getElementById('btn-record-payment');
    if (recBtn) {
      recBtn.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('pay-amount').value);
        if (!amount || amount <= 0) { UIComponents.showToast('Enter a valid payment amount.', 'warning'); return; }
        const mode = document.getElementById('pay-mode').value;
        const reference = document.getElementById('pay-ref').value.trim();
        await admissionService.recordPayment(app, { amount, mode, reference });
        await auditService.log('ADMISSION_PAYMENT_RECORDED', 'ADMISSIONS', { formNo: app.appId, amount, mode }, app.id);
        UIComponents.showToast('Payment recorded.', 'success');
        UIComponents.closeModal();
        const tabContent = document.getElementById('admin-tab-content');
        await this.refreshApplications(tabContent);
        this.openApplicationModal(app.id);
      });
    }

    const saveCred = document.getElementById('btn-save-credential');
    if (saveCred) {
      saveCred.addEventListener('click', async () => {
        const username = document.getElementById('cred-username').value.trim();
        const password = document.getElementById('cred-password').value;
        await admissionService.updateCredentials(credential, { username, password });
        UIComponents.showToast('Credentials updated.', 'success');
      });
    }

    const resendCred = document.getElementById('btn-resend-credential');
    if (resendCred) {
      resendCred.addEventListener('click', async () => {
        const res = await admissionService.resendCredentials(app);
        if (res.delivered) {
          UIComponents.showToast('Credentials sent to the parent portal.', 'success');
        } else if (res.row) {
          UIComponents.showToast(`Nothing was sent. ${res.reason || ''}`.trim(), 'warning');
        } else {
          UIComponents.showToast('No credentials to resend.', 'warning');
        }
      });
    }

    const activateCred = document.getElementById('btn-activate-credential');
    if (activateCred) {
      activateCred.addEventListener('click', async () => {
        activateCred.disabled = true;
        activateCred.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Activating…';
        UIComponents.refreshIcons();
        const res = await admissionService.activateParentAccount(app);
        if (res.error) {
          UIComponents.showToast(`Could not activate the login: ${res.error}`, 'danger');
          activateCred.disabled = false;
          activateCred.innerHTML = '<i data-lucide="key-round"></i> Activate Login';
          UIComponents.refreshIcons();
          return;
        }
        await auditService.log('PARENT_LOGIN_ACTIVATED', 'ADMISSIONS', { appId: app.appId, userId: res.userId }, app.id);
        UIComponents.showToast('Parent login activated. The parent can now sign in.', 'success');
        UIComponents.closeModal();
        const tabContent = document.getElementById('admin-tab-content');
        await this.refreshApplications(tabContent);
        this.openApplicationModal(app.id);
      });
    }

    const delCred = document.getElementById('btn-delete-credential');
    if (delCred) {
      delCred.addEventListener('click', async () => {
        if (!confirm('Delete the parent portal credentials for this application?')) return;
        await dbService.delete('parent_credentials', credential.id);
        UIComponents.showToast('Credentials deleted.', 'success');
        UIComponents.closeModal();
        const tabContent = document.getElementById('admin-tab-content');
        await this.refreshApplications(tabContent);
        this.openApplicationModal(app.id);
      });
    }

    UIComponents.refreshIcons();
  }

  static async refreshApplications(tabContent) {
    this._apps = await admissionService.listApplications();
    if (tabContent) this.renderApplicationRows(tabContent);
  }

  static async setApplicationStatus(app, status) {
    const remarks = (document.getElementById('app-remarks')?.value || '').trim();
    if (status === 'Rejected' && !remarks) {
      UIComponents.showToast('Please add remarks explaining the rejection.', 'warning');
      return;
    }
    await admissionService.verifyApplication(app.id, { status, remarks });
    await auditService.log('ADMISSION_STATUS_UPDATED', 'ADMISSIONS', { formNo: app.appId, status }, app.id);
    if (status === 'Approved') {
      await admissionService.resendCredentials(app);
    }
    UIComponents.showToast(`Application marked as ${status}.`, 'success');
    UIComponents.closeModal();
    const tabContent = document.getElementById('admin-tab-content');
    await this.refreshApplications(tabContent);
  }

  static applicationPairs(app, fields) {
    const pairs = [
      ['Form No', esc(app.appId || app.id)],
      ['Status', esc(app.status)],
      ['Submitted On', fmtDate(app.createdAt)],
      ['Entered By', esc(app.submittedByName || 'Self / Public')],
      ['Fees Total', fmtMoney(app.feeTotal)],
      ['Payment Status', esc(app.paymentStatus || '—')]
    ];
    fields.forEach((f) => pairs.push([esc(f.label), esc((app.payload || {})[f.fieldKey] || '—')]));
    if (app.parentUsername) pairs.push(['Portal Username', esc(app.parentUsername)]);
    if (app.remarks) pairs.push(['Remarks', esc(app.remarks)]);
    return pairs;
  }

  static async printApplication(id) {
    await this.showApplicationForm(id, true);
  }

  static async openEnrollmentModal(app) {
    const payload = app.payload || {};
    const name = app.studentName || payload.candidateName || payload.studentName || 'Student';
    const grade = app.grade || payload.applyingClass || 'Grade 1';
    const existingStudents = await dbService.select('students');
    const year = new Date().getFullYear();
    const currentYearStudents = existingStudents.filter((s) => String(s.admissionNo || '').includes(String(year)));
    const maxSeq = currentYearStudents.reduce((max, s) => {
      const match = String(s.admissionNo || '').match(/(\d+)\s*$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const nextSeq = maxSeq + 1;
    const suggestedAdmissionNo = `TMS/${year}/${nextSeq.toString().padStart(3, '0')}`;
    const sameGradeStudents = existingStudents.filter((s) => s.grade === grade);
    const suggestedRoll = (sameGradeStudents.length + 1).toString().padStart(2, '0');

    const bodyHtml = `
      <div style="margin-bottom:14px; padding:12px; border-radius:8px; background:rgba(22,163,74,0.08); border:1px solid #16a34a;">
        <div style="font-size:0.95rem; font-weight:700; color:#15803d; margin-bottom:4px;">
          <i data-lucide="user-check"></i> Convert Application to Enrolled Student
        </div>
        <p style="font-size:0.8rem; color:var(--text-main); margin:0;">
          This will register <strong>${esc(name)}</strong> into the official Student Directory, allocate their permanent Admission No &amp; Roll No, and mark the admission application as <strong>Enrolled</strong>.
        </p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Student Name</label>
          <input class="form-input" id="enr-name" value="${esc(name)}" readonly style="background:#f8fafc; font-weight:700;">
        </div>
        <div class="form-group">
          <label class="form-label">Admission Number *</label>
          <input class="form-input font-mono" id="enr-admission-no" value="${esc(suggestedAdmissionNo)}" style="font-weight:700;">
        </div>
        <div class="form-group">
          <label class="form-label">Class / Grade</label>
          <select class="form-select" id="enr-grade">
            ${TMS_CONFIG.academic.classes.map(c => `<option value="${esc(c)}" ${c === grade ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Section</label>
          <select class="form-select" id="enr-section">
            <option value="A" selected>Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Roll Number</label>
          <input class="form-input font-mono" id="enr-roll-no" value="${esc(suggestedRoll)}">
        </div>
        <div class="form-group">
          <label class="form-label">Guardian Contact</label>
          <input class="form-input font-mono" id="enr-phone" value="${esc(app.phone || payload.phone || '')}" readonly style="background:#f8fafc;">
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="btn-enr-cancel">Cancel</button>
      <button class="btn btn-primary" id="btn-enr-confirm" style="background:#16a34a; border-color:#16a34a;">
        <i data-lucide="check-circle-2"></i> Confirm Enrollment
      </button>
    `;

    UIComponents.openModal({
      title: `Student Enrollment — ${name}`,
      bodyHtml,
      footerHtml,
      maxWidth: '560px'
    });

    document.getElementById('btn-enr-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('btn-enr-confirm').addEventListener('click', async () => {
      const section = document.getElementById('enr-section').value;
      const rollNo = document.getElementById('enr-roll-no').value.trim();
      const res = await admissionService.enrollApplicantAsStudent(app.id, { section, rollNo });

      if (res.error) {
        UIComponents.showToast(`Enrollment failed: ${res.error}`, 'danger');
        return;
      }

      await auditService.log('STUDENT_ENROLLED_FROM_ADMISSION', 'ACADEMIC', {
        admissionNo: res.admissionNo,
        studentName: name,
        grade
      }, res.student.id);

      UIComponents.closeModal();
      UIComponents.showToast(`Student ${name} successfully enrolled with ID ${res.admissionNo}!`, 'success');

      const tabContent = document.getElementById('admin-tab-content');
      await this.refreshApplications(tabContent);

      UIComponents.openModal({
        title: 'Enrollment Confirmed',
        bodyHtml: `
          <div style="text-align:center; padding:10px 0 16px;">
            <div style="width:54px; height:54px; border-radius:50%; background:rgba(22,163,74,0.14); color:#16a34a; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="graduation-cap" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0 0 6px;">${esc(name)} is Now Officially Enrolled!</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 14px;">The student record has been added to the master directory.</p>
            <div style="background:var(--bg-subtle); border:1.5px dashed #16a34a; border-radius:10px; padding:12px; display:inline-block;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Permanent Admission Number</span>
              <span class="font-mono" style="font-size:1.35rem; font-weight:800; color:#15803d;">${esc(res.admissionNo)}</span>
            </div>
          </div>
        `,
        footerHtml: `
          <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
          <button class="btn btn-primary" id="btn-goto-student-dir"><i data-lucide="users"></i> View in Student Directory</button>
        `
      });

      document.getElementById('btn-goto-student-dir').addEventListener('click', () => {
        UIComponents.closeModal();
        window.location.hash = '#/students';
      });

      UIComponents.refreshIcons();
    });

    UIComponents.refreshIcons();
  }

  static async openMeritListModal() {
    const list = await admissionService.getMeritList('all');
    const classes = TMS_CONFIG.academic.classes;

    const renderListRows = (items) => {
      if (!items.length) {
        return '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No evaluated entrance exam records found. Enter exam marks in applicant review.</td></tr>';
      }
      return items.map((a, i) => {
        const exam = a.entranceExam || {};
        return `
          <tr>
            <td style="font-weight:800; color:#16a34a; text-align:center;">#${i + 1}</td>
            <td class="font-mono">${esc(a.appId || a.id)}</td>
            <td style="font-weight:700;">${esc(a.studentName || '—')}</td>
            <td>${esc(a.grade || '—')}</td>
            <td class="font-mono" style="text-align:center;">${exam.writtenScore ?? '—'}</td>
            <td class="font-mono" style="text-align:center;">${exam.interviewScore ?? '—'}</td>
            <td class="font-mono" style="text-align:center; font-weight:800; color:#15803d; font-size:1rem;">${exam.totalScore ?? '—'}</td>
            <td><span class="badge ${a.status === 'Enrolled' ? 'badge-success' : 'badge-info'}">${esc(a.status || '—')}</span></td>
          </tr>
        `;
      }).join('');
    };

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div>
          <label style="font-size:0.8rem; font-weight:600; margin-right:6px;">Filter by Class:</label>
          <select class="form-select" id="merit-class-filter" style="width:160px; display:inline-block; font-size:0.85rem;">
            <option value="all">All Classes</option>
            ${classes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div style="font-size:0.82rem; color:var(--text-muted);">
          Ranked by Entrance Exam Total Score (Written 50 + Interview 50)
        </div>
      </div>
      <div class="table-responsive" style="max-height:55vh; overflow-y:auto;">
        <table class="tms-table" style="font-size:0.84rem;">
          <thead>
            <tr>
              <th style="width:45px; text-align:center;">Rank</th>
              <th>Form No</th>
              <th>Candidate Name</th>
              <th>Class</th>
              <th style="text-align:center;">Written (50)</th>
              <th style="text-align:center;">Interview (50)</th>
              <th style="text-align:center;">Total (100)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="merit-table-body">
            ${renderListRows(list)}
          </tbody>
        </table>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
      <button class="btn btn-primary" id="btn-print-merit-pdf"><i data-lucide="printer"></i> Print Official Merit List</button>
    `;

    UIComponents.openModal({
      title: 'Entrance Examination Merit List',
      bodyHtml,
      footerHtml,
      maxWidth: '750px'
    });

    const filter = document.getElementById('merit-class-filter');
    if (filter) {
      filter.addEventListener('change', async (e) => {
        const selected = e.target.value;
        const filteredItems = await admissionService.getMeritList(selected);
        document.getElementById('merit-table-body').innerHTML = renderListRows(filteredItems);
      });
    }

    const printMeritBtn = document.getElementById('btn-print-merit-pdf');
    if (printMeritBtn) {
      printMeritBtn.addEventListener('click', async () => {
        const selected = filter ? filter.value : 'all';
        const items = await admissionService.getMeritList(selected);
        const rowsHtml = items.map((a, i) => {
          const exam = a.entranceExam || {};
          return `
            <tr>
              <td style="border:1px solid #000; padding:4px; text-align:center; font-weight:700;">${i + 1}</td>
              <td style="border:1px solid #000; padding:4px;">${esc(a.appId || a.id)}</td>
              <td style="border:1px solid #000; padding:4px; font-weight:700;">${esc(a.studentName || '—')}</td>
              <td style="border:1px solid #000; padding:4px;">${esc(a.grade || '—')}</td>
              <td style="border:1px solid #000; padding:4px; text-align:center;">${exam.writtenScore ?? '—'}</td>
              <td style="border:1px solid #000; padding:4px; text-align:center;">${exam.interviewScore ?? '—'}</td>
              <td style="border:1px solid #000; padding:4px; text-align:center; font-weight:800;">${exam.totalScore ?? '—'}</td>
              <td style="border:1px solid #000; padding:4px; text-align:center;">${esc(a.status || 'Selected')}</td>
            </tr>
          `;
        }).join('');

        const meritDocHtml = `
          <div style="text-align:center; margin-bottom:14px; border-bottom:2px solid #000; padding-bottom:8px;">
            <h2 style="font-size:18px; margin:0; text-transform:uppercase;">${esc(TMS_CONFIG.institution.name)}</h2>
            <div style="font-size:11px; font-weight:600;">${esc(TMS_CONFIG.institution.tagline)}</div>
            <h3 style="font-size:14px; margin:8px 0 2px; text-decoration:underline;">OFFICIAL ADMISSION ENTRANCE MERIT LIST</h3>
            <div style="font-size:10.5px;">Academic Session: 2027 - 2028 &nbsp;•&nbsp; Class: ${esc(selected.toUpperCase())}</div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="border:1px solid #000; padding:5px;">Rank</th>
                <th style="border:1px solid #000; padding:5px;">Form No</th>
                <th style="border:1px solid #000; padding:5px;">Candidate Name</th>
                <th style="border:1px solid #000; padding:5px;">Class</th>
                <th style="border:1px solid #000; padding:5px;">Written (50)</th>
                <th style="border:1px solid #000; padding:5px;">Interview (50)</th>
                <th style="border:1px solid #000; padding:5px;">Total (100)</th>
                <th style="border:1px solid #000; padding:5px;">Result Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:20px;">No ranked candidates.</td></tr>'}
            </tbody>
          </table>
          <div style="margin-top:40px; display:flex; justify-content:space-between; font-size:10px;">
            <div>_______________________<br><strong>Admission In-Charge</strong></div>
            <div>_______________________<br><strong>Principal / Controller</strong></div>
          </div>
        `;

        const meritFilename = formatPdfFilename('Merit_List', selected);
        exportPdf(meritFilename, meritDocHtml, {
          filename: meritFilename,
          title: `Official Entrance Merit List — Class ${selected.toUpperCase()}`,
          subtitle: `Academic Session: ${TMS_CONFIG.academic?.currentYear || '2027 - 2028'}`,
          badge: 'Merit Verified',
          showHeader: true,
          showFooter: true,
          signatures: ['Admission In-Charge', 'Principal / Controller of Examinations']
        });
      });
    }

    UIComponents.refreshIcons();
  }

  /** Build the application laid out exactly like the printed admission form. */
  static async buildApplicationFormHtml(app, fields, credential) {
    const list = fields || (await admissionService.listFields());
    const cred = credential !== undefined ? credential : await admissionService.getOrCreateCredentials(app);

    const photoKey = 'photo';
    const photoPath = (app.payload || {})[photoKey] || '';
    let photoUrl = '';
    if (photoPath) {
      photoUrl = (await admissionService.getSignedUrl('admission-docs', photoPath, 3600)) || '';
    }
    const photoBox = `
      <div style="width:105px;height:128px;border:1.5px solid #0f172a;margin-left:auto;display:flex;align-items:center;justify-content:center;overflow:hidden;text-align:center;font-size:8.5px;background:#fafafa;padding:2px;border-radius:4px;">
        ${photoUrl
          ? `<img src="${esc(photoUrl)}" alt="Applicant photograph" style="width:100%;height:100%;object-fit:cover;display:block;">`
          : 'Affix recent<br>passport-size<br>photograph'}
      </div>`;

    const groups = new Map();
    list.forEach((f) => {
      if (f.fieldKey === photoKey) return;
      const s = f.section || 'General Details';
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s).push(f);
    });

    let details = '';
    groups.forEach((sectionFields, section) => {
      details += `<div style="font-size:11.5px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:1px solid #bbf7d0; padding-bottom:2px;">${esc(section)}</div>`;
      details += '<table style="width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:8px;"><tbody>';
      sectionFields.forEach((f) => {
        const raw = (app.payload || {})[f.fieldKey];
        const isFile = (f.fieldType || 'text') === 'file';
        const shown = isFile
          ? (raw ? esc(String(raw).split('/').pop()) : 'Not attached')
          : (raw ? esc(raw) : '&#8212;');
        details += `<tr>
          <td style="width:36%; padding:4px 6px; background:#f8fafc; font-weight:700; border:1px solid #e2e8f0; color:#334155;">${esc(f.label)}</td>
          <td style="padding:4px 6px; border:1px solid #e2e8f0; font-weight:500;">${shown}</td>
        </tr>`;
      });
      details += '</tbody></table>';
    });

    const feeRows = (app.feeItems || [])
      .map((f) => `<tr><td style="padding:3px 6px; border:1px solid #e2e8f0;">${esc(f.name)}</td><td style="text-align:right; padding:3px 6px; border:1px solid #e2e8f0;">${fmtMoney(f.amount)}</td></tr>`)
      .join('');

    const portalUrl = (typeof window !== 'undefined' && window.location.origin)
      ? `${window.location.origin}/parent`
      : 'https://www.thaibagarden.com/parent';

    const credBlock = cred ? `
      <div style="border:1.5px solid #16a34a; background:#f0fdf4; border-radius:6px; padding:10px 14px; margin:14px 0; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #bbf7d0; padding-bottom:4px; margin-bottom:6px;">
          <div style="font-size:11px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.5px;">
            🔐 Parent &amp; Student Portal Login Credentials (Official)
          </div>
          <span style="font-size:8.5px; font-weight:700; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:10px;">Status: Active</span>
        </div>
        <table style="width:100%; font-size:10.5px; border-collapse:collapse; margin-bottom:4px; border:none;">
          <tbody>
            <tr style="border:none;">
              <td style="width:18%; padding:3px 0; color:#374151; border:none;"><strong>Tracking Portal:</strong></td>
              <td style="padding:3px 0; color:#15803d; font-family:monospace; border:none;"><strong>${esc(portalUrl)}</strong></td>
              <td style="width:18%; padding:3px 0; color:#374151; border:none;"><strong>Authorized Role:</strong></td>
              <td style="padding:3px 0; border:none;">Parent / Student Tracking</td>
            </tr>
            <tr style="border:none;">
              <td style="padding:3px 0; color:#374151; border:none;"><strong>Username:</strong></td>
              <td style="padding:3px 0; border:none;"><span class="font-mono" style="font-size:12px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 8px; border:1px solid #cbd5e1; border-radius:4px;">${esc(cred.username)}</span></td>
              <td style="padding:3px 0; color:#374151; border:none;"><strong>Password:</strong></td>
              <td style="padding:3px 0; border:none;"><span class="font-mono" style="font-size:12px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 8px; border:1px solid #cbd5e1; border-radius:4px;">${esc(cred.password || '******')}</span></td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:8.5px; color:#475569; margin-top:4px; line-height:1.35;">
          <strong>Security Notice:</strong> Keep these credentials strictly confidential. Sign in to the school portal to track admission status, download entrance exam admit cards, pay online fees, and access the academic diary.
        </div>
      </div>
    ` : '';

    const payload = app.payload || {};
    const candName = app.studentName || payload.candidateName || payload.studentName || '—';
    const guardian = app.guardianName || payload.fatherName || payload.guardianName || '—';
    const applyingGrade = app.grade || payload.applyingClass || payload.grade || '—';
    const contactPhone = app.phone || payload.phone || payload.mobile || '—';
    const addressStr = `${payload.village || payload.address || 'Baghait, Tapan'} ${payload.pin ? '- ' + payload.pin : ''}`.trim();

    return `
      <!-- Official Form Header -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;">
        <div style="width: 70px; height: 70px; flex-shrink: 0;">
          ${TMS_LOGO.emblemSvg(70)}
        </div>
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.8px;">${esc(TMS_CONFIG.institution.tagline || 'Run by : Thaiba Heritage, Kolkata')}</div>
          <h1 style="font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 900; color: #0f172a; margin: 1px 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px;">${esc(TMS_CONFIG.institution.name)}</h1>
          <div style="font-size: 9px; color: #334155;">${esc(TMS_CONFIG.institution.address.campus)}, ${esc(TMS_CONFIG.institution.address.district)} - ${esc(TMS_CONFIG.institution.address.pin)} • Regd. No. : ${esc(TMS_CONFIG.institution.regNo)}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Helpline: ${esc(TMS_CONFIG.institution.contact.phone1)}, ${esc(TMS_CONFIG.institution.contact.phone2)} • Web: www.thaibagarden.com</div>
        </div>
        <div style="width: 105px; text-align: right; flex-shrink: 0;">
          <div style="display: inline-block; padding: 3px 8px; background: #f0fdf4; border: 1.5px solid #16a34a; color: #15803d; border-radius: 4px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">ADMISSION FORM</div>
          <div style="font-size: 8.5px; color: #475569; margin-top: 3px;">Session: <strong>${esc(TMS_CONFIG.academic?.currentYear || '2027 - 2028')}</strong></div>
        </div>
      </div>

      <!-- Application Summary Row with Photo -->
      <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:12px;">
        <table style="flex:1; font-size:10.5px; border-collapse:collapse;">
          <tbody>
            <tr>
              <th style="width:28%; padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Form Number</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;"><strong class="font-mono" style="font-size:12px; color:#15803d;">${esc(app.appId || app.id)}</strong></td>
              <th style="width:24%; padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Class Applied</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;"><strong>${esc(applyingGrade)}</strong></td>
            </tr>
            <tr>
              <th style="padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Submission Date</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;">${fmtDate(app.createdAt)}</td>
              <th style="padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Application Status</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;"><span class="badge badge-success">${esc(app.status || 'Submitted')}</span></td>
            </tr>
            <tr>
              <th style="padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Candidate Name</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;"><strong>${esc(candName)}</strong></td>
              <th style="padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Entered By</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;">${esc(app.submittedByName || 'Self / Public')}</td>
            </tr>
          </tbody>
        </table>
        ${photoBox}
      </div>

      <!-- Dynamic Sections & Form Details -->
      ${details}

      <!-- Fees & Payment Details -->
      <div style="font-size:11.5px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:1px solid #bbf7d0; padding-bottom:2px;">Fees &amp; Payment Ledger</div>
      <table style="width:65%; font-size:10px; border-collapse:collapse; margin-bottom:8px;">
        <tbody>
          ${feeRows || '<tr><td style="padding:3px 6px; border:1px solid #e2e8f0;">Admission Registration Fee</td><td style="text-align:right; padding:3px 6px; border:1px solid #e2e8f0;">₹ 0</td></tr>'}
          <tr style="background:#f8fafc;">
            <td style="border:1px solid #cbd5e1; font-weight:800; padding:4px 6px;">Total Fee Amount</td>
            <td style="border:1px solid #cbd5e1; text-align:right; font-weight:800; padding:4px 6px; color:#15803d;">${fmtMoney(app.feeTotal)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #e2e8f0; padding:3px 6px;">Payment Clearance Status</td>
            <td style="border:1px solid #e2e8f0; text-align:right; font-weight:700; padding:3px 6px;">${esc(app.paymentStatus || 'Pending')}</td>
          </tr>
        </tbody>
      </table>

      ${app.remarks ? `<div style="margin:8px 0; font-size:10px; background:#f8fafc; padding:6px 10px; border-left:3px solid #16a34a; border-radius:3px;"><strong>Official Remarks:</strong> ${esc(app.remarks)}</div>` : ''}

      <!-- User Credentials Block -->
      ${credBlock}

      <!-- Declaration -->
      <div style="margin:14px 0 16px 0; font-size:9.5px; line-height:1.4; color:#374151;">
        <div style="font-weight:800; text-decoration:underline; margin-bottom:2px;">Declaration:</div>
        I hereby solemnly declare that all particulars furnished in this application are true, complete, and authentic to the best of my knowledge. I agree to abide by the rules, code of discipline, and academic guidelines of THAIBA PUBLIC SCHOOL.
      </div>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:20px; font-size:10px; margin-bottom:18px;">
        <div style="text-align:center; min-width:180px;">
          <div style="border-top:1.5px solid #0f172a; margin-bottom:4px;"></div>
          <strong>Signature of Parent / Guardian</strong>
        </div>
        <div style="text-align:center; min-width:180px;">
          <div style="border-top:1.5px solid #0f172a; margin-bottom:4px;"></div>
          <strong>Signature of Candidate / Student</strong>
        </div>
        <div style="text-align:center; min-width:180px;">
          <div style="border-top:1.5px solid #0f172a; margin-bottom:4px;"></div>
          <strong>Authorized Admission Officer</strong>
        </div>
      </div>

      <!-- TEAR-OFF ADMIT CARD SLIP -->
      <div style="border-top:2px dashed #64748b; margin-top:20px; padding-top:14px; position:relative; page-break-inside:avoid;">
        <div style="text-align:center; font-size:9px; font-weight:800; color:#475569; letter-spacing:1.5px; margin-bottom:8px;">
          ✂ - - - - - - - - - - - TEAR-OFF ADMISSION TEST ADMIT CARD &amp; ACKNOWLEDGEMENT SLIP - - - - - - - - - - - ✂
        </div>
        <div style="border:1.5px solid #0f172a; padding:10px 14px; border-radius:6px; background:#ffffff;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #0f172a; padding-bottom:6px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              ${TMS_LOGO.emblemSvg(36)}
              <div>
                <h3 style="font-family:'Outfit', sans-serif; font-size:13px; font-weight:800; margin:0; text-transform:uppercase;">${esc(TMS_CONFIG.institution.name)}</h3>
                <div style="font-size:8.5px; color:#64748b;">OFFICE OF ADMISSIONS • ENTRANCE ADMIT CARD</div>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge badge-success" style="font-size:9px; font-weight:800;">SESSION ${esc(TMS_CONFIG.academic?.currentYear || '2027 - 2028')}</span>
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:6px;">
            <tbody>
              <tr>
                <td style="width:20%; padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Form No. :</strong></td>
                <td style="width:30%; padding:3px 4px; border:1px solid #cbd5e1;"><strong class="font-mono" style="color:#15803d;">${esc(app.appId || app.id)}</strong></td>
                <td style="width:20%; padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Applying Class :</strong></td>
                <td style="width:30%; padding:3px 4px; border:1px solid #cbd5e1;"><strong>${esc(applyingGrade)}</strong></td>
              </tr>
              <tr>
                <td style="padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Student Name :</strong></td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1;"><strong>${esc(candName)}</strong></td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Father / Guardian :</strong></td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1;">${esc(guardian)}</td>
              </tr>
              <tr>
                <td style="padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Contact Number :</strong></td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1;">${esc(contactPhone)}</td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Address :</strong></td>
                <td style="padding:3px 4px; border:1px solid #cbd5e1;">${esc(addressStr)}</td>
              </tr>
              <tr style="background:#f0fdf4;">
                <td style="padding:3px 4px; border:1.5px solid #16a34a; font-weight:800; color:#166534;"><strong>Portal Credentials :</strong></td>
                <td colspan="3" style="padding:3px 4px; border:1.5px solid #16a34a;">
                  User: <strong class="font-mono" style="color:#0f172a; background:#fff; padding:1px 6px; border:1px solid #86efac; border-radius:3px;">${esc(cred ? cred.username : '—')}</strong> &nbsp;|&nbsp;
                  Password: <strong class="font-mono" style="color:#0f172a; background:#fff; padding:1px 6px; border:1px solid #86efac; border-radius:3px;">${esc(cred ? (cred.password || '******') : '—')}</strong> &nbsp;|&nbsp;
                  Portal: <span class="font-mono" style="color:#15803d; font-size:9px;">www.thaibagarden.com</span>
                </td>
              </tr>
              <tr>
                <td style="padding:3px 4px; border:1px solid #cbd5e1; background:#f8fafc;"><strong>Exam Centre :</strong></td>
                <td colspan="3" style="padding:3px 4px; border:1px solid #cbd5e1;">THAIBA PUBLIC SCHOOL, Baghait, Tapan, Dakshin Dinajpur</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:9px; padding-top:14px;">
            <div>
              Date of Issue: <strong>${fmtDate(app.createdAt)}</strong>
            </div>
            <div style="text-align:center;">
              <div style="border-top:1px solid #0f172a; width:140px; margin-bottom:2px;"></div>
              <strong>Seal &amp; Signature of Authority</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /** Show the application rendered as the admission form; optionally open the print dialog. */
  static async showApplicationForm(id, print = false) {
    const app = (this._apps || []).find((a) => a.id === id);
    if (!app) return;
    const fields = await admissionService.listFields();
    const credential = await admissionService.getOrCreateCredentials(app);
    const formHtml = await this.buildApplicationFormHtml(app, fields, credential);
    const filename = formatPdfFilename('Admission_Form', app.appId || app.id);
    if (print) {
      exportPdf(filename, formHtml, {
        filename,
        title: `Admission Application Form — ${app.appId || app.id}`,
        subtitle: `Candidate: ${app.studentName || 'Student'} • Class: ${app.grade || '—'}`,
        showHeader: false,
        showFooter: true
      });
      return;
    }
    UIComponents.openModal({
      title: `Form View — ${app.appId || app.id}`,
      bodyHtml: `<div style="max-height:66vh; overflow:auto;">${formHtml}</div>`,
      footerHtml: `
        <button class="btn btn-secondary" id="btn-form-close">Close</button>
        <button class="btn btn-primary" id="btn-form-print"><i data-lucide="printer"></i> Print / Save PDF</button>`
    });
    document.getElementById('btn-form-close').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('btn-form-print').addEventListener('click', () => {
      exportPdf(filename, formHtml, {
        filename,
        title: `Admission Application Form — ${app.appId || app.id}`,
        subtitle: `Candidate: ${app.studentName || 'Student'} • Class: ${app.grade || '—'}`,
        showHeader: false,
        showFooter: true
      });
    });
    UIComponents.refreshIcons();
  }

  static exportApplicationsCsv() {
    const rows = this.filteredApplications();
    const header = ['Form No', 'Candidate', 'Class', 'Guardian', 'Phone', 'Entered By', 'Fees', 'Payment', 'Status', 'Remarks'];
    const data = rows.map((a) => [
      a.appId || a.id, a.studentName, a.grade, a.guardianName, a.phone,
      a.submittedByName || 'Self / Public', a.feeTotal, a.paymentStatus, a.status, a.remarks || ''
    ]);
    downloadCsv(`TMS-Admissions-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
    UIComponents.showToast('CSV exported.', 'success');
  }

  static exportApplicationsPdf() {
    const rows = this.filteredApplications();
    const filename = formatPdfFilename('Admissions_Register', new Date().toISOString().slice(0, 10));
    const body = `
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #f1f5f9; color: #0f172a;">
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Form No</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Candidate Name</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Class</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Guardian</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Phone</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Fees</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Payment</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((a) => `<tr>
            <td class="font-mono" style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700;">${esc(a.appId || a.id)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${esc(a.studentName)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${esc(a.grade)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${esc(a.guardianName)}</td>
            <td class="font-mono" style="padding: 5px 8px; border: 1px solid #cbd5e1;">${esc(a.phone)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${fmtMoney(a.feeTotal)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${esc(a.paymentStatus)}</td>
            <td style="padding: 5px 8px; border: 1px solid #cbd5e1;"><span class="badge badge-info">${esc(a.status)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    exportPdf(filename, body, {
      filename,
      title: 'Admissions Applications Master Register',
      subtitle: `Total Candidate Applications: ${rows.length} • Session ${TMS_CONFIG.academic?.currentYear || '2027 - 2028'}`,
      badge: 'Official Register',
      showHeader: true,
      showFooter: true,
      signatures: ['Admissions Officer', 'Accounts Officer', 'Principal / Headmaster']
    });
  }

  /* ================================================================== */
  /* Section-Based Admission Form Customizer                            */
  /* ================================================================== */

  static async renderFormBuilderTab(tabContent) {
    const fields = await admissionService.listAllFields();
    const usingDefaults = fields.length === 0;
    const list = usingDefaults
      ? (await admissionService.listFields())
      : fields;

    // Group fields by section
    const sectionMap = new Map();
    list.forEach((f) => {
      const s = (f.section || 'General Information').trim();
      if (!sectionMap.has(s)) sectionMap.set(s, []);
      sectionMap.get(s).push(f);
    });

    const totalSections = sectionMap.size;
    const totalFields = list.length;
    const activeCount = list.filter((f) => f.isActive !== false).length;

    let sectionsHtml = '';
    let secIdx = 0;

    sectionMap.forEach((secFields, secName) => {
      secIdx += 1;
      const secActiveCount = secFields.filter(f => f.isActive !== false).length;

      sectionsHtml += `
        <div class="card section-customizer-card" style="margin-bottom:22px; border:1.5px solid var(--border-color); border-radius:14px; overflow:hidden; box-shadow:var(--shadow-sm);">
          <div class="card-header" style="background:#F8FAFC; border-bottom:1.5px solid var(--border-color); padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="width:34px; height:34px; border-radius:8px; background:#DCFCE7; color:#15803d; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem; font-family:var(--font-mono);">
                ${String(secIdx).padStart(2, '0')}
              </span>
              <div>
                <h4 style="margin:0 0 2px 0; font-size:1.05rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.01em;">
                  ${esc(secName)}
                </h4>
                <div style="display:flex; gap:8px; align-items:center; font-size:0.75rem; color:var(--text-muted);">
                  <span>${secFields.length} question(s)</span>
                  <span>•</span>
                  <span style="color:#15803d; font-weight:600;">${secActiveCount} active</span>
                  ${secFields.length - secActiveCount > 0 ? `<span>•</span><span style="color:#b45309;">${secFields.length - secActiveCount} disabled</span>` : ''}
                </div>
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm btn-rename-section" data-section="${esc(secName)}" title="Rename this section">
                <i data-lucide="edit-3"></i> Rename Section
              </button>
              <button class="btn btn-primary btn-sm btn-add-field-to-sec" data-section="${esc(secName)}">
                <i data-lucide="plus"></i> Add Question
              </button>
              <button class="btn btn-secondary btn-sm btn-del-section" data-section="${esc(secName)}" style="color:#ef4444;" title="Delete Section and all its questions">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="tms-table" style="font-size:0.85rem; margin:0;">
              <thead>
                <tr style="background:#ffffff;">
                  <th style="width:34px;">${usingDefaults ? '' : '<input type="checkbox" class="section-select-all" data-section="' + esc(secName) + '">'}</th>
                  <th style="width:50px;">#</th>
                  <th>Question Label</th>
                  <th>Field Key</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${secFields.map((f, i) => `
                  <tr>
                    <td>${usingDefaults ? '' : `<input type="checkbox" class="field-row-check" data-section="${esc(secName)}" value="${esc(f.id)}">`}</td>
                    <td class="font-mono" style="font-size:0.8rem; color:var(--text-muted);">${f.displayOrder || i + 1}</td>
                    <td>
                      <span style="font-weight:700; color:var(--text-primary);">${esc(f.label)}</span>
                      ${f.placeholder ? `<br><span style="font-size:0.72rem; color:var(--text-muted);">${esc(f.placeholder)}</span>` : ''}
                    </td>
                    <td class="font-mono" style="font-size:0.78rem; color:#475569;">${esc(f.fieldKey)}</td>
                    <td><span class="badge badge-info" style="font-size:0.72rem;">${esc(f.fieldType)}</span></td>
                    <td>
                      <button type="button" class="badge btn-toggle-required ${f.required ? 'badge-success' : ''}" data-key="${esc(f.fieldKey)}" style="cursor:pointer; border:none;" title="Click to toggle required">
                        ${f.required ? '✓ Required' : 'Optional'}
                      </button>
                    </td>
                    <td>
                      <button type="button" class="badge btn-toggle-active ${f.isActive === false ? 'badge-warning' : 'badge-success'}" data-key="${esc(f.fieldKey)}" style="cursor:pointer; border:none;" title="Click to toggle active">
                        ${f.isActive === false ? '⊘ Disabled' : '● Active'}
                      </button>
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                      <button class="btn btn-secondary btn-sm btn-edit-field" data-key="${esc(f.fieldKey)}" title="Edit Question"><i data-lucide="pencil"></i></button>
                      <button class="btn btn-secondary btn-sm btn-del-field" data-id="${esc(f.id)}" style="color:#ef4444;" title="Delete Question"><i data-lucide="trash-2"></i></button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    tabContent.innerHTML = `
      <div style="margin-bottom:20px;">
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header" style="flex-wrap:wrap; gap:14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge badge-primary" style="font-size:0.75rem;">Section-Based Architecture</span>
                <span style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">${totalSections} Section(s) • ${totalFields} Total Question(s) (${activeCount} Active)</span>
              </div>
              <h3 class="card-title" style="margin-top:4px;">Admission Form Section Customizer</h3>
              <p class="card-desc" style="margin-top:2px;">
                Organize your admission portal application into dedicated section steps. Only active questions configured here will be asked to candidates.
                ${usingDefaults ? '<br><strong style="color:#b45309;">Showing built-in defaults — click "Save &amp; Persist Defaults" to enable live customization.</strong>' : ''}
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              ${usingDefaults ? '<button class="btn btn-secondary btn-sm" id="btn-seed-fields"><i data-lucide="download"></i> Save &amp; Persist Defaults</button>' : ''}
              ${usingDefaults ? '' : `
                <button class="btn btn-secondary btn-sm" id="btn-select-all-fields"><i data-lucide="check-square"></i> Select All</button>
                <button class="btn btn-secondary btn-sm" id="btn-bulk-del-fields" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete Selected (<span id="field-selected-count">0</span>)</button>
              `}
              <button class="btn btn-secondary btn-sm" id="btn-add-section"><i data-lucide="folder-plus"></i> Add New Section</button>
              <button class="btn btn-primary btn-sm" id="btn-add-field"><i data-lucide="plus"></i> Add Question</button>
            </div>
          </div>
        </div>

        <div id="sections-container">
          ${sectionsHtml || `
            <div class="card" style="text-align:center; padding:48px 20px; color:var(--text-muted);">
              <i data-lucide="layers" style="width:48px; height:48px; margin:0 auto 12px; color:#cbd5e1;"></i>
              <h4 style="color:var(--text-primary); margin-bottom:6px;">No Sections Configured</h4>
              <p style="font-size:0.86rem; max-width:400px; margin:0 auto 16px;">Click "Add New Section" or "Save &amp; Persist Defaults" to set up your admission form.</p>
            </div>
          `}
        </div>
      </div>
    `;

    const seedBtn = document.getElementById('btn-seed-fields');
    if (seedBtn) seedBtn.addEventListener('click', async () => {
      await admissionService.seedDefaultFields();
      await auditService.log('ADMISSION_FORM_FIELDS_SEEDED', 'GOVERNANCE', {});
      UIComponents.showToast('Default form sections saved.', 'success');
      this.renderTab('form-builder');
    });

    const checkedFields = () => Array.from(tabContent.querySelectorAll('.field-row-check:checked')).map((c) => c.value);
    const syncFieldCount = () => {
      const el = document.getElementById('field-selected-count');
      if (el) el.innerText = checkedFields().length;
    };
    tabContent.querySelectorAll('.field-row-check').forEach((c) => c.addEventListener('change', syncFieldCount));

    // Section-level select all
    tabContent.querySelectorAll('.section-select-all').forEach((sa) => {
      sa.addEventListener('change', (e) => {
        const sec = sa.dataset.section;
        tabContent.querySelectorAll(`.field-row-check[data-section="${sec}"]`).forEach((c) => { c.checked = e.target.checked; });
        syncFieldCount();
      });
    });

    const fieldSelBtn = document.getElementById('btn-select-all-fields');
    if (fieldSelBtn) fieldSelBtn.addEventListener('click', () => {
      tabContent.querySelectorAll('.field-row-check').forEach((c) => { c.checked = true; });
      syncFieldCount();
    });

    const fieldBulkDel = document.getElementById('btn-bulk-del-fields');
    if (fieldBulkDel) fieldBulkDel.addEventListener('click', async () => {
      const ids = checkedFields();
      if (!ids.length) { UIComponents.showToast('Select at least one question.', 'warning'); return; }
      if (!confirm(`Delete ${ids.length} form question(s)?`)) return;
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await admissionService.removeField(id);
      }
      await auditService.log('ADMISSION_FORM_FIELDS_BULK_DELETED', 'GOVERNANCE', { count: ids.length });
      UIComponents.showToast(`${ids.length} question(s) deleted.`, 'success');
      this.renderTab('form-builder');
    });

    // Add field global
    safeOn('btn-add-field', 'click', () => this.openFieldModal(null));

    // Add field to specific section
    tabContent.querySelectorAll('.btn-add-field-to-sec').forEach((b) => {
      b.addEventListener('click', () => this.openFieldModal(null, b.dataset.section));
    });

    // Add new section modal
    safeOn('btn-add-section', 'click', () => this.openAddSectionModal(Array.from(sectionMap.keys())));

    // Rename section
    tabContent.querySelectorAll('.btn-rename-section').forEach((b) => {
      b.addEventListener('click', () => this.openRenameSectionModal(b.dataset.section, list));
    });

    // Delete entire section
    tabContent.querySelectorAll('.btn-del-section').forEach((b) => {
      b.addEventListener('click', async () => {
        const secName = b.dataset.section;
        const secItems = list.filter(f => (f.section || 'General Information').trim() === secName);
        if (!confirm(`Are you sure you want to delete section "${secName}" and all its ${secItems.length} question(s)?`)) return;
        for (const item of secItems) {
          // eslint-disable-next-line no-await-in-loop
          await admissionService.removeField(item.id);
        }
        await auditService.log('ADMISSION_SECTION_DELETED', 'GOVERNANCE', { section: secName, count: secItems.length });
        UIComponents.showToast(`Section "${secName}" deleted.`, 'success');
        this.renderTab('form-builder');
      });
    });

    // Quick toggle required
    tabContent.querySelectorAll('.btn-toggle-required').forEach((b) => {
      b.addEventListener('click', async () => {
        const field = list.find(f => f.fieldKey === b.dataset.key);
        if (!field) return;
        field.required = !field.required;
        await admissionService.saveField(field);
        UIComponents.showToast(`"${field.label}" marked ${field.required ? 'Required' : 'Optional'}.`, 'info');
        this.renderTab('form-builder');
      });
    });

    // Quick toggle active
    tabContent.querySelectorAll('.btn-toggle-active').forEach((b) => {
      b.addEventListener('click', async () => {
        const field = list.find(f => f.fieldKey === b.dataset.key);
        if (!field) return;
        field.isActive = field.isActive === false ? true : false;
        await admissionService.saveField(field);
        UIComponents.showToast(`"${field.label}" set to ${field.isActive ? 'Active' : 'Disabled'}.`, 'info');
        this.renderTab('form-builder');
      });
    });

    // Edit field
    tabContent.querySelectorAll('.btn-edit-field').forEach((b) =>
      b.addEventListener('click', () => this.openFieldModal(list.find((f) => f.fieldKey === b.dataset.key) || null)));

    // Delete single field
    tabContent.querySelectorAll('.btn-del-field').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this question?')) return;
        await admissionService.removeField(b.dataset.id);
        UIComponents.showToast('Question deleted.', 'success');
        this.renderTab('form-builder');
      }));

    UIComponents.refreshIcons();
  }

  static openAddSectionModal(existingSections) {
    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">New Section Name *</label>
          <input class="form-input" id="new-sec-name" placeholder="e.g. Health &amp; Medical Details, Hostel Facility">
        </div>
        <div style="border-top:1px solid var(--border-color); padding-top:14px;">
          <h5 style="font-size:0.9rem; font-weight:700; margin-bottom:8px;">First Question in this Section</h5>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Question Label *</label>
              <input class="form-input" id="new-sec-fld-label" placeholder="e.g. Existing Medical Conditions">
            </div>
            <div class="form-group">
              <label class="form-label">Field Key (unique, no spaces) *</label>
              <input class="form-input font-mono" id="new-sec-fld-key" placeholder="e.g. medicalCondition">
            </div>
            <div class="form-group">
              <label class="form-label">Response Type</label>
              <select class="form-select" id="new-sec-fld-type">
                ${['text', 'textarea', 'number', 'date', 'tel', 'email', 'select', 'checkbox', 'file'].map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <label style="display:flex; gap:8px; align-items:center; grid-column:1/-1;">
              <input type="checkbox" id="new-sec-fld-req"> Required Question
            </label>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="sec-cancel">Cancel</button>
      <button class="btn btn-primary" id="sec-save"><i data-lucide="plus"></i> Create Section</button>
    `;

    UIComponents.openModal({ title: 'Add New Form Section', bodyHtml, footerHtml, maxWidth: '520px' });
    document.getElementById('sec-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('sec-save').addEventListener('click', async () => {
      const secName = document.getElementById('new-sec-name').value.trim();
      const label = document.getElementById('new-sec-fld-label').value.trim();
      const key = document.getElementById('new-sec-fld-key').value.trim().replace(/\s+/g, '_');
      const type = document.getElementById('new-sec-fld-type').value;
      const req = document.getElementById('new-sec-fld-req').checked;

      if (!secName) { UIComponents.showToast('Please enter a section name.', 'warning'); return; }
      if (!label || !key) { UIComponents.showToast('Please enter the question label and field key.', 'warning'); return; }

      try {
        await admissionService.saveField({
          label,
          fieldKey: key,
          fieldType: type,
          section: secName,
          displayOrder: 1,
          required: req,
          isActive: true
        });
        await auditService.log('ADMISSION_SECTION_CREATED', 'GOVERNANCE', { section: secName, fieldKey: key });
        UIComponents.showToast(`Section "${secName}" created successfully.`, 'success');
        UIComponents.closeModal();
        this.renderTab('form-builder');
      } catch (e) {
        UIComponents.showToast(e.message, 'danger');
      }
    });
    UIComponents.refreshIcons();
  }

  static openRenameSectionModal(currentName, allFields) {
    const secFields = allFields.filter(f => (f.section || 'General Information').trim() === currentName);

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Current Section Name</label>
          <input class="form-input" value="${esc(currentName)}" readonly style="background:var(--bg-subtle);">
        </div>
        <div class="form-group">
          <label class="form-label">New Section Name *</label>
          <input class="form-input" id="rename-new-sec-name" value="${esc(currentName)}" autofocus>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
            All ${secFields.length} question(s) in this section will be updated to the new section name.
          </span>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="rename-cancel">Cancel</button>
      <button class="btn btn-primary" id="rename-save"><i data-lucide="check"></i> Update Section Name</button>
    `;

    UIComponents.openModal({ title: 'Rename Form Section', bodyHtml, footerHtml, maxWidth: '480px' });
    document.getElementById('rename-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('rename-save').addEventListener('click', async () => {
      const newName = document.getElementById('rename-new-sec-name').value.trim();
      if (!newName || newName === currentName) { UIComponents.closeModal(); return; }

      try {
        for (const f of secFields) {
          f.section = newName;
          // eslint-disable-next-line no-await-in-loop
          await admissionService.saveField(f);
        }
        await auditService.log('ADMISSION_SECTION_RENAMED', 'GOVERNANCE', { oldName: currentName, newName });
        UIComponents.showToast(`Section renamed to "${newName}".`, 'success');
        UIComponents.closeModal();
        this.renderTab('form-builder');
      } catch (e) {
        UIComponents.showToast(e.message, 'danger');
      }
    });
    UIComponents.refreshIcons();
  }

  static openFieldModal(field, defaultSection = '') {
    const f = field || {};
    const existingSection = f.section || defaultSection || 'General Information';

    const bodyHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Question / Field Label *</label>
          <input class="form-input" id="fld-label" value="${esc(f.label || '')}" placeholder="e.g. Mother's Name">
        </div>
        <div class="form-group">
          <label class="form-label">Field Key (unique, no spaces) *</label>
          <input class="form-input font-mono" id="fld-key" value="${esc(f.fieldKey || '')}" placeholder="e.g. motherName">
        </div>
        <div class="form-group">
          <label class="form-label">Response Type</label>
          <select class="form-select" id="fld-type">
            ${['text', 'textarea', 'number', 'date', 'tel', 'email', 'select', 'checkbox', 'file'].map((t) => `<option ${f.fieldType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Section (Step Group) *</label>
          <input class="form-input" id="fld-section" value="${esc(existingSection)}" placeholder="e.g. Candidate Details">
        </div>
        <div class="form-group">
          <label class="form-label">Display Order</label>
          <input type="number" class="form-input" id="fld-order" value="${f.displayOrder || 1}">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Options (comma separated — for dropdown select)</label>
          <input class="form-input" id="fld-options" value="${esc((f.options || []).join(', '))}" placeholder="e.g. Male, Female, Other">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Placeholder / Help Text</label>
          <input class="form-input" id="fld-placeholder" value="${esc(f.placeholder || '')}">
        </div>
        <label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="fld-required" ${f.required ? 'checked' : ''}> Required Question</label>
        <label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="fld-active" ${f.isActive === false ? '' : 'checked'}> Active (Ask to Applicants)</label>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="fld-cancel">Cancel</button>
      <button class="btn btn-primary" id="fld-save"><i data-lucide="save"></i> Save Question</button>
    `;

    UIComponents.openModal({ title: field ? 'Edit Question' : 'Add Question', bodyHtml, footerHtml });
    document.getElementById('fld-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('fld-save').addEventListener('click', async () => {
      const options = document.getElementById('fld-options').value.split(',').map((s) => s.trim()).filter(Boolean);
      const label = document.getElementById('fld-label').value.trim();
      const fieldKey = document.getElementById('fld-key').value.trim();
      const section = document.getElementById('fld-section').value.trim();

      if (!label || !fieldKey || !section) {
        UIComponents.showToast('Label, key, and section are required.', 'warning');
        return;
      }

      try {
        await admissionService.saveField({
          id: f.id,
          label,
          fieldKey,
          fieldType: document.getElementById('fld-type').value,
          section,
          displayOrder: Number(document.getElementById('fld-order').value || 1),
          options,
          placeholder: document.getElementById('fld-placeholder').value.trim(),
          required: document.getElementById('fld-required').checked,
          isActive: document.getElementById('fld-active').checked
        });
        await auditService.log('ADMISSION_FIELD_SAVED', 'GOVERNANCE', { key: fieldKey });
        UIComponents.showToast('Question saved.', 'success');
        UIComponents.closeModal();
        this.renderTab('form-builder');
      } catch (e) {
        UIComponents.showToast(e.message, 'danger');
      }
    });
    UIComponents.refreshIcons();
  }
  /* ================================================================== */
  /* Fees                                                               */
  /* ================================================================== */

  static async renderFeesTab(tabContent) {
    const fees = await admissionService.listAllFees();
    const usingDefaults = fees.length === 0;
    const list = usingDefaults ? await admissionService.listFees() : fees;

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px;">
          <div>
            <h3 class="card-title">Admission Fee Items</h3>
            <p class="card-desc">Ticked items are offered to applicants. Mandatory items are always charged. ${usingDefaults ? '<strong style="color:#b45309;">Showing built-in defaults — save to persist.</strong>' : ''}</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${usingDefaults ? '<button class="btn btn-secondary btn-sm" id="btn-seed-fees"><i data-lucide="download"></i> Load &amp; Save Defaults</button>' : ''}
            ${usingDefaults ? '' : '<button class="btn btn-secondary btn-sm" id="btn-select-all-fees"><i data-lucide="check-square"></i> Select All</button><button class="btn btn-secondary btn-sm" id="btn-bulk-del-fees" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete Selected (<span id="fee-selected-count">0</span>)</button>'}
            <button class="btn btn-primary btn-sm" id="btn-add-fee"><i data-lucide="plus"></i> Add Fee Item</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.85rem;">
            <thead><tr><th style="width:34px;">${usingDefaults ? '' : '<input type="checkbox" id="fee-select-all">'}</th><th>#</th><th>Fee Name</th><th>Schedule</th><th>Amount</th><th>Mandatory</th><th>Active</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              ${list.map((f, i) => `<tr>
                <td>${usingDefaults ? '' : `<input type="checkbox" class="fee-row-check" value="${esc(f.id)}">`}</td>
                <td>${f.displayOrder || i + 1}</td>
                <td style="font-weight:600;">${esc(f.name)}</td>
                <td>${esc(f.schedule || '—')}</td>
                <td>${fmtMoney(f.amount)}</td>
                <td>${f.mandatory ? '<span class="badge badge-warning">Yes</span>' : '<span class="badge">No</span>'}</td>
                <td>${f.isActive === false ? '<span class="badge badge-warning">Off</span>' : '<span class="badge badge-success">On</span>'}</td>
                <td style="font-size:0.78rem;color:var(--text-muted);">${esc(f.description || '—')}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-edit-fee" data-id="${esc(f.id)}"><i data-lucide="pencil"></i></button>
                  <button class="btn btn-secondary btn-sm btn-del-fee" data-id="${esc(f.id)}" style="color:#ef4444;"><i data-lucide="trash-2"></i></button>
                </td>
              </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:26px;">No fee items configured.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const seedBtn = document.getElementById('btn-seed-fees');
    if (seedBtn) seedBtn.addEventListener('click', async () => {
      await admissionService.seedDefaultFees();
      UIComponents.showToast('Default fees saved.', 'success');
      this.renderTab('fees');
    });

    const checkedFees = () => Array.from(tabContent.querySelectorAll('.fee-row-check:checked')).map((c) => c.value);
    const syncFeeCount = () => {
      const el = document.getElementById('fee-selected-count');
      if (el) el.innerText = checkedFees().length;
    };
    tabContent.querySelectorAll('.fee-row-check').forEach((c) => c.addEventListener('change', syncFeeCount));
    const feeSelAll = document.getElementById('fee-select-all');
    if (feeSelAll) feeSelAll.addEventListener('change', (e) => {
      tabContent.querySelectorAll('.fee-row-check').forEach((c) => { c.checked = e.target.checked; });
      syncFeeCount();
    });
    const feeSelBtn = document.getElementById('btn-select-all-fees');
    if (feeSelBtn) feeSelBtn.addEventListener('click', () => {
      tabContent.querySelectorAll('.fee-row-check').forEach((c) => { c.checked = true; });
      syncFeeCount();
    });
    const feeBulkDel = document.getElementById('btn-bulk-del-fees');
    if (feeBulkDel) feeBulkDel.addEventListener('click', async () => {
      const ids = checkedFees();
      if (!ids.length) { UIComponents.showToast('Select at least one fee item.', 'warning'); return; }
      if (!confirm(`Delete ${ids.length} fee item(s)?`)) return;
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await admissionService.removeFee(id);
      }
      await auditService.log('ADMISSION_FEES_BULK_DELETED', 'GOVERNANCE', { count: ids.length });
      UIComponents.showToast(`${ids.length} fee item(s) deleted.`, 'success');
      this.renderTab('fees');
    });

    safeOn('btn-add-fee', 'click', () => this.openFeeModal(null));
    tabContent.querySelectorAll('.btn-edit-fee').forEach((b) =>
      b.addEventListener('click', () => this.openFeeModal(list.find((f) => f.id === b.dataset.id) || null)));
    tabContent.querySelectorAll('.btn-del-fee').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this fee item?')) return;
        await admissionService.removeFee(b.dataset.id);
        UIComponents.showToast('Fee item deleted.', 'success');
        this.renderTab('fees');
      }));
    UIComponents.refreshIcons();
  }

  static openFeeModal(fee) {
    const f = fee || {};
    const bodyHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Fee Name *</label>
          <input class="form-input" id="fee-name" value="${esc(f.name || '')}" placeholder="e.g. Registration Fee">
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" class="form-input" id="fee-amount" value="${Number(f.amount || 0)}">
        </div>
        <div class="form-group">
          <label class="form-label">Schedule</label>
          <input class="form-input" id="fee-schedule" value="${esc(f.schedule || '')}" placeholder="e.g. One-Time / Monthly">
        </div>
        <div class="form-group">
          <label class="form-label">Display Order</label>
          <input type="number" class="form-input" id="fee-order" value="${f.displayOrder || 0}">
        </div>
        <label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="fee-mandatory" ${f.mandatory ? 'checked' : ''}> Mandatory</label>
        <label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="fee-active" ${f.isActive === false ? '' : 'checked'}> Active</label>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Description</label>
          <input class="form-input" id="fee-desc" value="${esc(f.description || '')}">
        </div>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="fee-cancel">Cancel</button>
      <button class="btn btn-primary" id="fee-save"><i data-lucide="save"></i> Save Fee</button>
    `;
    UIComponents.openModal({ title: fee ? 'Edit Fee Item' : 'Add Fee Item', bodyHtml, footerHtml });
    document.getElementById('fee-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('fee-save').addEventListener('click', async () => {
      await admissionService.saveFee({
        id: f.id,
        name: document.getElementById('fee-name').value.trim(),
        amount: parseFloat(document.getElementById('fee-amount').value) || 0,
        schedule: document.getElementById('fee-schedule').value.trim(),
        description: document.getElementById('fee-desc').value.trim(),
        displayOrder: Number(document.getElementById('fee-order').value || 0),
        mandatory: document.getElementById('fee-mandatory').checked,
        isActive: document.getElementById('fee-active').checked
      });
      UIComponents.showToast('Fee saved.', 'success');
      UIComponents.closeModal();
      this.renderTab('fees');
    });
    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Payment & Session settings                                         */
  /* ================================================================== */

  static async renderPaymentSettingsTab(tabContent) {
    const s = await admissionService.loadSettings();
    let currentInstructions = Array.isArray(s.instructions) && s.instructions.length
      ? s.instructions.slice()
      : (DEFAULT_INSTRUCTIONS || []).slice();

    let currentPopupInstructions = Array.isArray(s.popupInstructions) && s.popupInstructions.length
      ? s.popupInstructions.slice()
      : (DEFAULT_POPUP_INSTRUCTIONS || []).slice();

    const renderGuidelinesList = () => {
      const container = document.getElementById('guidelines-list-container');
      if (!container) return;
      if (!currentInstructions.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">No guidelines configured. Click "Reset to Defaults" or add one below.</p>';
        return;
      }
      container.innerHTML = currentInstructions.map((item, idx) => `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; background:var(--bg-subtle, #f8fafc); padding:8px 12px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
          <span style="font-weight:700; color:var(--text-muted); font-size:0.85rem; min-width:22px;">${idx + 1}.</span>
          <input type="text" class="form-input guideline-item-input" data-index="${idx}" value="${esc(item)}" style="flex:1; font-size:0.88rem;">
          <button type="button" class="btn btn-secondary btn-sm btn-del-guideline" data-index="${idx}" title="Delete Guideline" style="color:#ef4444; padding:4px 8px;">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `).join('');

      container.querySelectorAll('.guideline-item-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          currentInstructions[index] = e.target.value;
          const ta = document.getElementById('set-instructions-raw');
          if (ta) ta.value = currentInstructions.join('\n');
        });
      });

      container.querySelectorAll('.btn-del-guideline').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index, 10);
          currentInstructions.splice(index, 1);
          renderGuidelinesList();
          const ta = document.getElementById('set-instructions-raw');
          if (ta) ta.value = currentInstructions.join('\n');
        });
      });

      UIComponents.refreshIcons();
    };

    const renderPopupList = () => {
      const container = document.getElementById('popup-list-container');
      if (!container) return;
      if (!currentPopupInstructions.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">No instructions configured. Click "Reset to Defaults" or add one below.</p>';
        return;
      }
      container.innerHTML = currentPopupInstructions.map((item, idx) => `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; background:var(--bg-subtle, #f8fafc); padding:8px 12px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
          <span style="font-weight:700; color:#16a34a; font-size:0.85rem; min-width:22px;">${idx + 1}.</span>
          <input type="text" class="form-input popup-item-input" data-index="${idx}" value="${esc(item)}" style="flex:1; font-size:0.88rem;">
          <button type="button" class="btn btn-secondary btn-sm btn-del-popup-item" data-index="${idx}" title="Delete Item" style="color:#ef4444; padding:4px 8px;">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `).join('');

      container.querySelectorAll('.popup-item-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          currentPopupInstructions[index] = e.target.value;
          const ta = document.getElementById('set-popup-raw');
          if (ta) ta.value = currentPopupInstructions.join('\n');
        });
      });

      container.querySelectorAll('.btn-del-popup-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index, 10);
          currentPopupInstructions.splice(index, 1);
          renderPopupList();
          const ta = document.getElementById('set-popup-raw');
          if (ta) ta.value = currentPopupInstructions.join('\n');
        });
      });

      UIComponents.refreshIcons();
    };

    tabContent.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; margin:0 0 4px;">Admission Portal &amp; Guidelines Settings</h2>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
            Customize form headings, academic session, submission popup instructions, and on-demand display toggles.
          </p>
        </div>
        <button class="btn btn-primary" id="btn-save-settings"><i data-lucide="save"></i> Save All Settings</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap:22px;">
        
        <!-- CARD 1: FORM HEADINGS & BRANDING CUSTOMIZER -->
        <div class="card" style="border-left: 4px solid #16a34a;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="heading" style="color:#16a34a;"></i> Form Headings &amp; Title Customization</h3>
          </div>
          <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:14px;">
            Configure the main titles, organization line, and session shown on the public admission form, A4 printout, and Admit Card.
          </p>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Form Main Heading</label>
            <input class="form-input" id="set-form-title" value="${esc(s.formTitle || 'Admission Application Form')}" placeholder="e.g. Admission Application Form">
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Form Subtitle / Trust Line</label>
            <input class="form-input" id="set-form-subtitle" value="${esc(s.formSubtitle || 'Run by : Thaiba Heritage, Kolkata')}" placeholder="e.g. Run by : Thaiba Heritage, Kolkata">
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Academic Session</label>
            <input class="form-input" id="set-session" value="${esc(s.session || '2027 - 2028')}" placeholder="e.g. 2027 - 2028">
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:14px; margin-top:14px;">
            <h4 style="font-size:0.92rem; color:#15803d; margin-bottom:10px;">Admit Card Slip Titles</h4>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Admit Card Title</label>
              <input class="form-input" id="set-admit-title" value="${esc(s.admitCardTitle || 'ADMIT CARD')}" placeholder="e.g. ADMIT CARD">
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">School Name on Admit Card</label>
              <input class="form-input" id="set-admit-subtitle" value="${esc(s.admitCardSubtitle || 'THAIBA PUBLIC SCHOOL')}" placeholder="e.g. THAIBA PUBLIC SCHOOL">
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Admit Card Address &amp; Contact</label>
              <input class="form-input" id="set-admit-address" value="${esc(s.admitCardAddress || 'Baghait, Tapan, Dakshin Dinajpur • Contact : +91 8653382851, +91 8167782851')}">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Admission / Test Centre</label>
              <input class="form-input" id="set-centre" value="${esc(s.testCentre || 'THAIBA PUBLIC SCHOOL, Baghait, Tapan, Dakshin Dinajpur')}">
            </div>
          </div>
        </div>

        <!-- CARD 2: DISPLAY TOGGLES & POPUP INSTRUCTIONS -->
        <div class="card" style="border-left: 4px solid #8b5cf6;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="sliders" style="color:#8b5cf6;"></i> Public Portal Toggles</h3>
          </div>
          <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:14px;">
            Choose whether to show on-demand buttons for Fee Structure and Guidelines on the public form.
          </p>

          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:var(--radius-md);">
              <div style="padding-right:12px;">
                <strong style="font-size:0.92rem; display:block; margin-bottom:2px;">Show Fee Structure Button</strong>
                <span style="font-size:0.78rem; color:var(--text-muted);">Displays the "Fee Structure" button on the portal to view fee schedule on demand.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:26px; flex-shrink:0;">
                <input type="checkbox" id="set-show-fee-structure" ${s.showFeeStructure ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:#cbd5e1; border-radius:26px; transition:.3s;"></span>
              </label>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:var(--radius-md);">
              <div style="padding-right:12px;">
                <strong style="font-size:0.92rem; display:block; margin-bottom:2px;">Show General Guidelines Button</strong>
                <span style="font-size:0.78rem; color:var(--text-muted);">Displays the "General Guidelines" button on the portal to read admission instructions on demand.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:26px; flex-shrink:0;">
                <input type="checkbox" id="set-show-guidelines" ${s.showGuidelines ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:#cbd5e1; border-radius:26px; transition:.3s;"></span>
              </label>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--bg-subtle, #f8fafc); border:1px solid var(--border-color); border-radius:var(--radius-md);">
              <div style="padding-right:12px;">
                <strong style="font-size:0.92rem; display:block; margin-bottom:2px;">Show Instruction Video</strong>
                <span style="font-size:0.78rem; color:var(--text-muted);">Embeds the instructional video in the Guidelines modal &amp; adds "Watch Video Guide" button on the portal.</span>
              </div>
              <label class="switch" style="position:relative; display:inline-block; width:50px; height:26px; flex-shrink:0;">
                <input type="checkbox" id="set-show-video" ${s.showInstructionVideo ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:#cbd5e1; border-radius:26px; transition:.3s;"></span>
              </label>
            </div>
          </div>

          <!-- SUBMISSION POPUP INSTRUCTIONS EDITOR -->
          <div style="border-top:1px solid var(--border-color); padding-top:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
              <div>
                <h4 style="font-size:0.95rem; margin:0 0 2px; color:#6d28d9;"><i data-lucide="message-square" style="width:16px; height:16px; vertical-align:middle;"></i> Post-Submission Popup Instructions</h4>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">Instructions shown inside the confirmation popup after submitting.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-popup" style="font-size:0.75rem; padding:4px 8px;">
                <i data-lucide="rotate-ccw"></i> Reset
              </button>
            </div>

            <div style="display:flex; gap:8px; margin-bottom:12px;">
              <input type="text" class="form-input" id="new-popup-text" placeholder="Add an instruction for the submit popup..." style="font-size:0.85rem;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-add-popup" style="white-space:nowrap;">
                <i data-lucide="plus"></i> Add
              </button>
            </div>

            <div id="popup-list-container" style="max-height:220px; overflow-y:auto; padding-right:4px;"></div>

            <details style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);">
              <summary style="cursor:pointer; font-weight:600; color:var(--text-main);">Bulk edit popup instructions</summary>
              <textarea class="form-textarea" id="set-popup-raw" rows="3" style="font-size:0.8rem; margin-top:6px;">${esc(currentPopupInstructions.join('\n'))}</textarea>
            </details>
          </div>
        </div>

        <!-- CARD 3: INSTRUCTION & GUIDELINES VIDEO TUTORIAL -->
        <div class="card" style="border-left: 4px solid #ef4444; grid-column: 1 / -1;">
          <div class="card-header" style="flex-wrap:wrap; gap:10px;">
            <div>
              <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                <span style="color:#ef4444;"><i data-lucide="video"></i></span>
                Instructional &amp; Guidelines Video Walkthrough
              </h3>
              <p class="card-desc">Applicants can watch this video tutorial directly when viewing admission guidelines or clicking the video button.</p>
            </div>
            <span class="badge ${s.instructionVideoUrl ? 'badge-success' : 'badge-info'}" id="badge-video-status">
              ${s.instructionVideoUrl ? 'Video Configured' : 'No Video Set'}
            </span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px; margin-bottom:14px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:600;">Instruction Video URL (YouTube, Vimeo, or MP4) *</label>
              <div style="display:flex; gap:8px;">
                <input type="url" class="form-input" id="set-video-url" value="${esc(s.instructionVideoUrl || '')}" placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..." style="flex:1; font-size:0.85rem;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-preview-video"><i data-lucide="play"></i> Test Video</button>
              </div>
              <small style="color:var(--text-muted); font-size:0.75rem; margin-top:4px; display:block;">
                Paste any standard YouTube video URL, YouTube Shorts, Vimeo link, or MP4 video URL. It is automatically converted into a responsive player.
              </small>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:600;">Video Title / Heading</label>
              <input type="text" class="form-input" id="set-video-title" value="${esc(s.instructionVideoTitle || 'How to Fill Admission Application Form')}" placeholder="e.g. Step-by-Step Admission Form Guide" style="font-size:0.85rem;">
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-weight:600;">Video Aspect Ratio / Mobile Presentation</label>
              <select class="form-select" id="set-video-ratio" style="font-size:0.85rem;">
                <option value="auto" ${(!s.instructionVideoRatio || s.instructionVideoRatio === 'auto') ? 'selected' : ''}>Auto-Adaptive (Smart Phone &amp; Desktop)</option>
                <option value="9:16" ${s.instructionVideoRatio === '9:16' ? 'selected' : ''}>📱 Mobile / Phone Portrait (9:16 - Best for Screen Recordings)</option>
                <option value="16:9" ${s.instructionVideoRatio === '16:9' ? 'selected' : ''}>🖥️ Widescreen Landscape (16:9)</option>
              </select>
              <small style="color:var(--text-muted); font-size:0.75rem; margin-top:4px; display:block;">
                Select "Mobile / Phone Portrait (9:16)" if your tutorial was recorded on a smartphone.
              </small>
            </div>
          </div>

          <!-- Live Video Preview Section -->
          <div id="video-preview-wrapper" style="margin-top:14px;">
            ${s.instructionVideoUrl ? renderVideoPlayerHtml(s.instructionVideoUrl, s.instructionVideoTitle, s.instructionVideoRatio || 'auto') : '<p style="color:var(--text-muted); font-size:0.82rem; margin:0; padding:12px; background:var(--bg-subtle, #f8fafc); border:1px dashed var(--border-color); border-radius:8px; text-align:center;">Enter a video URL above and click "Test Video" to preview the video player.</p>'}
          </div>
        </div>

        <!-- CARD 4: GENERAL GUIDELINES MODAL INSTRUCTIONS -->
        <div class="card" style="border-left: 4px solid #3b82f6; grid-column: 1 / -1;">
          <div class="card-header" style="flex-wrap:wrap; gap:10px;">
            <div>
              <h3 class="card-title"><i data-lucide="list-checks" style="color:#3b82f6;"></i> General Guidelines (Modal Content)</h3>
              <p class="card-desc">Detailed guidelines shown when applicants click the "General Guidelines" button on the portal.</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-guidelines">
              <i data-lucide="rotate-ccw"></i> Reset Defaults
            </button>
          </div>

          <div style="display:flex; gap:8px; margin-bottom:14px;">
            <input type="text" class="form-input" id="new-guideline-text" placeholder="Type a new guideline here..." style="font-size:0.88rem;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-add-guideline" style="white-space:nowrap;">
              <i data-lucide="plus"></i> Add
            </button>
          </div>

          <div id="guidelines-list-container" style="max-height:280px; overflow-y:auto; padding-right:4px;"></div>

          <details style="margin-top:12px; font-size:0.82rem; color:var(--text-muted);">
            <summary style="cursor:pointer; font-weight:600; color:var(--text-main); margin-bottom:6px;">Bulk edit guidelines (raw lines)</summary>
            <textarea class="form-textarea" id="set-instructions-raw" rows="4" style="font-size:0.82rem; margin-top:6px;">${esc(currentInstructions.join('\n'))}</textarea>
          </details>
        </div>

      </div>
    `;

    renderGuidelinesList();
    renderPopupList();

    const addSwitchStyles = () => {
      const styleId = 'tms-switch-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .switch input:checked + .slider { background-color: #16a34a !important; }
          .switch input:checked + .slider:before { transform: translateX(24px); }
          .slider:before {
            position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
            background-color: white; border-radius: 50%; transition: .3s;
          }
        `;
        document.head.appendChild(style);
      }
    };
    addSwitchStyles();

    // Guidelines listeners
    safeOn('btn-add-guideline', 'click', () => {
      const inp = document.getElementById('new-guideline-text');
      const val = (inp?.value || '').trim();
      if (!val) return;
      currentInstructions.push(val);
      if (inp) inp.value = '';
      renderGuidelinesList();
      const ta = document.getElementById('set-instructions-raw');
      if (ta) ta.value = currentInstructions.join('\n');
    });

    safeOn('new-guideline-text', 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-add-guideline')?.click();
      }
    });

    safeOn('btn-reset-guidelines', 'click', () => {
      if (!confirm('Reset all guidelines back to the school default instructions?')) return;
      currentInstructions = (DEFAULT_INSTRUCTIONS || []).slice();
      renderGuidelinesList();
      const ta = document.getElementById('set-instructions-raw');
      if (ta) ta.value = currentInstructions.join('\n');
    });

    const rawTa = document.getElementById('set-instructions-raw');
    if (rawTa) {
      rawTa.addEventListener('input', (e) => {
        currentInstructions = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean);
        renderGuidelinesList();
      });
    }

    // Popup instructions listeners
    safeOn('btn-add-popup', 'click', () => {
      const inp = document.getElementById('new-popup-text');
      const val = (inp?.value || '').trim();
      if (!val) return;
      currentPopupInstructions.push(val);
      if (inp) inp.value = '';
      renderPopupList();
      const ta = document.getElementById('set-popup-raw');
      if (ta) ta.value = currentPopupInstructions.join('\n');
    });

    safeOn('new-popup-text', 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-add-popup')?.click();
      }
    });

    safeOn('btn-reset-popup', 'click', () => {
      if (!confirm('Reset popup instructions back to default?')) return;
      currentPopupInstructions = (DEFAULT_POPUP_INSTRUCTIONS || []).slice();
      renderPopupList();
      const ta = document.getElementById('set-popup-raw');
      if (ta) ta.value = currentPopupInstructions.join('\n');
    });

    const rawPopupTa = document.getElementById('set-popup-raw');
    if (rawPopupTa) {
      rawPopupTa.addEventListener('input', (e) => {
        currentPopupInstructions = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean);
        renderPopupList();
      });
    }

    // Video preview test button
    const previewVideoBtn = document.getElementById('btn-preview-video');
    if (previewVideoBtn) {
      previewVideoBtn.addEventListener('click', () => {
        const url = (document.getElementById('set-video-url')?.value || '').trim();
        const title = (document.getElementById('set-video-title')?.value || '').trim() || 'Instruction Video';
        const wrapper = document.getElementById('video-preview-wrapper');
        const badge = document.getElementById('badge-video-status');
        if (!url) {
          if (wrapper) wrapper.innerHTML = '<p style="color:#ef4444; font-size:0.82rem; margin:0; padding:12px; background:rgba(239,68,68,0.08); border:1px dashed #ef4444; border-radius:8px; text-align:center;">Please enter a video URL first.</p>';
          if (badge) {
            badge.className = 'badge badge-info';
            badge.innerText = 'No Video Set';
          }
          return;
        }

        const ratio = (document.getElementById('set-video-ratio')?.value || 'auto').trim();
        const embedHtml = renderVideoPlayerHtml(url, title, ratio);
        if (embedHtml) {
          if (wrapper) wrapper.innerHTML = embedHtml;
          if (badge) {
            badge.className = 'badge badge-success';
            badge.innerText = 'Video Configured';
          }
          UIComponents.refreshIcons();
          UIComponents.showToast('Video player preview loaded!', 'success');
        } else {
          if (wrapper) wrapper.innerHTML = '<p style="color:#ef4444; font-size:0.82rem; margin:0; padding:12px; background:rgba(239,68,68,0.08); border:1px dashed #ef4444; border-radius:8px; text-align:center;">Invalid video URL format. Please enter a valid YouTube, Vimeo, or MP4 link.</p>';
        }
      });
    }

    safeOn('btn-save-settings', 'click', async () => {
      const showFeeStructure = document.getElementById('set-show-fee-structure').checked;
      const showGuidelines = document.getElementById('set-show-guidelines').checked;
      const showInstructionVideo = document.getElementById('set-show-video').checked;
      const instructionVideoUrl = document.getElementById('set-video-url').value.trim();
      const instructionVideoTitle = document.getElementById('set-video-title').value.trim();
      const instructionVideoRatio = (document.getElementById('set-video-ratio')?.value || 'auto').trim();
      const formTitle = document.getElementById('set-form-title').value.trim();
      const formSubtitle = document.getElementById('set-form-subtitle').value.trim();
      const session = document.getElementById('set-session').value.trim();
      const admitCardTitle = document.getElementById('set-admit-title').value.trim();
      const admitCardSubtitle = document.getElementById('set-admit-subtitle').value.trim();
      const admitCardAddress = document.getElementById('set-admit-address').value.trim();
      const testCentre = document.getElementById('set-centre').value.trim();

      const saveRes = await admissionService.saveSettings({
        showFeeStructure,
        showGuidelines,
        showInstructionVideo,
        instructionVideoUrl,
        instructionVideoTitle,
        instructionVideoRatio,
        formTitle,
        formSubtitle,
        session,
        admitCardTitle,
        admitCardSubtitle,
        admitCardAddress,
        testCentre,
        instructions: currentInstructions,
        popupInstructions: currentPopupInstructions
      });

      await auditService.log('ADMISSION_SETTINGS_UPDATED', 'GOVERNANCE', {
        showFeeStructure,
        showGuidelines,
        showInstructionVideo,
        instructionVideoRatio,
        hasVideoUrl: !!instructionVideoUrl,
        formTitle,
        session
      });

      if (saveRes && saveRes._syncError) {
        UIComponents.showToast(`Warning: Database sync error: ${saveRes._syncError}`, 'warning');
      } else {
        UIComponents.showToast('Admission settings, headings & guidelines saved successfully!', 'success');
      }
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Notifications                                                      */
  /* ================================================================== */

  static async renderNotificationsTab(tabContent) {
    const list = await notificationService.list();

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px;">
          <div>
            <h3 class="card-title">Notifications</h3>
            <p class="card-desc">Publish announcements to all portals. Targeted notices reach staff, students, parents or a specific role.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-create-notification"><i data-lucide="bell-plus"></i> Create Notification</button>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
          <button class="btn btn-secondary btn-sm" id="btn-select-all-notices"><i data-lucide="check-square"></i> Select All</button>
          <button class="btn btn-secondary btn-sm" id="btn-clear-notices">Clear</button>
          <button class="btn btn-secondary btn-sm" id="btn-bulk-del-notices" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete Selected (<span id="notif-selected-count">0</span>)</button>
        </div>
        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.85rem;">
            <thead><tr><th style="width:34px;"><input type="checkbox" id="notif-select-all"></th><th>Title</th><th>Audience</th><th>Priority</th><th>Created By</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${list.map((n) => `<tr>
                <td><input type="checkbox" class="notif-row-check" value="${esc(n.id)}"></td>
                <td style="font-weight:600;">${esc(n.title)}<div style="font-size:0.76rem;color:var(--text-muted);font-weight:400;">${esc((n.message || '').slice(0, 100))}</div></td>
                <td><span class="badge badge-info">${esc(n.audience)}${n.targetRole ? ': ' + esc(n.targetRole) : ''}</span></td>
                <td>${esc(n.priority || 'Normal')}</td>
                <td>${esc(n.createdByName || '—')}</td>
                <td>${fmtDate(n.createdAt)}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-del-notice" data-id="${esc(n.id)}" style="color:#ef4444;"><i data-lucide="trash-2"></i></button>
                </td>
              </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:26px;">No notifications published yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const checkedNotices = () => Array.from(tabContent.querySelectorAll('.notif-row-check:checked')).map((c) => c.value);
    const syncNoticeCount = () => {
      const el = document.getElementById('notif-selected-count');
      if (el) el.innerText = checkedNotices().length;
    };
    tabContent.querySelectorAll('.notif-row-check').forEach((c) => c.addEventListener('change', syncNoticeCount));
    safeOn('notif-select-all', 'change', (e) => {
      tabContent.querySelectorAll('.notif-row-check').forEach((c) => { c.checked = e.target.checked; });
      syncNoticeCount();
    });
    safeOn('btn-select-all-notices', 'click', () => {
      tabContent.querySelectorAll('.notif-row-check').forEach((c) => { c.checked = true; });
      syncNoticeCount();
    });
    safeOn('btn-clear-notices', 'click', () => {
      tabContent.querySelectorAll('.notif-row-check').forEach((c) => { c.checked = false; });
      syncNoticeCount();
    });
    safeOn('btn-bulk-del-notices', 'click', async () => {
      const ids = checkedNotices();
      if (!ids.length) { UIComponents.showToast('Select at least one notification.', 'warning'); return; }
      if (!confirm(`Delete ${ids.length} notification(s)?`)) return;
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await notificationService.remove(id);
      }
      await auditService.log('NOTIFICATIONS_BULK_DELETED', 'GOVERNANCE', { count: ids.length });
      UIComponents.showToast(`${ids.length} notification(s) deleted.`, 'success');
      this.renderTab('notifications');
    });

    safeOn('btn-create-notification', 'click', () => this.openNotificationModal());
    tabContent.querySelectorAll('.btn-del-notice').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this notification?')) return;
        await notificationService.remove(b.dataset.id);
        UIComponents.showToast('Notification deleted.', 'success');
        this.renderTab('notifications');
      }));
    UIComponents.refreshIcons();
  }

  static openNotificationModal() {
    const roles = Object.values(TMS_CONFIG.roles).filter((r) => r !== 'super_admin');
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input class="form-input" id="notif-title" placeholder="e.g. Half-yearly Examination Schedule">
      </div>
      <div class="form-group">
        <label class="form-label">Message *</label>
        <textarea class="form-textarea" id="notif-message" rows="4" placeholder="Write the announcement…"></textarea>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div class="form-group">
          <label class="form-label">Audience</label>
          <select class="form-select" id="notif-audience">
            <option value="all">Everyone</option>
            <option value="staff">All Staff</option>
            <option value="students">Students</option>
            <option value="parents">Parents</option>
            <option value="role">Specific Role</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target Role</label>
          <select class="form-select" id="notif-role">
            ${roles.map((r) => `<option value="${esc(r)}">${esc(ROLE_LABELS[r] || r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="notif-priority">
            <option>Normal</option><option>High</option><option>Urgent</option>
          </select>
        </div>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="notif-cancel">Cancel</button>
      <button class="btn btn-primary" id="notif-send"><i data-lucide="send"></i> Publish Notification</button>
    `;
    UIComponents.openModal({ title: 'Create Notification', bodyHtml, footerHtml });
    document.getElementById('notif-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('notif-send').addEventListener('click', async () => {
      const title = document.getElementById('notif-title').value.trim();
      const message = document.getElementById('notif-message').value.trim();
      const audience = document.getElementById('notif-audience').value;
      if (!title || !message) { UIComponents.showToast('Title and message are required.', 'warning'); return; }
      await notificationService.create({
        title,
        message,
        audience,
        targetRole: audience === 'role' ? document.getElementById('notif-role').value : null,
        priority: document.getElementById('notif-priority').value
      });
      await auditService.log('NOTIFICATION_PUBLISHED', 'GOVERNANCE', { title, audience });
      UIComponents.showToast('Notification published.', 'success');
      UIComponents.closeModal();
      const active = document.querySelector('.admin-tab-btn.btn-primary');
      if (active && active.dataset.tab === 'notifications') this.renderTab('notifications');
    });
    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* User Authentication & Google Approvals                             */
  /* ================================================================== */

  static async renderGoogleApprovalsTab(tabContent) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    let profiles = [];
    try {
      profiles = await dbService.select('profiles');
    } catch (e) {
      profiles = [];
    }

    // Categorize
    const pendingList = profiles.filter((p) => p.role === 'pending' || p.approvalStatus === 'pending');
    const approvedList = profiles.filter((p) => p.role !== 'pending' && p.role !== 'rejected' && p.isActive !== false);
    const rejectedList = profiles.filter((p) => p.role === 'rejected' || p.approvalStatus === 'rejected' || p.isActive === false);

    this._pendingApprovalsCount = pendingList.length;
    this.refreshPendingBadges();

    const roles = Object.values(TMS_CONFIG.roles).filter((r) => isSuperAdmin ? true : r !== 'super_admin');
    const scopes = Object.values(TMS_CONFIG.scopes);

    if (!this._approvalFilter) {
      this._approvalFilter = pendingList.length > 0 ? 'pending' : 'all';
    }
    const currentFilter = this._approvalFilter;

    let displayed = profiles;
    if (currentFilter === 'pending') displayed = pendingList;
    else if (currentFilter === 'approved') displayed = approvedList;
    else if (currentFilter === 'rejected') displayed = rejectedList;

    tabContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- KPI Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
          <div class="card" style="padding:16px; border-left:4px solid #f59e0b; background:linear-gradient(to right, rgba(245,158,11,0.06), var(--bg-surface));">
            <div style="font-size:0.75rem; font-weight:700; color:#b45309; text-transform:uppercase; letter-spacing:0.04em;">Pending Approvals</div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
              <span style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${pendingList.length}</span>
              ${pendingList.length > 0 ? '<span class="badge badge-warning" style="font-size:0.72rem;">Requires Action</span>' : '<span style="font-size:0.72rem; color:#16a34a;">All Approved</span>'}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Waiting on approval screen</div>
          </div>
          <div class="card" style="padding:16px; border-left:4px solid #16a34a; background:linear-gradient(to right, rgba(22,163,74,0.06), var(--bg-surface));">
            <div style="font-size:0.75rem; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.04em;">Active &amp; Approved</div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
              <span style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${approvedList.length}</span>
              <span style="font-size:0.72rem; color:var(--text-muted);">Active Staff &amp; Users</span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Full portal permissions granted</div>
          </div>
          <div class="card" style="padding:16px; border-left:4px solid #ef4444; background:linear-gradient(to right, rgba(239,68,68,0.06), var(--bg-surface));">
            <div style="font-size:0.75rem; font-weight:700; color:#b91c1c; text-transform:uppercase; letter-spacing:0.04em;">Rejected / Revoked</div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
              <span style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${rejectedList.length}</span>
              <span style="font-size:0.72rem; color:var(--text-muted);">Blocked Access</span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Access denied or disabled</div>
          </div>
          <div class="card" style="padding:16px; border-left:4px solid #6366f1; background:linear-gradient(to right, rgba(99,102,241,0.06), var(--bg-surface));">
            <div style="font-size:0.75rem; font-weight:700; color:#4338ca; text-transform:uppercase; letter-spacing:0.04em;">Total Registered</div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
              <span style="font-size:1.8rem; font-weight:800; color:var(--text-main);">${profiles.length}</span>
              <span style="font-size:0.72rem; color:var(--text-muted);">Total Accounts</span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Google &amp; manual accounts</div>
          </div>
        </div>

        <!-- Main Approvals Management Card -->
        <div class="card">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h3 class="card-title" style="margin:0; font-size:1.15rem;">User Authentication &amp; Google Sign-in Approvals</h3>
                <span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700; font-size:0.72rem;">
                  Google OAuth / Gmail
                </span>
              </div>
              <p class="card-desc" style="margin-top:4px;">
                When institutional users sign in with Gmail/Google, their accounts are held in pending status until you approve them and assign their official institutional role.
              </p>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-refresh-approvals">
                <i data-lucide="refresh-cw"></i> Refresh List
              </button>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;" id="approval-filter-tabs">
              <button class="btn btn-sm ${currentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} filter-btn" data-filter="pending" style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="clock"></i>
                <span>Pending Approvals</span>
                <span class="badge" style="background:${currentFilter === 'pending' ? 'rgba(255,255,255,0.25)' : '#fef3c7'}; color:${currentFilter === 'pending' ? '#fff' : '#b45309'}; padding:1px 6px; font-size:0.7rem;">${pendingList.length}</span>
              </button>
              <button class="btn btn-sm ${currentFilter === 'approved' ? 'btn-primary' : 'btn-secondary'} filter-btn" data-filter="approved" style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="check-circle"></i>
                <span>Approved Users (${approvedList.length})</span>
              </button>
              <button class="btn btn-sm ${currentFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'} filter-btn" data-filter="rejected" style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="shield-x"></i>
                <span>Rejected (${rejectedList.length})</span>
              </button>
              <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'} filter-btn" data-filter="all" style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="users"></i>
                <span>All Accounts (${profiles.length})</span>
              </button>
            </div>

            <div style="position:relative; min-width:240px;">
              <input type="text" class="form-input form-input-sm" id="approval-search-input" placeholder="Search by name or email..." style="padding-left:32px;">
              <i data-lucide="search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:var(--text-muted);"></i>
            </div>
          </div>

          <!-- Approvals Table -->
          <div class="table-responsive">
            <table class="tms-table" id="approval-table" style="font-size:0.85rem;">
              <thead>
                <tr>
                  <th style="min-width:220px;">User &amp; Google Account</th>
                  <th>Current Status</th>
                  <th style="min-width:160px;">Role Assignment</th>
                  <th style="min-width:140px;">Access Scope</th>
                  <th style="min-width:130px;">Title / Designation</th>
                  <th style="min-width:120px;">Department</th>
                  <th style="text-align:right; min-width:180px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${displayed.map((p) => {
                  const isPending = p.role === 'pending' || p.approvalStatus === 'pending';
                  const isRejected = p.role === 'rejected' || p.approvalStatus === 'rejected' || p.isActive === false;
                  const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.is_super_admin === true || p.isSuperAdmin === true;
                  const canModify = isSuperAdmin || !isTargetSuper;
                  const isGmail = (p.email || '').toLowerCase().includes('@gmail.com');

                  // Default selected role for pending user
                  const currentRole = p.role === 'pending' ? 'teacher' : p.role;
                  const currentScope = p.scope === 'own_records' ? (currentRole === 'admin' ? 'school_wide' : 'own_records') : (p.scope || 'own_records');

                  return `
                    <tr data-id="${esc(p.id)}" data-email="${esc(p.email || '')}" class="approval-row ${isPending ? 'row-pending-highlight' : ''}" style="${isPending ? 'background:rgba(245, 158, 11, 0.04);' : ''}">
                      <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                          <img src="${esc(p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')}" alt="" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--border-color); background:#f1f5f9; flex-shrink:0;">
                          <div style="min-width:0;">
                            <div style="font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                              <span class="user-display-name">${esc(p.name || 'TMS User')}</span>
                              ${isTargetSuper ? '<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:800; font-size:0.65rem; padding:1px 5px;">👑 ROOT</span>' : ''}
                            </div>
                            <div class="font-mono user-display-email" style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-top:2px;">
                              <span>${esc(p.email || '—')}</span>
                              ${isGmail ? `
                                <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.62rem; padding:1px 5px; display:inline-flex; align-items:center; gap:3px;">
                                  <svg width="10" height="10" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                                  Google
                                </span>` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        ${isPending ? `
                          <span class="badge badge-warning" style="display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                            <i data-lucide="clock" style="width:12px; height:12px;"></i> Pending Approval
                          </span>
                        ` : isRejected ? `
                          <span class="badge badge-danger" style="display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                            <i data-lucide="shield-x" style="width:12px; height:12px;"></i> Rejected / Inactive
                          </span>
                        ` : `
                          <span class="badge badge-success" style="display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                            <i data-lucide="check-circle" style="width:12px; height:12px;"></i> Approved (${esc(ROLE_LABELS[p.role] || p.role)})
                          </span>
                        `}
                      </td>

                      <td>
                        ${!canModify ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">👑 Super Admin</span>` : `
                          <select class="form-select form-select-sm approval-role-select">
                            ${roles.map((r) => `
                              <option value="${esc(r)}" ${(r === currentRole) ? 'selected' : ''}>
                                ${esc(ROLE_LABELS[r] || r)}
                              </option>
                            `).join('')}
                          </select>
                        `}
                      </td>

                      <td>
                        ${!canModify ? `<span class="badge badge-success">school_wide</span>` : `
                          <select class="form-select form-select-sm approval-scope-select">
                            ${scopes.map((s) => `
                              <option value="${esc(s)}" ${(s === currentScope) ? 'selected' : ''}>
                                ${esc(s)}
                              </option>
                            `).join('')}
                          </select>
                        `}
                      </td>

                      <td>
                        ${!canModify ? `<span>${esc(p.title || 'Super Admin')}</span>` : `
                          <input type="text" class="form-input form-input-sm approval-title-input" value="${esc(p.title || (isPending ? 'Teacher' : 'Staff Member'))}" placeholder="Title">
                        `}
                      </td>

                      <td>
                        ${!canModify ? `<span>${esc(p.department || 'Governance')}</span>` : `
                          <input type="text" class="form-input form-input-sm approval-dept-input" value="${esc(p.department || (isPending ? 'Academics' : 'General'))}" placeholder="Department">
                        `}
                      </td>

                      <td style="text-align:right; white-space:nowrap;">
                        ${!canModify ? '<span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Root Protected</span>' : `
                          ${isPending ? `
                            <button class="btn btn-primary btn-sm btn-action-approve" style="padding:5px 12px; font-weight:700;" title="Approve user and grant portal access">
                              <i data-lucide="user-check"></i> Approve &amp; Assign
                            </button>
                            <button class="btn btn-secondary btn-sm btn-action-reject" style="padding:5px 9px; color:#ef4444;" title="Reject access request">
                              <i data-lucide="user-x"></i> Reject
                            </button>
                          ` : isRejected ? `
                            <button class="btn btn-secondary btn-sm btn-action-approve" style="padding:5px 12px; color:#16a34a; font-weight:700;" title="Re-approve and activate">
                              <i data-lucide="rotate-ccw"></i> Re-Approve
                            </button>
                          ` : `
                            <button class="btn btn-secondary btn-sm btn-action-update" style="padding:5px 10px;" title="Update role and permissions">
                              <i data-lucide="save"></i> Update
                            </button>
                            <button class="btn btn-secondary btn-sm btn-action-reject" style="padding:5px 9px; color:#ef4444;" title="Revoke access">
                              <i data-lucide="user-x"></i> Reject
                            </button>
                          `}
                        `}
                      </td>
                    </tr>
                  `;
                }).join('') || `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No accounts found in this view.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindGoogleApprovalEvents(tabContent, profiles);
    UIComponents.refreshIcons();
  }

  static bindGoogleApprovalEvents(tabContent, profiles) {
    // 1. Filter tabs
    tabContent.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this._approvalFilter = e.currentTarget.dataset.filter;
        this.renderGoogleApprovalsTab(tabContent);
      });
    });

    // 2. Search input live filtering
    const searchInput = tabContent.querySelector('#approval-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        tabContent.querySelectorAll('.approval-row').forEach((row) => {
          const name = (row.querySelector('.user-display-name')?.innerText || '').toLowerCase();
          const email = (row.querySelector('.user-display-email')?.innerText || '').toLowerCase();
          if (!query || name.includes(query) || email.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // 3. Refresh button
    const refreshBtn = tabContent.querySelector('#btn-refresh-approvals');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        UIComponents.showToast('Refreshing accounts list...', 'info');
        this.renderGoogleApprovalsTab(tabContent);
      });
    }

    // 4. Approve / Update Button
    tabContent.querySelectorAll('.btn-action-approve, .btn-action-update').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.currentTarget.closest('tr');
        const userId = row.dataset.id;
        const userEmail = row.dataset.email;
        const selectedRole = row.querySelector('.approval-role-select')?.value || 'teacher';
        const selectedScope = row.querySelector('.approval-scope-select')?.value || 'own_records';
        const title = row.querySelector('.approval-title-input')?.value.trim() || ROLE_LABELS[selectedRole] || 'Staff Member';
        const dept = row.querySelector('.approval-dept-input')?.value.trim() || 'General';

        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Saving...`;
        UIComponents.refreshIcons();

        try {
          const updates = {
            role: selectedRole,
            scope: selectedScope,
            title: title,
            department: dept,
            isActive: true
          };

          await dbService.update('profiles', userId, updates);
          await auditService.log('USER_APPROVED_BY_ADMIN', 'SECURITY', {
            userId,
            email: userEmail,
            role: selectedRole,
            scope: selectedScope
          });

          UIComponents.showToast(`Account ${userEmail} approved as ${ROLE_LABELS[selectedRole] || selectedRole}!`, 'success');
          await this.renderGoogleApprovalsTab(tabContent);
        } catch (err) {
          console.error('Approval failed:', err);
          UIComponents.showToast(`Approval failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          UIComponents.refreshIcons();
        }
      });
    });

    // 5. Reject Button
    tabContent.querySelectorAll('.btn-action-reject').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.currentTarget.closest('tr');
        const userId = row.dataset.id;
        const userEmail = row.dataset.email;

        if (!confirm(`Are you sure you want to REJECT and block access for ${userEmail}?\nThey will be shown the access rejected message and prevented from entering the ERP.`)) {
          return;
        }

        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Rejecting...`;
        UIComponents.refreshIcons();

        try {
          const updates = {
            role: 'rejected',
            isActive: false
          };

          await dbService.update('profiles', userId, updates);
          await auditService.log('USER_REJECTED_BY_ADMIN', 'SECURITY', {
            userId,
            email: userEmail
          });

          UIComponents.showToast(`Access rejected for ${userEmail}.`, 'info');
          await this.renderGoogleApprovalsTab(tabContent);
        } catch (err) {
          console.error('Rejection failed:', err);
          UIComponents.showToast(`Rejection failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          UIComponents.refreshIcons();
        }
      });
    });
  }

  /* ================================================================== */
  /* Users & Roles                                                      */
  /* ================================================================== */

  static async renderUsersTab(tabContent) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    let profiles = [];
    try {
      profiles = await dbService.select('profiles');
    } catch (e) { /* non-admin */ }

    // Admin-visible login identifiers issued to staff and parents.
    let creds = [];
    try { creds = await dbService.select('staff_credentials'); } catch (e) { creds = []; }
    let parentCreds = [];
    try { parentCreds = await dbService.select('parent_credentials'); } catch (e) { parentCreds = []; }
    const loginByUser = {};
    parentCreds.forEach((c) => { if (c.userId) loginByUser[c.userId] = c; });
    creds.forEach((c) => { if (c.userId) loginByUser[c.userId] = c; });
    this._loginByUser = loginByUser;

    // Only super admin can grant or see super_admin role
    const roles = Object.values(TMS_CONFIG.roles).filter((r) => isSuperAdmin ? true : r !== 'super_admin');
    const scopes = Object.values(TMS_CONFIG.scopes);

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
          <div>
            <h3 class="card-title">Users &amp; Roles</h3>
            <p class="card-desc">Every account in the system — including staff and parent logins created elsewhere. Use <strong>Edit Details</strong> to change a user's profile, photo, class assignment or password.</p>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" id="btn-config-cred-share"><i data-lucide="message-square"></i> Customize Share Message</button>
          </div>
            <p class="card-desc">Every account in the system — including staff and parent logins created elsewhere. Use <strong>Edit Details</strong> to change a user's profile, photo, class assignment or password. To make a staff member an Office Boy (admission data entry), set their role to <strong>Office Boy</strong>.</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.85rem;">
            <thead><tr><th>User</th><th>Email</th><th>Login ID</th><th>Role</th><th>Scope</th><th>Class</th><th>Active</th><th>Action</th></tr></thead>
            <tbody>
              ${profiles.map((p) => {
                const login = loginByUser[p.id];
                const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.is_super_admin === true || p.isSuperAdmin === true;
                const canModifyThisUser = isSuperAdmin || !isTargetSuper;

                return `<tr data-id="${esc(p.id)}">
                <td style="font-weight:600; display:flex; align-items:center; gap:8px;">
                  <img src="${esc(p.avatar || '')}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);background:#f1f5f9;">
                  <span>${esc(p.name || '—')}</span>
                  ${isTargetSuper ? '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:800; font-size:0.68rem; padding:2px 6px;">👑 SUPER ADMIN</span>' : ''}
                </td>
                <td class="font-mono" style="font-size:0.78rem;">${esc(p.email || '—')}</td>
                <td style="font-size:0.78rem;">
                  ${login && login.username
                    ? `<div style="display:flex; flex-direction:column; gap:4px;">
                         <div style="display:flex; align-items:center; gap:6px;">
                           <span class="font-mono" style="font-weight:700;">${esc(login.username)}</span>
                           <button class="btn btn-secondary btn-sm btn-reveal-pass" data-user="${esc(p.id)}" title="Show password" style="padding:1px 5px;"><i data-lucide="eye" style="width:12px;height:12px;"></i></button>
                           <span class="user-pass font-mono" data-user="${esc(p.id)}" style="display:none; color:#b45309; font-weight:700;">${esc(login.password || '—')}</span>
                         </div>
                         <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                           <button class="btn btn-secondary btn-sm btn-copy-user-cred" data-user="${esc(p.id)}" title="Copy login message for this user" style="padding:1px 6px; font-size:0.72rem; color:#0284c7; border-color:#bae6fd;">
                             <i data-lucide="share-2" style="width:11px;height:11px;"></i> Copy
                           </button>
                           ${p.phone ? `<button class="btn btn-secondary btn-sm btn-wa-user-cred" data-user="${esc(p.id)}" title="Share login via WhatsApp" style="padding:1px 6px; font-size:0.72rem; color:#16a34a; border-color:#bbf7d0;">
                             <i data-lucide="send" style="width:11px;height:11px;"></i> WA
                           </button>` : ''}
                         </div>
                       </div>`
                    : '<span style="color:var(--text-muted);">—</span>'}
                </td>
                <td>
                  ${isTargetSuper && !isSuperAdmin ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">👑 Super Admin (Protected)</span>`
                    : `<select class="form-select user-role" style="min-width:150px;">
                        ${roles.map((r) => `<option value="${esc(r)}" ${(p.role === r || (isTargetSuper && r === 'super_admin')) ? 'selected' : ''}>${esc(ROLE_LABELS[r] || r)}</option>`).join('')}
                        ${p.role === 'pending' ? '<option value="pending" selected>Pending</option>' : ''}
                      </select>`}
                </td>
                <td>
                  ${isTargetSuper && !isSuperAdmin ? `<span class="badge badge-success">school_wide</span>`
                    : `<select class="form-select user-scope" style="min-width:150px;">
                        ${scopes.map((s) => `<option value="${esc(s)}" ${(p.scope === s || (isTargetSuper && s === 'school_wide')) ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                      </select>`}
                </td>
                <td style="font-size:0.78rem;">${esc([p.assignedClass, p.assignedSection].filter(Boolean).join(' / ') || '—')}</td>
                <td><input type="checkbox" class="user-active" ${p.isActive === false ? '' : 'checked'} ${!canModifyThisUser ? 'disabled' : ''}></td>
                <td style="white-space:nowrap;">
                  ${!canModifyThisUser ? '<span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Root Protected</span>'
                    : `<button class="btn btn-secondary btn-sm btn-edit-user"><i data-lucide="user-cog"></i> Edit Details</button>
                       <button class="btn btn-primary btn-sm btn-save-user"><i data-lucide="save"></i> Save</button>`}
                </td>
              </tr>`; }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:26px;">No user profiles visible.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Credential share settings button
    document.getElementById('btn-config-cred-share')?.addEventListener('click', () => {
      this.openCredentialTemplateModal();
    });

    // Copy user credentials button
    tabContent.querySelectorAll('.btn-copy-user-cred').forEach((b) => {
      b.addEventListener('click', () => {
        const userId = b.dataset.user;
        const profile = profiles.find((p) => p.id === userId);
        const login = loginByUser[userId];
        if (login) {
          this.copyCredentialMessageToClipboard({
            name: profile?.name || 'User',
            role: profile?.role || 'staff',
            username: login.username,
            password: login.password,
            customUrl: `${this.getCredentialShareConfig().domain}/login.html`
          });
        }
      });
    });

    // WhatsApp user credentials button
    tabContent.querySelectorAll('.btn-wa-user-cred').forEach((b) => {
      b.addEventListener('click', () => {
        const userId = b.dataset.user;
        const profile = profiles.find((p) => p.id === userId);
        const login = loginByUser[userId];
        if (login) {
          const msg = this.compileCredentialMessage({
            name: profile?.name || 'User',
            role: profile?.role || 'staff',
            username: login.username,
            password: login.password,
            customUrl: `${this.getCredentialShareConfig().domain}/login.html`
          });
          const ph = WhatsAppService.cleanPhone(profile?.phone);
          if (ph) {
            window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank');
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }
        }
      });
    });

    tabContent.querySelectorAll('.btn-reveal-pass').forEach((b) =>
      b.addEventListener('click', () => {
        const userId = b.dataset.user || '';
        const span = Array.from(tabContent.querySelectorAll('.user-pass'))
          .find((el) => el.dataset.user === userId);
        if (span) span.style.display = span.style.display === 'none' ? 'inline' : 'none';
      }));

    tabContent.querySelectorAll('.btn-save-user').forEach((b) =>
      b.addEventListener('click', async () => {
        const row = b.closest('tr');
        const id = row.dataset.id;
        await dbService.update('profiles', id, {
          role: row.querySelector('.user-role').value,
          scope: row.querySelector('.user-scope').value,
          isActive: row.querySelector('.user-active').checked
        });
        await auditService.log('USER_ROLE_UPDATED', 'GOVERNANCE', { userId: id, role: row.querySelector('.user-role').value });
        UIComponents.showToast('User updated.', 'success');
      }));

    tabContent.querySelectorAll('.btn-edit-user').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.closest('tr').dataset.id;
        const profile = profiles.find((p) => p.id === id);
        if (profile) this.openUserEditModal(profile);
      }));
    UIComponents.refreshIcons();
  }

  /** Full user editor: identity, assignment, avatar upload and password reset. */
  static openUserEditModal(p) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();
    const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.isSuperAdmin === true || p.is_super_admin === true;

    if (isTargetSuper && !isSuperAdmin) {
      UIComponents.showToast('Root Super Administrator account is protected and cannot be modified.', 'warning');
      return;
    }

    let pendingAvatar = null;
    const roleList = Object.values(TMS_CONFIG.roles).filter((r) => isSuperAdmin ? true : r !== 'super_admin');
    if (p.role === 'pending' && !roleList.includes('pending')) roleList.unshift('pending');
    const scopeList = Object.values(TMS_CONFIG.scopes);
    const classList = ['', ...(TMS_CONFIG.academic && TMS_CONFIG.academic.classes ? TMS_CONFIG.academic.classes : [])];
    const sectionList = ['', 'A', 'B', 'C', 'D'];

    const bodyHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="form-group" style="grid-column:1/-1; display:flex; gap:16px; align-items:center;">
          <img id="ue-avatar" src="${esc(p.avatar || '')}" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);background:#f1f5f9;">
          <div>
            <label class="form-label">Profile Photo</label>
            <input type="file" id="ue-avatar-file" accept="image/*" class="form-input">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="ue-name" value="${esc(p.name || '')}"></div>
        <div class="form-group"><label class="form-label">Email (read-only)</label><input class="form-input" id="ue-email" value="${esc(p.email || '')}" readonly></div>
        <div class="form-group"><label class="form-label">Title / Designation</label><input class="form-input" id="ue-title" value="${esc(p.title || '')}"></div>
        <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="ue-department" value="${esc(p.department || '')}"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ue-phone" value="${esc(p.phone || '')}"></div>
        <div class="form-group"><label class="form-label">Assigned Class</label>
          <select class="form-select" id="ue-class">${classList.map((c) => `<option value="${esc(c)}" ${p.assignedClass === c ? 'selected' : ''}>${c ? esc(c) : '—'}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Assigned Section</label>
          <select class="form-select" id="ue-section">${sectionList.map((s) => `<option value="${esc(s)}" ${p.assignedSection === s ? 'selected' : ''}>${s || '—'}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-select" id="ue-role">${roleList.map((r) => `<option value="${esc(r)}" ${p.role === r ? 'selected' : ''}>${esc(ROLE_LABELS[r] || r)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Scope</label>
          <select class="form-select" id="ue-scope">${scopeList.map((s) => `<option value="${esc(s)}" ${p.scope === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <label style="display:flex;gap:8px;align-items:center;grid-column:1/-1;"><input type="checkbox" id="ue-active" ${p.isActive === false ? '' : 'checked'} ${isTargetSuper ? 'disabled' : ''}> Account active</label>
        <div class="form-group" style="grid-column:1/-1; border-top:1px solid var(--border-color); padding-top:12px;">
          <label class="form-label">Set New Password (optional, min 6 characters)</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input type="text" class="form-input font-mono" id="ue-password" placeholder="Leave blank to keep the current password" style="flex:1; min-width:200px;">
            <button class="btn btn-secondary" id="ue-apply-password"><i data-lucide="key-round"></i> Apply Password</button>
          </div>
          <span style="font-size:0.72rem;color:var(--text-subtle);">Works for staff accounts and auto-generated parent logins.</span>
        </div>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="ue-cancel">Cancel</button>
      ${isTargetSuper ? '' : '<button class="btn btn-secondary" id="ue-delete" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete User</button>'}
      <button class="btn btn-primary" id="ue-save"><i data-lucide="save"></i> Save Changes</button>
    `;
    UIComponents.openModal({ title: `Edit User — ${p.name || p.email}`, bodyHtml, footerHtml });

    const fileInput = document.getElementById('ue-avatar-file');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const path = `users/${p.id}-${Date.now()}-${admissionService.sanitizeFileName(file.name)}`;
      const res = await admissionService.uploadFile('avatars', path, file);
      if (res.error) { UIComponents.showToast(`Photo upload failed: ${res.error}`, 'warning'); return; }
      pendingAvatar = admissionService.getPublicUrl('avatars', res.path) || res.path;
      document.getElementById('ue-avatar').src = pendingAvatar;
      UIComponents.showToast('Photo uploaded — remember to save.', 'success');
    });

    document.getElementById('ue-cancel').addEventListener('click', () => UIComponents.closeModal());

    document.getElementById('ue-delete').addEventListener('click', async () => {
      if (!confirm(`Permanently delete ${p.name || p.email}? This removes their login, profile and access. This cannot be undone.`)) return;
      const res = await authService.adminDeleteUser(p.id);
      if (!res.success) { UIComponents.showToast(`Could not delete the user: ${res.error}`, 'danger'); return; }
      await auditService.log('USER_DELETED', 'GOVERNANCE', { userId: p.id, email: p.email });
      UIComponents.showToast('User deleted.', 'success');
      UIComponents.closeModal();
      this.renderTab('users');
    });

    document.getElementById('ue-apply-password').addEventListener('click', async () => {
      const pw = document.getElementById('ue-password').value;
      if (!pw || pw.length < 6) { UIComponents.showToast('Enter a password of at least 6 characters.', 'warning'); return; }
      const r = await authService.adminSetPassword(p.id, pw);
      if (r.success) {
        // Keep the admin-visible credential records in step with the real password.
        await this.syncStoredPasswords(p.id, pw);
        await auditService.log('USER_PASSWORD_RESET', 'GOVERNANCE', { userId: p.id });
        UIComponents.showToast('Password updated.', 'success');
        document.getElementById('ue-password').value = '';
      } else {
        UIComponents.showToast(`Password change failed: ${r.error}`, 'danger');
      }
    });

    document.getElementById('ue-save').addEventListener('click', async () => {
      const updates = {
        name: document.getElementById('ue-name').value.trim(),
        title: document.getElementById('ue-title').value.trim(),
        department: document.getElementById('ue-department').value.trim(),
        phone: document.getElementById('ue-phone').value.trim(),
        assignedClass: document.getElementById('ue-class').value,
        assignedSection: document.getElementById('ue-section').value,
        role: document.getElementById('ue-role').value,
        scope: document.getElementById('ue-scope').value,
        isActive: document.getElementById('ue-active').checked
      };
      if (pendingAvatar) updates.avatar = pendingAvatar;
      await dbService.update('profiles', p.id, updates);
      await auditService.log('USER_DETAILS_UPDATED', 'GOVERNANCE', { userId: p.id, role: updates.role });
      UIComponents.showToast('User details saved.', 'success');
      UIComponents.closeModal();
      this.renderTab('users');
    });
    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Branding & Logo                                                    */
  /* ================================================================== */

  /** Mirror a password change into the admin-visible credential stores. */
  static async syncStoredPasswords(userId, password) {
    if (!userId || !password) return;
    for (const table of ['staff_credentials', 'parent_credentials']) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const rows = await dbService.select(table);
        const row = rows.find((r) => r.userId === userId);
        // eslint-disable-next-line no-await-in-loop
        if (row) await dbService.update(table, row.id, { password });
      } catch (e) {
        // Table may not exist yet (migration not applied) - ignore.
      }
    }
  }

  static async renderBrandingTab(tabContent) {
    const branding = await brandingService.refresh();
    const logoUrl = branding.logoUrl || '';
    const previewSrc = logoUrl || '';

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px;">
          <div>
            <h3 class="card-title">Institute Branding &amp; Logo</h3>
            <p class="card-desc">Upload the official institute logo. Once saved it is applied everywhere — the sidebar, sign-in page, every portal, the administration console and all printed / PDF documents.</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 200px 1fr; gap:24px; align-items:start;">
          <div style="border:1px dashed var(--border-color); border-radius:10px; padding:16px; text-align:center; background:var(--bg-subtle);">
            <div id="branding-preview" style="min-height:110px; display:flex; align-items:center; justify-content:center;">
              ${previewSrc
                ? `<img src="${esc(previewSrc)}" alt="Institute logo" style="max-width:150px; max-height:150px; object-fit:contain;">`
                : TMS_LOGO.emblemSvg(110)}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:10px;">
              ${logoUrl ? 'Current institute logo' : 'Built-in emblem (no logo uploaded)'}
            </div>
          </div>

          <div>
            <div class="form-group">
              <label class="form-label">Upload Logo (PNG, JPG or SVG)</label>
              <input type="file" id="branding-file" accept="image/*" class="form-input">
              <span style="font-size:0.72rem; color:var(--text-subtle);">Transparent PNG or SVG recommended. Square or wide logos both work.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Or paste a public image URL</label>
              <input class="form-input" id="branding-url" placeholder="https://…/logo.png" value="${esc(logoUrl)}">
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
              <button class="btn btn-primary" id="btn-branding-save"><i data-lucide="save"></i> Save Logo</button>
              <button class="btn btn-secondary" id="btn-branding-remove" style="color:#ef4444;"><i data-lucide="trash-2"></i> Remove Logo</button>
              <button class="btn btn-secondary" id="btn-branding-restore"><i data-lucide="rotate-ccw"></i> Restore Built-in Emblem</button>
            </div>
          </div>
        </div>

        <div style="margin-top:22px; padding-top:16px; border-top:1px solid var(--border-color);">
          <h4 style="font-size:0.95rem; margin-bottom:8px;">Live preview</h4>
          <div style="display:flex; gap:24px; align-items:center; flex-wrap:wrap; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
            <div style="text-align:center;">
              <div id="branding-preview-sm">${TMS_LOGO.emblemSvg(42)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:6px;">Sidebar</div>
            </div>
            <div style="text-align:center;">
              <div id="branding-preview-lg">${TMS_LOGO.emblemSvg(64)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:6px;">Sign-in / header</div>
            </div>
            <div style="text-align:center;">
              <div id="branding-preview-print">${TMS_LOGO.emblemSvg(70)}</div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:6px;">Printed form</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const repaint = (url) => {
      const preview = document.getElementById('branding-preview');
      const sm = document.getElementById('branding-preview-sm');
      const lg = document.getElementById('branding-preview-lg');
      const pr = document.getElementById('branding-preview-print');
      const html = url
        ? `<img src="${esc(url)}" alt="Institute logo" style="object-fit:contain;">`
        : TMS_LOGO.emblemSvg(110);
      if (preview) preview.innerHTML = html;
      if (url) {
        const img = (size) => `<img src="${esc(url)}" alt="Institute logo" style="width:${size}px;height:${size}px;object-fit:contain;">`;
        if (sm) sm.innerHTML = img(42);
        if (lg) lg.innerHTML = img(64);
        if (pr) pr.innerHTML = img(70);
      } else {
        if (sm) sm.innerHTML = TMS_LOGO.emblemSvg(42);
        if (lg) lg.innerHTML = TMS_LOGO.emblemSvg(64);
        if (pr) pr.innerHTML = TMS_LOGO.emblemSvg(70);
      }
    };

    document.getElementById('branding-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      UIComponents.showToast('Uploading logo…', 'info');
      const res = await brandingService.uploadLogo(file);
      if (res.error) { UIComponents.showToast(`Logo upload failed: ${res.error}`, 'danger'); return; }
      await auditService.log('BRANDING_LOGO_UPDATED', 'GOVERNANCE', { source: 'upload' });
      UIComponents.showToast('Institute logo updated everywhere.', 'success');
      document.getElementById('branding-url').value = res.logoUrl;
      repaint(res.logoUrl);
    });

    document.getElementById('btn-branding-save').addEventListener('click', async () => {
      const url = document.getElementById('branding-url').value.trim();
      const res = await brandingService.saveBranding({ logoUrl: url || null });
      if (res.error) { UIComponents.showToast(`Could not save the logo: ${res.error}`, 'danger'); return; }
      await auditService.log('BRANDING_LOGO_UPDATED', 'GOVERNANCE', { source: 'url' });
      UIComponents.showToast('Institute logo saved.', 'success');
      repaint(url);
    });

    document.getElementById('btn-branding-remove').addEventListener('click', async () => {
      if (!confirm('Remove the institute logo from every screen and document?')) return;
      await brandingService.removeLogo();
      await auditService.log('BRANDING_LOGO_REMOVED', 'GOVERNANCE', {});
      UIComponents.showToast('Logo removed.', 'success');
      document.getElementById('branding-url').value = '';
      repaint('');
    });

    document.getElementById('btn-branding-restore').addEventListener('click', async () => {
      await brandingService.removeLogo();
      await auditService.log('BRANDING_LOGO_RESET', 'GOVERNANCE', {});
      UIComponents.showToast('Built-in emblem restored.', 'success');
      document.getElementById('branding-url').value = '';
      repaint('');
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Audit Trail (Interactive Security & Governance Log)                */
  /* ================================================================== */

  static async renderAuditTab(tabContent) {
    let allLogs = [];
    try {
      allLogs = await auditService.getLogs();
      if (!allLogs || !allLogs.length) {
        allLogs = dbService.getLocal('audit_logs') || [];
      }
    } catch (e) {
      allLogs = dbService.getLocal('audit_logs') || [];
    }

    let currentFilter = 'all';
    let searchQuery = '';

    const renderLogsTable = () => {
      let filtered = [...allLogs];
      if (currentFilter !== 'all') {
        filtered = filtered.filter(l => (l.category || '').toLowerCase() === currentFilter.toLowerCase());
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(l => 
          (l.userName || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q) ||
          (l.entityRef || '').toLowerCase().includes(q) ||
          (l.id || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q)
        );
      }

      const tbody = document.getElementById('audit-table-body');
      const countEl = document.getElementById('audit-count-badge');
      if (countEl) countEl.innerText = `${filtered.length} Events Filtered (${allLogs.length} Total Recorded)`;

      if (!tbody) return;

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);"><i data-lucide="inbox" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:0.4;"></i>No audit events matched your search filter.</td></tr>`;
        UIComponents.refreshIcons();
        return;
      }

      tbody.innerHTML = filtered.slice(0, 150).map(l => {
        const act = l.action || 'ACTION';
        let badgeColor = 'badge-info';
        if (act.includes('LOGIN')) badgeColor = 'badge-success';
        else if (act.includes('LOGOUT')) badgeColor = 'badge-secondary';
        else if (act.includes('DELETE')) badgeColor = 'badge-danger';
        else if (act.includes('UPDATE') || act.includes('SAVE')) badgeColor = 'badge-warning';
        else if (act.includes('APPROVED')) badgeColor = 'badge-success';

        return `
          <tr data-log-id="${esc(l.id)}">
            <td><span class="font-mono" style="font-weight:700; font-size:0.75rem;">${esc(l.id)}</span></td>
            <td style="white-space:nowrap; font-size:0.78rem;">${fmtDate(l.timestamp)}</td>
            <td>
              <div style="font-weight:600; font-size:0.84rem;">${esc(l.userName || 'System')}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${esc(l.userRole || 'system')} • ${esc(l.userScope || 'school_wide')}</div>
            </td>
            <td>
              <span class="badge ${badgeColor}" style="font-size:0.72rem;">${esc(act)}</span>
              <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${esc(l.category || 'GENERAL')}</div>
            </td>
            <td class="font-mono" style="font-size:0.78rem;">${esc(l.entityRef || '—')}</td>
            <td style="text-align:right;">
              <button type="button" class="btn btn-secondary btn-sm btn-view-log-payload" data-id="${esc(l.id)}" style="padding:3px 8px; font-size:0.74rem;">
                <i data-lucide="eye" style="width:13px;height:13px;"></i> View Payload
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-view-log-payload').forEach(btn => {
        btn.addEventListener('click', () => {
          const logId = btn.dataset.id;
          const log = allLogs.find(x => x.id === logId);
          if (!log) return;
          let parsedDetails = log.details;
          try {
            if (typeof log.details === 'string') parsedDetails = JSON.parse(log.details);
          } catch(e) {}

          UIComponents.openModal({
            title: `Audit Event: ${log.action} (${log.id})`,
            bodyHtml: `
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.83rem; background:var(--bg-subtle, #f8fafc); padding:12px; border-radius:8px;">
                  <div><strong>Operator:</strong> ${esc(log.userName)} (${esc(log.userRole)})</div>
                  <div><strong>Timestamp:</strong> ${fmtDate(log.timestamp)}</div>
                  <div><strong>Category:</strong> <span class="badge badge-info">${esc(log.category)}</span></div>
                  <div><strong>Entity Ref:</strong> ${esc(log.entityRef || 'None')}</div>
                  <div style="grid-column: span 2;"><strong>Client Agent:</strong> <span style="font-size:0.75rem; color:var(--text-muted);">${esc(log.clientAgent || 'Unknown')}</span></div>
                </div>
                <div style="font-weight:700; font-size:0.86rem; margin-top:4px;">Event Details (JSON):</div>
                <pre style="background:#0f172a; color:#38bdf8; padding:12px; border-radius:8px; font-size:0.78rem; max-height:280px; overflow:auto; margin:0; line-height:1.4;">${esc(JSON.stringify(parsedDetails, null, 2))}</pre>
              </div>
            `,
            footerHtml: ''
          });
          UIComponents.refreshIcons();
        });
      });

      UIComponents.refreshIcons();
    };

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <span style="color:#ef4444;"><i data-lucide="shield-alert"></i></span>
              Immutable System &amp; Security Audit Trail
            </h3>
            <p class="card-desc">Chronological cryptographic activity ledger recording administrative actions, role assignments, student modifications, and auth sessions.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-audit-csv">
              <i data-lucide="download"></i> Export CSV
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-audit-json">
              <i data-lucide="file-json"></i> Export JSON
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-refresh-audit">
              <i data-lucide="refresh-cw"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div style="padding:12px 16px; background:var(--bg-subtle, #f8fafc); border-bottom:1px solid var(--border-color); display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;" id="audit-category-pills">
            <button class="btn btn-sm btn-primary audit-cat-btn" data-cat="all">All Events</button>
            <button class="btn btn-sm btn-secondary audit-cat-btn" data-cat="AUTH">🔐 Auth &amp; Sessions</button>
            <button class="btn btn-sm btn-secondary audit-cat-btn" data-cat="GOVERNANCE">🏛️ Governance</button>
            <button class="btn btn-sm btn-secondary audit-cat-btn" data-cat="ADMISSIONS">📝 Admissions</button>
            <button class="btn btn-sm btn-secondary audit-cat-btn" data-cat="FINANCE">💳 Finance</button>
            <button class="btn btn-sm btn-secondary audit-cat-btn" data-cat="ACADEMIC">🎓 Academic</button>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex:1; max-width:320px; min-width:200px;">
            <input type="text" id="audit-search-input" class="form-control form-control-sm" placeholder="Search by operator, action, ref..." style="width:100%;">
          </div>
        </div>

        <div style="padding:8px 16px; background:#f1f5f9; font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between;">
          <span id="audit-count-badge">${allLogs.length} Logged Events</span>
          <span>Showing latest entries (auto-indexed)</span>
        </div>

        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.83rem;">
            <thead>
              <tr>
                <th style="width:140px;">Audit ID</th>
                <th style="width:160px;">Timestamp</th>
                <th>Operator</th>
                <th>Action &amp; Category</th>
                <th>Entity Reference</th>
                <th style="text-align:right;">Payload</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderLogsTable();

    tabContent.querySelectorAll('.audit-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabContent.querySelectorAll('.audit-cat-btn').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        currentFilter = btn.dataset.cat;
        renderLogsTable();
      });
    });

    const searchInput = document.getElementById('audit-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderLogsTable();
      });
    }

    const refreshBtn = document.getElementById('btn-refresh-audit');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Refreshing...';
        UIComponents.refreshIcons();
        allLogs = await auditService.getLogs();
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh';
        renderLogsTable();
        UIComponents.showToast('Audit log updated from server.', 'info');
      });
    }

    const exportCsvBtn = document.getElementById('btn-export-audit-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const rows = allLogs.map(l => [
          l.id,
          l.timestamp,
          `"${(l.userName || '').replace(/"/g, '""')}"`,
          l.userRole,
          l.action,
          l.category,
          l.entityRef || '',
          `"${(l.details || '').replace(/"/g, '""')}"`
        ]);
        const csv = 'Audit ID,Timestamp,Operator,Role,Action,Category,Entity Ref,Details\n' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TMS-Audit-Trail-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      });
    }

    const exportJsonBtn = document.getElementById('btn-export-audit-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TMS-Audit-Trail-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      });
    }
  }

  /* ================================================================== */
  /* User Sessions (Live Presence & Login / Logout History Tracker)     */
  /* ================================================================== */

  static async renderUserSessionsTab(tabContent) {
    const isSuperAdmin = authService.getCurrentUser()?.isSuperAdmin === true;
    tabContent.innerHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <span style="color:#0284c7;"><i data-lucide="history"></i></span>
              User Login &amp; Logout Session Tracker
            </h3>
            <p class="card-desc">Real-time presence tracking, authenticated sessions, device platforms, and historical login/logout times across all accounts.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-refresh-sessions">
              <i data-lucide="refresh-cw"></i> Refresh Sessions
            </button>
          </div>
        </div>

        <div class="kpi-grid" style="margin:16px 0 20px;">
          <div class="card" style="padding:14px; text-align:center; border-left:3px solid #16a34a;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Active Online Now</div>
            <div style="font-size:1.8rem; font-weight:800; color:#16a34a;" id="kpi-online-count">—</div>
          </div>
          <div class="card" style="padding:14px; text-align:center; border-left:3px solid #2563eb;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Total Sessions Logged</div>
            <div style="font-size:1.8rem; font-weight:800; color:#2563eb;" id="kpi-total-sessions">—</div>
          </div>
          <div class="card" style="padding:14px; text-align:center; border-left:3px solid #f59e0b;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Admin &amp; Staff Sessions</div>
            <div style="font-size:1.8rem; font-weight:800; color:#f59e0b;" id="kpi-staff-sessions">—</div>
          </div>
          <div class="card" style="padding:14px; text-align:center; border-left:3px solid #8b5cf6;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Parent Portal Sessions</div>
            <div style="font-size:1.8rem; font-weight:800; color:#8b5cf6;" id="kpi-parent-sessions">—</div>
          </div>
        </div>

        <div style="padding:12px 16px; background:var(--bg-subtle, #f8fafc); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;" id="session-filter-pills">
            <button class="btn btn-sm btn-primary session-filter-btn" data-filter="all">All Sessions</button>
            <button class="btn btn-sm btn-secondary session-filter-btn" data-filter="active">● Active Online</button>
            <button class="btn btn-sm btn-secondary session-filter-btn" data-filter="staff">Staff &amp; Admins</button>
            <button class="btn btn-sm btn-secondary session-filter-btn" data-filter="parent">Parent Logins</button>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex:1; max-width:300px;">
            <input type="text" id="session-search-input" class="form-control form-control-sm" placeholder="Search by name, email, role..." style="width:100%;">
          </div>
        </div>

        <div class="table-responsive">
          <table class="tms-table" style="font-size:0.83rem;">
            <thead>
              <tr>
                <th>User / Account</th>
                <th>Role &amp; Scope</th>
                <th>Login Time</th>
                <th>Logout / Status</th>
                <th>Duration / Last Active</th>
                <th>Device / Browser</th>
                <th style="text-align:right;">Control</th>
              </tr>
            </thead>
            <tbody id="sessions-table-body">
              <tr><td colspan="7" style="text-align:center; padding:30px;"><i data-lucide="loader" class="animate-spin" style="margin:0 auto 8px;"></i> Loading active sessions...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    UIComponents.refreshIcons();

    const loadAndRenderSessions = async () => {
      let sessions = [];
      try {
        sessions = await dbService.select('user_sessions', null, true);
      } catch (e) {
        sessions = dbService.getLocal('user_sessions') || [];
      }

      if (!sessions || !sessions.length) {
        const auditLogs = await auditService.getLogs();
        const loginLogs = auditLogs.filter(l => l.action === 'USER_LOGIN' || l.action === 'USER_LOGOUT');
        if (loginLogs.length) {
          sessions = loginLogs.map(l => {
            let details = {};
            try { details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details; } catch(e) {}
            return {
              id: l.id,
              userId: l.userId,
              userEmail: details.email || l.userId,
              userName: l.userName,
              userRole: l.userRole,
              loginAt: l.action === 'USER_LOGIN' ? l.timestamp : null,
              logoutAt: l.action === 'USER_LOGOUT' ? l.timestamp : null,
              lastActiveAt: l.timestamp,
              status: l.action === 'USER_LOGOUT' ? 'logged_out' : 'active',
              clientAgent: l.clientAgent || details.device || ''
            };
          });
        }
      }

      sessions.sort((a, b) => new Date(b.loginAt || b.lastActiveAt || 0) - new Date(a.loginAt || a.lastActiveAt || 0));

      const now = Date.now();
      let activeOnlineCount = 0;
      let staffCount = 0;
      let parentCount = 0;

      sessions.forEach(s => {
        const lastActiveTime = new Date(s.lastActiveAt || s.loginAt || 0).getTime();
        const isRecent = (now - lastActiveTime) < 15 * 60 * 1000;
        const isOnline = isRecent && s.status !== 'logged_out' && !s.logoutAt;
        if (isOnline) activeOnlineCount++;
        if (s.userRole === 'admin' || s.userRole === 'super_admin' || s.userRole === 'teacher' || s.userRole === 'hr' || s.userRole === 'finance') staffCount++;
        if (s.userRole === 'parent') parentCount++;
      });

      const kpiOnline = document.getElementById('kpi-online-count');
      const kpiTotal = document.getElementById('kpi-total-sessions');
      const kpiStaff = document.getElementById('kpi-staff-sessions');
      const kpiParent = document.getElementById('kpi-parent-sessions');

      if (kpiOnline) kpiOnline.innerText = activeOnlineCount;
      if (kpiTotal) kpiTotal.innerText = sessions.length;
      if (kpiStaff) kpiStaff.innerText = staffCount;
      if (kpiParent) kpiParent.innerText = parentCount;

      let currentSessionFilter = 'all';
      let currentSessionSearch = '';

      const renderRows = () => {
        const tbody = document.getElementById('sessions-table-body');
        if (!tbody) return;

        let filtered = [...sessions];
        if (currentSessionFilter === 'active') {
          filtered = filtered.filter(s => {
            const lastActiveTime = new Date(s.lastActiveAt || s.loginAt || 0).getTime();
            return (now - lastActiveTime) < 15 * 60 * 1000 && s.status !== 'logged_out' && !s.logoutAt;
          });
        } else if (currentSessionFilter === 'staff') {
          filtered = filtered.filter(s => s.userRole !== 'parent' && s.userRole !== 'student');
        } else if (currentSessionFilter === 'parent') {
          filtered = filtered.filter(s => s.userRole === 'parent');
        }

        if (currentSessionSearch.trim()) {
          const q = currentSessionSearch.toLowerCase().trim();
          filtered = filtered.filter(s => 
            (s.userName || '').toLowerCase().includes(q) ||
            (s.userEmail || '').toLowerCase().includes(q) ||
            (s.userRole || '').toLowerCase().includes(q)
          );
        }

        if (!filtered.length) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No user sessions found matching criteria.</td></tr>`;
          UIComponents.refreshIcons();
          return;
        }

        tbody.innerHTML = filtered.slice(0, 100).map(s => {
          const lastActiveTime = new Date(s.lastActiveAt || s.loginAt || 0).getTime();
          const isOnline = (now - lastActiveTime) < 15 * 60 * 1000 && s.status !== 'logged_out' && !s.logoutAt;
          
          let durationStr = '—';
          if (s.loginAt) {
            const start = new Date(s.loginAt).getTime();
            const end = s.logoutAt ? new Date(s.logoutAt).getTime() : now;
            const diffMin = Math.round((end - start) / 60000);
            if (diffMin < 60) durationStr = `${diffMin} min`;
            else durationStr = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
          }

          const deviceStr = parseUserAgent(s.clientAgent);

          return `
            <tr data-session-id="${esc(s.id)}">
              <td>
                <div style="font-weight:700; font-size:0.86rem; display:flex; align-items:center; gap:6px;">
                  ${isOnline ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#16a34a; box-shadow:0 0 8px #16a34a;"></span>' : ''}
                  ${esc(s.userName || 'TMS User')}
                </div>
                <div class="font-mono" style="font-size:0.75rem; color:var(--text-muted);">${esc(s.userEmail || '—')}</div>
              </td>
              <td>
                ${s.userRole === 'super_admin' ? '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700;">👑 Super Admin</span>'
                  : `<span class="badge badge-info">${esc(s.userRole || 'user')}</span>`}
              </td>
              <td style="font-size:0.78rem; white-space:nowrap;">
                ${s.loginAt ? fmtDate(s.loginAt) : '—'}
              </td>
              <td>
                ${isOnline ? '<span class="badge badge-success" style="font-weight:700;">● Online Now</span>'
                  : s.logoutAt ? `<span style="font-size:0.78rem;">${fmtDate(s.logoutAt)}</span>`
                  : '<span class="badge badge-secondary">Session Closed</span>'}
              </td>
              <td style="font-size:0.78rem;">
                <strong>${durationStr}</strong>
                ${s.lastActiveAt ? `<div style="font-size:0.7rem; color:var(--text-muted);">Active: ${new Date(s.lastActiveAt).toLocaleTimeString()}</div>` : ''}
              </td>
              <td style="font-size:0.78rem; color:var(--text-muted);">
                <i data-lucide="laptop" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;"></i>
                ${esc(deviceStr)}
              </td>
              <td style="text-align:right;">
                ${isOnline && isSuperAdmin ? `
                  <button type="button" class="btn btn-secondary btn-sm btn-terminate-session" data-id="${esc(s.id)}" data-user="${esc(s.userName)}" style="padding:2px 8px; font-size:0.72rem; color:#ef4444; border-color:#fca5a5;">
                    <i data-lucide="power" style="width:12px;height:12px;"></i> Force Logout
                  </button>
                ` : '—'}
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-terminate-session').forEach(btn => {
          btn.addEventListener('click', async () => {
            const sid = btn.dataset.id;
            const uName = btn.dataset.user;
            if (!confirm(`Force logout session for ${uName}?`)) return;
            try {
              await dbService.update('user_sessions', sid, {
                logoutAt: new Date().toISOString(),
                status: 'terminated'
              });
              await auditService.log('SESSION_TERMINATED_BY_SUPER_ADMIN', 'SECURITY', { sessionId: sid, user: uName });
              UIComponents.showToast(`Terminated session for ${uName}.`, 'warning');
              loadAndRenderSessions();
            } catch (err) {
              UIComponents.showToast(`Failed: ${err.message}`, 'danger');
            }
          });
        });

        UIComponents.refreshIcons();
      };

      renderRows();

      tabContent.querySelectorAll('.session-filter-btn').forEach(b => {
        b.addEventListener('click', () => {
          tabContent.querySelectorAll('.session-filter-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
          });
          b.classList.remove('btn-secondary');
          b.classList.add('btn-primary');
          currentSessionFilter = b.dataset.filter;
          renderRows();
        });
      });

      const sSearch = document.getElementById('session-search-input');
      if (sSearch) {
        sSearch.addEventListener('input', (e) => {
          currentSessionSearch = e.target.value;
          renderRows();
        });
      }
    };

    loadAndRenderSessions();

    const rBtn = document.getElementById('btn-refresh-sessions');
    if (rBtn) {
      rBtn.addEventListener('click', () => {
        rBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Refreshing...';
        loadAndRenderSessions().finally(() => {
          rBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh Sessions';
          UIComponents.refreshIcons();
          UIComponents.showToast('User session tracker refreshed.', 'info');
        });
      });
    }
  }

  /* ================================================================== */
  /* System Doctor (Find & Fix Errors — Automated Integrity Engine)     */
  /* ================================================================== */

  static async renderSystemDoctorTab(tabContent) {
    tabContent.innerHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <span style="color:#16a34a;"><i data-lucide="wrench"></i></span>
              System Doctor — Automated Error Diagnosis &amp; Self-Repair
            </h3>
            <p class="card-desc">Deep diagnostic scanner that identifies database inconsistencies, orphaned student records, missing IDs, corrupted finance items, and offline queue drift, with 1-click automatic fixes.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-run-full-scan">
              <i data-lucide="stethoscope"></i> Run Deep System Scan
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-auto-repair-all" disabled>
              <i data-lucide="sparkles"></i> Auto-Repair All Detected Issues
            </button>
          </div>
        </div>

        <div id="doctor-summary-bar" style="margin:16px 0; padding:14px; background:var(--bg-subtle, #f8fafc); border-radius:10px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div id="doctor-status-badge" class="badge badge-info" style="font-size:0.82rem; padding:4px 10px;">Ready for Diagnosis</div>
            <span id="doctor-status-text" style="font-size:0.85rem; color:var(--text-muted);">Click "Run Deep System Scan" to analyze database health.</span>
          </div>
          <div id="doctor-issue-count" style="font-weight:700; font-size:0.9rem; color:#16a34a;">0 Issues Detected</div>
        </div>

        <div style="font-weight:700; font-size:0.92rem; margin:16px 0 10px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="activity" style="width:16px;height:16px;color:#2563eb;"></i> Diagnostic Scan Results:
        </div>
        <div id="doctor-issues-container" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          <div style="padding:28px; text-align:center; background:#f8fafc; border:1.5px dashed var(--border-color); border-radius:10px; color:var(--text-muted); font-size:0.85rem;">
            Click <strong>"Run Deep System Scan"</strong> above to launch full automated health checks across all campus data stores.
          </div>
        </div>

        <div style="font-weight:700; font-size:0.85rem; margin:14px 0 8px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="terminal" style="width:14px;height:14px;"></i> Live Diagnostic Engine Console:
        </div>
        <div id="doctor-console-log" style="background:#090d16; color:#10b981; font-family:monospace; font-size:0.76rem; padding:14px; border-radius:8px; max-height:220px; overflow-y:auto; line-height:1.6; border:1px solid #1e293b;">
          [TMS SYSTEM DOCTOR] Engine Initialized. Ready for diagnostics.
        </div>
      </div>
    `;
    UIComponents.refreshIcons();

    let detectedIssues = [];

    const logConsole = (msg, type = 'info') => {
      const c = document.getElementById('doctor-console-log');
      if (!c) return;
      const time = new Date().toLocaleTimeString();
      let color = '#10b981';
      if (type === 'warn') color = '#f59e0b';
      if (type === 'err') color = '#ef4444';
      if (type === 'dim') color = '#64748b';
      c.innerHTML += `<div style="color:${color};"><span style="color:#64748b;">[${time}]</span> ${esc(msg)}</div>`;
      c.scrollTop = c.scrollHeight;
    };

    const runScan = async () => {
      detectedIssues = [];
      const scanBtn = document.getElementById('btn-run-full-scan');
      const repairBtn = document.getElementById('btn-auto-repair-all');
      const statusBadge = document.getElementById('doctor-status-badge');
      const statusText = document.getElementById('doctor-status-text');
      const container = document.getElementById('doctor-issues-container');

      scanBtn.disabled = true;
      scanBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Scanning System...';
      UIComponents.refreshIcons();

      logConsole('Initiating comprehensive health scan across all data collections...', 'info');

      // Check 1: Super Admin Root Profile Check
      logConsole('Validating Super Administrator account (cmbasith786@gmail.com)...', 'dim');
      try {
        const profiles = await dbService.select('profiles');
        const basith = profiles.find(p => (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase());
        if (!basith) {
          detectedIssues.push({
            id: 'ISSUE-SUPERADMIN-MISSING',
            category: 'SECURITY',
            title: 'Super Admin Profile Missing in Database',
            description: `No profile record found matching ${TMS_CONFIG.superAdminEmail}.`,
            severity: 'high',
            fix: async () => {
              await dbService.insert('profiles', {
                email: TMS_CONFIG.superAdminEmail,
                name: 'C. M. Basith',
                role: 'super_admin',
                scope: 'school_wide',
                is_super_admin: true,
                title: 'Executive Director & Super Admin'
              });
            }
          });
          logConsole('WARNING: Super Admin profile record not found in profiles collection!', 'warn');
        } else if (basith.role !== 'super_admin' || !basith.is_super_admin) {
          detectedIssues.push({
            id: 'ISSUE-SUPERADMIN-ROLE-DRIFT',
            category: 'SECURITY',
            title: 'Super Admin Role Flag Drift',
            description: `Super Admin account has role "${basith.role}" instead of "super_admin".`,
            severity: 'high',
            fix: async () => {
              await dbService.update('profiles', basith.id, {
                role: 'super_admin',
                is_super_admin: true,
                scope: 'school_wide'
              });
            }
          });
          logConsole(`Found role flag drift on Super Admin account: current role is "${basith.role}".`, 'warn');
        } else {
          logConsole('✓ Super Admin account is verified, active, and holds root super_admin role.', 'info');
        }
      } catch (e) {
        logConsole(`Error inspecting profiles: ${e.message}`, 'err');
      }

      // Check 2: Admission Applications Integrity
      logConsole('Inspecting admissions_applications collection...', 'dim');
      try {
        const apps = await dbService.select('admissions_applications');
        let brokenApps = [];
        apps.forEach(a => {
          if (!a.appId || !a.status || !a.session) {
            brokenApps.push(a);
          }
        });
        if (brokenApps.length) {
          detectedIssues.push({
            id: 'ISSUE-ADMISSION-RECORDS',
            category: 'ADMISSIONS',
            title: `${brokenApps.length} Admission Applications With Incomplete Fields`,
            description: `Found ${brokenApps.length} applications missing Form No (appId), status, or session headers.`,
            severity: 'medium',
            fix: async () => {
              for (const b of brokenApps) {
                const patch = {};
                if (!b.appId) patch.appId = `TMS-APP-${Date.now().toString(36).toUpperCase()}`;
                if (!b.status) patch.status = 'Submitted';
                if (!b.session) patch.session = TMS_CONFIG.academic?.currentYear || '2027 - 2028';
                await dbService.update('admissions_applications', b.id, patch);
              }
            }
          });
          logConsole(`WARNING: ${brokenApps.length} admission applications have missing critical metadata.`, 'warn');
        } else {
          logConsole(`✓ All ${apps.length} admission applications have valid identifiers and schemas.`, 'info');
        }
      } catch (e) {
        logConsole(`Error checking applications: ${e.message}`, 'err');
      }

      // Check 3: Finance & Invoices Sanity
      logConsole('Inspecting invoices and financial ledger...', 'dim');
      try {
        const invoices = await dbService.select('invoices');
        let brokenInvoices = invoices.filter(inv => isNaN(Number(inv.total)) || isNaN(Number(inv.paidAmount || 0)));
        if (brokenInvoices.length) {
          detectedIssues.push({
            id: 'ISSUE-INVOICES-CORRUPT',
            category: 'FINANCE',
            title: `${brokenInvoices.length} Invoices With Corrupted Numeric Totals`,
            description: `Detected invoices containing NaN or unparseable financial totals.`,
            severity: 'high',
            fix: async () => {
              for (const inv of brokenInvoices) {
                await dbService.update('invoices', inv.id, {
                  total: Number(inv.total) || 0,
                  paidAmount: Number(inv.paidAmount) || 0
                });
              }
            }
          });
          logConsole(`WARNING: ${brokenInvoices.length} invoices contain corrupted financial calculations.`, 'warn');
        } else {
          logConsole(`✓ All ${invoices.length} fee invoices have valid numbers and balances.`, 'info');
        }
      } catch (e) {
        logConsole(`Invoices check note: ${e.message}`, 'dim');
      }

      // Check 4: Attendance Records Sanity
      logConsole('Inspecting attendance registers...', 'dim');
      try {
        const attendance = await dbService.select('attendance_records');
        let unlinkedAttendance = attendance.filter(att => !att.date || !att.classId);
        if (unlinkedAttendance.length) {
          detectedIssues.push({
            id: 'ISSUE-ATTENDANCE-DRIFT',
            category: 'ATTENDANCE',
            title: `${unlinkedAttendance.length} Attendance Records Missing Date / Class`,
            description: `Found ${unlinkedAttendance.length} records missing timestamps or classroom links.`,
            severity: 'low',
            fix: async () => {
              const idsToDelete = unlinkedAttendance.map(x => x.id);
              await dbService.delete('attendance_records', idsToDelete);
            }
          });
          logConsole(`WARNING: ${unlinkedAttendance.length} attendance records missing classroom / date references.`, 'warn');
        } else {
          logConsole(`✓ All ${attendance.length} attendance punch records have valid timestamps.`, 'info');
        }
      } catch (e) {
        logConsole(`Attendance check note: ${e.message}`, 'dim');
      }

      // Check 5: Offline Mutation Queue Drift
      logConsole('Checking browser offline queue (tms_offline_queue)...', 'dim');
      try {
        const rawQueue = localStorage.getItem('tms_offline_queue');
        const queue = rawQueue ? JSON.parse(rawQueue) : [];
        if (queue.length > 0) {
          detectedIssues.push({
            id: 'ISSUE-OFFLINE-QUEUE',
            category: 'SYNC',
            title: `${queue.length} Pending Mutations In Offline Queue`,
            description: `There are mutations awaiting synchronization with the Supabase database.`,
            severity: 'medium',
            fix: async () => {
              await dbService.processQueue();
            }
          });
          logConsole(`Found ${queue.length} uncommitted offline mutation(s) in queue.`, 'warn');
        } else {
          logConsole('✓ Offline queue is completely clear and in sync with Supabase cloud.', 'info');
        }
      } catch (e) {
        logConsole(`Queue check: ${e.message}`, 'dim');
      }

      // Check 6: Memory Cache Health
      logConsole('Checking in-memory RAM cache state...', 'dim');
      const cacheSize = dbService._memCache ? dbService._memCache.size : 0;
      logConsole(`✓ In-Memory RAM Cache is active: ${cacheSize} collections cached.`, 'info');

      // Finalize UI
      scanBtn.disabled = false;
      scanBtn.innerHTML = '<i data-lucide="stethoscope"></i> Run Deep System Scan';

      const issueCountEl = document.getElementById('doctor-issue-count');
      if (detectedIssues.length === 0) {
        statusBadge.className = 'badge badge-success';
        statusBadge.innerText = 'System 100% Healthy';
        statusText.innerText = 'All database collections, schemas, and accounts verified intact.';
        if (issueCountEl) {
          issueCountEl.innerText = '0 Issues Detected';
          issueCountEl.style.color = '#16a34a';
        }
        repairBtn.disabled = true;

        container.innerHTML = `
          <div style="padding:24px; text-align:center; background:rgba(22,163,74,0.06); border:1.5px solid #86efac; border-radius:10px; color:#15803d;">
            <i data-lucide="check-circle-2" style="width:36px;height:36px;display:block;margin:0 auto 8px;color:#16a34a;"></i>
            <div style="font-weight:700; font-size:1.05rem;">All Core Subsystems Operating Correctly</div>
            <div style="font-size:0.84rem; color:var(--text-muted); margin-top:4px;">No data corruption, schema drift, or broken relationships detected across any campus table.</div>
          </div>
        `;
        logConsole('Diagnosis complete: No errors or inconsistencies detected.', 'info');
      } else {
        statusBadge.className = 'badge badge-warning';
        statusBadge.innerText = `${detectedIssues.length} Inconsistencies Found`;
        statusText.innerText = 'Review detected issues below and click "Auto-Repair All Detected Issues".';
        if (issueCountEl) {
          issueCountEl.innerText = `${detectedIssues.length} Issues Found`;
          issueCountEl.style.color = '#ef4444';
        }
        repairBtn.disabled = false;

        container.innerHTML = detectedIssues.map((iss, idx) => `
          <div class="card" style="padding:14px; border-left:4px solid ${iss.severity === 'high' ? '#ef4444' : '#f59e0b'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge ${iss.severity === 'high' ? 'badge-danger' : 'badge-warning'}">${iss.category}</span>
                <span style="font-weight:700; font-size:0.92rem;">${esc(iss.title)}</span>
              </div>
              <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">${esc(iss.description)}</div>
            </div>
            <div>
              <button type="button" class="btn btn-secondary btn-sm btn-fix-single" data-idx="${idx}">
                <i data-lucide="wrench"></i> Fix This
              </button>
            </div>
          </div>
        `).join('');

        container.querySelectorAll('.btn-fix-single').forEach(b => {
          b.addEventListener('click', async () => {
            const idx = Number(b.dataset.idx);
            const iss = detectedIssues[idx];
            if (!iss) return;
            b.disabled = true;
            b.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Fixing...';
            try {
              await iss.fix();
              await auditService.log('SYSTEM_DOCTOR_FIX_APPLIED', 'GOVERNANCE', { issueId: iss.id, title: iss.title });
              logConsole(`Repaired issue: ${iss.title}`, 'info');
              UIComponents.showToast(`Fixed: ${iss.title}`, 'success');
              runScan();
            } catch (err) {
              logConsole(`Repair failed: ${err.message}`, 'err');
              UIComponents.showToast(`Repair failed: ${err.message}`, 'danger');
            }
          });
        });
      }

      UIComponents.refreshIcons();
    };

    const runScanBtn = document.getElementById('btn-run-full-scan');
    if (runScanBtn) runScanBtn.addEventListener('click', runScan);

    const autoRepairBtn = document.getElementById('btn-auto-repair-all');
    if (autoRepairBtn) {
      autoRepairBtn.addEventListener('click', async () => {
        if (!detectedIssues.length) return;
        if (!confirm(`Apply automated self-repair to all ${detectedIssues.length} detected system issue(s)?`)) return;
        autoRepairBtn.disabled = true;
        autoRepairBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Repairing all...';
        logConsole('Initiating automated repair sequence across all flagged issues...', 'warn');

        for (const iss of detectedIssues) {
          try {
            await iss.fix();
            logConsole(`Successfully resolved: ${iss.title}`, 'info');
          } catch (e) {
            logConsole(`Failed repairing ${iss.title}: ${e.message}`, 'err');
          }
        }
        await auditService.log('SYSTEM_DOCTOR_BULK_REPAIR_COMPLETED', 'GOVERNANCE', { count: detectedIssues.length });
        UIComponents.showToast('Automated self-repair routine completed.', 'success');
        runScan();
      });
    }
  }

  /* ================================================================== */
  /* Developer Tools & Direct Supabase Table Explorer                   */
  /* ================================================================== */

  static async renderDeveloperToolsTab(tabContent) {
    const TABLES = [
      'profiles',
      'user_sessions',
      'audit_logs',
      'admissions_applications',
      'students',
      'invoices',
      'attendance_records',
      'timetables',
      'certificates',
      'notices',
      'admission_settings',
      'admission_form_fields',
      'admission_fees'
    ];

    tabContent.innerHTML = `
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <span style="color:#f59e0b;"><i data-lucide="terminal"></i></span>
              Developer Console &amp; Direct Database Explorer
            </h3>
            <p class="card-desc">Super Administrator privileged diagnostics: inspect raw tables, measure cloud latency, analyze RAM caches, and force local state purges.</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-purge-ram-cache">
              <i data-lucide="zap"></i> Flush RAM Cache
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-ping-supabase">
              <i data-lucide="activity"></i> Test Cloud Latency
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-flush-local-storage" style="color:#ef4444;">
              <i data-lucide="trash-2"></i> Hard Reset Storage
            </button>
          </div>
        </div>

        <!-- System Diagnostic KPIs -->
        <div class="kpi-grid" style="margin:16px 0 20px;">
          <div class="card" style="padding:14px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Supabase Status</div>
            <div style="font-size:1.1rem; font-weight:800; color:#16a34a; margin-top:4px;" id="dev-kpi-status">Connected</div>
          </div>
          <div class="card" style="padding:14px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Roundtrip Ping</div>
            <div style="font-size:1.1rem; font-weight:800; color:#2563eb; margin-top:4px;" id="dev-kpi-ping">— ms</div>
          </div>
          <div class="card" style="padding:14px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">RAM Cache Entries</div>
            <div style="font-size:1.1rem; font-weight:800; color:#f59e0b; margin-top:4px;" id="dev-kpi-cache">${dbService._memCache ? dbService._memCache.size : 0} Collections</div>
          </div>
          <div class="card" style="padding:14px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">LocalStorage Used</div>
            <div style="font-size:1.1rem; font-weight:800; color:#8b5cf6; margin-top:4px;" id="dev-kpi-storage">— KB</div>
          </div>
        </div>

        <!-- Table Explorer Select -->
        <div style="padding:14px 16px; background:var(--bg-subtle, #f8fafc); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <label style="font-weight:700; font-size:0.86rem;">Select Data Collection:</label>
            <select class="form-select form-select-sm" id="dev-table-select" style="min-width:220px; font-weight:600;">
              ${TABLES.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-primary btn-sm" id="btn-load-table-data">
              <i data-lucide="database"></i> Query Records
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-download-table-json">
              <i data-lucide="download"></i> Download JSON
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="text" id="dev-table-filter" class="form-control form-control-sm" placeholder="Filter table rows..." style="max-width:240px;">
          </div>
        </div>

        <div style="padding:8px 16px; background:#f1f5f9; font-size:0.75rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
          <span id="dev-row-count-badge">0 Records Loaded</span>
          <label style="margin:0; font-size:0.75rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <input type="checkbox" id="dev-toggle-raw-json"> Raw JSON Format
          </label>
        </div>

        <div class="table-responsive" id="dev-table-view-container" style="max-height:460px; overflow:auto;">
          <div style="padding:36px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
            Select a table and click <strong>"Query Records"</strong> to inspect raw database rows.
          </div>
        </div>
      </div>
    `;
    UIComponents.refreshIcons();

    // Calculate localStorage size
    let totalBytes = 0;
    try {
      for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          totalBytes += (localStorage[x].length + x.length) * 2;
        }
      }
    } catch (e) {}
    const kbUsed = (totalBytes / 1024).toFixed(1);
    const storageEl = document.getElementById('dev-kpi-storage');
    if (storageEl) storageEl.innerText = `${kbUsed} KB`;

    // Latency Ping test
    const runPing = async () => {
      const pingEl = document.getElementById('dev-kpi-ping');
      if (pingEl) pingEl.innerText = 'Testing...';
      const start = performance.now();
      try {
        await fetch(`${TMS_CONFIG.supabase.url}/rest/v1/profiles?select=id&limit=1`, {
          headers: {
            'apikey': TMS_CONFIG.supabase.anonKey,
            'Authorization': `Bearer ${TMS_CONFIG.supabase.anonKey}`
          }
        });
        const elapsed = Math.round(performance.now() - start);
        if (pingEl) {
          pingEl.innerText = `${elapsed} ms`;
          pingEl.style.color = elapsed < 300 ? '#16a34a' : '#f59e0b';
        }
      } catch (err) {
        if (pingEl) {
          pingEl.innerText = 'Offline';
          pingEl.style.color = '#ef4444';
        }
      }
    };
    runPing();

    const pingBtn = document.getElementById('btn-ping-supabase');
    if (pingBtn) pingBtn.addEventListener('click', runPing);

    // RAM Cache Purge
    const purgeRamBtn = document.getElementById('btn-purge-ram-cache');
    if (purgeRamBtn) {
      purgeRamBtn.addEventListener('click', () => {
        dbService.invalidateCache();
        const cacheEl = document.getElementById('dev-kpi-cache');
        if (cacheEl) cacheEl.innerText = '0 Collections';
        UIComponents.showToast('RAM Memory Cache purged completely.', 'success');
      });
    }

    // Hard reset localStorage
    const flushStorageBtn = document.getElementById('btn-flush-local-storage');
    if (flushStorageBtn) {
      flushStorageBtn.addEventListener('click', () => {
        if (!confirm('Clear local client cache and force reload from Supabase cloud? (Your cloud records are completely safe).')) return;
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('tms_')) localStorage.removeItem(k);
        });
        dbService.invalidateCache();
        UIComponents.showToast('Local cache wiped. Reloading application...', 'info');
        setTimeout(() => window.location.reload(), 600);
      });
    }

    // Query Table Data
    let currentTableData = [];
    const loadTable = async () => {
      const tableSelect = document.getElementById('dev-table-select');
      const tableName = tableSelect ? tableSelect.value : 'profiles';
      const container = document.getElementById('dev-table-view-container');
      const countBadge = document.getElementById('dev-row-count-badge');
      const isRawJson = document.getElementById('dev-toggle-raw-json')?.checked;

      container.innerHTML = `<div style="padding:30px; text-align:center;"><i data-lucide="loader" class="animate-spin" style="margin:0 auto 8px;"></i> Querying ${tableName}...</div>`;
      UIComponents.refreshIcons();

      try {
        currentTableData = await dbService.select(tableName, null, true);
        if (countBadge) countBadge.innerText = `${currentTableData.length} Records in "${tableName}"`;

        if (!currentTableData.length) {
          container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted);">Table "${tableName}" is currently empty.</div>`;
          return;
        }

        renderTableContent();
      } catch (err) {
        container.innerHTML = `<div style="padding:20px; color:#ef4444;">Query error: ${esc(err.message)}</div>`;
      }
    };

    const renderTableContent = () => {
      const container = document.getElementById('dev-table-view-container');
      const isRawJson = document.getElementById('dev-toggle-raw-json')?.checked;
      const filterText = (document.getElementById('dev-table-filter')?.value || '').toLowerCase().trim();

      let displayData = currentTableData;
      if (filterText) {
        displayData = displayData.filter(row => JSON.stringify(row).toLowerCase().includes(filterText));
      }

      if (isRawJson) {
        container.innerHTML = `
          <pre style="background:#090d16; color:#38bdf8; font-family:monospace; font-size:0.75rem; padding:16px; margin:0; line-height:1.5;">${esc(JSON.stringify(displayData, null, 2))}</pre>
        `;
        return;
      }

      const sample = displayData[0] || {};
      const cols = Object.keys(sample).slice(0, 8);

      container.innerHTML = `
        <table class="tms-table font-mono" style="font-size:0.76rem;">
          <thead>
            <tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${displayData.map(row => `
              <tr>
                ${cols.map(c => {
                  let val = row[c];
                  if (typeof val === 'object') val = JSON.stringify(val);
                  return `<td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(String(val ?? '—'))}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      UIComponents.refreshIcons();
    };

    const loadBtn = document.getElementById('btn-load-table-data');
    if (loadBtn) loadBtn.addEventListener('click', loadTable);

    const toggleJson = document.getElementById('dev-toggle-raw-json');
    if (toggleJson) toggleJson.addEventListener('change', renderTableContent);

    const filterInp = document.getElementById('dev-table-filter');
    if (filterInp) filterInp.addEventListener('input', renderTableContent);

    const downloadBtn = document.getElementById('btn-download-table-json');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const tableSelect = document.getElementById('dev-table-select');
        const tableName = tableSelect ? tableSelect.value : 'table';
        const blob = new Blob([JSON.stringify(currentTableData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TMS-${tableName}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      });
    }

    // Auto-load first table
    loadTable();
  }

  /* ================================================================== */
  /* Institutional Backup & Disaster Recovery                           */
  /* ================================================================== */

  static async renderBackupTab(tabContent) {
    const esc = (v) => UIComponents.escapeHtml(v);
const safeOn = (id, event, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
};

    const [
      students, staff, invoices, apps, exams, att, timetables, certs, settings
    ] = await Promise.all([
      dbService.select('students'),
      dbService.select('staff_directory'),
      dbService.select('invoices'),
      dbService.select('admissions_applications'),
      dbService.select('exam_assessments'),
      dbService.select('attendance_records'),
      dbService.select('timetables'),
      dbService.select('certificates'),
      dbService.select('admission_settings')
    ]);

    const stats = [
      { name: 'Enrolled Students', count: students.length, icon: 'graduation-cap', color: 'emerald' },
      { name: 'Staff & Faculty', count: staff.length, icon: 'users', color: 'blue' },
      { name: 'Financial Invoices', count: invoices.length, icon: 'credit-card', color: 'amber' },
      { name: 'Admission Applications', count: apps.length, icon: 'file-text', color: 'rose' },
      { name: 'Exam Assessments', count: exams.length, icon: 'award', color: 'blue' },
      { name: 'Daily Attendance Punches', count: att.length, icon: 'check-square', color: 'emerald' },
      { name: 'Class Timetables', count: timetables.length, icon: 'calendar-days', color: 'amber' },
      { name: 'Issued Certificates (TC & Merit)', count: certs.length, icon: 'file-check', color: 'rose' }
    ];

    tabContent.innerHTML = `
      <div class="card" style="border-left: 4px solid #16a34a; margin-bottom: 24px;">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
              <span style="color: #16a34a;"><i data-lucide="database"></i></span>
              Institutional Data Snapshot &amp; Disaster Recovery
            </h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
              One-click consolidated JSON and CSV data exports ensuring data permanence, offline backups, and zero data loss.
            </p>
          </div>
          <button class="btn btn-primary" id="btn-download-full-json">
            <i data-lucide="download"></i> Download Full JSON Backup
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin: 16px 0;">
          ${stats.map(s => `
            <div style="background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(22, 163, 74, 0.1); color: #16a34a; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${s.icon}"></i>
              </div>
              <div>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); line-height: 1.1;">${s.count}</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${esc(s.name)}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 18px; margin-top: 8px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="btn-export-students-csv">
            <i data-lucide="file-spreadsheet"></i> Export Students Directory (CSV)
          </button>
          <button class="btn btn-secondary" id="btn-export-finance-csv">
            <i data-lucide="file-spreadsheet"></i> Export Invoices Ledger (CSV)
          </button>
          <button class="btn btn-secondary" id="btn-export-exams-csv">
            <i data-lucide="file-spreadsheet"></i> Export Examination Ledger (CSV)
          </button>
        </div>
      </div>
    `;

    // Download full JSON backup
    safeOn('btn-download-full-json', 'click', async () => {
      const backupPayload = {
        metadata: {
          institution: TMS_CONFIG.institution.name,
          campus: TMS_CONFIG.institution.address.campus,
          academicYear: TMS_CONFIG.academic.currentYear,
          timestamp: new Date().toISOString(),
          version: '2.0.0-PROD'
        },
        data: {
          students,
          staffDirectory: staff,
          invoices,
          admissionsApplications: apps,
          examAssessments: exams,
          attendanceRecords: att,
          timetables,
          certificates: certs,
          admissionSettings: settings
        }
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TMS_ERP_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await auditService.log('DISASTER_RECOVERY_BACKUP_DOWNLOADED', 'GOVERNANCE', {
        timestamp: new Date().toISOString(),
        totalStudents: students.length,
        totalInvoices: invoices.length
      });

      UIComponents.showToast('Full institutional JSON backup downloaded successfully!', 'success');
    });

    // Students CSV
    safeOn('btn-export-students-csv', 'click', () => {
      const header = ['Admission No', 'Roll No', 'Full Name', 'Grade', 'Section', 'DOB', 'Parent Name', 'Phone', 'Address'];
      const rows = students.map(s => [
        s.admissionNo || '',
        s.rollNo || '',
        s.fullName || '',
        s.grade || '',
        s.section || '',
        s.dob || '',
        s.parentName || s.guardianName || '',
        s.phone || '',
        s.address || s.village || ''
      ]);
      downloadCsv(`TMS_Students_Directory_${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
      UIComponents.showToast('Students directory exported to CSV.', 'success');
    });

    // Invoices CSV
    safeOn('btn-export-finance-csv', 'click', () => {
      const header = ['Invoice No', 'Student Name', 'Grade', 'Term', 'Amount', 'Paid', 'Balance', 'Status', 'Due Date'];
      const rows = invoices.map(i => [
        i.invoiceNo || '',
        i.studentName || '',
        i.grade || '',
        i.term || '',
        i.amount || 0,
        i.paid || 0,
        i.balance || 0,
        i.status || '',
        i.dueDate || ''
      ]);
      downloadCsv(`TMS_Finance_Invoices_${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
      UIComponents.showToast('Invoices ledger exported to CSV.', 'success');
    });

    // Exams CSV
    document.getElementById('btn-export-exams-csv').addEventListener('click', () => {
      const header = ['Admission No', 'Student Name', 'Grade', 'Term', 'Total Scored', 'Max Total', 'Percentage', 'Overall Grade'];
      const rows = exams.map(e => [
        e.admissionNo || '',
        e.studentName || '',
        e.grade || '',
        e.term || '',
        e.totalScored || 0,
        e.totalMax || 700,
        e.percentage || 0,
        e.overallGrade || ''
      ]);
      downloadCsv(`TMS_Exam_Assessments_${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
      UIComponents.showToast('Exam assessments exported to CSV.', 'success');
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Document & File Previewer Lightbox                                 */
  /* ================================================================== */

  static async openFilePreviewModal({ title = 'Document Preview', path, url, fileName = '' }) {
    let overlay = document.getElementById('tms-file-preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tms-file-preview-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.78); backdrop-filter: blur(6px);
        z-index: 999999; display: flex; align-items: center; justify-content: center;
        padding: 16px; box-sizing: border-box;
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display !== 'none') {
          overlay.style.display = 'none';
        }
      });
    }

    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:#ffffff; border-radius:12px; width:100%; max-width:980px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.2);">
        <div style="padding:14px 18px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <div style="width:36px; height:36px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="file-text" style="width:20px;height:20px;"></i>
            </div>
            <div style="min-width:0;">
              <h4 style="margin:0; font-size:0.95rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(title)}</h4>
              <p style="margin:0; font-size:0.75rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(fileName || path || 'Loading document...')}</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div id="tms-preview-img-controls" style="display:none; align-items:center; gap:4px; margin-right:8px; padding-right:8px; border-right:1px solid #e2e8f0;">
              <button class="btn btn-secondary btn-sm" id="btn-zoom-in" title="Zoom In" style="padding:4px 8px;"><i data-lucide="zoom-in" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-secondary btn-sm" id="btn-zoom-out" title="Zoom Out" style="padding:4px 8px;"><i data-lucide="zoom-out" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-secondary btn-sm" id="btn-rotate-img" title="Rotate 90°" style="padding:4px 8px;"><i data-lucide="rotate-cw" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-secondary btn-sm" id="btn-reset-img" title="Reset View" style="padding:4px 8px;"><i data-lucide="maximize-2" style="width:14px;height:14px;"></i></button>
            </div>
            <a id="btn-download-preview" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px; padding:5px 10px; font-size:0.78rem;" download target="_blank">
              <i data-lucide="download" style="width:14px;height:14px;"></i> Download
            </a>
            <a id="btn-open-tab-preview" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px; padding:5px 10px; font-size:0.78rem;" target="_blank">
              <i data-lucide="external-link" style="width:14px;height:14px;"></i> Open
            </a>
            <button class="icon-btn" id="btn-close-preview" style="padding:6px; border-radius:6px; color:#64748b; cursor:pointer;"><i data-lucide="x" style="width:18px;height:18px;"></i></button>
          </div>
        </div>
        <div id="tms-preview-content" style="flex:1; overflow:auto; background:#0f172a; min-height:420px; display:flex; align-items:center; justify-content:center; position:relative;">
          <div style="color:#94a3b8; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
            <i data-lucide="loader-2" class="spin"></i> Loading document...
          </div>
        </div>
      </div>
    `;

    UIComponents.refreshIcons();
    document.getElementById('btn-close-preview')?.addEventListener('click', () => { overlay.style.display = 'none'; });

    let finalUrl = url;
    if (!finalUrl && path) {
      finalUrl = await admissionService.getSignedUrl('admission-docs', path, 7200);
      if (!finalUrl) finalUrl = admissionService.getPublicUrl('admission-docs', path);
    }

    const contentEl = document.getElementById('tms-preview-content');
    const dlBtn = document.getElementById('btn-download-preview');
    const openBtn = document.getElementById('btn-open-tab-preview');
    const imgControls = document.getElementById('tms-preview-img-controls');

    if (!finalUrl) {
      if (contentEl) {
        contentEl.style.background = '#f8fafc';
        contentEl.innerHTML = `
          <div style="text-align:center; padding:40px; color:#64748b;">
            <i data-lucide="alert-circle" style="width:48px;height:48px;color:#f59e0b;margin-bottom:12px;"></i>
            <h5 style="margin:0 0 6px 0; color:#1e293b;">Document Preview Unavailable</h5>
            <p style="font-size:0.8rem; margin:0 0 16px 0;">The attached file could not be loaded from storage (${esc(path || 'unknown')}).</p>
          </div>
        `;
        UIComponents.refreshIcons();
      }
      return;
    }

    if (dlBtn) dlBtn.href = finalUrl;
    if (openBtn) openBtn.href = finalUrl;

    const lowerPath = (path || finalUrl || '').toLowerCase();
    const isImage = lowerPath.includes('.jpg') || lowerPath.includes('.jpeg') || lowerPath.includes('.png') ||
                    lowerPath.includes('.webp') || lowerPath.includes('.gif') || lowerPath.includes('.svg') ||
                    finalUrl.startsWith('data:image/');
    const isPdf = lowerPath.includes('.pdf') || finalUrl.startsWith('data:application/pdf');

    if (isImage) {
      if (imgControls) imgControls.style.display = 'flex';
      let zoom = 1;
      let rot = 0;
      contentEl.innerHTML = `
        <div style="width:100%; height:100%; min-height:480px; display:flex; align-items:center; justify-content:center; overflow:auto; padding:20px;">
          <img id="tms-target-img" src="${finalUrl}" alt="Preview" style="max-width:100%; max-height:75vh; object-fit:contain; transition:transform 0.15s ease-out; transform:scale(1) rotate(0deg); border-radius:4px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        </div>
      `;

      const targetImg = document.getElementById('tms-target-img');
      const updateTransform = () => {
        if (targetImg) targetImg.style.transform = `scale(${zoom}) rotate(${rot}deg)`;
      };

      document.getElementById('btn-zoom-in')?.addEventListener('click', () => { zoom = Math.min(zoom + 0.25, 3.5); updateTransform(); });
      document.getElementById('btn-zoom-out')?.addEventListener('click', () => { zoom = Math.max(zoom - 0.25, 0.4); updateTransform(); });
      document.getElementById('btn-rotate-img')?.addEventListener('click', () => { rot = (rot + 90) % 360; updateTransform(); });
      document.getElementById('btn-reset-img')?.addEventListener('click', () => { zoom = 1; rot = 0; updateTransform(); });
    } else if (isPdf) {
      contentEl.style.background = '#334155';
      contentEl.innerHTML = `
        <iframe src="${finalUrl}#toolbar=1" style="width:100%; height:76vh; border:none; background:#ffffff;" title="PDF Preview"></iframe>
      `;
    } else {
      contentEl.style.background = '#f8fafc';
      contentEl.innerHTML = `
        <div style="text-align:center; padding:40px; color:#1e293b;">
          <div style="width:56px; height:56px; border-radius:12px; background:#eff6ff; color:#2563eb; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
            <i data-lucide="file-check" style="width:28px;height:28px;"></i>
          </div>
          <h4 style="margin:0 0 8px 0;">Attached File</h4>
          <p style="font-size:0.82rem; color:#64748b; margin:0 0 20px 0;">${esc(path || fileName)}</p>
          <div style="display:flex; justify-content:center; gap:10px;">
            <a href="${finalUrl}" target="_blank" class="btn btn-primary btn-sm"><i data-lucide="external-link"></i> Open Document</a>
            <a href="${finalUrl}" download class="btn btn-secondary btn-sm"><i data-lucide="download"></i> Download File</a>
          </div>
        </div>
      `;
    }
    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Admission Application Data Editor                                  */
  /* ================================================================== */

  static async openEditApplicationModal(appId) {
    let app = (this._apps || []).find((a) => a.id === appId);
    if (!app) {
      app = await admissionService.getApplication(appId);
    }
    if (!app) {
      UIComponents.showToast('Application record not found.', 'danger');
      return;
    }

    const fields = await admissionService.listFields();
    const payload = app.payload || {};

    const getVal = (key, fallback = '') => {
      if (payload[key] !== undefined && payload[key] !== null) return payload[key];
      if (app[key] !== undefined && app[key] !== null) return app[key];
      return fallback;
    };

    const classOptions = ['Nursery', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentClass = getVal('applyingClass', app.grade || '');

    const docFields = fields.filter((f) => (f.fieldType || 'text') === 'file');
    const standardDocKeys = ['photo', 'birthCertificate', 'aadhaarDoc', 'marksheet'];
    const standardDocLabels = {
      photo: 'Applicant Photo',
      birthCertificate: 'Birth Certificate',
      aadhaarDoc: 'Aadhaar / ID Card',
      marksheet: 'Previous Marksheet / Transfer Certificate'
    };

    const docFieldsToRender = [...docFields];
    standardDocKeys.forEach(k => {
      if (!docFieldsToRender.some(f => f.fieldKey === k)) {
        docFieldsToRender.push({ fieldKey: k, label: standardDocLabels[k], fieldType: 'file' });
      }
    });

    const docsHtml = docFieldsToRender.map((f) => {
      const curPath = getVal(f.fieldKey, '');
      return `
        <div style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong style="font-size:0.8rem; color:#1e293b;">${esc(f.label)}</strong>
            ${curPath ? `
              <div style="display:flex; gap:6px; align-items:center;">
                <span class="badge badge-success" style="font-size:0.68rem;"><i data-lucide="check"></i> Attached</span>
                <button type="button" class="btn btn-secondary btn-sm btn-edit-preview-doc" data-path="${esc(curPath)}" data-title="${esc(f.label)}" style="font-size:0.72rem; padding:2px 8px; color:#2563eb; border-color:#bfdbfe;">
                  <i data-lucide="eye" style="width:12px;height:12px;"></i> Preview
                </button>
              </div>
            ` : '<span style="font-size:0.72rem; color:#94a3b8; font-style:italic;">No file attached</span>'}
          </div>
          <div>
            <label style="font-size:0.7rem; color:#64748b; display:block; margin-bottom:3px;">Replace or Upload File:</label>
            <input type="file" class="form-input form-input-sm edit-doc-file" data-key="${esc(f.fieldKey)}" accept="image/*,application/pdf" style="font-size:0.75rem;">
          </div>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <form id="edit-app-form" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Status & Meta Bar -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px 16px; border-radius:8px;">
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#166534; font-weight:700;">Application Status</label>
            <select class="form-select form-select-sm" id="ea-status">
              <option value="Submitted" ${app.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="Under Verification" ${app.status === 'Under Verification' ? 'selected' : ''}>Under Verification</option>
              <option value="Approved" ${app.status === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Enrolled" ${app.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#166534; font-weight:700;">Payment Status</label>
            <select class="form-select form-select-sm" id="ea-pay-status">
              <option value="Not Required" ${app.paymentStatus === 'Not Required' ? 'selected' : ''}>Not Required</option>
              <option value="Pending" ${app.paymentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Paid" ${app.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="Partial" ${app.paymentStatus === 'Partial' ? 'selected' : ''}>Partial</option>
              <option value="Waived" ${app.paymentStatus === 'Waived' ? 'selected' : ''}>Waived</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#166534; font-weight:700;">Total Fees (₹)</label>
            <input type="number" class="form-input form-input-sm" id="ea-fee-total" value="${esc(app.feeTotal != null ? app.feeTotal : 0)}">
          </div>
        </div>

        <!-- Section 1: Candidate Identity -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="user" style="width:16px;height:16px;"></i> 1. Candidate Details
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Candidate's Full Name *</label>
              <input class="form-input form-input-sm" id="ea-candidate-name" value="${esc(getVal('candidateName', app.studentName || ''))}" required>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Applying for Class *</label>
              <select class="form-select form-select-sm" id="ea-class">
                ${classOptions.map((c) => `<option value="${esc(c)}" ${(currentClass === c || app.grade === c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Date of Birth</label>
              <input type="date" class="form-input form-input-sm" id="ea-dob" value="${esc(getVal('dob', app.dob || ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Gender</label>
              <select class="form-select form-select-sm" id="ea-gender">
                <option value="Male" ${getVal('gender', app.gender) === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${getVal('gender', app.gender) === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${getVal('gender', app.gender) === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Blood Group</label>
              <select class="form-select form-select-sm" id="ea-blood-group">
                <option value="">Select Blood Group</option>
                ${['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => `<option value="${b}" ${getVal('bloodGroup') === b ? 'selected' : ''}>${b}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Religion</label>
              <input class="form-input form-input-sm" id="ea-religion" value="${esc(getVal('religion', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Aadhaar / National ID</label>
              <input class="form-input form-input-sm font-mono" id="ea-aadhaar" value="${esc(getVal('aadhaar', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Identification Marks</label>
              <input class="form-input form-input-sm" id="ea-marks" value="${esc(getVal('identificationMarks', ''))}">
            </div>
          </div>
        </div>

        <!-- Section 2: Guardian Details -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="users" style="width:16px;height:16px;"></i> 2. Guardian &amp; Contact Details
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Father's / Guardian's Name *</label>
              <input class="form-input form-input-sm" id="ea-father-name" value="${esc(getVal('fatherName', app.guardianName || ''))}" required>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Father's Occupation</label>
              <input class="form-input form-input-sm" id="ea-father-occ" value="${esc(getVal('fatherOccupation', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Mother's Name</label>
              <input class="form-input form-input-sm" id="ea-mother-name" value="${esc(getVal('motherName', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Mother's Occupation</label>
              <input class="form-input form-input-sm" id="ea-mother-occ" value="${esc(getVal('motherOccupation', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Mobile / WhatsApp Number *</label>
              <input class="form-input form-input-sm font-mono" id="ea-phone" value="${esc(getVal('phone', app.phone || ''))}" required>
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Email Address</label>
              <input type="email" class="form-input form-input-sm font-mono" id="ea-email" value="${esc(getVal('email', app.email || ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Annual Family Income</label>
              <input type="number" class="form-input form-input-sm" id="ea-income" value="${esc(getVal('fatherIncome', getVal('annualIncome', '')))}">
            </div>
          </div>
        </div>

        <!-- Section 3: Address & School -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="map-pin" style="width:16px;height:16px;"></i> 3. Address &amp; Academic History
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Village / Street</label>
              <input class="form-input form-input-sm" id="ea-village" value="${esc(getVal('village', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Post Office (PO)</label>
              <input class="form-input form-input-sm" id="ea-po" value="${esc(getVal('po', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Police Station (PS)</label>
              <input class="form-input form-input-sm" id="ea-ps" value="${esc(getVal('ps', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">District</label>
              <input class="form-input form-input-sm" id="ea-district" value="${esc(getVal('district', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">PIN Code</label>
              <input class="form-input form-input-sm font-mono" id="ea-pin" value="${esc(getVal('pin', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Previous School</label>
              <input class="form-input form-input-sm" id="ea-prev-school" value="${esc(getVal('previousSchool', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Last Class Passed</label>
              <input class="form-input form-input-sm" id="ea-last-class" value="${esc(getVal('lastClass', ''))}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Last Percentage / Marks</label>
              <input class="form-input form-input-sm" id="ea-last-marks" value="${esc(getVal('lastMarks', ''))}">
            </div>
          </div>
        </div>

        <!-- Section 4: Attached Files -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#15803d; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="paperclip" style="width:16px;height:16px;"></i> 4. Attached Files &amp; Uploads
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
            ${docsHtml}
          </div>
        </div>

        <!-- Section 5: Remarks -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#475569; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="message-square" style="width:16px;height:16px;"></i> 5. Verification Remarks / Internal Notes
          </div>
          <textarea class="form-textarea" id="ea-remarks" rows="2" style="font-size:0.82rem;" placeholder="Administrative notes visible to reviewers...">${esc(app.remarks || '')}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-app">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-edit-app"><i data-lucide="save"></i> Save Application Changes</button>
      </div>
    `;

    UIComponents.openModal({
      title: `Edit Application Data — ${app.appId || app.id}`,
      bodyHtml,
      footerHtml,
      maxWidth: '1000px'
    });

    document.getElementById('btn-cancel-edit-app')?.addEventListener('click', () => {
      UIComponents.closeModal();
      this.openApplicationModal(app.id);
    });

    // Wire document preview buttons inside edit modal
    document.querySelectorAll('.btn-edit-preview-doc').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openFilePreviewModal({ title: btn.dataset.title, path: btn.dataset.path });
      });
    });

    // Wire save button
    document.getElementById('btn-save-edit-app')?.addEventListener('click', async () => {
      const saveBtn = document.getElementById('btn-save-edit-app');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
      UIComponents.refreshIcons();

      try {
        const candidateName = document.getElementById('ea-candidate-name')?.value.trim();
        const applyingClass = document.getElementById('ea-class')?.value;
        const fatherName = document.getElementById('ea-father-name')?.value.trim();
        const phone = document.getElementById('ea-phone')?.value.trim();

        if (!candidateName || !fatherName || !phone) {
          UIComponents.showToast('Please fill in required fields: Candidate Name, Father Name, and Mobile Number.', 'warning');
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i data-lucide="save"></i> Save Application Changes';
          UIComponents.refreshIcons();
          return;
        }

        const values = {
          candidateName,
          applyingClass,
          dob: document.getElementById('ea-dob')?.value || '',
          gender: document.getElementById('ea-gender')?.value || '',
          bloodGroup: document.getElementById('ea-blood-group')?.value || '',
          religion: document.getElementById('ea-religion')?.value.trim() || '',
          aadhaar: document.getElementById('ea-aadhaar')?.value.trim() || '',
          identificationMarks: document.getElementById('ea-marks')?.value.trim() || '',
          fatherName,
          fatherOccupation: document.getElementById('ea-father-occ')?.value.trim() || '',
          motherName: document.getElementById('ea-mother-name')?.value.trim() || '',
          motherOccupation: document.getElementById('ea-mother-occ')?.value.trim() || '',
          phone,
          email: document.getElementById('ea-email')?.value.trim() || '',
          fatherIncome: document.getElementById('ea-income')?.value || '',
          village: document.getElementById('ea-village')?.value.trim() || '',
          po: document.getElementById('ea-po')?.value.trim() || '',
          ps: document.getElementById('ea-ps')?.value.trim() || '',
          district: document.getElementById('ea-district')?.value.trim() || '',
          pin: document.getElementById('ea-pin')?.value.trim() || '',
          previousSchool: document.getElementById('ea-prev-school')?.value.trim() || '',
          lastClass: document.getElementById('ea-last-class')?.value.trim() || '',
          lastMarks: document.getElementById('ea-last-marks')?.value || ''
        };

        // Process file uploads
        const fileInputs = document.querySelectorAll('.edit-doc-file');
        for (const input of fileInputs) {
          if (input.files && input.files[0]) {
            const file = input.files[0];
            const key = input.dataset.key;
            const sanitizedName = admissionService.sanitizeFileName(file.name);
            const uploadPath = `applications/${app.appId || app.id}/${key}-${Date.now()}-${sanitizedName}`;
            const res = await admissionService.uploadFile('admission-docs', uploadPath, file);
            if (res && res.path) {
              values[key] = res.path;
            } else {
              // Fallback to base64 data URL
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
              });
              if (base64) values[key] = base64;
            }
          }
        }

        const status = document.getElementById('ea-status')?.value;
        const paymentStatus = document.getElementById('ea-pay-status')?.value;
        const feeTotal = parseFloat(document.getElementById('ea-fee-total')?.value) || 0;
        const remarks = document.getElementById('ea-remarks')?.value.trim() || '';

        await admissionService.updateApplication(app.id, { values, status, paymentStatus, remarks });
        await dbService.update('admissions_applications', app.id, { feeTotal });
        await auditService.log('ADMISSION_UPDATED', 'ADMISSIONS', { id: app.id, formNo: app.appId, candidateName }, app.id);

        UIComponents.showToast('Application details updated successfully!', 'success');
        UIComponents.closeModal();

        const tabContent = document.getElementById('admin-tab-content');
        await this.refreshApplications(tabContent);
        this.openApplicationModal(app.id);
      } catch (err) {
        console.error('Save application failed:', err);
        UIComponents.showToast(`Error saving application: ${err.message}`, 'danger');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i data-lucide="save"></i> Save Application Changes';
        UIComponents.refreshIcons();
      }
    });

    UIComponents.refreshIcons();
  }

  /* ================================================================== */
  /* Credential Sharing & Template Manager                             */
  /* ================================================================== */

  static getCredentialShareConfig() {
    let raw = null;
    try {
      raw = localStorage.getItem('tms_credential_share_template');
    } catch (_) {}

    let cfg = null;
    if (raw) {
      try { cfg = JSON.parse(raw); } catch (_) {}
    }

    const defaultDomain = (window && window.location && window.location.origin && !window.location.origin.includes('localhost'))
      ? window.location.origin
      : 'https://tms.clubad.space';

    const defaultTemplate = `Assalamu Alaikum / Greetings {name},

Here are your official login credentials for {institution_name}:

• Role: {role}
• Login ID / Username: {username}
• Password: {password}
• Portal Link: {portal_url}

Please keep your login details safe and confidential.`;

    return {
      template: (cfg && cfg.template) || defaultTemplate,
      domain: (cfg && cfg.domain) || defaultDomain
    };
  }

  static async saveCredentialShareConfig({ template, domain }) {
    const payload = { template, domain, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem('tms_credential_share_template', JSON.stringify(payload));
    } catch (_) {}
    try {
      await dbService.upsert('app_settings', { id: 'credential_share_template', value: payload });
    } catch (_) {}
    UIComponents.showToast('Credential sharing template saved!', 'success');
  }

  static compileCredentialMessage({ name, role, username, password, customUrl }) {
    const cfg = this.getCredentialShareConfig();
    const portalUrl = customUrl || `${cfg.domain}/login.html`;
    const schoolName = TMS_CONFIG.schoolName || 'Thaiba Public School';

    let msg = cfg.template;
    msg = msg.replace(/{name}/g, name || 'User');
    msg = msg.replace(/{role}/g, ROLE_LABELS[role] || role || 'User');
    msg = msg.replace(/{username}/g, username || '—');
    msg = msg.replace(/{password}/g, password || '—');
    msg = msg.replace(/{portal_url}/g, portalUrl);
    msg = msg.replace(/{domain}/g, cfg.domain);
    msg = msg.replace(/{institution_name}/g, schoolName);

    return msg;
  }

  static async copyCredentialMessageToClipboard(opts) {
    const msg = this.compileCredentialMessage(opts);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
      } else {
        const ta = document.createElement('textarea');
        ta.value = msg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      UIComponents.showToast(`Login credentials copied for ${opts.name || 'user'}! Ready to paste & share.`, 'success');
    } catch (e) {
      UIComponents.showToast('Could not copy to clipboard: ' + e.message, 'danger');
    }
  }

  static openCredentialTemplateModal() {
    const cfg = this.getCredentialShareConfig();

    const sampleProfile = {
      name: 'Dr. Ahmad Khan',
      role: 'teacher',
      username: 'ahmad.khan',
      password: 'TMS@Secure2026'
    };

    const previewMsg = this.compileCredentialMessage(sampleProfile);

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
          Customize the template message used when copying or sharing login credentials to Staff, Parents, or Students via WhatsApp, SMS, or Clipboard.
        </p>

        <div>
          <label class="form-label" style="font-size:0.78rem; font-weight:700;">Portal Domain / Link</label>
          <input class="form-input form-input-sm font-mono" id="cst-domain" value="${esc(cfg.domain)}" placeholder="e.g. https://tms.clubad.space">
          <small style="font-size:0.7rem; color:var(--text-muted);">The default website address or domain included in the login link.</small>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label class="form-label" style="font-size:0.78rem; font-weight:700; margin:0;">Message Template</label>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
              <span class="badge badge-info cst-tag" data-tag="{name}" style="cursor:pointer;" title="Click to insert">{name}</span>
              <span class="badge badge-info cst-tag" data-tag="{username}" style="cursor:pointer;" title="Click to insert">{username}</span>
              <span class="badge badge-info cst-tag" data-tag="{password}" style="cursor:pointer;" title="Click to insert">{password}</span>
              <span class="badge badge-info cst-tag" data-tag="{role}" style="cursor:pointer;" title="Click to insert">{role}</span>
              <span class="badge badge-info cst-tag" data-tag="{portal_url}" style="cursor:pointer;" title="Click to insert">{portal_url}</span>
              <span class="badge badge-info cst-tag" data-tag="{institution_name}" style="cursor:pointer;" title="Click to insert">{institution_name}</span>
            </div>
          </div>
          <textarea class="form-textarea font-mono" id="cst-template" rows="7" style="font-size:0.82rem; line-height:1.45;">${esc(cfg.template)}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-size:0.78rem; font-weight:700; color:#15803d; display:flex; align-items:center; gap:6px;">
            <i data-lucide="eye" style="width:14px;height:14px;"></i> Live Preview
          </label>
          <pre id="cst-preview" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:0.8rem; white-space:pre-wrap; color:#1e293b; margin:0; max-height:160px; overflow-y:auto;">${esc(previewMsg)}</pre>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-close-cst">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-cst"><i data-lucide="save"></i> Save Template</button>
      </div>
    `;

    UIComponents.openModal({
      title: 'Credential Sharing Message Settings',
      bodyHtml,
      footerHtml,
      maxWidth: '680px'
    });

    const updateLivePreview = () => {
      const template = document.getElementById('cst-template')?.value || '';
      const domain = document.getElementById('cst-domain')?.value.trim() || window.location.origin;
      const portalUrl = `${domain}/login.html`;
      const schoolName = TMS_CONFIG.schoolName || 'Thaiba Public School';

      let out = template;
      out = out.replace(/{name}/g, sampleProfile.name);
      out = out.replace(/{role}/g, ROLE_LABELS[sampleProfile.role] || sampleProfile.role);
      out = out.replace(/{username}/g, sampleProfile.username);
      out = out.replace(/{password}/g, sampleProfile.password);
      out = out.replace(/{portal_url}/g, portalUrl);
      out = out.replace(/{domain}/g, domain);
      out = out.replace(/{institution_name}/g, schoolName);

      const previewEl = document.getElementById('cst-preview');
      if (previewEl) previewEl.innerText = out;
    };

    document.getElementById('cst-template')?.addEventListener('input', updateLivePreview);
    document.getElementById('cst-domain')?.addEventListener('input', updateLivePreview);

    document.querySelectorAll('.cst-tag').forEach((chip) => {
      chip.addEventListener('click', () => {
        const ta = document.getElementById('cst-template');
        if (!ta) return;
        const tag = chip.dataset.tag;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + tag + ta.value.substring(end);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + tag.length;
        updateLivePreview();
      });
    });

    document.getElementById('btn-close-cst')?.addEventListener('click', () => UIComponents.closeModal());

    document.getElementById('btn-save-cst')?.addEventListener('click', async () => {
      const template = document.getElementById('cst-template')?.value || '';
      const domain = document.getElementById('cst-domain')?.value.trim() || window.location.origin;
      await this.saveCredentialShareConfig({ template, domain });
      UIComponents.closeModal();
    });

    UIComponents.refreshIcons();
  }

}
