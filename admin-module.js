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
import { OnboardingService } from './onboarding-service.js';
import { admissionService, DEFAULT_INSTRUCTIONS, DEFAULT_POPUP_INSTRUCTIONS, getEmbedVideoUrl, renderVideoPlayerHtml } from './admission-service.js';
import { notificationService } from './notification-service.js';
import { brandingService } from './branding-service.js';
import { institutionService } from './institution-service.js';
import { WhatsAppService } from './whatsapp-service.js';
import { downloadCsv, exportPdf, formatPdfFilename, kvTable } from './export-utils.js';
import { AdminWebsiteCms } from './admin-website-cms.js';
import { websiteService } from './website-service.js';
import { WindowPermissionsService, WINDOW_ROLES, ROLE_THEMES, WINDOW_CATEGORIES, DEFAULT_RBAC_MATRIX } from './window-permissions.js';

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
  boys_mentor: 'Boys Hostel Mentor',
  girls_mentor: 'Girls Hostel Mentor',
  mentor: 'Hostel Mentor',
  hostel_leader: 'Hostel Leader',
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
    const [stats, inqs] = await Promise.all([
      admissionService.getStats(),
      websiteService.listInquiries().catch(() => [])
    ]);
    this._inquiries = inqs || [];
    this._newInquiriesCount = (this._inquiries).filter(i => (i.status || 'new') === 'new').length;

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'School Administration & Governance',
          subtitle: 'Admissions hub, public website CMS, hostel setups, notifications, campus governance & disaster recovery.',
          breadcrumbs: [{ label: 'Administration' }],
          badge: isSuperAdmin ? 'Super Admin' : 'Admin Console',
          actionsHtml: `
            <a href="#/users" class="btn btn-secondary"><i data-lucide="shield-check"></i> User &amp; Permissions</a>
            <a href="/admission" target="_blank" class="btn btn-secondary"><i data-lucide="external-link"></i> Public Admission Gateway</a>
            <button class="btn btn-primary" id="btn-new-notification"><i data-lucide="bell-plus"></i> New Notification</button>
          `
        })}

      <div class="kpi-grid" style="margin-bottom: 22px;">
        ${UIComponents.renderKpiCard({ title: 'Total Applications', value: stats.total, icon: 'file-text', color: 'blue' })}
        ${UIComponents.renderKpiCard({ title: 'Awaiting Verification', value: stats.submitted, icon: 'clock', color: 'amber' })}
        ${UIComponents.renderKpiCard({ title: 'Approved', value: stats.approved, icon: 'check-circle', color: 'Gold' })}
        ${UIComponents.renderKpiCard({ title: 'Fee Collected', value: fmtMoney(stats.collected), icon: 'indian-rupee', color: 'rose' })}
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <div style="flex-shrink: 0;">${TMS_LOGO.emblemSvg(64)}</div>
          <div style="flex: 1; min-width: 260px;">
            <h2 style="font-size: 1.3rem; letter-spacing: 0.02em;">${esc(TMS_CONFIG.institution.name)}</h2>
            <div style="color: #BF9A33; font-weight: 700; font-size: 0.85rem; text-transform: uppercase;">
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
      <div class="tms-tab-scroll-wrapper">
        <button type="button" class="tms-tab-nav-btn tms-tab-nav-prev" id="admin-primary-scroll-prev" aria-label="Scroll left" title="Scroll tabs left">
          <i data-lucide="chevron-left"></i>
        </button>
        <div class="tms-segmented-tabs tms-tab-scroll-rail" id="admin-primary-tabs">
          <button class="tms-tab-pill active" data-group="admissions">
            <i data-lucide="clipboard-list"></i>
            <span>Admissions Hub</span>
            <span class="tab-badge" id="admin-apps-badge">${stats.total}</span>
          </button>
          <button class="tms-tab-pill" data-group="notices">
            <i data-lucide="bell"></i>
            <span>Notifications</span>
          </button>
          <button class="tms-tab-pill" data-group="website">
            <i data-lucide="globe"></i>
            <span>Institutional Website</span>
          </button>
          <button class="tms-tab-pill" data-group="hostel" id="admin-group-tab-hostel" style="${websiteService.isHostelEnabled() ? '' : 'display:none;'}">
            <i data-lucide="home"></i>
            <span>Hostel Management</span>
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
        <button type="button" class="tms-tab-nav-btn tms-tab-nav-next" id="admin-primary-scroll-next" aria-label="Scroll right" title="Scroll tabs right">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>

      <!-- Secondary Subtabs Rail with Navigation Controls -->
      <div class="tms-subtab-container-wrap tms-tab-scroll-wrapper">
        <button type="button" class="tms-subtab-nav-btn tms-tab-nav-btn tms-subtab-nav-prev" id="admin-subtab-scroll-prev" aria-label="Scroll left" title="Scroll subtabs left">
          <i data-lucide="chevron-left"></i>
        </button>
        <div class="tms-subtab-rail tms-tab-scroll-rail" id="admin-subtab-rail"></div>
        <button type="button" class="tms-subtab-nav-btn tms-tab-nav-btn tms-subtab-nav-next" id="admin-subtab-scroll-next" aria-label="Scroll right" title="Scroll subtabs right">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>

      <div id="admin-tab-content"></div>
    </div>
  `;

    this.bindEvents(container);
    this.refreshPendingBadges();
    this.switchGroup('admissions', 'applications');
  }

  /* ================================================================== */
  /* Dedicated User & Permissions Module View                           */
  /* ================================================================== */

  static async renderUsers(container, targetTab = 'users') {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    let profiles = [];
    try {
      profiles = await dbService.select('profiles');
    } catch (e) {
      profiles = [];
    }

    const pendingList = profiles.filter((p) => p.role === 'pending' || p.approvalStatus === 'pending');
    const approvedList = profiles.filter((p) => p.role !== 'pending' && p.role !== 'rejected' && p.isActive !== false);
    const suspendedList = profiles.filter((p) => p.role === 'rejected' || p.approvalStatus === 'rejected' || p.isActive === false);

    const pendingCount = pendingList.length;
    const totalCount = profiles.length;
    const activeCount = approvedList.length;
    this._pendingApprovalsCount = pendingCount;

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'User & Permissions Management',
          subtitle: 'Institutional identity governance, pending approval queue, role definitions, and customized window-level access control.',
          breadcrumbs: [{ label: 'User & Permissions' }],
          badge: isSuperAdmin ? 'Super Admin' : 'Security Console',
          actionsHtml: `
            <a href="#/administration" class="btn btn-secondary"><i data-lucide="settings"></i> School Administration</a>
            <button class="btn btn-secondary" id="btn-refresh-users-page"><i data-lucide="refresh-cw"></i> Refresh</button>
          `
        })}

        <div class="kpi-grid" style="margin-bottom: 22px;">
          ${UIComponents.renderKpiCard({ title: 'Total Accounts', value: totalCount, icon: 'users', color: 'blue' })}
          ${UIComponents.renderKpiCard({ title: 'Pending Approvals', value: pendingCount, icon: 'clock', color: pendingCount > 0 ? 'amber' : 'blue' })}
          ${UIComponents.renderKpiCard({ title: 'Active Accounts', value: activeCount, icon: 'check-circle', color: 'Gold' })}
          ${UIComponents.renderKpiCard({ title: 'Configured Roles', value: WINDOW_ROLES.length, icon: 'shield-check', color: 'purple' })}
        </div>

        <!-- Primary Segmented Tabs Rail for Users Module -->
        <div class="tms-tab-scroll-wrapper">
          <button type="button" class="tms-tab-nav-btn tms-tab-nav-prev" aria-label="Scroll left" title="Scroll tabs left">
            <i data-lucide="chevron-left"></i>
          </button>
          <div class="tms-segmented-tabs tms-tab-scroll-rail" id="users-primary-tabs">
            <button class="tms-tab-pill ${targetTab === 'users' ? 'active' : ''}" data-tab="users">
              <i data-lucide="users"></i>
              <span>User Directory</span>
            </button>
            <button class="tms-tab-pill ${targetTab === 'rbac' ? 'active' : ''}" data-tab="rbac">
              <i data-lucide="shield-check"></i>
              <span>Assign Windows (RBAC)</span>
            </button>
            <button class="tms-tab-pill ${targetTab === 'google-approvals' ? 'active' : ''}" data-tab="google-approvals">
              <i data-lucide="user-check"></i>
              <span>Google Approvals</span>
              ${pendingCount > 0 ? `<span class="tab-badge" style="background:#f59e0b; color:#fff;">${pendingCount}</span>` : ''}
            </button>
            <button class="tms-tab-pill ${targetTab === 'staff-onboarding' ? 'active' : ''}" data-tab="staff-onboarding">
              <i data-lucide="user-cog"></i>
              <span>Staff Onboarding</span>
            </button>
            <button class="tms-tab-pill ${targetTab === 'user-sessions' ? 'active' : ''}" data-tab="user-sessions">
              <i data-lucide="history"></i>
              <span>User Sessions</span>
            </button>
            <button class="tms-tab-pill ${targetTab === 'audit' ? 'active' : ''}" data-tab="audit">
              <i data-lucide="shield-alert"></i>
              <span>Security Audit Logs</span>
            </button>
          </div>
          <button type="button" class="tms-tab-nav-btn tms-tab-nav-next" aria-label="Scroll right" title="Scroll tabs right">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>

        <div id="users-view-content" style="margin-top: 18px;"></div>
      </div>
    `;

    const switchUsersTab = async (tabKey) => {
      const contentEl = container.querySelector('#users-view-content');
      if (!contentEl) return;
      container.querySelectorAll('#users-primary-tabs .tms-tab-pill').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tabKey);
      });
      contentEl.innerHTML = '<div style="padding:2rem;text-align:center;"><div class="tms-spinner"></div></div>';
      try {
        if (tabKey === 'users') {
          await this.renderUsersTab(contentEl);
        } else if (tabKey === 'rbac') {
          this.renderRbacMatrixView(contentEl, profiles, isSuperAdmin);
        } else if (tabKey === 'google-approvals') {
          await this.renderGoogleApprovalsTab(contentEl);
        } else if (tabKey === 'staff-onboarding') {
          await this.renderStaffOnboardingTab(contentEl);
        } else if (tabKey === 'user-sessions') {
          await this.renderUserSessionsTab(contentEl);
        } else if (tabKey === 'audit') {
          await this.renderAuditTab(contentEl);
        }
      } catch (err) {
        contentEl.innerHTML = `<div class="card"><p style="color:#dc2626;">Failed to load section: ${esc(err.message)}</p></div>`;
      }
      UIComponents.refreshIcons();
    };

    container.querySelectorAll('#users-primary-tabs .tms-tab-pill').forEach((btn) => {
      btn.addEventListener('click', () => switchUsersTab(btn.dataset.tab));
    });

    const refreshBtn = container.querySelector('#btn-refresh-users-page');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.renderUsers(container, targetTab));
    }

    await switchUsersTab(targetTab);
    UIComponents.refreshIcons();
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
    if (groupKey === 'hostel' && !websiteService.isHostelEnabled()) {
      groupKey = 'website';
      targetSubtab = targetSubtab || 'website-hostel';
    }

    const primaryTabs = document.getElementById('admin-primary-tabs');
    if (primaryTabs) {
      primaryTabs.querySelectorAll('.tms-tab-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.group === groupKey);
      });
    }

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    const SUBTABS = {
      admissions: [
        { key: 'applications', label: 'Applications Roster', icon: 'file-text' },
        { key: 'inquiries', label: 'Website Inquiries', icon: 'message-square', showInquiryBadge: true },
        { key: 'form-builder', label: 'Form Field Builder', icon: 'layout-template' },
        { key: 'fees', label: 'Fee Structure Master', icon: 'receipt' },
        { key: 'payment-settings', label: 'Portal Rules & Video', icon: 'settings' }
      ],
      users: [
        { key: 'users', label: 'User Logins, Roles & Permissions', icon: 'users', showPendingBadge: true },
        { key: 'google-approvals', label: 'Google Approvals Queue', icon: 'user-check' },
        { key: 'staff-onboarding', label: 'Staff Onboarding & Governance', icon: 'user-cog' },
        ...(isSuperAdmin ? [{ key: 'user-sessions', label: 'Login & Logout Sessions', icon: 'history' }] : []),
        { key: 'audit', label: 'Security Audit Trail', icon: 'shield-alert' }
      ],
      website: [
        { key: 'website-inquiries', label: 'Admission Inquiries', icon: 'message-square', showInquiryBadge: true },
        { key: 'website-sections', label: 'Sections & Tabs Visibility (ON/OFF)', icon: 'toggle-right' },
        { key: 'website-general', label: 'Identity & Brand Colors', icon: 'palette' },
        { key: 'website-hero', label: 'Hero & Headlines', icon: 'sparkles' },
        { key: 'website-about', label: 'About & Leadership', icon: 'book-open' },
        { key: 'website-academics', label: 'Academic Programs', icon: 'graduation-cap' },
        { key: 'website-facilities', label: 'Campus Facilities', icon: 'building' },
        { key: 'website-hostel', label: 'Hostel Managing Setup', icon: 'home' },
        { key: 'website-notices', label: 'Notice Board Bulletins', icon: 'megaphone' },
        { key: 'website-gallery', label: 'Photo Gallery', icon: 'image' },
        { key: 'website-testimonials', label: 'Parent Testimonials', icon: 'message-square-quote' },
        { key: 'website-contact', label: 'Contact, Admission & Footer', icon: 'phone-call' },
        { key: 'website-backup', label: 'CMS Backup & Reset', icon: 'database' }
      ],
      hostel: [
        { key: 'website-hostel', label: 'Hostel Managing Setup & Button', icon: 'sliders' },
        { key: 'hostel-wings', label: 'Dormitories & Wings', icon: 'home' },
        { key: 'hostel-features', label: 'Facilities & Amenities', icon: 'sparkles' },
        { key: 'hostel-routine', label: 'Daily Life Routine', icon: 'clock' },
        { key: 'hostel-mess', label: 'Mess & Weekly Menu', icon: 'utensils' },
        { key: 'hostel-wardens', label: 'Wardens & Contact', icon: 'phone-call' },
        { key: 'hostel-roster', label: 'Student Bed Allotments', icon: 'users' }
      ],
      notices: [
        { key: 'notifications', label: 'Broadcast Bulletins', icon: 'bell' }
      ],
      system: [
        { key: 'institution-details', label: 'Institution Profile & Campus Status', icon: 'building-2' },
        { key: 'branding', label: 'Institute Logo & Emblem', icon: 'image' },
        { key: 'backup', label: 'JSON Disaster Recovery', icon: 'database' }
      ],
      superadmin: [
        { key: 'system-doctor', label: '🩺 System Doctor (Find & Fix)', icon: 'wrench' },
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
        ${st.showInquiryBadge && (this._newInquiriesCount || 0) > 0 ? `<span class="badge" style="background:#BF9A33; color:#fff; font-size:0.68rem; padding:1px 6px; border-radius:10px; margin-left:4px;">${this._newInquiriesCount} New</span>` : ''}
      </button>
    `).join('');

    subRail.querySelectorAll('.tms-subtab-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        subRail.querySelectorAll('.tms-subtab-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        this.renderTab(e.currentTarget.dataset.tab);
        setTimeout(updateSubtabScrollState, 200);
      });
    });

    // Setup horizontal scroll controls and wheel scrolling
    const updateSubtabScrollState = () => {
      if (!subRail) return;
      const prevBtn = document.getElementById('admin-subtab-scroll-prev');
      const nextBtn = document.getElementById('admin-subtab-scroll-next');
      const maxScroll = Math.max(0, subRail.scrollWidth - subRail.clientWidth);
      const canScrollLeft = subRail.scrollLeft > 6;
      const canScrollRight = subRail.scrollLeft < maxScroll - 6;

      if (prevBtn) {
        prevBtn.style.display = 'inline-flex';
        prevBtn.style.opacity = canScrollLeft ? '1' : '0.35';
        prevBtn.style.pointerEvents = canScrollLeft ? 'auto' : 'none';
      }
      if (nextBtn) {
        nextBtn.style.display = 'inline-flex';
        nextBtn.style.opacity = canScrollRight ? '1' : '0.35';
        nextBtn.style.pointerEvents = canScrollRight ? 'auto' : 'none';
      }
    };

    if (!subRail._scrollInitialized) {
      subRail._scrollInitialized = true;
      subRail.addEventListener('scroll', updateSubtabScrollState, { passive: true });
      window.addEventListener('resize', updateSubtabScrollState, { passive: true });

      subRail.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0 && subRail.scrollWidth > subRail.clientWidth) {
          e.preventDefault();
          subRail.scrollLeft += e.deltaY;
          updateSubtabScrollState();
        }
      }, { passive: false });

      const prevBtn = document.getElementById('admin-subtab-scroll-prev');
      const nextBtn = document.getElementById('admin-subtab-scroll-next');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          subRail.scrollBy({ left: -260, behavior: 'smooth' });
          setTimeout(updateSubtabScrollState, 300);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          subRail.scrollBy({ left: 260, behavior: 'smooth' });
          setTimeout(updateSubtabScrollState, 300);
        });
      }
    }

    UIComponents.refreshIcons();
    this.renderTab(activeSubKey);

    const activePill = subRail.querySelector(`.tms-subtab-pill[data-tab="${activeSubKey}"]`);
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setTimeout(updateSubtabScrollState, 150);
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

    window.addEventListener('tms_hostel_toggled', (e) => {
      const isEnabled = !!(e.detail && e.detail.enabled);
      const hostelPill = container.querySelector('#admin-group-tab-hostel');
      if (hostelPill) {
        hostelPill.style.display = isEnabled ? 'inline-flex' : 'none';
      }
      if (!isEnabled && this._activeGroup === 'hostel') {
        this.switchGroup('website', 'website-hostel');
      }
    });
  }

  static async renderTab(tabKey) {
    const tabContent = document.getElementById('admin-tab-content');
    if (!tabContent) return;

    try {
      if (tabKey === 'inquiries' || tabKey === 'website-inquiries') await this.renderInquiriesTab(tabContent);
      else if (tabKey.startsWith('website-')) await AdminWebsiteCms.render(tabContent, tabKey);
      else if (tabKey.startsWith('hostel-')) {
        await AdminWebsiteCms.render(tabContent, 'website-hostel');
        const targetMap = {
          'hostel-wings': 'hostel-sec-wings',
          'hostel-features': 'hostel-sec-features',
          'hostel-routine': 'hostel-sec-routine',
          'hostel-mess': 'hostel-sec-mess',
          'hostel-wardens': 'hostel-sec-wardens',
          'hostel-roster': 'hostel-sec-roster'
        };
        const targetId = targetMap[tabKey];
        if (targetId) {
          const pill = tabContent.querySelector(`.hostel-sub-pill[data-target="${targetId}"]`);
          if (pill) pill.click();
        }
      }
      else if (tabKey === 'applications') await this.renderApplicationsTab(tabContent);
      else if (tabKey === 'form-builder') await this.renderFormBuilderTab(tabContent);
      else if (tabKey === 'fees') await this.renderFeesTab(tabContent);
      else if (tabKey === 'payment-settings') await this.renderPaymentSettingsTab(tabContent);
      else if (tabKey === 'notifications') await this.renderNotificationsTab(tabContent);
      else if (tabKey === 'users') await this.renderUsersTab(tabContent);
      else if (tabKey === 'staff-onboarding') await this.renderStaffOnboardingTab(tabContent);
      else if (tabKey === 'google-approvals') await this.renderGoogleApprovalsTab(tabContent);
      else if (tabKey === 'institution-details') await this.renderInstitutionDetailsTab(tabContent);
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
            <button class="btn btn-secondary btn-sm" id="btn-refresh-apps" title="Fetch fresh applications from server"><i data-lucide="refresh-cw"></i> Refresh</button>
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
    safeOn('btn-refresh-apps', 'click', () => this.refreshApplications(tabContent));
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
      const pld = a.payload || {};
      const photoName = pld.photo || pld.candidatePassportPhoto || pld.passportPhoto || pld.studentPassportPhoto || pld.studentProfilePhoto || pld.candidatePhoto;
      let photoSrc = '';
      if (photoName) {
        if (typeof photoName === 'string' && photoName.includes('/storage/v1/object/sign/')) {
          photoSrc = photoName.replace('/storage/v1/object/sign/', '/storage/v1/object/public/').split('?')[0];
        } else if (typeof photoName === 'string' && (photoName.startsWith('http') || photoName.startsWith('data:'))) {
          photoSrc = photoName;
        } else {
          photoSrc = admissionService.getPublicUrl('admission-docs', photoName);
        }
      }
      const photoCell = photoSrc
        ? `<img class="app-photo-thumb" src="${esc(photoSrc)}" data-path="${esc(photoName)}" alt="Applicant photo"
             style="width:30px;height:36px;object-fit:cover;border:1px solid var(--border-color);border-radius:4px;background:#f1f5f9;cursor:pointer;"
             onerror="this.onerror=null; this.src='data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2236%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M19%2021v-2a4%204%200%200%200-4-4H9a4%204%200%200%200-4%204v2%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%2F%3E%3C%2Fsvg%3E';"
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

    // Click applicant photo thumbnail to open preview modal
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
    const confirmName = prompt(`CAUTION: You are about to delete ALL ${pending.length} pending application(s). Type "DELETE" to confirm:`);
    if (confirmName !== 'DELETE') return;
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

    const pld = app.payload || {};
    const detailsRows = textFields.map((f) => {
      let raw = pld[f.fieldKey];
      if (raw == null || raw === '') {
        if (f.fieldKey === 'candidateName') raw = app.studentName || app.student_name || pld.studentName;
        else if (f.fieldKey === 'applyingClass') raw = app.grade || pld.grade;
        else if (f.fieldKey === 'fatherName') raw = app.guardianName || app.guardian_name || pld.guardianName;
        else if (f.fieldKey === 'phone') raw = app.phone;
        else if (f.fieldKey === 'email') raw = app.email;
        else if (f.fieldKey === 'dob') raw = app.dob;
        else if (f.fieldKey === 'gender') raw = app.gender;
        else if (f.fieldKey === 'village' && app.address) raw = app.address;
        else raw = app[f.fieldKey];
      }
      return `
        <tr>
          <th style="width:36%; background:#f8fafc; font-weight:700; color:#475569; font-size:0.75rem; border-bottom:1px solid #f1f5f9; padding:8px 12px; white-space:normal;">${esc(f.label)}</th>
          <td style="font-size:0.82rem; color:#1e293b; border-bottom:1px solid #f1f5f9; padding:8px 12px;">${esc(raw || '—')}</td>
        </tr>
      `;
    }).join('');

    // Append any extra payload attributes not already captured in textFields
    const knownKeys = new Set(fields.map(f => f.fieldKey));
    knownKeys.add('photo');
    knownKeys.add('candidatePhoto');
    knownKeys.add('passportPhoto');
    knownKeys.add('candidateName');
    knownKeys.add('studentName');
    knownKeys.add('applyingClass');
    knownKeys.add('grade');
    knownKeys.add('fatherName');
    knownKeys.add('guardianName');
    const extraRows = Object.entries(pld)
      .filter(([k, v]) => !knownKeys.has(k) && v != null && v !== '' && typeof v !== 'object')
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `
          <tr>
            <th style="width:36%; background:#f8fafc; font-weight:700; color:#475569; font-size:0.75rem; border-bottom:1px solid #f1f5f9; padding:8px 12px; white-space:normal;">${esc(label)}</th>
            <td style="font-size:0.82rem; color:#1e293b; border-bottom:1px solid #f1f5f9; padding:8px 12px;">${esc(v)}</td>
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
        ? `<button type="button" class="btn btn-secondary btn-sm btn-verify-doc" data-key="${esc(f.fieldKey)}" style="padding:2px 8px; font-size:0.72rem; color:#8C6E1E; border-color:#F2D88C; font-weight:600;"><i data-lucide="check"></i> Verify &amp; Stamp</button>`
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
          <td style="text-align:right; font-weight:700; font-size:0.82rem; color:#BF9A33;">${fmtMoney(p.amount)}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px; font-size:0.8rem;">No payment transactions recorded.</td></tr>';

    const exam = app.entranceExam || {};
    const isEnrolled = app.status === 'Enrolled';
    const totalPaidCalc = app.paymentStatus === 'Paid' ? (app.feeTotal || 0) : payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDueCalc = Math.max(0, (app.feeTotal || 0) - totalPaidCalc);

    const bodyHtml = `
      <!-- Top Candidate Profile Banner -->
      <div style="background:linear-gradient(135deg, rgba(191, 154, 51, 0.05), rgba(37, 99, 235, 0.06)); border:1.5px solid var(--border-color); border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
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
            <div style="font-size:1.15rem; font-weight:800; color:#BF9A33;">${fmtMoney(totalPaidCalc)}</div>
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
            <div style="font-weight:800; font-size:0.92rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
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
                  ${extraRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Uploaded Documents Card -->
          <div class="card" style="padding:16px 18px; border:1px solid var(--border-color); border-radius:10px; background:#fff; margin:0;">
            <div style="font-weight:800; font-size:0.92rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
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
            <div style="font-weight:800; font-size:0.92rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
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
                <i data-lucide="plus-circle" style="width:14px; height:14px; color:#BF9A33;"></i> Record Payment Transaction
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
                <button type="button" class="btn btn-secondary btn-sm" id="btn-wa-parent-cred" style="color:#BF9A33;"><i data-lucide="send"></i> WhatsApp</button>
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
            ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-view-enrolled" style="color:#BF9A33; font-weight:700;"><i data-lucide="graduation-cap"></i> Enrolled: ${esc(app.enrolledAdmissionNo || 'Student')}</button>`
            : `<button type="button" class="btn btn-success btn-sm" id="btn-app-enroll" style="background:#BF9A33; color:#fff;"><i data-lucide="graduation-cap"></i> Enroll as Official Student</button>`
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

    // Applicant photo
    if (photoPath) {
      const url = admissionService.getPublicUrl('admission-docs', photoPath);
      const img = document.getElementById('app-photo-img');
      if (img && url) {
        img.src = url;
        img.onerror = () => { img.style.display = 'none'; };
      }
    }

    // Document links open via direct URL
    document.querySelectorAll('.doc-link').forEach((link) =>
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = admissionService.getPublicUrl('admission-docs', link.dataset.path);
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
      <div style="margin-bottom:14px; padding:12px; border-radius:8px; background:rgba(191, 154, 51,0.08); border:1px solid #BF9A33;">
        <div style="font-size:0.95rem; font-weight:700; color:#8C6E1E; margin-bottom:4px;">
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
      <button class="btn btn-primary" id="btn-enr-confirm" style="background:#BF9A33; border-color:#BF9A33;">
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
            <div style="width:54px; height:54px; border-radius:50%; background:rgba(191, 154, 51,0.14); color:#BF9A33; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="graduation-cap" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0 0 6px;">${esc(name)} is Now Officially Enrolled!</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0 0 14px;">The student record has been added to the master directory.</p>
            <div style="background:var(--bg-subtle); border:1.5px dashed #BF9A33; border-radius:10px; padding:12px; display:inline-block;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Permanent Admission Number</span>
              <span class="font-mono" style="font-size:1.35rem; font-weight:800; color:#8C6E1E;">${esc(res.admissionNo)}</span>
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
            <td style="font-weight:800; color:#BF9A33; text-align:center;">#${i + 1}</td>
            <td class="font-mono">${esc(a.appId || a.id)}</td>
            <td style="font-weight:700;">${esc(a.studentName || '—')}</td>
            <td>${esc(a.grade || '—')}</td>
            <td class="font-mono" style="text-align:center;">${exam.writtenScore ?? '—'}</td>
            <td class="font-mono" style="text-align:center;">${exam.interviewScore ?? '—'}</td>
            <td class="font-mono" style="text-align:center; font-weight:800; color:#8C6E1E; font-size:1rem;">${exam.totalScore ?? '—'}</td>
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
      photoUrl = admissionService.getPublicUrl('admission-docs', photoPath) || '';
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
      details += `<div style="font-size:11.5px; font-weight:800; color:#8C6E1E; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:1px solid #F7E8B5; padding-bottom:2px;">${esc(section)}</div>`;
      details += '<table style="width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:8px;"><tbody>';
      sectionFields.forEach((f) => {
        const pld = app.payload || {};
        let raw = pld[f.fieldKey];
        if (raw == null || raw === '') {
          if (f.fieldKey === 'candidateName') raw = app.studentName || app.student_name || pld.studentName;
          else if (f.fieldKey === 'applyingClass') raw = app.grade || pld.grade;
          else if (f.fieldKey === 'fatherName') raw = app.guardianName || app.guardian_name || pld.guardianName;
          else if (f.fieldKey === 'phone') raw = app.phone;
          else if (f.fieldKey === 'email') raw = app.email;
          else if (f.fieldKey === 'dob') raw = app.dob;
          else if (f.fieldKey === 'gender') raw = app.gender;
          else if (f.fieldKey === 'village' && app.address) raw = app.address;
          else raw = app[f.fieldKey];
        }
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
      : 'https://tps.clubad.space/parent';

    const credBlock = cred ? `
      <div style="border:1.5px solid #BF9A33; background:#FDF8E8; border-radius:6px; padding:10px 14px; margin:14px 0; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #F7E8B5; padding-bottom:4px; margin-bottom:6px;">
          <div style="font-size:11px; font-weight:800; color:#8C6E1E; text-transform:uppercase; letter-spacing:0.5px;">
            🔐 Parent &amp; Student Portal Login Credentials (Official)
          </div>
          <span style="font-size:8.5px; font-weight:700; color:#8C6E1E; background:#FCF4D9; padding:2px 8px; border-radius:10px;">Status: Active</span>
        </div>
        <table style="width:100%; font-size:10.5px; border-collapse:collapse; margin-bottom:4px; border:none;">
          <tbody>
            <tr style="border:none;">
              <td style="width:18%; padding:3px 0; color:#374151; border:none;"><strong>Tracking Portal:</strong></td>
              <td style="padding:3px 0; color:#8C6E1E; font-family:monospace; border:none;"><strong>${esc(portalUrl)}</strong></td>
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
          <div style="font-size: 10px; font-weight: 700; color: #BF9A33; text-transform: uppercase; letter-spacing: 0.8px;">${esc(TMS_CONFIG.institution.tagline || 'Run by : Thaiba Heritage, Kolkata')}</div>
          <h1 style="font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 900; color: #0f172a; margin: 1px 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px;">${esc(TMS_CONFIG.institution.name)}</h1>
          <div style="font-size: 9px; color: #334155;">${esc(TMS_CONFIG.institution.address.campus)}, ${esc(TMS_CONFIG.institution.address.district)} - ${esc(TMS_CONFIG.institution.address.pin)} • Regd. No. : ${esc(TMS_CONFIG.institution.regNo)}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Helpline: ${esc(TMS_CONFIG.institution.contact.phone1)}, ${esc(TMS_CONFIG.institution.contact.phone2)} • Web: tps.clubad.space</div>
        </div>
        <div style="width: 105px; text-align: right; flex-shrink: 0;">
          <div style="display: inline-block; padding: 3px 8px; background: #FDF8E8; border: 1.5px solid #BF9A33; color: #8C6E1E; border-radius: 4px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">ADMISSION FORM</div>
          <div style="font-size: 8.5px; color: #475569; margin-top: 3px;">Session: <strong>${esc(TMS_CONFIG.academic?.currentYear || '2027 - 2028')}</strong></div>
        </div>
      </div>

      <!-- Application Summary Row with Photo -->
      <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:12px;">
        <table style="flex:1; font-size:10.5px; border-collapse:collapse;">
          <tbody>
            <tr>
              <th style="width:28%; padding:4px 6px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0;">Form Number</th>
              <td style="padding:4px 6px; border:1px solid #e2e8f0;"><strong class="font-mono" style="font-size:12px; color:#8C6E1E;">${esc(app.appId || app.id)}</strong></td>
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
      <div style="font-size:11.5px; font-weight:800; color:#8C6E1E; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:1px solid #F7E8B5; padding-bottom:2px;">Fees &amp; Payment Ledger</div>
      <table style="width:65%; font-size:10px; border-collapse:collapse; margin-bottom:8px;">
        <tbody>
          ${feeRows || '<tr><td style="padding:3px 6px; border:1px solid #e2e8f0;">Admission Registration Fee</td><td style="text-align:right; padding:3px 6px; border:1px solid #e2e8f0;">₹ 0</td></tr>'}
          <tr style="background:#f8fafc;">
            <td style="border:1px solid #cbd5e1; font-weight:800; padding:4px 6px;">Total Fee Amount</td>
            <td style="border:1px solid #cbd5e1; text-align:right; font-weight:800; padding:4px 6px; color:#8C6E1E;">${fmtMoney(app.feeTotal)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #e2e8f0; padding:3px 6px;">Payment Clearance Status</td>
            <td style="border:1px solid #e2e8f0; text-align:right; font-weight:700; padding:3px 6px;">${esc(app.paymentStatus || 'Pending')}</td>
          </tr>
        </tbody>
      </table>

      ${app.remarks ? `<div style="margin:8px 0; font-size:10px; background:#f8fafc; padding:6px 10px; border-left:3px solid #BF9A33; border-radius:3px;"><strong>Official Remarks:</strong> ${esc(app.remarks)}</div>` : ''}

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
                <td style="width:30%; padding:3px 4px; border:1px solid #cbd5e1;"><strong class="font-mono" style="color:#8C6E1E;">${esc(app.appId || app.id)}</strong></td>
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
              <tr style="background:#FDF8E8;">
                <td style="padding:3px 4px; border:1.5px solid #BF9A33; font-weight:800; color:#8C6E1E;"><strong>Portal Credentials :</strong></td>
                <td colspan="3" style="padding:3px 4px; border:1.5px solid #BF9A33;">
                  User: <strong class="font-mono" style="color:#0f172a; background:#fff; padding:1px 6px; border:1px solid #F2D88C; border-radius:3px;">${esc(cred ? cred.username : '—')}</strong> &nbsp;|&nbsp;
                  Password: <strong class="font-mono" style="color:#0f172a; background:#fff; padding:1px 6px; border:1px solid #F2D88C; border-radius:3px;">${esc(cred ? (cred.password || '******') : '—')}</strong> &nbsp;|&nbsp;
                  Portal: <span class="font-mono" style="color:#8C6E1E; font-size:9px;">tps.clubad.space</span>
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
              <span style="width:34px; height:34px; border-radius:8px; background:#FCF4D9; color:#8C6E1E; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem; font-family:var(--font-mono);">
                ${String(secIdx).padStart(2, '0')}
              </span>
              <div>
                <h4 style="margin:0 0 2px 0; font-size:1.05rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.01em;">
                  ${esc(secName)}
                </h4>
                <div style="display:flex; gap:8px; align-items:center; font-size:0.75rem; color:var(--text-muted);">
                  <span>${secFields.length} question(s)</span>
                  <span>•</span>
                  <span style="color:#8C6E1E; font-weight:600;">${secActiveCount} active</span>
                  ${secFields.length - secActiveCount > 0 ? `<span>•</span><span style="color:#b45309;">${secFields.length - secActiveCount} disabled</span>` : ''}
                </div>
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm btn-rename-section" data-section="${esc(secName)}" title="Rename this section">
                <i data-lucide="edit-3"></i> Rename Section
              </button>
              <button class="btn btn-secondary btn-sm btn-add-photo-to-sec" data-section="${esc(secName)}" style="color:#059669; border-color:#F2D88C; font-weight:700;">
                <i data-lucide="camera"></i> + Add Photo
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
                    <td>
                      ${(f.fieldType === 'photo' || f.fieldType === 'image')
                        ? `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="camera" style="width:11px;height:11px;"></i> Photo</span>`
                        : (f.fieldType === 'file')
                        ? `<span class="badge" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-size:0.72rem; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="file-text" style="width:11px;height:11px;"></i> Document</span>`
                        : `<span class="badge badge-info" style="font-size:0.72rem;">${esc(f.fieldType)}</span>`
                      }
                    </td>
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
              <button class="btn btn-secondary btn-sm" id="btn-restore-defaults" title="Restore standard questions without deleting custom questions"><i data-lucide="rotate-ccw"></i> Restore Standard Questions</button>
              <button class="btn btn-secondary btn-sm" id="btn-add-section"><i data-lucide="folder-plus"></i> Add New Section</button>
              <button class="btn btn-secondary btn-sm" id="btn-add-photo-field" style="color:#059669; border-color:#F2D88C; font-weight:700;"><i data-lucide="camera"></i> + Add Photo Question</button>
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
      await admissionService.seedDefaultFields(true);
      await auditService.log('ADMISSION_FORM_FIELDS_SEEDED', 'GOVERNANCE', {});
      UIComponents.showToast('Default form sections saved.', 'success');
      this.renderTab('form-builder');
    });

    const restoreBtn = document.getElementById('btn-restore-defaults');
    if (restoreBtn) restoreBtn.addEventListener('click', async () => {
      await admissionService.seedDefaultFields(true);
      await auditService.log('ADMISSION_FORM_FIELDS_RESTORED', 'GOVERNANCE', {});
      UIComponents.showToast('Standard admission questions restored successfully.', 'success');
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

    // Add photo question global
    safeOn('btn-add-photo-field', 'click', () => {
      this.openFieldModal({
        fieldType: 'photo',
        label: 'Candidate Passport Photograph',
        fieldKey: 'candidatePassportPhoto',
        placeholder: 'Recent colour passport-size photograph (JPG or PNG up to 2 MB). Required for admit card.',
        helpText: 'Recent colour passport-size photograph (JPG or PNG up to 2 MB). Required for admit card.',
        required: true,
        isActive: true
      }, 'Photo & Documents');
    });

    // Add photo to specific section
    tabContent.querySelectorAll('.btn-add-photo-to-sec').forEach((b) => {
      b.addEventListener('click', () => {
        const secName = b.dataset.section || 'General Information';
        this.openFieldModal({
          fieldType: 'photo',
          label: 'Photograph',
          fieldKey: 'photo_' + Date.now().toString(36),
          placeholder: 'Recent colour photograph (JPG or PNG up to 2 MB)',
          helpText: 'Recent colour photograph (JPG or PNG up to 2 MB)',
          required: false,
          isActive: true
        }, secName);
      });
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
                ${['text', 'photo', 'file', 'textarea', 'number', 'date', 'tel', 'email', 'select', 'checkbox'].map(t => `<option>${t}</option>`).join('')}
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
        <!-- Quick Photo Templates Toolbar -->
        <div style="grid-column:1/-1; background:#FDF8E8; border:1px solid #F7E8B5; border-radius:10px; padding:12px 14px;">
          <div style="font-size:0.78rem; font-weight:700; color:#8C6E1E; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="sparkles" style="width:14px;height:14px;color:#059669;"></i> Quick Photo Templates (Click to auto-fill):
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm btn-photo-preset" data-label="Candidate Passport Photograph" data-key="candidatePassportPhoto" data-help="Recent colour passport-size photograph (JPG or PNG up to 2 MB). Required for admit card." style="background:#fff; font-size:0.75rem; border-color:#F2D88C; color:#8C6E1E; font-weight:700;">
              📸 Candidate Passport Photo
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-photo-preset" data-label="Student Profile Photo" data-key="studentProfilePhoto" data-help="Front-facing portrait profile picture (JPG or PNG up to 2 MB)." style="background:#fff; font-size:0.75rem; border-color:#F2D88C; color:#8C6E1E; font-weight:700;">
              👤 Student Profile Photo
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-photo-preset" data-label="Father's Photograph" data-key="fatherPhoto" data-help="Recent passport-size photo of father / male guardian." style="background:#fff; font-size:0.75rem; border-color:#F2D88C; color:#8C6E1E; font-weight:600;">
              👨 Father's Photo
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-photo-preset" data-label="Mother's Photograph" data-key="motherPhoto" data-help="Recent passport-size photo of mother / female guardian." style="background:#fff; font-size:0.75rem; border-color:#F2D88C; color:#8C6E1E; font-weight:600;">
              👩 Mother's Photo
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-photo-preset" data-label="Guardian's Photograph" data-key="guardianPhoto" data-help="Recent passport-size photo of legal guardian." style="background:#fff; font-size:0.75rem; border-color:#F2D88C; color:#8C6E1E; font-weight:600;">
              👥 Guardian's Photo
            </button>
          </div>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label" style="font-weight:700;">Question / Field Label *</label>
          <input class="form-input" id="fld-label" value="${esc(f.label || '')}" placeholder="e.g. Candidate Passport Photograph">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Field Key (unique, no spaces) *</label>
          <input class="form-input font-mono" id="fld-key" value="${esc(f.fieldKey || '')}" placeholder="e.g. candidatePassportPhoto">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Response Type *</label>
          <select class="form-select" id="fld-type" style="font-weight:600;">
            <option value="photo" ${(f.fieldType === 'photo' || f.fieldType === 'image') ? 'selected' : ''}>📸 Photo / Passport / Profile Image</option>
            <option value="file" ${f.fieldType === 'file' ? 'selected' : ''}>📁 Document / PDF Attachment</option>
            <option value="text" ${(!f.fieldType || f.fieldType === 'text') ? 'selected' : ''}>📝 Single-line Text</option>
            <option value="textarea" ${f.fieldType === 'textarea' ? 'selected' : ''}>📄 Multi-line Paragraph</option>
            <option value="select" ${f.fieldType === 'select' ? 'selected' : ''}>🔽 Dropdown Selection</option>
            <option value="date" ${f.fieldType === 'date' ? 'selected' : ''}>📅 Date Picker</option>
            <option value="tel" ${f.fieldType === 'tel' ? 'selected' : ''}>📞 Phone Number</option>
            <option value="email" ${f.fieldType === 'email' ? 'selected' : ''}>✉️ Email Address</option>
            <option value="number" ${f.fieldType === 'number' ? 'selected' : ''}>🔢 Numeric Value</option>
            <option value="checkbox" ${f.fieldType === 'checkbox' ? 'selected' : ''}>☑️ Checkbox Confirmation</option>
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

    const modalTitle = (field && field.id) ? 'Edit Question' : ((f.fieldType === 'photo' || f.fieldType === 'image') ? 'Add Photo Question' : 'Add Question');
    UIComponents.openModal({ title: modalTitle, bodyHtml, footerHtml });

    // Quick Photo Preset template buttons
    document.querySelectorAll('.btn-photo-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const labelInp = document.getElementById('fld-label');
        const keyInp = document.getElementById('fld-key');
        const typeSel = document.getElementById('fld-type');
        const helpInp = document.getElementById('fld-placeholder');
        const secInp = document.getElementById('fld-section');
        if (labelInp) labelInp.value = btn.dataset.label || '';
        if (keyInp) {
          keyInp.value = btn.dataset.key || '';
          keyInp.dataset.userEdited = 'true';
        }
        if (typeSel) typeSel.value = 'photo';
        if (helpInp && btn.dataset.help) helpInp.value = btn.dataset.help;
        if (secInp && (!secInp.value || secInp.value === 'General Information')) {
          secInp.value = 'Photo & Documents';
        }
        UIComponents.showToast(`Applied template: ${btn.dataset.label}`, 'info');
      });
    });

    // Auto-generate unique field key from question label for new questions
    const labelInp = document.getElementById('fld-label');
    const keyInp = document.getElementById('fld-key');
    if (labelInp && keyInp && (!field || !field.id)) {
      labelInp.addEventListener('input', () => {
        if (!keyInp.dataset.userEdited) {
          const words = labelInp.value.trim().replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            keyInp.value = words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          } else {
            keyInp.value = '';
          }
        }
      });
      keyInp.addEventListener('input', () => {
        keyInp.dataset.userEdited = 'true';
      });
    }

    // Response type change helper
    const typeSel = document.getElementById('fld-type');
    if (typeSel) {
      typeSel.addEventListener('change', () => {
        const helpInp = document.getElementById('fld-placeholder');
        if ((typeSel.value === 'photo' || typeSel.value === 'image') && helpInp && !helpInp.value) {
          helpInp.value = 'Recent passport-size colour photograph (JPG or PNG up to 2 MB)';
        }
      });
    }

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
          helpText: document.getElementById('fld-placeholder').value.trim(),
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
          <span style="font-weight:700; color:#BF9A33; font-size:0.85rem; min-width:22px;">${idx + 1}.</span>
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
        <div class="card" style="border-left: 4px solid #BF9A33;">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="heading" style="color:#BF9A33;"></i> Form Headings &amp; Title Customization</h3>
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
            <h4 style="font-size:0.92rem; color:#8C6E1E; margin-bottom:10px;">Admit Card Slip Titles</h4>
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
          .switch input:checked + .slider { background-color: #BF9A33 !important; }
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
  /* Admission Inquiries                                                */
  /* ================================================================== */

  static async renderInquiriesTab(tabContent) {
    let inquiries = await websiteService.listInquiries();
    this._inquiries = inquiries || [];
    this._inqSearch = '';
    this._inqStatusFilter = '';
    this._inqGradeFilter = '';

    const newCount = this._inquiries.filter(i => (i.status || 'new') === 'new').length;
    const contactedCount = this._inquiries.filter(i => i.status === 'contacted').length;
    const admittedCount = this._inquiries.filter(i => i.status === 'admitted').length;
    const closedCount = this._inquiries.filter(i => i.status === 'closed').length;
    this._newInquiriesCount = newCount;

    tabContent.innerHTML = `
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="message-square" style="color:var(--brand-theme-primary, #BF9A33);"></i>
              <span>Website Admission Inquiries</span>
              ${newCount > 0 ? `<span class="badge" style="background:#BF9A33; color:#fff; font-size:0.75rem; padding:3px 9px; border-radius:999px;">${newCount} New</span>` : ''}
            </h3>
            <p class="card-desc">Review, follow up, and track prospective parents and students who submitted inquiries through the institutional website contact form.</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-refresh-inquiries" title="Reload from server">
              <i data-lucide="refresh-cw"></i> Refresh
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-export-inquiries-csv">
              <i data-lucide="file-spreadsheet"></i> Export CSV
            </button>
            <button class="btn btn-primary btn-sm" id="btn-manual-inquiry">
              <i data-lucide="plus"></i> Log Manual Inquiry
            </button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:18px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px;">
            <div style="font-size:0.74rem; color:#64748b; font-weight:700; text-transform:uppercase;">Total Inquiries</div>
            <div style="font-size:1.55rem; font-weight:800; color:#0f172a; margin-top:2px;">${this._inquiries.length}</div>
          </div>
          <div style="background:#FDF8E8; border:1px solid #F7E8B5; border-radius:10px; padding:12px 14px;">
            <div style="font-size:0.74rem; color:#8C6E1E; font-weight:700; text-transform:uppercase;">New / Needs Call</div>
            <div style="font-size:1.55rem; font-weight:800; color:#BF9A33; margin-top:2px;">${newCount}</div>
          </div>
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:12px 14px;">
            <div style="font-size:0.74rem; color:#0369a1; font-weight:700; text-transform:uppercase;">Contacted / In Progress</div>
            <div style="font-size:1.55rem; font-weight:800; color:#0284c7; margin-top:2px;">${contactedCount}</div>
          </div>
          <div style="background:#fefce8; border:1px solid #fef08a; border-radius:10px; padding:12px 14px;">
            <div style="font-size:0.74rem; color:#854d0e; font-weight:700; text-transform:uppercase;">Converted / Admitted</div>
            <div style="font-size:1.55rem; font-weight:800; color:#ca8a04; margin-top:2px;">${admittedCount}</div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; align-items:center;">
          <input class="form-input" id="inq-search" placeholder="Search guardian, phone, class, questions…" style="max-width: 280px;">
          <select class="form-select" id="inq-status-filter" style="max-width: 190px;">
            <option value="">All Statuses</option>
            <option value="new">✨ New (Awaiting Call)</option>
            <option value="contacted">📞 Contacted</option>
            <option value="admitted">🎓 Converted / Admitted</option>
            <option value="closed">📁 Closed / Archived</option>
          </select>
          <select class="form-select" id="inq-grade-filter" style="max-width: 210px;">
            <option value="">All Grades / Wings</option>
            <option value="Nursery">Nursery / LKG / UKG</option>
            <option value="Primary">Primary School (Grades 1–5)</option>
            <option value="Middle">Middle School (Grades 6–8)</option>
            <option value="Secondary">Secondary (Grades 9–10)</option>
            <option value="Higher Secondary">Senior Secondary (11–12)</option>
            <option value="Hostel">Hostel &amp; Residential Wing</option>
            <option value="Moral Wing">Islamic &amp; Moral Studies</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btn-clear-inq-filters">Reset Filters</button>
        </div>

        <!-- Inquiries Table -->
        <div class="table-responsive">
          <table class="tms-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Received Date</th>
                <th>Guardian / Parent</th>
                <th>Target Class</th>
                <th>Contact &amp; WhatsApp</th>
                <th>Message / Questions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inq-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderInquiryRows(tabContent);

    safeOn('inq-search', 'input', (e) => {
      this._inqSearch = e.target.value.toLowerCase().trim();
      this.renderInquiryRows(tabContent);
    });

    safeOn('inq-status-filter', 'change', (e) => {
      this._inqStatusFilter = e.target.value;
      this.renderInquiryRows(tabContent);
    });

    safeOn('inq-grade-filter', 'change', (e) => {
      this._inqGradeFilter = e.target.value;
      this.renderInquiryRows(tabContent);
    });

    safeOn('btn-clear-inq-filters', 'click', () => {
      const s = document.getElementById('inq-search');
      const sf = document.getElementById('inq-status-filter');
      const gf = document.getElementById('inq-grade-filter');
      if (s) s.value = '';
      if (sf) sf.value = '';
      if (gf) gf.value = '';
      this._inqSearch = '';
      this._inqStatusFilter = '';
      this._inqGradeFilter = '';
      this.renderInquiryRows(tabContent);
    });

    safeOn('btn-refresh-inquiries', 'click', async () => {
      UIComponents.showToast('Refreshing inquiries from campus database...', 'info');
      await this.renderInquiriesTab(tabContent);
    });

    safeOn('btn-export-inquiries-csv', 'click', () => {
      this.exportInquiriesCsv();
    });

    safeOn('btn-manual-inquiry', 'click', () => {
      this.openManualInquiryModal(tabContent);
    });

    UIComponents.refreshIcons();
  }

  static renderInquiryRows(tabContent) {
    const body = document.getElementById('inq-table-body');
    if (!body) return;

    let rows = this._inquiries || [];
    if (this._inqSearch) {
      const q = this._inqSearch;
      rows = rows.filter(i => {
        const str = `${i.guardianName || ''} ${i.phone || ''} ${i.email || ''} ${i.grade || ''} ${i.message || ''} ${i.notes || ''}`.toLowerCase();
        return str.includes(q);
      });
    }

    if (this._inqStatusFilter) {
      rows = rows.filter(i => (i.status || 'new') === this._inqStatusFilter);
    }

    if (this._inqGradeFilter) {
      rows = rows.filter(i => (i.grade || '').toLowerCase().includes(this._inqGradeFilter.toLowerCase()));
    }

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 36px 20px;">
            <div style="margin-bottom:8px;"><i data-lucide="inbox" style="width:36px; height:36px; color:#cbd5e1;"></i></div>
            <p style="font-weight:600; margin:0 0 6px 0; color:#475569;">No admission inquiries match the selected criteria.</p>
            <span style="font-size:0.8rem; color:#94a3b8;">Prospective inquiries submitted on the website homepage will appear here automatically.</span>
          </td>
        </tr>
      `;
      UIComponents.refreshIcons();
      return;
    }

    body.innerHTML = rows.map(inq => {
      const dateStr = inq.createdAt ? new Date(inq.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }) : '—';

      const cleanPhone = (inq.phone || '').replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
      const waText = encodeURIComponent(`Assalamu Alaikum / Greetings from Thaiba Public School Admissions Desk. We received your admission inquiry for ${inq.grade || 'our academic program'}. How may we assist you with admissions for 2026-27?`);
      const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${waText}`;

      let statusBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:700; border:1px solid #fde68a;">✨ New</span>';
      if (inq.status === 'contacted') {
        statusBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; border:1px solid #bae6fd;">📞 Contacted</span>';
      } else if (inq.status === 'admitted') {
        statusBadge = '<span class="badge" style="background:#FCF4D9; color:#8C6E1E; font-weight:700; border:1px solid #F7E8B5;">🎓 Admitted</span>';
      } else if (inq.status === 'closed') {
        statusBadge = '<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700; border:1px solid #e2e8f0;">Closed</span>';
      }

      const msgPreview = inq.message ? esc(inq.message.length > 55 ? inq.message.slice(0, 55) + '…' : inq.message) : '<span style="color:#94a3b8; font-style:italic;">No question attached</span>';

      return `
        <tr>
          <td style="white-space:nowrap; color:#64748b; font-size:0.8rem;">
            <div>${dateStr}</div>
            <div style="font-size:0.7rem; color:#94a3b8;">${esc(inq.source || 'Website')}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">${esc(inq.guardianName)}</div>
            ${inq.email ? `<div style="font-size:0.75rem; color:#64748b;"><a href="mailto:${esc(inq.email)}" style="color:inherit; text-decoration:none;">${esc(inq.email)}</a></div>` : ''}
          </td>
          <td>
            <span class="badge" style="background:#f1f5f9; color:#0f172a; font-weight:700; border:1px solid #cbd5e1; white-space:nowrap;">
              ${esc(inq.grade)}
            </span>
          </td>
          <td style="white-space:nowrap;">
            <div style="display:flex; align-items:center; gap:6px;">
              <a href="tel:${esc(inq.phone)}" class="font-mono" style="font-weight:700; color:#0f172a; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="phone" style="width:13px; height:13px; color:#BF9A33;"></i>
                <span>${esc(inq.phone)}</span>
              </a>
              ${cleanPhone ? `
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" title="Chat on WhatsApp"
                   style="background:#D4AF37; color:#fff; padding:3px 7px; font-size:0.7rem; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
                  <i data-lucide="message-circle" style="width:12px; height:12px;"></i>
                  <span>WA</span>
                </a>
              ` : ''}
            </div>
          </td>
          <td>
            <div style="max-width:240px; color:#334155; line-height:1.4;">${msgPreview}</div>
            ${inq.notes ? `<div style="font-size:0.72rem; color:#BF9A33; margin-top:2px; font-weight:600;"><i data-lucide="bookmark" style="width:10px; height:10px;"></i> ${esc(inq.notes.slice(0, 35))}</div>` : ''}
          </td>
          <td>
            ${statusBadge}
          </td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-secondary btn-sm btn-view-inquiry" data-id="${esc(inq.id)}" title="View full details and update follow-up notes" style="padding:4px 8px;">
                <i data-lucide="eye" style="width:13px; height:13px;"></i> Details
              </button>
              <button class="btn btn-secondary btn-sm btn-del-inquiry" data-id="${esc(inq.id)}" title="Delete inquiry" style="color:#ef4444; padding:4px 7px;">
                <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('.btn-view-inquiry').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const inq = (this._inquiries || []).find(i => i.id === id);
        if (inq) this.openInquiryDetailsModal(inq, tabContent);
      });
    });

    body.querySelectorAll('.btn-del-inquiry').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirmed = await UIComponents.confirm({
          title: 'Delete Admission Inquiry?',
          message: 'Are you sure you want to delete this website inquiry? This action cannot be undone.',
          confirmText: 'Delete Inquiry',
          cancelText: 'Keep'
        });
        if (confirmed) {
          await websiteService.deleteInquiry(id);
          this._inquiries = (this._inquiries || []).filter(i => i.id !== id);
          UIComponents.showToast('Inquiry deleted successfully.', 'success');
          this.renderInquiryRows(tabContent);
        }
      });
    });

    UIComponents.refreshIcons();
  }

  static openInquiryDetailsModal(inq, tabContent) {
    const cleanPhone = (inq.phone || '').replace(/[^0-9]/g, '');
    const waNumber = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const waText = encodeURIComponent(`Assalamu Alaikum / Greetings from Thaiba Public School Admissions Desk regarding your admission inquiry for ${inq.grade || 'our academic program'}.`);
    const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${waText}`;

    const dateStr = inq.createdAt ? new Date(inq.createdAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }) : '—';

    const modalContent = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Top Info Header -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Inquiry ID: <span class="font-mono">${esc(inq.id)}</span></div>
              <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; color:#0f172a; margin:4px 0;">${esc(inq.guardianName)}</h3>
              <div style="font-size:0.82rem; color:#475569;">Received on <strong>${dateStr}</strong> via ${esc(inq.source || 'Website Contact Form')}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <a href="tel:${esc(inq.phone)}" class="btn btn-secondary btn-sm" style="font-weight:700;">
                <i data-lucide="phone" style="width:14px; height:14px; color:#BF9A33;"></i> Call
              </a>
              <a href="${waUrl}" target="_blank" class="btn btn-sm" style="background:#D4AF37; color:#fff; font-weight:700;">
                <i data-lucide="message-circle" style="width:14px; height:14px;"></i> WhatsApp
              </a>
            </div>
          </div>
        </div>

        <!-- Contact & Target Grid -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem; font-weight:700;">Contact Phone</label>
            <input class="form-input font-mono" id="modal-inq-phone" value="${esc(inq.phone)}" readonly style="background:#f8fafc; font-weight:700;">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem; font-weight:700;">Email Address</label>
            <input class="form-input" id="modal-inq-email" value="${esc(inq.email || 'None provided')}" readonly style="background:#f8fafc;">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:0.78rem; font-weight:700;">Target Grade / Campus Wing</label>
          <input class="form-input" value="${esc(inq.grade || '—')}" readonly style="background:#f8fafc; font-weight:700; color:#BF9A33;">
        </div>

        <!-- Message from Parent -->
        <div class="form-group">
          <label class="form-label" style="font-size:0.78rem; font-weight:700;">Parent Inquiry / Questions</label>
          <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:8px; padding:12px; font-size:0.9rem; line-height:1.6; color:#1e293b; min-height:64px; white-space:pre-wrap;">${esc(inq.message || 'No additional message was submitted.')}</div>
        </div>

        <!-- Follow-up Status & Admin Notes -->
        <div style="background:#FDF8E8; border:1px solid #F7E8B5; border-radius:10px; padding:14px;">
          <div style="font-size:0.85rem; font-weight:800; color:#8C6E1E; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i data-lucide="clipboard-edit" style="width:16px; height:16px;"></i>
            <span>Admission Desk Follow-up</span>
          </div>

          <div style="display:grid; grid-template-columns: 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label" style="font-size:0.8rem; font-weight:700;">Inquiry Status</label>
              <select class="form-select" id="modal-inq-status" style="font-weight:700;">
                <option value="new" ${inq.status === 'new' ? 'selected' : ''}>✨ New (Awaiting Call)</option>
                <option value="contacted" ${inq.status === 'contacted' ? 'selected' : ''}>📞 Contacted (Follow-up In Progress)</option>
                <option value="admitted" ${inq.status === 'admitted' ? 'selected' : ''}>🎓 Converted to Admission / Enrolled</option>
                <option value="closed" ${inq.status === 'closed' ? 'selected' : ''}>📁 Closed / Not Interested</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:0.8rem; font-weight:700;">Office Follow-up Notes &amp; Remarks</label>
              <textarea class="form-textarea" id="modal-inq-notes" rows="3" placeholder="e.g. Called guardian on 6th Nov. Interested in Class 5 Hostel admission. Scheduled campus visit for Saturday...">${esc(inq.notes || '')}</textarea>
            </div>
          </div>
        </div>

        <!-- Conversion Button to Formal Admission Entry -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid #e2e8f0; flex-wrap:wrap; gap:8px;">
          <a href="/admission" target="_blank" class="btn btn-secondary btn-sm" style="color:var(--brand-theme-primary); font-weight:700;">
            <i data-lucide="external-link" style="width:14px; height:14px;"></i> Open Public Admission Gateway
          </a>
          <button type="button" class="btn btn-primary" id="btn-save-inquiry-modal" style="font-weight:700;">
            <i data-lucide="save" style="width:15px; height:15px;"></i> Save Follow-up Changes
          </button>
        </div>
      </div>
    `;

    UIComponents.showModal({
      title: `Admission Inquiry — ${esc(inq.guardianName)}`,
      content: modalContent,
      confirmText: 'Done',
      showCancel: false
    });

    safeOn('btn-save-inquiry-modal', 'click', async () => {
      const nextStatus = document.getElementById('modal-inq-status').value;
      const nextNotes = document.getElementById('modal-inq-notes').value.trim();

      await websiteService.updateInquiry(inq.id, {
        status: nextStatus,
        notes: nextNotes
      });

      inq.status = nextStatus;
      inq.notes = nextNotes;
      UIComponents.showToast('Inquiry follow-up notes & status saved!', 'success');
      this.renderInquiryRows(tabContent);
    });

    UIComponents.refreshIcons();
  }

  static openManualInquiryModal(tabContent) {
    const modalContent = `
      <form id="form-manual-inquiry" style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" style="font-weight:700; font-size:0.82rem;">Guardian / Parent Name *</label>
            <input class="form-input" id="man-inq-name" placeholder="e.g. Dr. Rafiqul Islam" required>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:700; font-size:0.82rem;">Contact Phone *</label>
            <input class="form-input" id="man-inq-phone" placeholder="+91 XXXXX XXXXX" required>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label" style="font-weight:700; font-size:0.82rem;">Target Class / Wing *</label>
            <select class="form-select" id="man-inq-grade" required>
              <option value="Pre-Primary (Nursery/KG)">Pre-Primary (Nursery / KG)</option>
              <option value="Primary School (Grades 1–5)">Primary School (Grades 1–5)</option>
              <option value="Middle School (Grades 6–8)">Middle School (Grades 6–8)</option>
              <option value="Secondary (Grades 9–10)">Secondary (Grades 9–10)</option>
              <option value="Senior Secondary (Grades 11–12)">Senior Secondary (Grades 11–12)</option>
              <option value="Hostel & Residential Wing">Hostel &amp; Residential Wing</option>
              <option value="Islamic & Moral Studies Wing">Islamic &amp; Moral Studies Wing</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:700; font-size:0.82rem;">Email Address (Optional)</label>
            <input class="form-input" id="man-inq-email" placeholder="guardian@example.com">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700; font-size:0.82rem;">Inquiry Source</label>
          <select class="form-select" id="man-inq-source">
            <option value="Campus Office Walk-in">Campus Office Walk-in</option>
            <option value="Telephone Call">Telephone Call</option>
            <option value="WhatsApp Direct">WhatsApp Direct</option>
            <option value="Institutional Website">Institutional Website</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700; font-size:0.82rem;">Parent Questions / Requirements</label>
          <textarea class="form-textarea" id="man-inq-msg" rows="3" placeholder="Requirements regarding transport, hostel boarding, fee concessions..."></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="submit" class="btn btn-primary" style="font-weight:700;">
            <i data-lucide="plus"></i> Record Inquiry
          </button>
        </div>
      </form>
    `;

    UIComponents.showModal({
      title: 'Log New Admission Inquiry',
      content: modalContent,
      showConfirm: false,
      cancelText: 'Cancel'
    });

    safeOn('form-manual-inquiry', 'submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('man-inq-name').value.trim();
      const phone = document.getElementById('man-inq-phone').value.trim();
      const grade = document.getElementById('man-inq-grade').value;
      const email = document.getElementById('man-inq-email').value.trim();
      const source = document.getElementById('man-inq-source').value;
      const message = document.getElementById('man-inq-msg').value.trim();

      const newInquiry = {
        guardianName: name,
        phone,
        grade,
        email,
        source,
        message,
        status: 'new'
      };

      const saved = await websiteService.saveInquiry(newInquiry);
      if (!this._inquiries) this._inquiries = [];
      this._inquiries.unshift(saved);

      UIComponents.closeModal();
      UIComponents.showToast('Admission inquiry recorded successfully!', 'success');
      this.renderInquiryRows(tabContent);
    });

    UIComponents.refreshIcons();
  }

  static exportInquiriesCsv() {
    const list = this._inquiries || [];
    if (!list.length) {
      UIComponents.showToast('No admission inquiries to export.', 'warning');
      return;
    }
    const headers = ['Inquiry ID', 'Received Date', 'Guardian Name', 'Phone', 'Email', 'Target Grade', 'Message', 'Source', 'Status', 'Admin Notes'];
    const data = list.map(i => [
      i.id || '',
      i.createdAt ? new Date(i.createdAt).toISOString() : '',
      i.guardianName || '',
      i.phone || '',
      i.email || '',
      i.grade || '',
      (i.message || '').replace(/\r?\n/g, ' '),
      i.source || '',
      i.status || '',
      (i.notes || '').replace(/\r?\n/g, ' ')
    ]);
    downloadCsv(`TMS-Admission-Inquiries-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...data]);
    UIComponents.showToast('Exported admission inquiries to CSV.', 'success');
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
      profiles = await dbService.select('profiles', null, true);
    } catch (e) {
      profiles = [];
    }

    // Resilient fallback: Also check audit_logs for any newly registered Google users awaiting approval
    try {
      const auditLogs = await dbService.select('audit_logs', null, true);
      const pendingAuditLogs = (auditLogs || []).filter(
        (log) => (log.action === 'GOOGLE_SIGNUP_PENDING_APPROVAL' || log.action === 'GOOGLE_SIGNUP_PENDING') && log.details
      );
      const existingProfileIds = new Set(profiles.map((p) => p.id));
      const existingProfileEmails = new Set(profiles.map((p) => (p.email || '').toLowerCase().trim()));

      for (const log of pendingAuditLogs) {
        try {
          const detail = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          const email = (detail.email || log.entity_ref || log.entityRef || '').toLowerCase().trim();
          const userId = detail.id || log.user_id || log.userId;
          if (email && !existingProfileEmails.has(email) && !existingProfileIds.has(userId)) {
            profiles.push({
              id: userId,
              email: email,
              name: detail.name || log.user_name || log.userName || email.split('@')[0],
              avatar: detail.avatar || null,
              role: 'pending',
              scope: detail.scope || 'own_records',
              title: detail.title || 'Pending Google Verification',
              department: detail.department || 'Unassigned',
              isActive: true,
              isPending: true
            });
            existingProfileIds.add(userId);
            existingProfileEmails.add(email);
          }
        } catch (pe) {}
      }
    } catch (auditErr) {
      console.warn('Could not cross-reference audit logs for pending approvals:', auditErr);
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
              ${pendingList.length > 0 ? '<span class="badge badge-warning" style="font-size:0.72rem;">Requires Action</span>' : '<span style="font-size:0.72rem; color:#BF9A33;">All Approved</span>'}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Waiting on approval screen</div>
          </div>
          <div class="card" style="padding:16px; border-left:4px solid #BF9A33; background:linear-gradient(to right, rgba(191, 154, 51,0.06), var(--bg-surface));">
            <div style="font-size:0.75rem; font-weight:700; color:#8C6E1E; text-transform:uppercase; letter-spacing:0.04em;">Active &amp; Approved</div>
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
                  <th style="min-width:150px;">School / Campus</th>
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
                        ${!canModify ? `<span class="badge badge-info">Central HQ (All)</span>` : `
                          <select class="form-select form-select-sm approval-school-select">
                            <option value="all" ${(p.school_id === 'all') ? 'selected' : ''}>Central HQ (All Schools)</option>
                            ${institutionService.getSchools().map((s) => `
                              <option value="${esc(s.id)}" ${(p.school_id || 'tps') === s.id ? 'selected' : ''}>
                                ${esc(s.shortName || s.name)}
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
                            <button class="btn btn-secondary btn-sm btn-action-approve" style="padding:5px 12px; color:#BF9A33; font-weight:700;" title="Re-approve and activate">
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
      refreshBtn.addEventListener('click', async () => {
        UIComponents.showToast('Refreshing accounts list from cloud...', 'info');
        await this.renderGoogleApprovalsTab(tabContent);
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
        const selectedSchool = row.querySelector('.approval-school-select')?.value || 'tps';
        const title = row.querySelector('.approval-title-input')?.value.trim() || ROLE_LABELS[selectedRole] || 'Staff Member';
        const dept = row.querySelector('.approval-dept-input')?.value.trim() || 'General';

        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Saving...`;
        UIComponents.refreshIcons();

        try {
          const updates = {
            id: userId,
            email: userEmail,
            role: selectedRole,
            scope: selectedScope,
            school_id: selectedSchool,
            schoolId: selectedSchool,
            title: title,
            department: dept,
            isActive: true,
            is_active: true
          };

          await dbService.upsert('profiles', updates);
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

  /* ========================================================================== */
  /* User Accounts & Window-Level Permissions (RBAC) System                     */
  /* Reference: https://tpsh.vercel.app/#users                                 */
  /* ========================================================================== */

  
  /**
   * High-res institutional avatar renderer with fallback to two-letter gradient badge
   */
  static _renderUserAvatar(p, size = 34) {
    const esc = (v) => UIComponents.escapeHtml(v || '');
    const currentUser = authService.getCurrentUser();
    const isCurrent = p.email && currentUser?.email && p.email.toLowerCase() === currentUser.email.toLowerCase();
    const avatarUrl = p.avatar || p.avatar_url || (isCurrent ? (currentUser?.avatar || currentUser?.avatar_url) : '') || '';
    const nameStr = p.name || p.email || 'User';
    const initials = nameStr.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U';

    if (avatarUrl) {
      return `
        <div style="width:${size}px; height:${size}px; border-radius:50%; position:relative; flex-shrink:0;">
          <img src="${esc(avatarUrl)}" alt="${esc(nameStr)}" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:1.5px solid var(--border-color, #E2E8F0); background:#F1F5F9; display:block;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
          <div style="display:none; width:${size}px; height:${size}px; border-radius:50%; background: linear-gradient(135deg, #10B981 0%, #047857 100%); color:#FFFFFF; align-items:center; justify-content:center; font-weight:800; font-size:${Math.round(size * 0.42)}px; letter-spacing:0.02em; border:1.5px solid #A7F3D0; box-shadow:0 2px 6px rgba(16, 185, 129, 0.2);">
            ${esc(initials)}
          </div>
        </div>
      `;
    }

    return `
      <div style="width:${size}px; height:${size}px; border-radius:50%; background: linear-gradient(135deg, #10B981 0%, #047857 100%); color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:${Math.round(size * 0.42)}px; letter-spacing:0.02em; border:1.5px solid #A7F3D0; box-shadow:0 2px 6px rgba(16, 185, 129, 0.2); flex-shrink:0;">
        ${esc(initials)}
      </div>
    `;
  }

  static async renderUsersTab(tabContent) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    let profiles = [];
    try {
      profiles = await dbService.select('profiles');
    } catch (e) {
      profiles = [];
    }

    // Enrich profiles with active session data (avatar, department)
    for (const p of profiles) {
      if (p.email && currentUser?.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) {
        p.avatar = p.avatar || currentUser?.avatar || currentUser?.avatar_url;
        p.department = p.department || currentUser?.department;
        p.title = p.title || currentUser?.title;
      }
    }

    // Admin-visible login identifiers issued to staff and parents
    let creds = [];
    try { creds = await dbService.select('staff_credentials'); } catch (e) { creds = []; }
    let parentCreds = [];
    try { parentCreds = await dbService.select('parent_credentials'); } catch (e) { parentCreds = []; }
    const loginByUser = {};
    parentCreds.forEach((c) => { if (c.userId) loginByUser[c.userId] = c; });
    creds.forEach((c) => { if (c.userId) loginByUser[c.userId] = c; });
    this._loginByUser = loginByUser;

    let students = [];
    try { students = await dbService.select('students'); } catch (e) { students = []; }
    this._allStudents = students;

    // Filter lists
    const pendingList = profiles.filter((p) => p.role === 'pending' || p.approvalStatus === 'pending');
    const approvedList = profiles.filter((p) => p.role !== 'pending' && p.role !== 'rejected' && p.isActive !== false);
    const suspendedList = profiles.filter((p) => p.role === 'rejected' || p.approvalStatus === 'rejected' || p.isActive === false);

    this._pendingApprovalsCount = pendingList.length;
    this.refreshPendingBadges();

    if (!this._usersCurrentTab) {
      this._usersCurrentTab = pendingList.length > 0 ? 'pending' : 'active';
    }
    const currentTab = this._usersCurrentTab;
    if (!this._rbacActiveRole) {
      this._rbacActiveRole = 'teacher';
    }

    tabContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header -->
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:0;">
          <div class="page-title-group">
            <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin:0;">User Accounts &amp; Permissions</h2>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">
              Institutional identity governance, pending approval queue, role definitions, and customized window-level access control.
            </p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-config-cred-share">
              <i data-lucide="message-square"></i> Share Credentials
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-users">
              <i data-lucide="refresh-cw"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Pending Approvals Alert Banner (if any) -->
        ${pendingList.length > 0 ? `
          <div class="users-pending-alert-banner" style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:0.9rem 1.15rem; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.35rem;">⚠️</span>
              <div>
                <strong style="color:#b45309; font-size:0.92rem;">${pendingList.length} Account(s) Awaiting Approval</strong>
                <p style="font-size:0.8rem; color:#92400E; margin:2px 0 0 0;">These users have authenticated with Google or submitted registration but are blocked until approved.</p>
              </div>
            </div>
            <button class="btn btn-sm btn-primary" id="btn-jump-pending" style="font-size:0.78rem; font-weight:700;">
              Review Applications
            </button>
          </div>
        ` : ''}

        <!-- Main Card Panel with Sub-Tabs -->
        <div class="card" style="padding:0; overflow:visible;">
          <div class="card-header" style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color); background:var(--bg-surface); border-radius:16px 16px 0 0;">
            <div class="tms-tab-scroll-wrapper" style="margin-bottom:0;">
              <button type="button" class="tms-tab-nav-btn tms-tab-nav-prev" aria-label="Scroll left" title="Scroll tabs left">
                <i data-lucide="chevron-left"></i>
              </button>
              <div class="user-sub-tabs-bar tms-tab-scroll-rail" style="display:inline-flex; gap:6px; align-items:center; overflow-x:auto;">
                <button class="btn ${currentTab === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-sub-btn" data-subtab="pending">
                  <span class="tab-label-full">Pending Approvals (${pendingList.length})</span>
                  <span class="tab-label-short">Pending (${pendingList.length})</span>
                </button>
                <button class="btn ${currentTab === 'active' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-sub-btn" data-subtab="active">
                  <span class="tab-label-full">Active Accounts (${approvedList.length})</span>
                  <span class="tab-label-short">Active (${approvedList.length})</span>
                </button>
                <button class="btn ${currentTab === 'suspended' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-sub-btn" data-subtab="suspended">
                  <span class="tab-label-full">Suspended Accounts (${suspendedList.length})</span>
                  <span class="tab-label-short">Suspended (${suspendedList.length})</span>
                </button>
                <button class="btn ${currentTab === 'rbac' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-sub-btn" data-subtab="rbac" style="display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="shield-check" style="width:14px;height:14px;"></i>
                  <span class="tab-label-full">Assign Windows (RBAC)</span>
                  <span class="tab-label-short">RBAC</span>
                </button>
              </div>
              <button type="button" class="tms-tab-nav-btn tms-tab-nav-next" aria-label="Scroll right" title="Scroll tabs right">
                <i data-lucide="chevron-right"></i>
              </button>
            </div>
          </div>

          <div class="card-body" style="padding:1.25rem;" id="users-tab-subcontent">
            <!-- Subcontent renders here -->
          </div>
        </div>
      </div>
    `;

    // Render Subcontent
    const subContainer = document.getElementById('users-tab-subcontent');
    if (currentTab === 'rbac') {
      this.renderRbacMatrixView(subContainer, profiles, isSuperAdmin);
    } else if (currentTab === 'pending') {
      this.renderPendingUsersView(subContainer, pendingList, isSuperAdmin);
    } else if (currentTab === 'suspended') {
      this.renderAccountListView(subContainer, suspendedList, isSuperAdmin, 'suspended');
    } else {
      this.renderAccountListView(subContainer, approvedList, isSuperAdmin, 'active');
    }

    // Attach Tab Bar events
    tabContent.querySelectorAll('.tab-sub-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._usersCurrentTab = btn.dataset.subtab;
        this.renderUsersTab(tabContent);
      });
    });

    safeOn('btn-jump-pending', 'click', () => {
      this._usersCurrentTab = 'pending';
      this.renderUsersTab(tabContent);
    });

    safeOn('btn-refresh-users', 'click', () => {
      this.renderUsersTab(tabContent);
      UIComponents.showToast('User accounts refreshed', 'info');
    });

    safeOn('btn-config-cred-share', 'click', () => {
      this.openCredentialTemplateModal();
    });

    UIComponents.refreshIcons();
  }

  /**
   * Pending Users Approval Queue
   */
  static renderPendingUsersView(container, pendingList, isSuperAdmin) {
    if (pendingList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:3.5rem 1rem; text-align:center;">
          <div style="width:54px; height:54px; border-radius:50%; background:#ecfdf5; color:#059669; font-size:24px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">✓</div>
          <h4 style="font-size:1.1rem; font-weight:700; color:var(--text-main); margin:0;">Queue Clear</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">There are no pending user authorization requests at this time.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <!-- Desktop Table -->
      <div class="desktop-user-table table-responsive">
        <table class="tms-table" style="font-size:0.85rem;">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pendingList.map((p) => {
              const isParent = p.role === 'parent';
              return `
                <tr data-id="${esc(p.id)}">
                  <td style="font-weight:600;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <img src="${esc(p.avatar || '')}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);background:#f1f5f9;">
                      <div>
                        <span>${esc(p.name || 'Pending Applicant')}</span>
                        ${isParent ? '<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:0.65rem; margin-left:4px; font-weight:700;">PARENT APPLICANT</span>' : ''}
                      </div>
                    </div>
                  </td>
                  <td class="font-mono" style="font-size:0.78rem;">${esc(p.email || '—')}</td>
                  <td style="font-size:0.78rem;">${esc(p.phone || '—')}</td>
                  <td><span class="badge badge-warning">Pending Approval</span></td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-sm btn-primary btn-approve-user" data-id="${esc(p.id)}" data-role="${esc(p.role || (isParent ? 'parent' : 'teacher'))}">
                        ${isParent ? 'Approve & Assign Children' : 'Approve & Assign Role'}
                      </button>
                      <button class="btn btn-sm btn-secondary btn-reject-user" data-id="${esc(p.id)}" style="color:#dc2626; border-color:#fecaca;">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-user-cards">
        ${pendingList.map((p) => {
          const isParent = p.role === 'parent';
          return `
            <div class="user-card-item">
              <div class="user-card-header">
                ${this._renderUserAvatar(p, 40)}
                <div>
                  <div class="user-card-name">${esc(p.name || 'Pending Applicant')}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${esc(p.email || '—')}</div>
                </div>
              </div>
              <div class="user-card-contact">
                <div class="user-card-contact-item">📞 ${esc(p.phone || 'No phone recorded')}</div>
                <div class="user-card-contact-item">Status: <span class="badge badge-warning" style="font-size:0.7rem;">Pending Approval</span></div>
              </div>
              <div class="user-card-actions">
                <button class="btn btn-sm btn-primary btn-approve-user" data-id="${esc(p.id)}" data-role="${esc(p.role || (isParent ? 'parent' : 'teacher'))}">
                  ${isParent ? 'Approve & Children' : 'Approve & Assign Role'}
                </button>
                <button class="btn btn-sm btn-secondary btn-reject-user" data-id="${esc(p.id)}" style="color:#dc2626; border-color:#fecaca;">Reject</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Events
    container.querySelectorAll('.btn-approve-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = pendingList.find((u) => u.id === btn.dataset.id);
        if (p) this.openChangeRoleModal(p, true);
      });
    });

    container.querySelectorAll('.btn-reject-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const p = pendingList.find((u) => u.id === id);
        if (!confirm(`Reject access for ${p?.name || p?.email}?`)) return;
        await dbService.update('profiles', id, { role: 'rejected', approvalStatus: 'rejected', isActive: false });
        await auditService.log('USER_REJECTED', 'GOVERNANCE', { userId: id });
        UIComponents.showToast('Account application rejected', 'warning');
        const mainContent = document.getElementById('users-view-content') || document.getElementById('admin-tab-content');
        if (mainContent) this.renderUsersTab(mainContent);
      });
    });
  }

  /**
   * Active and Suspended User Accounts Directory
   */
  static renderAccountListView(container, list, isSuperAdmin, type) {
    if (!this._userFilterQuery) this._userFilterQuery = '';
    if (!this._userFilterRole) this._userFilterRole = 'all';

    const q = (this._userFilterQuery || '').toLowerCase().trim();
    const rf = this._userFilterRole;

    const filtered = list.filter((p) => {
      if (rf !== 'all' && p.role !== rf) return false;
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });

    const loginByUser = this._loginByUser || {};

    container.innerHTML = `
      <!-- Search & Filters Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:1rem; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; align-items:center; flex:1; min-width:240px;">
          <input type="text" class="form-input" id="input-user-search" placeholder="Search by name, email or phone..." value="${esc(this._userFilterQuery)}" style="max-width:320px; font-size:0.85rem;">
          <div style="min-width:180px; max-width:220px;">
            <select class="form-select" id="select-user-role-filter" style="width:100%; font-size:0.85rem;">
              <option value="all">All Roles (${list.length})</option>
              <option value="super_admin" ${rf === 'super_admin' ? 'selected' : ''}>Super Administrator</option>
            ${WINDOW_ROLES.map((r) => `<option value="${r.key}" ${rf === r.key ? 'selected' : ''}>${r.label}</option>`).join('')}
            <option value="principal" ${rf === 'principal' ? 'selected' : ''}>Principal</option>
            <option value="coordinator" ${rf === 'coordinator' ? 'selected' : ''}>Coordinator</option>
            <option value="finance" ${rf === 'finance' ? 'selected' : ''}>Finance</option>
            <option value="hr" ${rf === 'hr' ? 'selected' : ''}>HR</option>
            <option value="librarian" ${rf === 'librarian' ? 'selected' : ''}>Librarian</option>
            <option value="operations" ${rf === 'operations' ? 'selected' : ''}>Operations</option>
            <option value="office_boy" ${rf === 'office_boy' ? 'selected' : ''}>Office Boy</option>
          </select>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Showing <strong>${filtered.length}</strong> of ${list.length} accounts
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state" style="padding:2.5rem 1rem; text-align:center;">
          <p style="color:var(--text-muted); font-size:0.88rem;">No accounts match the current filter criteria.</p>
        </div>
      ` : `
        <!-- Desktop Table View -->
        <div class="desktop-user-table table-responsive">
          <table class="tms-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th>User Account</th>
                <th>Role</th>
                <th>Window Permissions</th>
                <th>Login ID / Credential</th>
                <th>Class / Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((p) => {
                const login = loginByUser[p.id];
                const email = (p.email || '').toLowerCase();
                const superAdminEmail = (TMS_CONFIG.superAdminEmail || '').toLowerCase();
                const isTargetSuper = email === superAdminEmail || p.role === 'super_admin' || p.is_super_admin === true || p.isSuperAdmin === true;
                const canModify = isSuperAdmin || !isTargetSuper;

                const customPerms = WindowPermissionsService.getUserCustomPermissions(p.id);
                const hasCustom = customPerms && Object.keys(customPerms).length > 0;
                const theme = ROLE_THEMES[p.role] || ROLE_THEMES.teacher;

                return `
                  <tr data-id="${esc(p.id)}">
                    <td style="font-weight:600;">
                      <div style="display:flex; align-items:center; gap:10px;">
                        ${this._renderUserAvatar(p, 34)}
                        <div>
                          <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:0.88rem; font-weight:700; color:#0F172A;">${esc(p.name || '—')}</span>
                            ${isTargetSuper ? '<span class="badge" style="background:#0F172A; color:#FFFFFF; font-size:0.6rem; padding:2px 6px; font-weight:800; border-radius:9999px;">SUPER ADMIN</span>' : ''}
                          </div>
                          <div class="font-mono" style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">${esc(p.email || '—')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" style="background:${theme.badgeBg}; color:${theme.badgeColor}; border:1px solid ${theme.border}; font-weight:700; font-size:0.72rem;">
                        ${esc(ROLE_LABELS[p.role] || p.role || 'Staff').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      ${hasCustom ? `
                        <span class="badge" style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; font-weight:700; font-size:0.68rem;" title="Individual window permissions active">
                          CUSTOM PERMS
                        </span>
                      ` : `
                        <span class="badge" style="background:#F1F5F9; color:#475569; border:1px solid #E2E8F0; font-weight:700; font-size:0.7rem;">
                          <i data-lucide="shield" style="width:10px; height:10px; color:#059669;"></i> Role Default ${isTargetSuper ? '(Full Access)' : ''}
                        </span>
                      `}
                    </td>
                    <td style="font-size:0.78rem;">
                      ${login && login.username ? `
                        <div style="display:flex; flex-direction:column; gap:3px;">
                          <div style="display:flex; align-items:center; gap:5px;">
                            <span class="font-mono" style="font-weight:700;">${esc(login.username)}</span>
                            <button class="btn btn-secondary btn-sm btn-reveal-pass" data-user="${esc(p.id)}" title="Show password" style="padding:1px 5px;"><i data-lucide="eye" style="width:11px;height:11px;"></i></button>
                            <span class="user-pass font-mono" data-user="${esc(p.id)}" style="display:none; color:#b45309; font-weight:700;">${esc(login.password || '—')}</span>
                          </div>
                          <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                            <button class="btn btn-secondary btn-sm btn-copy-user-cred" data-user="${esc(p.id)}" title="Copy login" style="padding:1px 6px; font-size:0.7rem; color:#0284c7; border-color:#bae6fd;">
                              <i data-lucide="share-2" style="width:10px;height:10px;"></i> Copy
                            </button>
                            ${p.phone ? `
                              <button class="btn btn-secondary btn-sm btn-wa-user-cred" data-user="${esc(p.id)}" title="WhatsApp" style="padding:1px 6px; font-size:0.7rem; color:#BF9A33; border-color:#F7E8B5;">
                                <i data-lucide="send" style="width:10px;height:10px;"></i> WA
                              </button>
                            ` : ''}
                          </div>
                        </div>
                      ` : isTargetSuper ? `
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <span class="badge" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; font-size:0.72rem; font-weight:700;">
                            <i data-lucide="shield-check" style="width:11px; height:11px;"></i> Super Admin Root
                          </span>
                          <span class="font-mono" style="font-size:0.72rem; color:#64748B;">${esc(p.email)}</span>
                        </div>
                      ` : p.email ? `
                        <div style="display:flex; flex-direction:column; gap:2px;">
                          <span class="badge" style="background:#F8FAFC; color:#475569; border:1px solid #E2E8F0; font-size:0.7rem; font-weight:700;">
                            <i data-lucide="mail" style="width:10px; height:10px;"></i> Direct Email Auth
                          </span>
                          <span class="font-mono" style="font-size:0.72rem; color:#64748B;">${esc(p.email)}</span>
                        </div>
                      ` : '<span style="color:var(--text-muted);">—</span>'}
                    </td>
                    <td style="font-size:0.78rem;">
                      <span style="display:inline-flex; align-items:center; gap:5px; font-weight:600; color:#334155;">
                        <i data-lucide="${p.assignedClass ? 'graduation-cap' : 'building-2'}" style="width:13px; height:13px; color:#BF9A33;"></i>
                        ${esc([p.assignedClass, p.assignedSection].filter(Boolean).join(' / ') || p.department || p.title || (isTargetSuper ? 'Executive Governance & Leadership' : 'Campus Operations'))}
                      </span>
                    </td>
                    <td>
                      ${p.isActive !== false ? `
                        <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#059669; font-weight:600;">
                          <span style="width:7px; height:7px; border-radius:50%; background:#10B981;"></span> Active
                        </span>
                      ` : `
                        <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:#dc2626; font-weight:600;">
                          <span style="width:7px; height:7px; border-radius:50%; background:#dc2626;"></span> Suspended
                        </span>
                      `}
                    </td>
                    <td style="white-space:nowrap;">
                      ${!canModify ? `
                        <span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Root Protected</span>
                      ` : `
                        <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                          <!-- Permissions button: exact modal from screenshot -->
                          <button class="btn btn-secondary btn-sm btn-perm" data-id="${esc(p.id)}" title="Customize Window Permissions" style="color:#059669; border-color:#a7f3d0; background:#FDF8E8;">
                            <i data-lucide="sliders" style="width:12px;height:12px;"></i> Permissions
                          </button>
                          <button class="btn btn-secondary btn-sm btn-change-role" data-id="${esc(p.id)}" title="Assign Role & Details">
                            <i data-lucide="shield" style="width:12px;height:12px;"></i> Role
                          </button>
                          <button class="btn btn-secondary btn-sm btn-edit-user" data-id="${esc(p.id)}" title="Edit Profile & Details">
                            <i data-lucide="user-cog" style="width:12px;height:12px;"></i> Profile
                          </button>
                          <button class="btn btn-secondary btn-sm btn-toggle-suspend" data-id="${esc(p.id)}" style="${p.isActive === false ? 'color:#059669; border-color:#a7f3d0;' : 'color:#dc2626; border-color:#fecaca;'}">
                            ${p.isActive === false ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Mobile Responsive Cards View -->
        <div class="mobile-user-cards">
          ${filtered.map((p) => {
            const email = (p.email || '').toLowerCase();
            const superAdminEmail = (TMS_CONFIG.superAdminEmail || '').toLowerCase();
            const isTargetSuper = email === superAdminEmail || p.role === 'super_admin' || p.is_super_admin === true || p.isSuperAdmin === true;
            const canModify = isSuperAdmin || !isTargetSuper;
            const customPerms = WindowPermissionsService.getUserCustomPermissions(p.id);
            const hasCustom = customPerms && Object.keys(customPerms).length > 0;
            const theme = ROLE_THEMES[p.role] || ROLE_THEMES.teacher;

            return `
              <div class="user-card-item">
                <div class="user-card-header">
                  ${this._renderUserAvatar(p, 42)}
                  <div style="flex:1; min-width:0;">
                    <div class="user-card-name-row">
                      <span class="user-card-name">${esc(p.name || 'User')}</span>
                      ${isTargetSuper ? '<span class="badge" style="background:#0F172A; color:#FFF; font-size:0.6rem; padding:2px 5px; font-weight:700;">SUPER ADMIN</span>' : ''}
                      ${hasCustom ? '<span class="badge" style="background:#D1FAE5; color:#065F46; font-size:0.6rem; padding:2px 5px; font-weight:700;">CUSTOM PERMS</span>' : ''}
                    </div>
                    <div class="user-card-meta-row">
                      <span class="badge" style="background:${theme.badgeBg}; color:${theme.badgeColor}; font-size:0.68rem; padding:2px 6px; font-weight:700;">
                        ${esc(ROLE_LABELS[p.role] || p.role || 'Staff').toUpperCase()}
                      </span>
                      ${p.isActive !== false ? `
                        <span style="font-size:0.72rem; color:#059669; font-weight:600;">● Active</span>
                      ` : `
                        <span style="font-size:0.72rem; color:#dc2626; font-weight:600;">● Suspended</span>
                      `}
                    </div>
                  </div>
                </div>

                <div class="user-card-contact">
                  <div class="user-card-contact-item">✉️ ${esc(p.email || '—')}</div>
                  ${p.phone ? `<div class="user-card-contact-item">📞 ${esc(p.phone)}</div>` : ''}
                </div>

                <div class="user-card-actions">
                  ${canModify ? `
                    <button class="btn btn-sm btn-secondary btn-perm" data-id="${esc(p.id)}" style="color:#059669; border-color:#a7f3d0; background:#FDF8E8;">
                      Permissions
                    </button>
                    <button class="btn btn-sm btn-secondary btn-change-role" data-id="${esc(p.id)}">Role</button>
                    <button class="btn btn-sm btn-secondary btn-edit-user" data-id="${esc(p.id)}">Profile</button>
                    <button class="btn btn-sm btn-secondary btn-toggle-suspend" data-id="${esc(p.id)}" style="${p.isActive === false ? 'color:#059669;' : 'color:#dc2626;'}">
                      ${p.isActive === false ? 'Activate' : 'Suspend'}
                    </button>
                  ` : '<span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Protected Account</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    // Filter Listeners
    const searchInput = container.querySelector('#input-user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._userFilterQuery = e.target.value;
        this.renderAccountListView(container, list, isSuperAdmin, type);
      });
    }

    const roleSelect = container.querySelector('#select-user-role-filter');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this._userFilterRole = e.target.value;
        this.renderAccountListView(container, list, isSuperAdmin, type);
      });
    }

    // Attach actions
    container.querySelectorAll('.btn-perm').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const profile = list.find((p) => p.id === id);
        if (profile) this.openCustomizeWindowPermissionsModal(profile);
      });
    });

    container.querySelectorAll('.btn-change-role').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const profile = list.find((p) => p.id === id);
        if (profile) this.openChangeRoleModal(profile);
      });
    });

    container.querySelectorAll('.btn-edit-user').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const profile = list.find((p) => p.id === id);
        if (profile) this.openUserEditModal(profile);
      });
    });

    container.querySelectorAll('.btn-toggle-suspend').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const profile = list.find((p) => p.id === id);
        if (!profile) return;
        const willActivate = profile.isActive === false;
        await dbService.update('profiles', id, { isActive: willActivate, approvalStatus: willActivate ? 'approved' : 'suspended' });
        await auditService.log(willActivate ? 'USER_ACTIVATED' : 'USER_SUSPENDED', 'GOVERNANCE', { userId: id });
        UIComponents.showToast(`Account ${willActivate ? 'activated' : 'suspended'}.`, willActivate ? 'success' : 'warning');
        const mainContent = document.getElementById('users-view-content') || document.getElementById('admin-tab-content');
        if (mainContent) this.renderUsersTab(mainContent);
      });
    });

    // Credential sharing events
    container.querySelectorAll('.btn-copy-user-cred').forEach((b) => {
      b.addEventListener('click', () => {
        const userId = b.dataset.user;
        const profile = list.find((p) => p.id === userId);
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

    container.querySelectorAll('.btn-wa-user-cred').forEach((b) => {
      b.addEventListener('click', () => {
        const userId = b.dataset.user;
        const profile = list.find((p) => p.id === userId);
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
          window.open(ph ? `https://wa.me/${ph}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
      });
    });

    container.querySelectorAll('.btn-reveal-pass').forEach((b) => {
      b.addEventListener('click', () => {
        const userId = b.dataset.user || '';
        const span = Array.from(container.querySelectorAll('.user-pass')).find((el) => el.dataset.user === userId);
        if (span) span.style.display = span.style.display === 'none' ? 'inline' : 'none';
      });
    });

    UIComponents.refreshIcons();
  }

  /**
   * Assign Windows (RBAC) View
   */
  static renderRbacMatrixView(container, profiles, isSuperAdmin) {
    let matrix = WindowPermissionsService.getRoleMatrix();
    let activeRole = this._rbacActiveRole || 'teacher';

    const countRolePerms = (roleKey) => {
      const perms = matrix[roleKey] || {};
      let full = 0;
      let view = 0;
      let off = 0;
      for (const cat of WINDOW_CATEGORIES) {
        for (const mod of cat.modules) {
          const state = perms[mod.key] || 'off';
          if (state === 'full') full++;
          else if (state === 'view') view++;
          else off++;
        }
      }
      return { full, view, off };
    };

    const draw = () => {
      const activeRoleObj = WINDOW_ROLES.find((r) => r.key === activeRole) || WINDOW_ROLES[1];
      const stats = countRolePerms(activeRole);
      const activePerms = matrix[activeRole] || {};

      container.innerHTML = `
        <div class="rbac-container">
          <!-- Role Selection Pills -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
              Select Role to Configure Windows:
            </div>
            <div class="role-pill-nav">
              ${WINDOW_ROLES.map((r) => {
                const s = countRolePerms(r.key);
                return `
                  <button type="button" class="role-pill-btn ${r.key === activeRole ? 'active' : ''}" data-role-key="${r.key}">
                    <span class="role-pill-icon">${r.icon}</span>
                    <span>${r.label}</span>
                    <span class="role-pill-badge">
                      ${s.full} Full • ${s.view} View
                    </span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Active Role Header & Switch Legend -->
          <div style="background: #F8FAFC; border: 1.5px solid var(--border-color); border-radius: 14px; padding: 1.15rem 1.35rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div class="role-avatar-badge">
                ${activeRoleObj.icon.replace('width="18" height="18"', 'width="24" height="24"')}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0F172A;">${activeRoleObj.label}</h3>
                  <span class="badge" style="background:#d1fae5; color:#065f46; font-size:0.72rem; padding:0.2rem 0.55rem; font-weight:700;">
                    ${stats.full} Full Access
                  </span>
                  <span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:0.72rem; padding:0.2rem 0.55rem; font-weight:700;">
                    ${stats.view} View Only
                  </span>
                  <span class="badge" style="background:#f1f5f9; color:#64748b; font-size:0.72rem; padding:0.2rem 0.55rem; font-weight:700;">
                    ${stats.off} Off
                  </span>
                </div>
                <div style="font-size: 0.78rem; color: #64748B; margin-top: 4px;">
                  ${activeRoleObj.subtitle}
                </div>
              </div>
            </div>

            <!-- Micro Legend -->
            <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; color: #64748B; flex-wrap: wrap;">
              <span><strong style="color: #0F172A;">Switch:</strong></span>
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1;"></span>
                <span>Gray (Left) = Off</span>
              </span>
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #EAB308;"></span>
                <span style="font-weight: 600; color: #854D0E;">Yellow (Center) = View Only</span>
              </span>
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                <span style="font-weight: 600; color: #065F46;">Green (Right) = Full Access</span>
              </span>
              <span style="color: #059669; font-weight: 600;">• Tap card to cycle</span>
            </div>
          </div>

          <!-- Window Categories & Modules Grid -->
          <div class="window-categories-list">
            ${WINDOW_CATEGORIES.map((cat) => `
              <div class="perm-category-card">
                <div class="perm-category-header">
                  <div class="perm-category-title">
                    <span class="perm-category-icon">${cat.icon}</span>
                    <span>${cat.title}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${cat.modules.length} Windows</span>
                </div>
                <div class="perm-grid">
                  ${cat.modules.map((mod) => {
                    const state = activePerms[mod.key] || 'off';
                    return `
                      <div class="perm-item state-${state} rbac-perm-card" data-mod-key="${mod.key}" title="${mod.label} • Click to cycle">
                        <div class="perm-item-left">
                          <div class="perm-item-icon">${mod.icon}</div>
                          <div class="perm-item-info">
                            <span class="perm-item-name">${mod.label}</span>
                            <span class="perm-item-desc">${mod.desc}</span>
                          </div>
                        </div>
                        <div class="perm-switch pos-${state}" data-mod-key="${mod.key}"></div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Bottom Actions Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-rbac-reset-defaults" style="color: #475569;">
              <i data-lucide="rotate-ccw"></i> Reset ${activeRoleObj.label} to Defaults
            </button>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" id="btn-rbac-grant-all">
                Grant All Windows Full
              </button>
              <button class="btn btn-primary btn-sm" id="btn-rbac-save-matrix" style="font-weight: 700; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
                <i data-lucide="save"></i> Save Role Assignments
              </button>
            </div>
          </div>
        </div>
      `;

      // Role Pill Click Events
      container.querySelectorAll('.role-pill-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeRole = btn.dataset.roleKey;
          this._rbacActiveRole = activeRole;
          draw();
        });
      });

      // Card Cycle Click Events (Off -> View Only -> Full Access -> Off)
      container.querySelectorAll('.rbac-perm-card').forEach((card) => {
        card.addEventListener('click', () => {
          const modKey = card.dataset.modKey;
          if (!modKey) return;
          if (!matrix[activeRole]) matrix[activeRole] = {};
          const current = matrix[activeRole][modKey] || 'off';
          let next = 'view';
          if (current === 'off') next = 'view';
          else if (current === 'view') next = 'full';
          else next = 'off';

          matrix[activeRole][modKey] = next;
          matrix[activeRole].dashboard = 'full';
          draw();
        });
      });

      // Bottom Bar Action Handlers
      safeOn('btn-rbac-reset-defaults', 'click', () => {
        const sysDefaults = WindowPermissionsService.getSystemDefaults();
        matrix[activeRole] = { ...(sysDefaults[activeRole] || sysDefaults.teacher || {}) };
        draw();
        UIComponents.showToast(`Reset ${activeRoleObj.label} back to system defaults`, 'info');
      });

      safeOn('btn-rbac-grant-all', 'click', () => {
        if (!matrix[activeRole]) matrix[activeRole] = {};
        for (const cat of WINDOW_CATEGORIES) {
          for (const mod of cat.modules) {
            matrix[activeRole][mod.key] = 'full';
          }
        }
        matrix[activeRole].dashboard = 'full';
        draw();
        UIComponents.showToast(`Granted Full Access on all windows for ${activeRoleObj.label}`, 'info');
      });

      safeOn('btn-rbac-save-matrix', 'click', async () => {
        WindowPermissionsService.saveRoleMatrix(matrix);
        await auditService.log('RBAC_ROLE_MATRIX_SAVED', 'GOVERNANCE', { role: activeRole });
        UIComponents.showToast(`Role window permissions saved successfully!`, 'success');
        draw();
      });

      UIComponents.refreshIcons();
    };

    draw();
  }

  /**
   * ==========================================================================
   * CUSTOMIZE WINDOW PERMISSIONS MODAL (MATCHING SCREENSHOT IDENTICALLY)
   * Reference: https://tpsh.vercel.app/#users
   * ==========================================================================
   */
  static openCustomizeWindowPermissionsModal(p) {
    const roleKey = p.role || 'teacher';
    const roleObj = WINDOW_ROLES.find((r) => r.key === roleKey) || WINDOW_ROLES[1];
    const roleDefaults = (WindowPermissionsService.getRoleMatrix()[roleKey]) || {};

    // Get current overrides or clone
    let userOverrides = { ...(WindowPermissionsService.getUserCustomPermissions(p.id) || {}) };

    const getState = (modKey) => {
      if (userOverrides[modKey] !== undefined) return userOverrides[modKey];
      return roleDefaults[modKey] || 'off';
    };

    const title = `Customize Window Permissions: ${p.name || p.email}`;

    const bodyHtml = `
      <div style="margin-bottom: 1.25rem;">
        <!-- User Info Banner -->
        <div style="background: #F8FAFC; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #0f172a; border: 1px solid var(--border-color);">
              ${p.avatar ? `<img src="${esc(p.avatar)}" style="width:100%;height:100%;object-fit:cover;" alt=""/>` : (p.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <strong style="font-size: 0.95rem; color: #0F172A;">${esc(p.name || 'User')}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                ${esc(p.email || '—')} • Role: <span class="badge" style="background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; font-weight:700; font-size:0.72rem;">${(p.role || 'STAFF').toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-modal-reset-defaults" style="color: #475569; font-size:0.75rem;" title="Reset this user's windows back to ${roleObj.label} defaults">
              Reset to Role Defaults
            </button>
          </div>
        </div>

        <!-- Description Hint Banner -->
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 0.7rem 0.9rem; font-size: 0.8rem; color: #1E40AF; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.1rem; flex-shrink: 0;">💡</span>
          <span>Customize specific window access for <strong>${esc(p.name || p.email)}</strong>. Overrides apply ONLY to this user; other ${roleObj.label} accounts remain untouched.</span>
        </div>

        <!-- Micro Legend -->
        <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; color: #64748B; margin-bottom: 1rem; flex-wrap: wrap;">
          <span><strong style="color: #0F172A;">Switch:</strong></span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1;"></span>
            <span>Gray (Left) = Off</span>
          </span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #EAB308;"></span>
            <span style="font-weight: 600; color: #854D0E;">Yellow (Center) = View Only</span>
          </span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
            <span style="font-weight: 600; color: #065F46;">Green (Right) = Full Access</span>
          </span>
          <span style="color: #059669; font-weight: 600; margin-left: 0.3rem;">• Tap card to cycle</span>
        </div>

        <!-- Modal Scrollable Windows List -->
        <div id="modal-user-perm-list" style="max-height: 52vh; overflow-y: auto; padding-right: 4px;">
          <!-- Dynamically populated below -->
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="btn-modal-cancel">Cancel</button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-modal-grant-all">Grant All Full</button>
          <button class="btn btn-primary btn-sm" id="btn-modal-save-perm" style="font-weight: 700; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
            Save Custom Permissions
          </button>
        </div>
      </div>
    `;

    UIComponents.openModal({ title, bodyHtml, footerHtml, maxWidth: '720px' });

    const renderModalItems = () => {
      const container = document.getElementById('modal-user-perm-list');
      if (!container) return;

      container.innerHTML = WINDOW_CATEGORIES.map((cat) => `
        <div style="margin-bottom: 1rem; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 12px; padding: 0.85rem 1rem;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #0F172A; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;">
            <span style="color: #059669; display: inline-flex;">${cat.icon}</span>
            <span>${cat.title}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 0.5rem;">
            ${cat.modules.map((mod) => {
              const state = getState(mod.key);
              const defaultVal = roleDefaults[mod.key] || 'off';
              const isOverridden = userOverrides[mod.key] !== undefined && userOverrides[mod.key] !== defaultVal;

              return `
                <div class="perm-item state-${state} modal-perm-card" data-mod-key="${mod.key}" style="padding: 0.65rem 0.85rem;" title="${mod.label} • Click to cycle">
                  <div class="perm-item-left">
                    <div class="perm-item-icon" style="width: 32px; height: 32px;">${mod.icon}</div>
                    <div class="perm-item-info">
                      <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                        <span class="perm-item-name" style="font-size: 0.85rem;">${mod.label}</span>
                        ${isOverridden ? `
                          <span class="badge" style="background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; font-size: 0.62rem; padding: 0.1rem 0.4rem; font-weight: 700;">
                            Special Override
                          </span>
                        ` : `
                          <span style="font-size: 0.68rem; color: #94A3B8;">(Role Default: ${defaultVal.toUpperCase()})</span>
                        `}
                      </div>
                      <span class="perm-item-desc" style="font-size: 0.7rem;">${mod.desc}</span>
                    </div>
                  </div>
                  <div class="perm-switch pos-${state}" data-mod-key="${mod.key}"></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');

      // Click to cycle (Off -> View Only -> Full Access -> Off)
      container.querySelectorAll('.modal-perm-card').forEach((card) => {
        card.addEventListener('click', () => {
          const modKey = card.dataset.modKey;
          if (!modKey) return;
          const current = getState(modKey);
          let next = 'view';
          if (current === 'off') next = 'view';
          else if (current === 'view') next = 'full';
          else next = 'off';

          userOverrides[modKey] = next;
          renderModalItems();
        });
      });
    };

    renderModalItems();

    safeOn('btn-modal-reset-defaults', 'click', () => {
      userOverrides = {};
      renderModalItems();
      UIComponents.showToast(`Switches reset to ${roleObj.label} defaults`, 'info');
    });

    safeOn('btn-modal-grant-all', 'click', () => {
      for (const cat of WINDOW_CATEGORIES) {
        for (const mod of cat.modules) {
          userOverrides[mod.key] = 'full';
        }
      }
      renderModalItems();
      UIComponents.showToast('All windows set to Full Access', 'info');
    });

    safeOn('btn-modal-cancel', 'click', () => {
      UIComponents.closeModal();
    });

    safeOn('btn-modal-save-perm', 'click', async () => {
      let hasDifference = false;
      const cleanCustom = {};

      for (const cat of WINDOW_CATEGORIES) {
        for (const mod of cat.modules) {
          const val = userOverrides[mod.key];
          const def = roleDefaults[mod.key] || 'off';
          if (val !== undefined && val !== def) {
            cleanCustom[mod.key] = val;
            hasDifference = true;
          }
        }
      }

      if (hasDifference) {
        WindowPermissionsService.setUserCustomPermissions(p.id, cleanCustom);
        try {
          await dbService.update('profiles', p.id, { custom_modules: cleanCustom });
        } catch (e) {}
        await auditService.log('USER_CUSTOM_PERM_SAVE', 'GOVERNANCE', { userId: p.id, permissions: cleanCustom });
        UIComponents.showToast(`Saved custom window permissions for ${p.name || p.email}.`, 'success');
      } else {
        WindowPermissionsService.resetUserCustomPermissions(p.id);
        try {
          await dbService.update('profiles', p.id, { custom_modules: null });
        } catch (e) {}
        UIComponents.showToast(`Restored default role permissions for ${p.name || p.email}.`, 'info');
      }

      UIComponents.closeModal();
      const mainContent = document.getElementById('users-view-content') || document.getElementById('admin-tab-content');
      if (mainContent) this.renderUsersTab(mainContent);
    });
  }

  /**
   * Institutional Role & Child Assignment Modal
   */
  static async openChangeRoleModal(p, isApprovalMode = false) {
    const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.isSuperAdmin === true || p.is_super_admin === true;
    if (isTargetSuper) {
      UIComponents.showToast('Initial Super Admin account is protected.', 'warning');
      return;
    }

    const allStudents = this._allStudents || [];
    let assignedStudentIds = Array.isArray(p.assigned_student_ids) ? [...p.assigned_student_ids] : (Array.isArray(p.child_ids) ? [...p.child_ids] : []);

    // If parent and no children linked yet, attempt auto-match by phone or father name
    if (assignedStudentIds.length === 0 && (p.role === 'parent' || isApprovalMode)) {
      const cleanPh = (p.phone || '').replace(/[^0-9]/g, '');
      if (cleanPh) {
        allStudents.forEach((st) => {
          const fPh = (st.father_phone || '').replace(/[^0-9]/g, '');
          const mPh = (st.mother_phone || '').replace(/[^0-9]/g, '');
          const wPh = (st.whatsapp_number || '').replace(/[^0-9]/g, '');
          if (cleanPh === fPh || cleanPh === mPh || cleanPh === wPh) {
            assignedStudentIds.push(st.id);
          }
        });
      }
      if (assignedStudentIds.length === 0 && p.name) {
        const pName = p.name.toLowerCase().trim();
        allStudents.forEach((st) => {
          if (st.father_name && st.father_name.toLowerCase().trim() === pName) {
            assignedStudentIds.push(st.id);
          }
        });
      }
    }

    const title = isApprovalMode ? 'Approve Account & Assign Role' : `Assign Role & Scope: ${p.name || p.email}`;
    const rolesList = WINDOW_ROLES;
    const currentRole = p.role === 'pending' ? (isApprovalMode ? 'teacher' : 'teacher') : (p.role || 'teacher');

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <!-- User Info Strip -->
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:10px; padding:0.75rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            ${this._renderUserAvatar(p, 36)}
            <div>
              <strong style="font-size:0.92rem; color:var(--text-main);">${esc(p.name || 'User Account')}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${esc(p.email || '—')}</div>
            </div>
          </div>
          ${p.phone ? `<div style="font-size:0.76rem; color:var(--text-muted);">📞 ${esc(p.phone)}</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Institutional Role</label>
          <select class="form-select" id="role-modal-select">
            ${rolesList.map((r) => `<option value="${r.key}" ${currentRole === r.key ? 'selected' : ''}>${r.label} (${r.subtitle})</option>`).join('')}
            <option value="principal" ${currentRole === 'principal' ? 'selected' : ''}>Principal (School Executive)</option>
            <option value="coordinator" ${currentRole === 'coordinator' ? 'selected' : ''}>Coordinator (Academic Management)</option>
            <option value="finance" ${currentRole === 'finance' ? 'selected' : ''}>Finance Officer (Fee Collection)</option>
            <option value="hr" ${currentRole === 'hr' ? 'selected' : ''}>HR Manager (Staff & Attendance)</option>
            <option value="librarian" ${currentRole === 'librarian' ? 'selected' : ''}>Librarian (Book Circulation)</option>
            <option value="operations" ${currentRole === 'operations' ? 'selected' : ''}>Operations (Facility & Hostel)</option>
            <option value="office_boy" ${currentRole === 'office_boy' ? 'selected' : ''}>Office Boy (Admission Data Entry)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Data Scope</label>
          <select class="form-select" id="role-modal-scope">
            ${Object.values(TMS_CONFIG.scopes).map((s) => `<option value="${s}" ${p.scope === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>

        <!-- Student Assignment Section (Conditional for Parents) -->
        <div id="role-modal-parent-section" style="display:${currentRole === 'parent' ? 'block' : 'none'}; border-top:1px solid var(--border-color); padding-top:12px;">
          <label class="form-label" style="font-weight:700;">Linked Student(s) / Wards</label>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">Parents can only view academic performance and leave requests for their linked children.</p>
          <div style="max-height:160px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; padding:6px 10px;">
            ${allStudents.length === 0 ? '<span style="font-size:0.8rem; color:var(--text-muted);">No student records found.</span>' : allStudents.map((st) => `
              <label style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:0.82rem; cursor:pointer;">
                <input type="checkbox" class="cb-assign-child" value="${esc(st.id)}" ${assignedStudentIds.includes(st.id) ? 'checked' : ''}>
                <span>${esc(st.full_name || st.name || 'Student')} (${esc(st.admission_number || st.admission_no || '—')}, Class ${esc(st.standard || st.class || '—')})</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary btn-sm" id="btn-role-cancel">Cancel</button>
      <button class="btn btn-primary btn-sm" id="btn-role-submit">
        ${isApprovalMode ? 'Approve & Save' : 'Save Changes'}
      </button>
    `;

    UIComponents.openModal({ title, bodyHtml, footerHtml });

    const roleSelect = document.getElementById('role-modal-select');
    roleSelect.addEventListener('change', () => {
      const parentSec = document.getElementById('role-modal-parent-section');
      if (parentSec) {
        parentSec.style.display = roleSelect.value === 'parent' ? 'block' : 'none';
      }
    });

    safeOn('btn-role-cancel', 'click', () => UIComponents.closeModal());

    safeOn('btn-role-submit', 'click', async () => {
      const selectedRole = roleSelect.value;
      const selectedScope = document.getElementById('role-modal-scope')?.value || 'own_records';
      const selectedChildren = Array.from(document.querySelectorAll('.cb-assign-child:checked')).map((cb) => cb.value);

      const updates = {
        role: selectedRole,
        scope: selectedScope,
        approvalStatus: 'approved',
        isActive: true
      };

      if (selectedRole === 'parent') {
        updates.assigned_student_ids = selectedChildren;
      }

      await dbService.update('profiles', p.id, updates);
      await auditService.log('USER_ROLE_ASSIGNED', 'GOVERNANCE', { userId: p.id, role: selectedRole });
      UIComponents.showToast(`Account ${isApprovalMode ? 'approved and assigned' : 'updated'}.`, 'success');
      UIComponents.closeModal();

      const mainContent = document.getElementById('users-view-content') || document.getElementById('admin-tab-content');
      if (mainContent) this.renderUsersTab(mainContent);
    });
  }

  /** Full user editor: identity, assignment, avatar upload and password reset. */
  static async openUserEditModal(p) {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();
    const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.isSuperAdmin === true || p.is_super_admin === true;

    if (isTargetSuper && !isSuperAdmin) {
      UIComponents.showToast('Root Super Administrator account is protected and cannot be modified.', 'warning');
      return;
    }

    let pendingAvatar = null;
    const staffMeta = await OnboardingService.getStaffMeta(p.id);
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
        <div class="form-group"><label class="form-label">TGI ID (Staff ID)</label><div style="display:flex; align-items:stretch; border:1px solid var(--border-color); border-radius:6px; overflow:hidden;"><div style="background:#f1f5f9; padding:8px 12px; font-weight:700; font-family:monospace; border-right:1px solid var(--border-color); color:#475569;">TGI</div><input class="form-input font-mono" id="ue-tgi-id" value="${esc(staffMeta.tgiId || '')}" placeholder="001" style="border:none; border-radius:0;"></div><span style="font-size:0.7rem; color:var(--text-subtle);">Displays read-only in the staff member's profile</span></div>
        <div class="form-group"><label class="form-label">Blood Group</label><select class="form-select" id="ue-blood-group"><option value="">Select Blood Group</option>${['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => `<option value="${b}" ${staffMeta.bloodGroup === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
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
      const tgiIdVal = (document.getElementById('ue-tgi-id')?.value || '').trim();
      const bloodGroupVal = document.getElementById('ue-blood-group')?.value || '';
      await OnboardingService.saveStaffMeta(p.id, {
        tgiId: tgiIdVal,
        bloodGroup: bloodGroupVal
      });
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


  /* ================================================================== */
  /* Staff Onboarding & Profile Governance (Questions & Grace Period)   */
  /* ================================================================== */

  static async renderStaffOnboardingTab(tabContent) {
    const currentUser = authService.getCurrentUser() || {};
    const isSuperAdmin = currentUser?.isSuperAdmin === true || (currentUser?.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase();

    // Load onboarding configuration, staff profiles, and metadata
    const config = await OnboardingService.getConfig();
    let profiles = [];
    try {
      profiles = await dbService.select('profiles');
    } catch (e) { profiles = []; }

    // Filter staff profiles (exclude parents and students)
    const staffProfiles = profiles.filter(p => {
      const r = (p.role || '').toLowerCase();
      return r !== TMS_CONFIG.roles.PARENT && r !== TMS_CONFIG.roles.STUDENT && r !== 'parent' && r !== 'student';
    });

    const staffMetaMap = await OnboardingService.getAllStaffMeta();

    // Calculate metrics
    let activeWindowCount = 0;
    let expiredWindowCount = 0;
    let completedCount = 0;

    const staffData = staffProfiles.map(p => {
      const meta = staffMetaMap[p.id] || {};
      const isTargetSuper = (p.email || '').toLowerCase() === (TMS_CONFIG.superAdminEmail || '').toLowerCase() || p.role === 'super_admin' || p.isSuperAdmin === true;

      let status = 'Not Logged In';
      let statusColor = '#64748b';
      let statusBadge = '<span class="badge" style="background:#f1f5f9; color:#475569;">Never Logged In</span>';
      let daysLeft = 0;

      if (isTargetSuper) {
        status = 'Super Admin Authority';
        statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700;">👑 Permanent Edit Access</span>';
      } else if (meta.firstLoginAt) {
        const firstLoginMs = new Date(meta.firstLoginAt).getTime();
        const windowMs = (Number(config.editWindowDays) || 7) * 24 * 60 * 60 * 1000;
        let deadlineMs = firstLoginMs + windowMs;
        if (meta.editWindowExtensionUntil) {
          const extMs = new Date(meta.editWindowExtensionUntil).getTime();
          if (extMs > deadlineMs) deadlineMs = extMs;
        }
        const msRemaining = deadlineMs - Date.now();
        if (msRemaining > 0) {
          activeWindowCount++;
          daysLeft = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
          status = `Active (${daysLeft}d left)`;
          statusBadge = `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; font-weight:700;"><i data-lucide="clock" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> Active (${daysLeft}d left)</span>`;
        } else {
          expiredWindowCount++;
          status = 'Expired / Locked';
          statusBadge = '<span class="badge" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; font-weight:700;"><i data-lucide="lock" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> Expired / Locked</span>';
        }
      }

      if (meta.onboardingCompleted) {
        completedCount++;
      }

      return {
        ...p,
        meta,
        isTargetSuper,
        status,
        statusBadge,
        daysLeft,
        firstLoginDisplay: meta.firstLoginAt ? new Date(meta.firstLoginAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Never'
      };
    });

    const questions = config.questions || [];

    tabContent.innerHTML = `
      <!-- Top Overview Bar -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="user-cog" style="color:#059669;"></i> Staff Onboarding &amp; Profile Governance
            </h3>
            <p class="card-desc">
              Manage the initial login questionnaire required from staff members, configure the self-editing grace period duration, allocate institutional TGI IDs, and grant grace period extensions.
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" id="btn-add-onboarding-question" style="background:#059669; border-color:#059669;">
              <i data-lucide="plus"></i> Add Onboarding Question
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-preview-staff-modal">
              <i data-lucide="eye"></i> Preview Profile Modal
            </button>
          </div>
        </div>

        <!-- 4-Metric Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:14px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Total Staff Accounts</div>
            <div style="font-size:1.5rem; font-weight:800; color:#0f172a; margin-top:4px;">${staffProfiles.length}</div>
          </div>
          <div style="background:#FDF8E8; border:1px solid #F7E8B5; border-radius:10px; padding:12px 16px;">
            <div style="font-size:0.75rem; color:#8C6E1E; font-weight:600; text-transform:uppercase;">Active Edit Windows</div>
            <div style="font-size:1.5rem; font-weight:800; color:#059669; margin-top:4px;">${activeWindowCount}</div>
          </div>
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px 16px;">
            <div style="font-size:0.75rem; color:#991b1b; font-weight:600; text-transform:uppercase;">Expired / Locked Profiles</div>
            <div style="font-size:1.5rem; font-weight:800; color:#dc2626; margin-top:4px;">${expiredWindowCount}</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 16px;">
            <div style="font-size:0.75rem; color:#1e40af; font-weight:600; text-transform:uppercase;">Completed Profiles</div>
            <div style="font-size:1.5rem; font-weight:800; color:#2563eb; margin-top:4px;">${completedCount}</div>
          </div>
        </div>
      </div>

      <!-- Section 1: Grace Period Configuration -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header" style="flex-wrap:wrap; gap:10px; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="clock" style="color:#2563eb;"></i> Profile Edit Grace Period Window
            </h3>
            <p class="card-desc">
              When a staff member logs in for the first time, a countdown begins. During this window, they can edit their profile information. After the period expires, profile fields are locked unless an administrator grants an extension.
            </p>
          </div>
        </div>
        <div style="display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; margin-top:8px;">
          <div style="max-width:240px; flex:1;">
            <label class="form-label" style="font-weight:600; font-size:0.85rem;">Edit Grace Period (in Days) *</label>
            <div style="display:flex; align-items:center; border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
              <input type="number" id="inp-grace-period-days" class="form-input" min="1" max="180" value="${Number(config.editWindowDays) || 7}" style="border:none; font-weight:700; font-size:1rem; padding:8px 12px;">
              <div style="background:#f1f5f9; padding:8px 14px; font-weight:600; color:#475569; font-size:0.85rem; border-left:1px solid var(--border-color);">Days</div>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-save-grace-period" style="background:#2563eb; border-color:#2563eb; padding:9px 18px; border-radius:8px;">
            <i data-lucide="save"></i> Save Grace Period Setting
          </button>
        </div>
      </div>

      <!-- Section 2: First-Login Question Builder -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header" style="flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="help-circle" style="color:#059669;"></i> First-Login Staff Onboarding Questions
            </h3>
            <p class="card-desc">
              Questions presented to staff members upon initial login and rendered inside their Institutional User Profile.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-add-question-sub">
            <i data-lucide="plus"></i> Add Question
          </button>
        </div>

        <div class="table-responsive" style="margin-top:10px;">
          <table class="tms-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th>Question / Field Label</th>
                <th>Field Type</th>
                <th>Requirement</th>
                <th>Placeholder &amp; Subtext</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${questions.length === 0 ? `
                <tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No onboarding questions configured yet. Click "Add Question" above.</td></tr>
              ` : questions.map((q, idx) => {
                const typeLabels = {
                  text: 'Single-line Text',
                  textarea: 'Multi-line Paragraph',
                  select: 'Dropdown Select',
                  date: 'Date Picker',
                  number: 'Numeric'
                };
                return `
                  <tr data-qid="${esc(q.id)}">
                    <td style="font-weight:700; color:#64748b;">${idx + 1}</td>
                    <td style="font-weight:600; color:#0f172a;">
                      ${esc(q.label)}
                    </td>
                    <td>
                      <span class="badge" style="background:#f1f5f9; color:#334155;">${esc(typeLabels[q.type] || q.type)}</span>
                    </td>
                    <td>
                      ${q.required ? '<span class="badge" style="background:#fef2f2; color:#b91c1c; font-weight:700;">Mandatory *</span>' : '<span class="badge" style="background:#f8fafc; color:#64748b;">Optional</span>'}
                    </td>
                    <td style="color:#64748b; font-size:0.78rem;">
                      ${q.placeholder ? `<div><strong>Placeholder:</strong> ${esc(q.placeholder)}</div>` : ''}
                      ${q.options ? `<div><strong>Options:</strong> ${esc(q.options)}</div>` : ''}
                      ${q.subtext ? `<div><strong>Helper:</strong> ${esc(q.subtext)}</div>` : ''}
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                      <button class="btn btn-secondary btn-sm btn-edit-q" data-qid="${esc(q.id)}" title="Edit Question" style="padding:4px 8px;">
                        <i data-lucide="edit" style="width:13px;height:13px;"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm btn-del-q" data-qid="${esc(q.id)}" title="Delete Question" style="padding:4px 8px; color:#dc2626;">
                        <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                      </button>
                      ${idx > 0 ? `<button class="btn btn-secondary btn-sm btn-up-q" data-qid="${esc(q.id)}" title="Move Up" style="padding:4px 6px;"><i data-lucide="arrow-up" style="width:13px;height:13px;"></i></button>` : ''}
                      ${idx < questions.length - 1 ? `<button class="btn btn-secondary btn-sm btn-down-q" data-qid="${esc(q.id)}" title="Move Down" style="padding:4px 6px;"><i data-lucide="arrow-down" style="width:13px;height:13px;"></i></button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Staff Profile Status & Grace Period Override Roster -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="users" style="color:#2563eb;"></i> Staff Profile Roster &amp; Grace Period Overrides
            </h3>
            <p class="card-desc">
              Allocate official TGI IDs, inspect each staff member's initial login date, review profile completion status, and grant individual grace period extensions.
            </p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input type="text" class="form-input" id="staff-roster-search" placeholder="Search staff name, email, TGI ID..." style="max-width:240px; font-size:0.83rem;">
            <select class="form-select" id="staff-roster-status-filter" style="max-width:180px; font-size:0.83rem;">
              <option value="">All Statuses</option>
              <option value="active">Active Edit Window</option>
              <option value="expired">Expired / Locked</option>
              <option value="completed">Completed Profile</option>
            </select>
          </div>
        </div>

        <div class="table-responsive" style="margin-top:10px;">
          <table class="tms-table" id="table-staff-roster" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>TGI ID (Staff ID)</th>
                <th>Blood Group</th>
                <th>First Login</th>
                <th>Edit Grace Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staffData.map(st => {
                const tgiRaw = st.meta.tgiId || '';
                const tgiBadge = tgiRaw ? `<span class="badge font-mono" style="background:#f1f5f9; color:#1e293b; font-weight:700; border:1px solid #cbd5e1;">TGI-${esc(tgiRaw)}</span>` : '<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">Not Allocated</span>';
                const bloodBadge = st.meta.bloodGroup ? `<span class="badge" style="background:#FDF8E8; color:#8C6E1E; font-weight:700;">${esc(st.meta.bloodGroup)}</span>` : '<span style="color:#94a3b8;">—</span>';

                return `
                  <tr class="staff-row" data-id="${esc(st.id)}" data-name="${esc(st.name || '').toLowerCase()}" data-email="${esc(st.email || '').toLowerCase()}" data-tgi="${esc(tgiRaw).toLowerCase()}" data-status="${st.daysLeft > 0 ? 'active' : (st.meta.firstLoginAt ? 'expired' : '')}">
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${esc(st.avatar || DEFAULT_AVATAR)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);background:#f1f5f9;">
                        <div>
                          <div style="font-weight:700; color:#0f172a;">${esc(st.name || 'Staff User')}</div>
                          <div class="font-mono" style="font-size:0.75rem; color:#64748b;">${esc(st.email || '—')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" style="background:#eff6ff; color:#1e40af; font-weight:600;">${esc(ROLE_LABELS[st.role] || st.role || 'Staff')}</span>
                    </td>
                    <td>
                      <div style="display:flex; align-items:center; gap:6px;">
                        ${tgiBadge}
                        <button class="btn btn-secondary btn-sm btn-quick-tgi" data-id="${esc(st.id)}" data-name="${esc(st.name || '')}" data-tgi="${esc(tgiRaw)}" title="Assign or Edit TGI ID" style="padding:2px 6px;">
                          <i data-lucide="edit-2" style="width:12px;height:12px;"></i>
                        </button>
                      </div>
                    </td>
                    <td>${bloodBadge}</td>
                    <td style="font-size:0.78rem; color:#64748b;">${esc(st.firstLoginDisplay)}</td>
                    <td>${st.statusBadge}</td>
                    <td style="text-align:right; white-space:nowrap;">
                      ${st.isTargetSuper ? `
                        <span style="font-size:0.75rem; color:#b45309; font-weight:700;">Protected</span>
                      ` : `
                        <button class="btn btn-secondary btn-sm btn-extend-grace" data-id="${esc(st.id)}" data-name="${esc(st.name || '')}" title="Grant +7 Days Extension" style="padding:4px 8px; color:#8C6E1E;">
                          <i data-lucide="plus-circle" style="width:13px;height:13px;"></i> +7d
                        </button>
                        ${st.daysLeft > 0 ? `
                        <button class="btn btn-secondary btn-sm btn-lock-grace" data-id="${esc(st.id)}" data-name="${esc(st.name || '')}" title="Lock Profile Now" style="padding:4px 8px; color:#dc2626;">
                          <i data-lucide="lock" style="width:13px;height:13px;"></i> Lock
                        </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm btn-edit-staff-profile" data-id="${esc(st.id)}" title="Full Staff Edit" style="padding:4px 8px;">
                          <i data-lucide="settings" style="width:13px;height:13px;"></i>
                        </button>
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

    // Bind Event Handlers
    // 1. Save Grace Period Days Setting
    safeOn('btn-save-grace-period', 'click', async () => {
      const days = Number(document.getElementById('inp-grace-period-days')?.value) || 7;
      if (days < 1 || days > 180) {
        UIComponents.showToast('Please enter a grace period between 1 and 180 days.', 'warning');
        return;
      }
      config.editWindowDays = days;
      const res = await OnboardingService.saveConfig(config);
      await auditService.log('STAFF_ONBOARDING_GRACE_PERIOD_UPDATED', 'GOVERNANCE', { editWindowDays: days });
      UIComponents.showToast(`Grace period updated to ${days} days successfully!`, 'success');
      this.renderTab('staff-onboarding');
    });

    // 2. Add Question Buttons
    const openAdd = () => this.openQuestionEditorModal(null, config);
    safeOn('btn-add-onboarding-question', 'click', openAdd);
    safeOn('btn-add-question-sub', 'click', openAdd);

    // 3. Edit Question Buttons
    tabContent.querySelectorAll('.btn-edit-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.qid;
        const q = (config.questions || []).find(x => x.id === qid);
        if (q) this.openQuestionEditorModal(q, config);
      });
    });

    // 4. Delete Question Buttons
    tabContent.querySelectorAll('.btn-del-q').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qid = btn.dataset.qid;
        const q = (config.questions || []).find(x => x.id === qid);
        if (!q) return;
        if (!confirm(`Are you sure you want to delete the question "${q.label}"?`)) return;
        config.questions = (config.questions || []).filter(x => x.id !== qid);
        await OnboardingService.saveConfig(config);
        await auditService.log('STAFF_ONBOARDING_QUESTION_DELETED', 'GOVERNANCE', { questionId: qid, label: q.label });
        UIComponents.showToast('Question deleted successfully.', 'success');
        this.renderTab('staff-onboarding');
      });
    });

    // 5. Move Question Up / Down
    tabContent.querySelectorAll('.btn-up-q').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qid = btn.dataset.qid;
        const idx = config.questions.findIndex(x => x.id === qid);
        if (idx > 0) {
          const temp = config.questions[idx - 1];
          config.questions[idx - 1] = config.questions[idx];
          config.questions[idx] = temp;
          await OnboardingService.saveConfig(config);
          this.renderTab('staff-onboarding');
        }
      });
    });

    tabContent.querySelectorAll('.btn-down-q').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qid = btn.dataset.qid;
        const idx = config.questions.findIndex(x => x.id === qid);
        if (idx >= 0 && idx < config.questions.length - 1) {
          const temp = config.questions[idx + 1];
          config.questions[idx + 1] = config.questions[idx];
          config.questions[idx] = temp;
          await OnboardingService.saveConfig(config);
          this.renderTab('staff-onboarding');
        }
      });
    });

    // 6. Preview Staff Profile Modal
    safeOn('btn-preview-staff-modal', 'click', () => {
      if (window.app && typeof window.app.openMyProfile === 'function') {
        window.app.openMyProfile();
      } else {
        UIComponents.showToast('Profile preview opening...', 'info');
      }
    });

    // 7. Quick Assign / Edit TGI ID
    tabContent.querySelectorAll('.btn-quick-tgi').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        const currentTgi = btn.dataset.tgi || '';
        const staffName = btn.dataset.name || 'Staff';
        const newTgi = prompt(`Assign / Edit TGI ID for ${staffName} (e.g. 001, 002):\nNote: Prefix "TGI" is automatically attached.`, currentTgi);
        if (newTgi !== null) {
          const clean = newTgi.trim().replace(/^TGI-?/i, '');
          await OnboardingService.saveStaffMeta(userId, { tgiId: clean });
          await auditService.log('STAFF_TGI_ID_ALLOCATED', 'GOVERNANCE', { userId, tgiId: clean });
          UIComponents.showToast(`TGI ID updated for ${staffName} to TGI-${clean || 'Not Assigned'}.`, 'success');
          this.renderTab('staff-onboarding');
        }
      });
    });

    // 8. Grant Extension (+7 Days)
    tabContent.querySelectorAll('.btn-extend-grace').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        const staffName = btn.dataset.name || 'Staff Member';
        const extensionMs = Date.now() + (7 * 24 * 60 * 60 * 1000);
        await OnboardingService.saveStaffMeta(userId, {
          editWindowExtensionUntil: new Date(extensionMs).toISOString()
        });
        await auditService.log('STAFF_GRACE_PERIOD_EXTENDED', 'GOVERNANCE', { userId, extensionDays: 7 });
        UIComponents.showToast(`Granted +7 days self-editing extension to ${staffName}.`, 'success');
        this.renderTab('staff-onboarding');
      });
    });

    // 9. Lock Grace Period Immediately
    tabContent.querySelectorAll('.btn-lock-grace').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        const staffName = btn.dataset.name || 'Staff Member';
        if (!confirm(`Lock profile self-editing immediately for ${staffName}?`)) return;
        await OnboardingService.saveStaffMeta(userId, {
          editWindowExtensionUntil: new Date(Date.now() - 1000).toISOString()
        });
        await auditService.log('STAFF_PROFILE_LOCKED_MANUALLY', 'GOVERNANCE', { userId });
        UIComponents.showToast(`Profile self-editing locked for ${staffName}.`, 'success');
        this.renderTab('staff-onboarding');
      });
    });

    // 10. Open Full Edit Modal
    tabContent.querySelectorAll('.btn-edit-staff-profile').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.id;
        const profile = profiles.find(p => p.id === userId);
        if (profile) this.openUserEditModal(profile);
      });
    });

    // 11. Search and Status Filtering in Staff Roster
    const searchInp = document.getElementById('staff-roster-search');
    const filterSelect = document.getElementById('staff-roster-status-filter');
    const filterRows = () => {
      const q = (searchInp?.value || '').toLowerCase().trim();
      const statusFilter = filterSelect?.value || '';
      tabContent.querySelectorAll('.staff-row').forEach(row => {
        const name = row.dataset.name || '';
        const email = row.dataset.email || '';
        const tgi = row.dataset.tgi || '';
        const rowStatus = row.dataset.status || '';

        const matchesQuery = !q || name.includes(q) || email.includes(q) || tgi.includes(q);
        const matchesStatus = !statusFilter || (statusFilter === rowStatus);

        row.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
      });
    };
    if (searchInp) searchInp.addEventListener('input', filterRows);
    if (filterSelect) filterSelect.addEventListener('change', filterRows);

    UIComponents.refreshIcons();
  }

  /**
   * Modal dialog to Add or Edit an Onboarding Question.
   */
  static openQuestionEditorModal(existingQ = null, config = null) {
    const isEdit = !!existingQ;
    const q = existingQ || {
      id: 'q_' + Date.now().toString(36),
      label: '',
      type: 'text',
      required: true,
      placeholder: '',
      options: '',
      subtext: ''
    };

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-weight:600; font-size:0.85rem;">Question / Field Label *</label>
          <input class="form-input" id="qe-label" value="${esc(q.label)}" placeholder="e.g. Highest Educational Qualification" required style="border-radius:8px;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-weight:600; font-size:0.85rem;">Field Type</label>
            <select class="form-select" id="qe-type" style="border-radius:8px;">
              <option value="text" ${q.type === 'text' ? 'selected' : ''}>Single-line Text</option>
              <option value="textarea" ${q.type === 'textarea' ? 'selected' : ''}>Multi-line Paragraph</option>
              <option value="select" ${q.type === 'select' ? 'selected' : ''}>Dropdown Select List</option>
              <option value="date" ${q.type === 'date' ? 'selected' : ''}>Date Picker</option>
              <option value="number" ${q.type === 'number' ? 'selected' : ''}>Numeric</option>
            </select>
          </div>

          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-weight:600; font-size:0.85rem;">Mandatory Field?</label>
            <label style="display:flex; align-items:center; gap:8px; margin-top:8px; cursor:pointer;">
              <input type="checkbox" id="qe-required" ${q.required !== false ? 'checked' : ''} style="width:16px;height:16px;">
              <span style="font-size:0.85rem; font-weight:600; color:#0f172a;">Required for staff</span>
            </label>
          </div>
        </div>

        <div class="form-group" id="qe-options-group" style="margin:0; display:${q.type === 'select' ? 'block' : 'none'};">
          <label class="form-label" style="font-weight:600; font-size:0.85rem;">Dropdown Options (Comma-separated) *</label>
          <input class="form-input" id="qe-options" value="${esc(Array.isArray(q.options) ? q.options.join(', ') : (q.options || ''))}" placeholder="e.g. Bachelor Degree, Master Degree, Doctorate, Diploma">
          <div style="font-size:0.72rem; color:#64748b; margin-top:4px;">Separate choices with commas</div>
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-weight:600; font-size:0.85rem;">Placeholder Text</label>
          <input class="form-input" id="qe-placeholder" value="${esc(q.placeholder || '')}" placeholder="e.g. e.g. M.Ed, B.Sc Mathematics" style="border-radius:8px;">
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-weight:600; font-size:0.85rem;">Help / Explanatory Subtext</label>
          <input class="form-input" id="qe-subtext" value="${esc(q.subtext || '')}" placeholder="e.g. Degree or professional title" style="border-radius:8px;">
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="qe-cancel" style="border-radius:8px; padding:8px 16px;">Cancel</button>
      <button class="btn btn-primary" id="qe-save" style="background:#059669; border-color:#059669; border-radius:8px; padding:8px 18px; display:flex; align-items:center; gap:6px;">
        <i data-lucide="check"></i> <span>${isEdit ? 'Update Question' : 'Add Question'}</span>
      </button>
    `;

    UIComponents.openModal({
      title: isEdit ? 'Edit Onboarding Question' : 'Add New Onboarding Question',
      bodyHtml,
      footerHtml,
      maxWidth: '520px'
    });

    const typeSelect = document.getElementById('qe-type');
    const optionsGroup = document.getElementById('qe-options-group');
    if (typeSelect && optionsGroup) {
      typeSelect.addEventListener('change', () => {
        optionsGroup.style.display = typeSelect.value === 'select' ? 'block' : 'none';
      });
    }

    safeOn('qe-cancel', 'click', () => UIComponents.closeModal());

    safeOn('qe-save', 'click', async () => {
      const label = (document.getElementById('qe-label')?.value || '').trim();
      if (!label) {
        UIComponents.showToast('Please enter a question label.', 'warning');
        return;
      }

      const type = document.getElementById('qe-type')?.value || 'text';
      const required = document.getElementById('qe-required')?.checked || false;
      const placeholder = (document.getElementById('qe-placeholder')?.value || '').trim();
      const subtext = (document.getElementById('qe-subtext')?.value || '').trim();
      const optionsRaw = (document.getElementById('qe-options')?.value || '').trim();

      const newQ = {
        id: q.id || ('q_' + Date.now().toString(36)),
        label,
        type,
        required,
        placeholder,
        subtext,
        options: type === 'select' ? optionsRaw : ''
      };

      const currConfig = config || await OnboardingService.getConfig();
      if (!currConfig.questions) currConfig.questions = [];

      if (isEdit) {
        const idx = currConfig.questions.findIndex(x => x.id === q.id);
        if (idx !== -1) currConfig.questions[idx] = newQ;
        else currConfig.questions.push(newQ);
      } else {
        currConfig.questions.push(newQ);
      }

      await OnboardingService.saveConfig(currConfig);
      await auditService.log(isEdit ? 'STAFF_ONBOARDING_QUESTION_UPDATED' : 'STAFF_ONBOARDING_QUESTION_CREATED', 'GOVERNANCE', { questionId: newQ.id, label: newQ.label });

      UIComponents.showToast(`Question "${label}" saved successfully!`, 'success');
      UIComponents.closeModal();
      this.renderTab('staff-onboarding');
    });

    UIComponents.refreshIcons();
  }

  /**
   * Institution Profile & Campus Status Tab
   * Editable institutional registration, trust body, campus location, support contacts,
   * and Head of Institution.
   */
  static async renderInstitutionDetailsTab(tabContent) {
    const details = await institutionService.refresh();

    tabContent.innerHTML = `
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="building-2" style="color: #BF9A33;"></i> Institution Profile &amp; Campus Status
            </h3>
            <p class="card-desc">
              Manage official campus registration, trust authority, physical location, institutional support contacts, and Head of Institution. Values saved here are applied everywhere across all school portals, website CMS, documents, admission forms, and fee receipts.
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-reset-inst-defaults" style="color: #64748b;">
              <i data-lucide="rotate-ccw"></i> Reset Defaults
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: minmax(320px, 460px) 1fr; gap: 24px; align-items: start; margin-top: 14px;">
          <!-- Left Column: Live Status Card Preview -->
          <div>
            <div style="font-weight: 700; font-size: 0.82rem; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="eye" style="width: 15px; height: 15px; color: #2563eb;"></i> Live Campus Status Card
            </div>
            <div id="inst-card-preview-container">
              ${institutionService.renderStatusCardHtml(details)}
            </div>
            <div style="font-size: 0.76rem; color: #64748b; margin-top: 12px; line-height: 1.4; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px 14px;">
              ℹ️ <strong>Universal Campus Presence:</strong> This card reflects real-time institutional accreditation. Any edits made on the right update this live preview immediately.
            </div>
          </div>

          <!-- Right Column: Institutional Profile Form -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
            <h4 style="margin: 0 0 16px 0; font-size: 1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="edit-3" style="color: #2563eb; width: 18px; height: 18px;"></i> Edit Institutional Campus Details
            </h4>

            <div style="display: grid; grid-template-columns: 1fr; gap: 14px;">
              <!-- 1. Official Registration & Trust -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Official Registration No. *</label>
                  <input type="text" class="form-input inst-inp" id="inst-reg-no" value="${esc(details.regNo || '')}" placeholder="e.g. Regd. No. IV 01894/2011" style="border-radius: 8px;">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Parent Trust / Society *</label>
                  <input type="text" class="form-input inst-inp" id="inst-trust" value="${esc(details.trust || '')}" placeholder="e.g. Thaiba Heritage, Kolkata" style="border-radius: 8px;">
                </div>
              </div>

              <!-- 2. Campus Location & District -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Campus District / Badge *</label>
                  <input type="text" class="form-input inst-inp" id="inst-district" value="${esc(details.campusDistrict || '')}" placeholder="e.g. Dakshin Dinajpur" style="border-radius: 8px;">
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Shown in the blue header pill badge</div>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Full Physical Campus Location *</label>
                  <input type="text" class="form-input inst-inp" id="inst-location" value="${esc(details.campusLocation || '')}" placeholder="e.g. Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127" style="border-radius: 8px;">
                </div>
              </div>

              <!-- 3. Campus Support Contacts -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Contact Phones (Primary / Secondary)</label>
                  <input type="text" class="form-input inst-inp font-mono" id="inst-phones" value="${esc(details.contactPhones || '')}" placeholder="+91 8653382851 / +91 8167782851" style="border-radius: 8px;">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Institutional Support Email</label>
                  <input type="email" class="form-input inst-inp font-mono" id="inst-email" value="${esc(details.contactEmail || '')}" placeholder="tps@thaibagarden.com" style="border-radius: 8px;">
                </div>
              </div>

              <!-- 4. Head of Institution -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.82rem; color: #BF9A33; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="crown" style="width: 14px; height: 14px;"></i> Head of Institution (Full Name) *
                  </label>
                  <input type="text" class="form-input inst-inp" id="inst-head-name" value="${esc(details.headOfInstitutionName || '')}" placeholder="e.g. C. M. Basith" style="border-radius: 8px; font-weight: 700;">
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Authorized Executive Head</div>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.82rem; color: #BF9A33; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="mail" style="width: 14px; height: 14px;"></i> Head of Institution Email *
                  </label>
                  <input type="email" class="form-input inst-inp font-mono" id="inst-head-email" value="${esc(details.headOfInstitutionEmail || '')}" placeholder="e.g. cmbasith786@gmail.com" style="border-radius: 8px;">
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">Official Correspondence Desk</div>
                </div>
              </div>

              <!-- 5. Name, Website & Tagline -->
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Legal Institution Name *</label>
                <input type="text" class="form-input inst-inp" id="inst-name" value="${esc(details.name || '')}" placeholder="THAIBA PUBLIC SCHOOL" style="border-radius: 8px; font-weight: 700;">
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Official Public Website</label>
                  <input type="text" class="form-input inst-inp" id="inst-website" value="${esc(details.website || '')}" placeholder="https://tps.clubad.space" style="border-radius: 8px;">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-weight: 600; font-size: 0.82rem;">Campus Motto / Subtitle</label>
                  <input type="text" class="form-input inst-inp" id="inst-tagline" value="${esc(details.tagline || '')}" placeholder="Run by : Thaiba Heritage, Kolkata" style="border-radius: 8px;">
                </div>
              </div>

              <!-- Save Action -->
              <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-primary" id="btn-save-inst-details" style="background: #BF9A33; border-color: #BF9A33; padding: 10px 22px; border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="save"></i> Save Institutional Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Live Card Preview Handler
    const updatePreview = () => {
      const liveData = {
        name: document.getElementById('inst-name')?.value.trim() || details.name,
        regNo: document.getElementById('inst-reg-no')?.value.trim() || details.regNo,
        trust: document.getElementById('inst-trust')?.value.trim() || details.trust,
        campusDistrict: document.getElementById('inst-district')?.value.trim() || details.campusDistrict,
        campusLocation: document.getElementById('inst-location')?.value.trim() || details.campusLocation,
        contactPhones: document.getElementById('inst-phones')?.value.trim() || details.contactPhones,
        contactEmail: document.getElementById('inst-email')?.value.trim() || details.contactEmail,
        headOfInstitutionName: document.getElementById('inst-head-name')?.value.trim() || details.headOfInstitutionName,
        headOfInstitutionEmail: document.getElementById('inst-head-email')?.value.trim() || details.headOfInstitutionEmail,
        website: document.getElementById('inst-website')?.value.trim() || details.website,
        tagline: document.getElementById('inst-tagline')?.value.trim() || details.tagline
      };

      const container = document.getElementById('inst-card-preview-container');
      if (container) {
        container.innerHTML = institutionService.renderStatusCardHtml(liveData);
        UIComponents.refreshIcons();
      }
    };

    tabContent.querySelectorAll('.inst-inp').forEach(inp => {
      inp.addEventListener('input', updatePreview);
    });

    // Save Button Handler
    safeOn('btn-save-inst-details', 'click', async () => {
      const regNo = (document.getElementById('inst-reg-no')?.value || '').trim();
      const trust = (document.getElementById('inst-trust')?.value || '').trim();
      const campusDistrict = (document.getElementById('inst-district')?.value || '').trim();
      const campusLocation = (document.getElementById('inst-location')?.value || '').trim();
      const contactPhones = (document.getElementById('inst-phones')?.value || '').trim();
      const contactEmail = (document.getElementById('inst-email')?.value || '').trim();
      const headOfInstitutionName = (document.getElementById('inst-head-name')?.value || '').trim();
      const headOfInstitutionEmail = (document.getElementById('inst-head-email')?.value || '').trim();
      const name = (document.getElementById('inst-name')?.value || '').trim();
      const website = (document.getElementById('inst-website')?.value || '').trim();
      const tagline = (document.getElementById('inst-tagline')?.value || '').trim();

      if (!name || !regNo || !trust) {
        UIComponents.showToast('Please fill in Institution Name, Registration No., and Parent Trust.', 'warning');
        return;
      }

      const payload = {
        name,
        regNo,
        trust,
        campusDistrict: campusDistrict || 'Dakshin Dinajpur',
        campusLocation: campusLocation || 'Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127',
        contactPhones: contactPhones || '+91 8653382851 / +91 8167782851',
        contactEmail: contactEmail || 'tps@thaibagarden.com',
        headOfInstitutionName: headOfInstitutionName || 'C. M. Basith',
        headOfInstitutionEmail: headOfInstitutionEmail || 'cmbasith786@gmail.com',
        website,
        tagline
      };

      const saveBtn = document.getElementById('btn-save-inst-details');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
      }

      await institutionService.saveDetails(payload);
      await auditService.log('INSTITUTION_DETAILS_UPDATED', 'GOVERNANCE', payload);

      UIComponents.showToast('Institutional Details updated successfully & applied campus-wide!', 'success');
      this.renderTab('institution-details');
    });

    // Reset Defaults Handler
    safeOn('btn-reset-inst-defaults', 'click', async () => {
      if (!confirm('Reset all institutional campus details back to standard defaults?')) return;
      await institutionService.resetToDefaults();
      await auditService.log('INSTITUTION_DETAILS_RESET', 'GOVERNANCE', {});
      UIComponents.showToast('Institutional details reset to standard defaults.', 'info');
      this.renderTab('institution-details');
    });

    UIComponents.refreshIcons();
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
          <div class="card" style="padding:14px; text-align:center; border-left:3px solid #BF9A33;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Active Online Now</div>
            <div style="font-size:1.8rem; font-weight:800; color:#BF9A33;" id="kpi-online-count">—</div>
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
                  ${isOnline ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#BF9A33; box-shadow:0 0 8px #BF9A33;"></span>' : ''}
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
              <span style="color:#BF9A33;"><i data-lucide="wrench"></i></span>
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
          <div id="doctor-issue-count" style="font-weight:700; font-size:0.9rem; color:#BF9A33;">0 Issues Detected</div>
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
          issueCountEl.style.color = '#BF9A33';
        }
        repairBtn.disabled = true;

        container.innerHTML = `
          <div style="padding:24px; text-align:center; background:rgba(191, 154, 51,0.06); border:1.5px solid #F2D88C; border-radius:10px; color:#8C6E1E;">
            <i data-lucide="check-circle-2" style="width:36px;height:36px;display:block;margin:0 auto 8px;color:#BF9A33;"></i>
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
            <div style="font-size:1.1rem; font-weight:800; color:#BF9A33; margin-top:4px;" id="dev-kpi-status">Connected</div>
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
          pingEl.style.color = elapsed < 300 ? '#BF9A33' : '#f59e0b';
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
      { name: 'Enrolled Students', count: students.length, icon: 'graduation-cap', color: 'Gold' },
      { name: 'Staff & Faculty', count: staff.length, icon: 'users', color: 'blue' },
      { name: 'Financial Invoices', count: invoices.length, icon: 'credit-card', color: 'amber' },
      { name: 'Admission Applications', count: apps.length, icon: 'file-text', color: 'rose' },
      { name: 'Exam Assessments', count: exams.length, icon: 'award', color: 'blue' },
      { name: 'Daily Attendance Punches', count: att.length, icon: 'check-square', color: 'Gold' },
      { name: 'Class Timetables', count: timetables.length, icon: 'calendar-days', color: 'amber' },
      { name: 'Issued Certificates (TC & Merit)', count: certs.length, icon: 'file-check', color: 'rose' }
    ];

    tabContent.innerHTML = `
      <div class="card" style="border-left: 4px solid #BF9A33; margin-bottom: 24px;">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
              <span style="color: #BF9A33;"><i data-lucide="database"></i></span>
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
              <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(191, 154, 51, 0.1); color: #BF9A33; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
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
      a.download = `TPS_ERP_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
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
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; background:#FDF8E8; border:1px solid #F7E8B5; padding:12px 16px; border-radius:8px;">
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#8C6E1E; font-weight:700;">Application Status</label>
            <select class="form-select form-select-sm" id="ea-status">
              <option value="Submitted" ${app.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="Under Verification" ${app.status === 'Under Verification' ? 'selected' : ''}>Under Verification</option>
              <option value="Approved" ${app.status === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Enrolled" ${app.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#8C6E1E; font-weight:700;">Payment Status</label>
            <select class="form-select form-select-sm" id="ea-pay-status">
              <option value="Not Required" ${app.paymentStatus === 'Not Required' ? 'selected' : ''}>Not Required</option>
              <option value="Pending" ${app.paymentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Paid" ${app.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="Partial" ${app.paymentStatus === 'Partial' ? 'selected' : ''}>Partial</option>
              <option value="Waived" ${app.paymentStatus === 'Waived' ? 'selected' : ''}>Waived</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#8C6E1E; font-weight:700;">Total Fees (₹)</label>
            <input type="number" class="form-input form-input-sm" id="ea-fee-total" value="${esc(app.feeTotal != null ? app.feeTotal : 0)}">
          </div>
        </div>

        <!-- Section 1: Candidate Identity -->
        <div class="card" style="margin:0; padding:14px; border:1px solid var(--border-color); border-radius:8px;">
          <div style="font-weight:700; font-size:0.85rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
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
          <div style="font-weight:700; font-size:0.85rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
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
          <div style="font-weight:700; font-size:0.85rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
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
          <div style="font-weight:700; font-size:0.85rem; color:#8C6E1E; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
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
          <label class="form-label" style="font-size:0.78rem; font-weight:700; color:#8C6E1E; display:flex; align-items:center; gap:6px;">
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
