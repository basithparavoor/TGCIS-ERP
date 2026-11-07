/**
 * THAIBA PUBLIC SCHOOL — Admissions Entry (Office Boy workspace)
 * Lets data-entry staff open the admission form (which records "done by" them)
 * and review the applications they have entered.
 */

import { authService } from './auth-service.js';
import { admissionService } from './admission-service.js';
import { auditService } from './audit-service.js';
import { UIComponents } from './ui-components.js';

const esc = (v) => UIComponents.escapeHtml(v);

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
}

export class AdmissionsEntryModule {
  static async render(container) {
    const user = authService.getCurrentUser() || {};
    let apps = [];
    try {
      apps = await admissionService.listApplications();
    } catch (e) { /* ignore */ }

    const mine = apps.filter((a) => a.submittedBy && a.submittedBy === user.id);
    const pending = mine.filter((a) => a.status === 'Submitted' || a.status === 'Under Verification').length;
    const fees = mine.reduce((s, a) => s + Number(a.feeTotal || 0), 0);

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'Admission Entry Desk',
          subtitle: `Authorized Data Entry Portal • Welcome, ${esc(user.name || 'Staff')}.`,
          breadcrumbs: [{ label: 'Admission Entry' }],
          badge: 'Online Desk',
          actionsHtml: `
            <button class="btn btn-primary" id="btn-open-admission-form"><i data-lucide="clipboard-pen"></i> Open Admission Form (A4)</button>
          `
        })}

        <div class="kpi-grid" style="margin-bottom: 22px;">
          ${UIComponents.renderKpiCard({ title: 'Applications Entered', value: mine.length, icon: 'file-text', color: 'blue', subtitle: 'Recorded By You' })}
          ${UIComponents.renderKpiCard({ title: 'Awaiting Verification', value: pending, icon: 'clock', color: 'amber', subtitle: 'Pipeline Queue' })}
          ${UIComponents.renderKpiCard({ title: 'Fees Recorded', value: `₹ ${fees.toLocaleString('en-IN')}`, icon: 'indian-rupee', color: 'emerald', subtitle: 'Cash / Online Receipts' })}
        </div>

        <div class="card" style="margin-bottom: 22px; border-left: 4px solid #16a34a;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
            <div>
              <h3 style="font-size:1.1rem; margin-bottom:4px; font-weight:700;">Direct Enrollment Entry</h3>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                Open the official admission portal. The applicant's parent login credentials are generated automatically on submission.
              </p>
            </div>
            <button class="btn btn-primary" id="btn-open-admission-form-banner"><i data-lucide="external-link"></i> Launch Form</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Applications Entered by You</h3>
            <span class="badge badge-info">${mine.length} record(s)</span>
          </div>
          <div class="table-responsive">
            <table class="tms-table" style="font-size:0.85rem;">
              <thead><tr><th>Form No</th><th>Candidate</th><th>Class</th><th>Phone</th><th>Fees</th><th>Status</th><th>Date</th><th style="text-align:right;">Action</th></tr></thead>
              <tbody>
                ${mine.length ? mine.map((a) => `<tr>
                  <td class="font-mono">${esc(a.appId || a.id)}</td>
                  <td style="font-weight:600;">${esc(a.studentName || '—')}</td>
                  <td>${esc(a.grade || '—')}</td>
                  <td class="font-mono">${esc(a.phone || '—')}</td>
                  <td>₹ ${Number(a.feeTotal || 0).toLocaleString('en-IN')}</td>
                  <td><span class="badge badge-info">${esc(a.status || '—')}</span></td>
                  <td>${fmtDate(a.createdAt)}</td><td style="text-align:right;"><button class="btn btn-secondary btn-sm btn-print-entry-form" data-id="${esc(a.id)}" title="Print Official Form with Credentials"><i data-lucide="printer"></i> Print</button></td>
                </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">You have not entered any applications yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const launchForm = async () => {
      await auditService.log('ADMISSION_ENTRY_OPENED', 'ADMISSIONS', { by: user.name });
      const schoolParam = user.school_id || user.schoolId ? `?school=${encodeURIComponent(user.school_id || user.schoolId)}` : '';
      window.open('/admission' + schoolParam, '_blank');
    };

    const btn = document.getElementById('btn-open-admission-form');
    if (btn) btn.addEventListener('click', launchForm);

    const btnBanner = document.getElementById('btn-open-admission-form-banner');
    if (btnBanner) btnBanner.addEventListener('click', launchForm);

    container.querySelectorAll('.btn-print-entry-form').forEach((b) => {
      b.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const { AdminModule } = await import('./admin-module.js');
        AdminModule._apps = await admissionService.listApplications();
        await AdminModule.showApplicationForm(id, true);
      });
    });

    UIComponents.refreshIcons();
  }
}

export default AdmissionsEntryModule;
