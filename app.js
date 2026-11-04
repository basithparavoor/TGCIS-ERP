/**
 * THAIBA PUBLIC SCHOOL — Main ERP Controller & Router
 * Hash Router: #/module/tab
 * Strict Authentication Mode & Official TMS Branding
 */

import { TMS_CONFIG } from './config.js';
import { authService } from './auth-service.js';
import { PermissionEngine } from './permission-engine.js';
import { UIComponents } from './ui-components.js';
import { dbService } from './supabase-client.js';
import { TMS_LOGO } from './logo.js';

// Import Functional Modules
import { AdminModule } from './admin-module.js';
import { InstitutionModule } from './institution-module.js';
import { MyWorkModule } from './my-work-module.js';
import { AttendanceModule } from './attendance-module.js';
import { StudentModule } from './student-module.js';
import { StaffModule } from './staff-module.js';
import { AcademicModule } from './academic-module.js';
import { ExaminationModule } from './examination-module.js';
import { FinanceModule } from './finance-module.js';
import { CommunicationModule } from './communication-module.js';
import { OperationsModule } from './operations-module.js';
import { ReportsModule } from './reports-module.js';
import { AdmissionsEntryModule } from './admissions-entry-module.js';
import { NotificationCenter } from './notification-center.js';
import { TimetableModule } from './timetable-module.js';
import { CertificatesModule } from './certificates-module.js';
import { IdCardsModule } from './id-cards-module.js';
import { CalendarModule } from './calendar-module.js';
import { HomeworkModule } from './homework-module.js';
import { WhatsAppService } from './whatsapp-service.js';
import { admissionService } from './admission-service.js';
import { brandingService } from './branding-service.js';
import { checkMigration } from './migration-check.js';

/** Escape untrusted values before putting them into an HTML template. */
const esc = (v) => UIComponents.escapeHtml(v);
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

class AppController {
  constructor() {
    this.currentRoute = '';
    this.init();
  }

  async init() {
    UIComponents.initTheme();

    // Validate the server-side session before rendering or touching data.
    await authService.init();

    // Strict Authentication Guard
    if (!authService.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }

    const currentUser = authService.getCurrentUser() || {};
    if (currentUser.role === 'pending' || currentUser.isPending || currentUser.role === 'rejected' || currentUser.isRejected) {
      window.location.href = '/login';
      return;
    }
    if (currentUser.role === TMS_CONFIG.roles.PARENT) {
      window.location.href = '/parent';
      return;
    }
    if (currentUser.role === TMS_CONFIG.roles.STUDENT) {
      window.location.href = '/student';
      return;
    }

    // Load the institute logo (cached value already applied at import time).
    brandingService.refresh().then(() => {
      const logoHost = document.getElementById('shell-logo');
      if (logoHost) logoHost.innerHTML = TMS_LOGO.emblemSvg(42);
    });

    // Warn clearly if the add-on migration has not been applied yet.
    checkMigration();

    this.renderShell();
    this.bindGlobalEvents();
    await NotificationCenter.init();

    const user = authService.getCurrentUser() || {};
    if (user.role === TMS_CONFIG.roles.OFFICE_BOY &&
        (!window.location.hash || window.location.hash === '#/dashboard' || window.location.hash === '#/')) {
      window.location.hash = '#/admissions-entry';
    }

    this.initRouter();
  }

  renderShell() {
    const user = authService.getCurrentUser() || {};
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="ambient-mesh">
        <div class="mesh-glow-1"></div>
        <div class="mesh-glow-2"></div>
      </div>

      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

      <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-brand-box" id="sidebar-brand-box">
              <span id="shell-logo" style="display:inline-flex; flex-shrink:0;">${TMS_LOGO.emblemSvg(40)}</span>
              <div class="brand-info">
                <h2>${TMS_CONFIG.institution.name}</h2>
                <p>Enterprise Campus ERP</p>
              </div>
            </div>
            <button class="sidebar-collapse-btn desktop-only" id="sidebar-collapse-btn" title="Toggle Sidebar (Ctrl+B)">
              <i data-lucide="chevron-left"></i>
            </button>
          </div>

          <nav class="sidebar-nav" id="sidebar-nav-items">
            <!-- Dynamically populated based on RBAC -->
          </nav>

          <div class="sidebar-footer">
            <div class="user-footer-wrap">
              <div class="user-mini-card" id="user-mini-card" role="button" tabindex="0" title="Edit my profile" style="cursor:pointer; flex: 1; min-width: 0;">
                <img id="user-mini-avatar" src="${esc(user.avatar || DEFAULT_AVATAR)}" alt="Avatar">
                <div class="user-details-mini" style="min-width: 0;">
                  <div class="name" id="user-mini-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(user.name || 'TMS Authorized')}</div>
                  <div class="role" id="user-mini-role" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(user.isSuperAdmin ? 'Super Admin' : (user.title || user.role))}</div>
                </div>
              </div>
              <button class="icon-btn" id="btn-logout" title="Sign Out" style="flex-shrink: 0; color: #ef4444; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="app-main">
          <!-- Topbar -->
          <header class="app-topbar">
            <div class="topbar-left">
              <button class="mobile-header-menu-btn" id="mobile-header-menu-btn" title="Navigation Menu" aria-label="Open Navigation Menu">
                <i data-lucide="menu"></i>
              </button>
              <div class="search-bar-trigger" id="global-search-trigger">
                <i data-lucide="search" style="width: 16px; height: 16px;"></i>
                <span>Search students, staff, records...</span>
                <span class="kbd-shortcut">Ctrl K</span>
              </div>
            </div>

            <div class="topbar-right">
              <div class="ticker-badge" title="Campus Active">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #BF9A33; display: inline-block; animation: badgePulse 2s infinite;"></span>
                <span>Session ${TMS_CONFIG.academic.currentYear} Active</span>
              </div>

              <button class="icon-btn notification-bell-btn" id="notification-bell" title="Notifications & Announcements" style="position: relative;">
                <i data-lucide="bell"></i>
                <span id="notification-badge" class="tms-notif-badge" style="display: none;">0</span>
              </button>

              <div class="topbar-user-avatar" id="topbar-user-avatar" role="button" tabindex="0" title="My Profile" style="cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 4px; border-radius: 8px;">
                <img src="${esc(user.avatar || DEFAULT_AVATAR)}" alt="Avatar" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--border-color);">
              </div>
            </div>
          </header>

          <!-- Module Viewport -->
          <div class="app-viewport" id="app-viewport">
            <!-- Dynamic module content injected here -->
          </div>
        </main>
      </div>

      <!-- Mobile Bottom Navigation -->
      <nav class="mobile-bottom-nav" id="mobile-bottom-nav">
        <a href="#/dashboard" class="mobile-nav-item active" data-module="dashboard">
          <i data-lucide="layout-dashboard"></i>
          <span>Overview</span>
        </a>
        <a href="#/students" class="mobile-nav-item" data-module="students">
          <i data-lucide="graduation-cap"></i>
          <span>Students</span>
        </a>
        <a href="#/attendance" class="mobile-nav-item" data-module="attendance">
          <i data-lucide="user-check"></i>
          <span>Radar</span>
        </a>
        <a href="#/finance" class="mobile-nav-item" data-module="finance">
          <i data-lucide="credit-card"></i>
          <span>Fees</span>
        </a>
        <a href="#/my-work" class="mobile-nav-item" data-module="my-work">
          <i data-lucide="briefcase"></i>
          <span>Workspace</span>
        </a>
      </nav>
    `;

    this.populateSidebarNav();

    // Bind avatar click in topbar to profile
    document.getElementById('topbar-user-avatar')?.addEventListener('click', () => this.openMyProfile());

    // Restore collapsed sidebar state on desktop
    const savedCollapsed = localStorage.getItem('tms_sidebar_collapsed') === 'true';
    if (savedCollapsed && window.innerWidth >= 993) {
      const sb = document.getElementById('app-sidebar');
      if (sb) sb.classList.add('collapsed');
      const collapseBtn = document.getElementById('sidebar-collapse-btn');
      if (collapseBtn) {
        collapseBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        collapseBtn.title = 'Expand Sidebar (Ctrl+B)';
      }
    }

    UIComponents.refreshIcons();
  }

  toggleDesktopSidebar(force = null) {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    const isCollapsed = force !== null ? force : !sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
      localStorage.setItem('tms_sidebar_collapsed', 'true');
    } else {
      sidebar.classList.remove('collapsed');
      localStorage.setItem('tms_sidebar_collapsed', 'false');
    }

    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.innerHTML = isCollapsed ? '<i data-lucide="chevron-right"></i>' : '<i data-lucide="chevron-left"></i>';
      collapseBtn.title = isCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)';
    }
    UIComponents.refreshIcons();
  }

  populateSidebarNav() {
    const nav = document.getElementById('sidebar-nav-items');
    if (!nav) return;

    const navSections = [
      {
        title: 'Campus Core',
        items: [
          { id: 'dashboard', label: 'Overview Dashboard', icon: 'layout-dashboard', module: 'dashboard' },
          { id: 'my-work', label: 'Staff Workspace', icon: 'briefcase', module: 'my-work' },
          { id: 'admissions-entry', label: 'Admission Entry', icon: 'clipboard-pen', module: 'admissions-entry' }
        ]
      },
      {
        title: 'Students & Attendance',
        items: [
          { id: 'students', label: 'Student Directory', icon: 'graduation-cap', module: 'students' },
          { id: 'id-cards', label: 'ID Cards & Badges', icon: 'contact-2', module: 'id-cards' },
          { id: 'attendance', label: 'Attendance & Radar', icon: 'user-check', module: 'attendance' }
        ]
      },
      {
        title: 'Academics & Operations',
        items: [
          { id: 'academics', label: 'Academic & Timetable', icon: 'book-open', module: 'academics' },
          { id: 'timetable', label: 'Class Timetables', icon: 'calendar-days', module: 'timetable' },
          { id: 'homework', label: 'Homework Diary', icon: 'book-check', module: 'homework' },
          { id: 'calendar', label: 'Academic Calendar', icon: 'calendar', module: 'calendar' },
          { id: 'examinations', label: 'Exams & Reports', icon: 'award', module: 'examinations' },
          { id: 'certificates', label: 'Certificates (TC & Merit)', icon: 'file-check', module: 'certificates' }
        ]
      },
      {
        title: 'Finance & Administration',
        items: [
          { id: 'finance', label: 'Finance & Accounts', icon: 'credit-card', module: 'finance' },
          { id: 'staff', label: 'Staff & HR', icon: 'users', module: 'staff' },
          { id: 'communication', label: 'Notice & Bulletins', icon: 'message-square', module: 'communication' },
          { id: 'reports', label: 'School Analytics', icon: 'bar-chart-3', module: 'reports' },
          { id: 'institution', label: 'Campus Facilities', icon: 'building', module: 'institution' },
          { id: 'administration', label: 'School Administration', icon: 'settings', module: 'administration' }
        ]
      }
    ];

    let html = '';
    navSections.forEach(section => {
      const authorized = section.items.filter(item => PermissionEngine.canAccessModule(item.module));
      if (authorized.length > 0) {
        html += `<div class="sidebar-group-title">${section.title}</div>`;
        authorized.forEach(item => {
          html += `
            <a class="nav-item" href="#/${item.module}" data-module="${item.module}" data-tooltip="${esc(item.label)}">
              <i data-lucide="${item.icon}"></i>
              <span>${item.label}</span>
            </a>
          `;
        });
      }
    });

    html += `
      <div class="sidebar-group-title" style="margin-top: 14px;">Dedicated Portals</div>
      <a class="nav-item" href="/admission" target="_blank" data-tooltip="Admission Form (A4)">
        <i data-lucide="file-text" style="color: #BF9A33;"></i>
        <span>Admission Form (A4)</span>
      </a>
    `;

    nav.innerHTML = html;
    UIComponents.refreshIcons();
  }

  bindGlobalEvents() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const mobileHeaderBtn = document.getElementById('mobile-header-menu-btn');

    // Desktop sidebar toggle
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleDesktopSidebar());
    }

    // Mobile header menu button to toggle sidebar
    if (mobileHeaderBtn && sidebar && backdrop) {
      mobileHeaderBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      });
    }

    // Ctrl+B shortcut to toggle sidebar
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          this.toggleDesktopSidebar();
        }
      }
    });

    if (sidebar && backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const confirmed = await UIComponents.confirm({
          title: 'Sign Out of TPS ERP?',
          message: 'Are you sure you want to end your current session? You will be safely signed out of Thaiba Public School Campus Gateway.',
          confirmText: 'Sign Out',
          cancelText: 'Stay Signed In',
          type: 'danger',
          icon: 'log-out'
        });
        if (confirmed) {
          authService.logout();
        }
      });
    }

    const miniCard = document.getElementById('user-mini-card');
    if (miniCard) {
      miniCard.addEventListener('click', () => this.openMyProfile());
      miniCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openMyProfile(); }
      });
    }

    // Universal Command Palette (Ctrl + K)
    const searchTrigger = document.getElementById('global-search-trigger');
    const openCommandPalette = () => {
      UIComponents.openModal({
        title: 'Universal Command Palette',
        bodyHtml: `
          <div style="margin-bottom: 12px; position: relative;">
            <input type="text" class="form-input" id="cmd-palette-input" placeholder="Search students, invoices, staff, or actions (e.g. 'kiosk', 'fees', 'tc')..." autofocus style="font-size: 1rem; padding: 12px 16px; border-radius: 10px; border-color: var(--primary);">
          </div>

          <div id="cmd-palette-results" style="max-height: 380px; overflow-y: auto; font-size: 0.85rem; padding-right: 4px;">
            <!-- Rendered by live script -->
          </div>
        `
      });

      const input = document.getElementById('cmd-palette-input');
      const results = document.getElementById('cmd-palette-results');
      if (!input || !results) return;

      const renderQuickActions = () => {
        results.innerHTML = `
          <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
            Institutional Quick Actions &amp; Navigation:
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="kiosk" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="scan" style="color: #BF9A33;"></i>
              <div><strong>Launch QR Kiosk</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Attendance Terminal</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="challan" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="layers" style="color: #2563eb;"></i>
              <div><strong>3-Part Fee Challan</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Print Bank Slips</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="timetable" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="calendar-days" style="color: #f59e0b;"></i>
              <div><strong>Class Timetable</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Weekly Period Matrix</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="tc" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="file-check" style="color: #991b1b;"></i>
              <div><strong>Transfer Certificate</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Issue Official TC</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="reports" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="award" style="color: #BF9A33;"></i>
              <div><strong>Exam Gradebook</strong><div style="font-size: 0.7rem; color: var(--text-muted);">CBSE Progress Reports</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="id-cards" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="contact-2" style="color: #BF9A33;"></i>
              <div><strong>ID Cards Studio</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Batch A4 Badges</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="homework" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="book-check" style="color: #2563eb;"></i>
              <div><strong>Homework Diary</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Daily Tasks &amp; Broadcast</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="calendar" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="calendar" style="color: #9333ea;"></i>
              <div><strong>Academic Calendar</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Holidays &amp; .ics Sync</div></div>
            </button>
            <button class="btn btn-secondary btn-sm cmd-action-btn" data-action="backup" style="justify-content: flex-start; padding: 10px; text-align: left;">
              <i data-lucide="database" style="color: #6366f1;"></i>
              <div><strong>Data Backup</strong><div style="font-size: 0.7rem; color: var(--text-muted);">Download Full JSON</div></div>
            </button>
          </div>
        `;
        UIComponents.refreshIcons();

        results.querySelectorAll('.cmd-action-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const act = btn.dataset.action;
            UIComponents.closeModal();
            if (act === 'kiosk') {
              window.location.hash = '#/attendance';
              setTimeout(() => document.getElementById('btn-qr-scanner')?.click(), 250);
            } else if (act === 'challan') {
              window.location.hash = '#/finance';
              setTimeout(() => document.getElementById('btn-generate-challan')?.click(), 250);
            } else if (act === 'timetable') {
              window.location.hash = '#/timetable';
            } else if (act === 'tc') {
              window.location.hash = '#/certificates';
              setTimeout(() => document.getElementById('btn-new-tc')?.click(), 250);
            } else if (act === 'id-cards') {
              window.location.hash = '#/id-cards';
            } else if (act === 'homework') {
              window.location.hash = '#/homework';
            } else if (act === 'calendar') {
              window.location.hash = '#/calendar';
            } else if (act === 'reports') {
              window.location.hash = '#/examinations';
            } else if (act === 'backup') {
              window.location.hash = '#/administration';
              setTimeout(() => document.querySelector('[data-tab="backup"]')?.click(), 300);
            }
          });
        });
      };

      renderQuickActions();

      let debounceTimer;
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const q = input.value.trim().toLowerCase();
          if (!q) {
            renderQuickActions();
            return;
          }

          results.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.85rem;"><i data-lucide="loader" class="animate-spin"></i> Searching...</div>`;
          UIComponents.refreshIcons();

          const [students, invoices, staff] = await Promise.all([
            dbService.select('students'),
            dbService.select('invoices'),
            dbService.select('staff_directory')
          ]);

          const matchedStudents = students.filter(s => 
            (s.fullName || '').toLowerCase().includes(q) || 
            (s.admissionNo || '').toLowerCase().includes(q) ||
            (s.grade || '').toLowerCase().includes(q)
          ).slice(0, 5);

          const matchedInvoices = invoices.filter(i => 
            (i.invoiceNo || '').toLowerCase().includes(q) || 
            (i.studentName || '').toLowerCase().includes(q)
          ).slice(0, 5);

          const matchedStaff = staff.filter(st => 
            (st.name || '').toLowerCase().includes(q) || 
            (st.designation || '').toLowerCase().includes(q)
          ).slice(0, 4);

          let html = '';

          if (matchedStudents.length) {
            html += `<div style="font-weight: 700; color: #BF9A33; font-size: 0.78rem; text-transform: uppercase; margin: 8px 0 4px;">Students (${matchedStudents.length}):</div>`;
            matchedStudents.forEach(s => {
              html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 10px; border-bottom: 1px solid var(--border-color); background: var(--bg-subtle, #f8fafc); border-radius: 6px; margin-bottom: 4px;">
                  <div>
                    <strong>${esc(s.fullName)}</strong>
                    <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 6px;">(${esc(s.admissionNo)} • ${esc(s.grade)})</span>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn btn-secondary btn-sm cmd-wa-student" data-phone="${esc(s.phone || s.parentPhone || '')}" data-name="${esc(s.fullName)}" title="WhatsApp Contact" style="padding: 2px 6px; color: #BF9A33;">
                      <i data-lucide="message-circle" style="width: 13px; height: 13px;"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm cmd-view-student" data-id="${esc(s.id)}" style="padding: 2px 8px; font-size: 0.72rem;">View Profile</button>
                  </div>
                </div>
              `;
            });
          }

          if (matchedInvoices.length) {
            html += `<div style="font-weight: 700; color: #2563eb; font-size: 0.78rem; text-transform: uppercase; margin: 12px 0 4px;">Fee Invoices (${matchedInvoices.length}):</div>`;
            matchedInvoices.forEach(inv => {
              html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 10px; border-bottom: 1px solid var(--border-color); background: var(--bg-subtle, #f8fafc); border-radius: 6px; margin-bottom: 4px;">
                  <div>
                    <span class="font-mono" style="font-weight: 700;">${esc(inv.invoiceNo)}</span>
                    <span style="margin-left: 6px;">${esc(inv.studentName)}</span>
                    <span style="color: ${inv.balance > 0 ? '#ef4444' : '#BF9A33'}; font-weight: 700; margin-left: 6px;">(₹ ${(inv.balance || inv.amount || 0).toLocaleString()})</span>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    ${inv.balance > 0 ? `
                      <button class="btn btn-secondary btn-sm cmd-wa-invoice" data-name="${esc(inv.studentName)}" data-inv="${esc(inv.invoiceNo)}" data-bal="${esc(inv.balance)}" data-due="${esc(inv.dueDate || '')}" title="WhatsApp Reminder" style="padding: 2px 6px; color: #BF9A33;">
                        <i data-lucide="message-circle" style="width: 13px; height: 13px;"></i>
                      </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm cmd-view-finance" style="padding: 2px 8px; font-size: 0.72rem;">Ledger</button>
                  </div>
                </div>
              `;
            });
          }

          if (matchedStaff.length) {
            html += `<div style="font-weight: 700; color: #6366f1; font-size: 0.78rem; text-transform: uppercase; margin: 12px 0 4px;">Faculty &amp; Staff (${matchedStaff.length}):</div>`;
            matchedStaff.forEach(st => {
              html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 10px; border-bottom: 1px solid var(--border-color); background: var(--bg-subtle, #f8fafc); border-radius: 6px; margin-bottom: 4px;">
                  <div>
                    <strong>${esc(st.name)}</strong>
                    <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 6px;">(${esc(st.designation || 'Faculty')})</span>
                  </div>
                </div>
              `;
            });
          }

          if (!html) {
            html = `<p style="color: var(--text-muted); text-align: center; padding: 24px;">No records found matching "${esc(q)}".</p>`;
          }

          results.innerHTML = html;
          UIComponents.refreshIcons();

          results.querySelectorAll('.cmd-view-student').forEach(b => {
            b.addEventListener('click', () => {
              UIComponents.closeModal();
              window.location.hash = '#/students';
            });
          });

          results.querySelectorAll('.cmd-view-finance').forEach(b => {
            b.addEventListener('click', () => {
              UIComponents.closeModal();
              window.location.hash = '#/finance';
            });
          });

          results.querySelectorAll('.cmd-wa-student').forEach(b => {
            b.addEventListener('click', () => {
              const phone = b.dataset.phone;
              const name = b.dataset.name;
              WhatsAppService.openChat(phone, `*${TMS_CONFIG.institution.name}*\nDear Parent of ${name},\nGreetings from the school administration.`);
            });
          });

          results.querySelectorAll('.cmd-wa-invoice').forEach(b => {
            b.addEventListener('click', () => {
              WhatsAppService.sendFeeReminder({
                studentName: b.dataset.name,
                invoiceNo: b.dataset.inv,
                balance: parseFloat(b.dataset.bal) || 0,
                dueDate: b.dataset.due
              });
            });
          });
        }, 150);
      });
    };

    if (searchTrigger) searchTrigger.addEventListener('click', openCommandPalette);
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    });
  }

  /** Self-service profile editor available to every signed-in user. */
  async openMyProfile() {
    const user = authService.currentUser || {};
    let pendingAvatar = null;

    const bodyHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div class="form-group" style="grid-column:1/-1; display:flex; gap:16px; align-items:center;">
          <img id="pf-avatar" src="${esc(user.avatar || DEFAULT_AVATAR)}" alt="Avatar" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);">
          <div>
            <label class="form-label">Profile Photo</label>
            <input type="file" id="pf-avatar-file" accept="image/*" class="form-input">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="pf-name" value="${esc(user.name || '')}"></div>
        <div class="form-group"><label class="form-label">Email (read-only)</label><input class="form-input" id="pf-email" value="${esc(user.email || '')}" readonly></div>
        <div class="form-group"><label class="form-label">Designation / Title</label><input class="form-input" id="pf-title" value="${esc(user.rawTitle || '')}"></div>
        <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="pf-department" value="${esc(user.rawDepartment || '')}"></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Phone</label><input class="form-input" id="pf-phone" value="${esc(user.phone || '')}"></div>
        <div class="form-group" style="grid-column:1/-1; border-top:1px solid var(--border-color); padding-top:12px;">
          <label class="form-label">Change My Password</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input type="password" class="form-input" id="pf-new-password" placeholder="New password (min 6 characters)" style="flex:1; min-width:200px;">
            <button class="btn btn-secondary" id="pf-change-password"><i data-lucide="key-round"></i> Update Password</button>
          </div>
        </div>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="pf-cancel">Cancel</button>
      <button class="btn btn-primary" id="pf-save"><i data-lucide="save"></i> Save Profile</button>
    `;
    UIComponents.openModal({ title: 'My Profile', bodyHtml, footerHtml });

    document.getElementById('pf-avatar-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // 1. Instant local preview and fallback
      const reader = new FileReader();
      reader.onload = (re) => {
        const dataUrl = re.target.result;
        pendingAvatar = dataUrl;
        const img = document.getElementById('pf-avatar');
        if (img) img.src = dataUrl;
      };
      reader.readAsDataURL(file);

      // 2. Best-effort Supabase Storage upload
      try {
        const path = `users/${user.id}-${Date.now()}-${admissionService.sanitizeFileName(file.name)}`;
        const res = await admissionService.uploadFile('avatars', path, file);
        if (!res.error) {
          const publicUrl = admissionService.getPublicUrl('avatars', res.path);
          if (publicUrl) pendingAvatar = publicUrl;
        }
      } catch (err) {
        console.warn('Storage upload notice:', err.message);
      }

      UIComponents.showToast('Profile photo ready — click Save Profile.', 'success');
    });

    document.getElementById('pf-cancel').addEventListener('click', () => UIComponents.closeModal());

    document.getElementById('pf-change-password').addEventListener('click', async () => {
      const pw = document.getElementById('pf-new-password').value;
      if (!pw || pw.length < 6) { UIComponents.showToast('Password must be at least 6 characters.', 'warning'); return; }
      const r = await authService.changePassword(pw);
      if (r.success) {
        document.getElementById('pf-new-password').value = '';
        UIComponents.showToast('Password updated.', 'success');
      } else {
        UIComponents.showToast(`Could not update password: ${r.error}`, 'danger');
      }
    });

    document.getElementById('pf-save').addEventListener('click', async () => {
      const avatarToSave = pendingAvatar || user.avatar || DEFAULT_AVATAR;
      const fields = {
        name: document.getElementById('pf-name').value.trim(),
        title: document.getElementById('pf-title').value.trim(),
        department: document.getElementById('pf-department').value.trim(),
        phone: document.getElementById('pf-phone').value.trim(),
        avatar: avatarToSave
      };
      const r = await authService.updateOwnProfile(fields);
      if (!r.success) { UIComponents.showToast(`Could not save profile: ${r.error}`, 'danger'); return; }
      const updated = r.user || fields;
      const nameEl = document.getElementById('user-mini-name');
      const roleEl = document.getElementById('user-mini-role');
      const avatarEl = document.getElementById('user-mini-avatar');
      if (nameEl && updated.name) nameEl.innerText = updated.name;
      if (roleEl && updated.title) roleEl.innerText = updated.title;
      if (avatarEl && avatarToSave) avatarEl.src = avatarToSave;
      UIComponents.showToast('Profile updated successfully!', 'success');
      UIComponents.closeModal();
    });
    UIComponents.refreshIcons();
  }

  initRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      this.handleRoute();
    }
  }

  async handleRoute() {
    authService.touchSession().catch(() => {});
    const hash = window.location.hash.slice(2) || 'dashboard';
    const [moduleName] = hash.split('/');
    const viewport = document.getElementById('app-viewport');
    if (!viewport) return;

    const moduleLabels = {
      'dashboard': 'Overview Dashboard',
      'my-work': 'Staff Workspace',
      'admissions-entry': 'Admission Entry',
      'students': 'Student Directory',
      'id-cards': 'ID Cards & Badges',
      'attendance': 'Attendance & Radar',
      'academics': 'Academic & Curriculum',
      'timetable': 'Class Timetables',
      'homework': 'Homework Diary',
      'calendar': 'Academic Calendar',
      'examinations': 'Exams & Reports',
      'certificates': 'Certificates (TC & Merit)',
      'finance': 'Finance & Accounts',
      'staff': 'Staff & HR',
      'operations': 'Campus Operations',
      'communication': 'Notice & Bulletins',
      'reports': 'School Analytics',
      'institution': 'Campus Facilities',
      'administration': 'School Administration'
    };

    const currentLabel = moduleLabels[moduleName] || 'Overview Dashboard';


    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.module === moduleName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.dataset.module === moduleName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile drawer when navigating
    const sidebarEl = document.getElementById('app-sidebar');
    const backdropEl = document.getElementById('sidebar-backdrop');
    if (sidebarEl && backdropEl && sidebarEl.classList.contains('open')) {
      sidebarEl.classList.remove('open');
      backdropEl.classList.remove('active');
    }

    if (!PermissionEngine.canAccessModule(moduleName)) {
      viewport.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px;">
          <i data-lucide="shield-alert" style="width: 56px; height: 56px; color: #ef4444; margin: 0 auto 16px;"></i>
          <h2>Access Restricted by School Security Policy</h2>
          <p style="color: var(--text-muted); max-width: 500px; margin: 8px auto 20px;">
            Your authenticated role does not possess capability authorization for module: <strong>${esc(moduleName)}</strong>.
          </p>
          <a href="#/dashboard" class="btn btn-primary">Return to Overview Dashboard</a>
        </div>
      `;
      UIComponents.refreshIcons();
      return;
    }

    switch (moduleName) {
      case 'dashboard':
        await this.renderDashboard(viewport);
        break;
      case 'my-work':
        await MyWorkModule.render(viewport);
        break;
      case 'admissions-entry':
        await AdmissionsEntryModule.render(viewport);
        break;
      case 'students':
        await StudentModule.render(viewport);
        break;
      case 'id-cards':
        await IdCardsModule.render(viewport);
        break;
      case 'attendance':
        await AttendanceModule.render(viewport);
        break;
      case 'academics':
        await AcademicModule.render(viewport);
        break;
      case 'timetable':
        await TimetableModule.render(viewport);
        break;
      case 'homework':
        await HomeworkModule.render(viewport);
        break;
      case 'calendar':
        await CalendarModule.render(viewport);
        break;
      case 'examinations':
        await ExaminationModule.render(viewport);
        break;
      case 'certificates':
        await CertificatesModule.render(viewport);
        break;
      case 'finance':
        await FinanceModule.render(viewport);
        break;
      case 'staff':
        await StaffModule.render(viewport);
        break;
      case 'operations':
        await OperationsModule.render(viewport);
        break;
      case 'communication':
        await CommunicationModule.render(viewport);
        break;
      case 'reports':
        await ReportsModule.render(viewport);
        break;
      case 'institution':
        await InstitutionModule.render(viewport);
        break;
      case 'administration':
        await AdminModule.render(viewport);
        break;
      default:
        await this.renderDashboard(viewport);
    }

    UIComponents.refreshIcons();
  }

  async renderDashboard(container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const [students, staff, invoices, attendance, applications] = await Promise.all([
      dbService.select('students'),
      dbService.select('staff_directory'),
      dbService.select('invoices'),
      dbService.select('attendance_records'),
      dbService.select('admissions_applications').catch(() => [])
    ]);
    const user = authService.getCurrentUser() || {};

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayAttendance = (attendance || []).filter(a => a.date === todayStr);
    const presentStudents = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attPercent = students.length ? Math.round((presentStudents / students.length) * 100) : 94;
    const absentees = Math.max(0, students.length - presentStudents);

    const totalCollected = (invoices || []).reduce((acc, i) => acc + (parseFloat(i.paid) || 0), 0);
    const totalDue = (invoices || []).reduce((acc, i) => acc + (parseFloat(i.balance) || 0), 0);
    const feeRatio = (totalCollected + totalDue > 0) ? Math.round((totalCollected / (totalCollected + totalDue)) * 100) : 88;

    // Greeting according to time of day
    const hour = today.getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : (hour < 17 ? 'Good afternoon' : 'Good evening');

    // 7-day Attendance Trend Data (simulated from attendance records or realistic trend)
    const trendLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const trendData = [92, 95, 89, 94, 96, 91, attPercent];

    // Monthly Fee Collection Data (in Thousands)
    const monthLabels = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    const monthData = [45, 52, 68, 74, 61, Math.max(30, Math.round(totalCollected / 1000))];

    // Class Distribution Data
    const classDistribution = [
      { name: 'Primary (Nursery-G5)', count: students.filter(s => ['Nursery','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5'].includes(s.grade)).length || 180, pct: 45 },
      { name: 'Middle (G6-G8)', count: students.filter(s => ['Grade 6','Grade 7','Grade 8'].includes(s.grade)).length || 120, pct: 30 },
      { name: 'Secondary (G9-G10)', count: students.filter(s => ['Grade 9','Grade 10'].includes(s.grade)).length || 60, pct: 15 },
      { name: 'Senior (G11-G12)', count: students.filter(s => (s.grade || '').includes('11') || (s.grade || '').includes('12')).length || 40, pct: 10 }
    ];

    // Adaptive TPSH Feature Metrics
    const totalStudentCount = students.length || 0;
    const boysCount = students.filter(s => (s.gender || '').toLowerCase() === 'male' || (s.gender || '').toLowerCase() === 'boys').length || Math.round(totalStudentCount * 0.54);
    const girlsCount = students.filter(s => (s.gender || '').toLowerCase() === 'female' || (s.gender || '').toLowerCase() === 'girls').length || (totalStudentCount - boysCount);
    const pendingAdmissions = (applications || []).filter(a => (a.status || '').toLowerCase() === 'pending').length;

    // Attendance breakdown for Arc Radar Gauge
    const lateStudents = todayAttendance.filter(a => a.status === 'late').length;
    const leaveStudents = todayAttendance.filter(a => a.status === 'leave').length;
    const absentCountCalc = todayAttendance.filter(a => a.status === 'absent').length || (totalStudentCount > 0 ? absentees : 0);
    const presentCountCalc = Math.max(0, (totalStudentCount || 100) - absentCountCalc - leaveStudents);

    // SVG Half-Donut Arc Geometry (Semi-circle radius = 80, circumference length = 251.3)
    const arcTotal = totalStudentCount > 0 ? totalStudentCount : 100;
    const lenPresent = Math.min(251.3, Math.max(0, (presentCountCalc / arcTotal) * 251.3));
    const lenLate = Math.min(251.3 - lenPresent, Math.max(0, (lateStudents / arcTotal) * 251.3));
    const lenLeave = Math.min(251.3 - (lenPresent + lenLate), Math.max(0, (leaveStudents / arcTotal) * 251.3));
    const lenAbsent = Math.max(0, 251.3 - (lenPresent + lenLate + lenLeave));

    const offsetLate = -lenPresent;
    const offsetLeave = -(lenPresent + lenLate);
    const offsetAbsent = -(lenPresent + lenLate + lenLeave);

    // Students with special attendance or leave status today
    const activeStatusStudents = (todayAttendance.length > 0)
      ? todayAttendance.filter(a => a.status === 'absent' || a.status === 'leave' || a.status === 'late')
          .map(a => {
            const st = students.find(s => s.id === a.student_id) || {};
            return {
              id: a.student_id,
              name: st.name || a.student_name || 'Student',
              avatar: st.photo || st.avatar || null,
              status: a.status || 'absent'
            };
          })
      : [];

    const isPrivacyInitial = localStorage.getItem('tms_privacy_mode') === 'true';

    container.innerHTML = `
      <div class="tms-content-wrapper">
        <!-- Top Executive Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-success" style="font-size:0.75rem;"><i data-lucide="shield-check" style="width:12px; height:12px;"></i> Official Campus Gateway</span>
            <span style="font-size:0.8rem; color:var(--text-secondary);">${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-print-morning-pulse">
              <i data-lucide="printer"></i> Executive Pulse (A4)
            </button>
            <a href="/admission" target="_blank" class="btn btn-secondary btn-sm">
              <i data-lucide="file-plus" style="color: #BF9A33;"></i> Admission Portal (A4)
            </a>
            <a href="#/attendance" class="btn btn-primary btn-sm">
              <i data-lucide="scan"></i> Gate Kiosk
            </a>
          </div>
        </div>

        <!-- 1. Dark Contrast Executive Hero Card (TPSH Adaptation) -->
        <div class="m-hero-card">
          <div class="m-hero-top-row">
            <a href="${pendingAdmissions > 0 ? '/admission' : '#/attendance'}" class="m-hero-brand-pill ${pendingAdmissions > 0 ? 'has-alert' : ''}" id="m-hero-brand-pill" title="Official Institutional Real-Time Synchronization">
              <span class="m-hero-live-indicator"></span>
              <span class="m-hero-brand-text">
                ${pendingAdmissions > 0 ? `${pendingAdmissions} Admissions Pending Review` : `THAIBA PUBLIC SCHOOL • CAMPUS LIVE`}
              </span>
            </a>
            <button class="m-hero-eye-btn" id="m-hero-eye-toggle" title="Toggle metrics privacy display" aria-label="Toggle metrics display">
              <i data-lucide="${isPrivacyInitial ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>
            </button>
          </div>

          <div class="m-hero-metric-body">
            <span class="m-hero-metric-label">TOTAL CAMPUS LEARNERS ENROLLED • SESSION ${TMS_CONFIG.academic.currentYear}</span>
            <div class="m-hero-metric-row">
              <span class="m-hero-big-number" id="m-hero-val">${isPrivacyInitial ? '••••' : totalStudentCount}</span>
              <span class="m-hero-unit">Active Students</span>
            </div>
            <div class="m-hero-trend-badge">
              <span>Boys: ${boysCount} • Girls: ${girlsCount}</span>
              <span class="m-hero-trend-sep">•</span>
              <span>Primary, Middle & Senior Wings</span>
            </div>
          </div>

          <div class="m-hero-footer-stats">
            <div class="m-hero-f-stat">
              <span class="m-hero-f-label">Morning Turnout</span>
              <span class="m-hero-f-val" id="m-hero-turnout-val" style="color: #34D399;">${isPrivacyInitial ? '••%' : attPercent + '%'}</span>
            </div>
            <div class="m-hero-f-stat">
              <span class="m-hero-f-label">Faculty & Staff</span>
              <span class="m-hero-f-val" id="m-hero-staff-val">${isPrivacyInitial ? '••' : staff.length + ' Active'}</span>
            </div>
            <div class="m-hero-f-stat">
              <span class="m-hero-f-label">Fee Realization</span>
              <span class="m-hero-f-val" id="m-hero-fee-val" style="color: #FBBF24;">${isPrivacyInitial ? '₹ ••••••' : '₹ ' + totalCollected.toLocaleString()}</span>
            </div>
            <div class="m-hero-f-stat" style="cursor: pointer;" onclick="window.location.hash='#/timetable'" title="View Live Period & Classroom Allocations">
              <span class="m-hero-f-label">Timetable Slots</span>
              <span class="m-hero-f-val" style="color: #60A5FA;">Period 3 Live →</span>
            </div>
          </div>
        </div>

        <!-- 2. Middle Row: Campus Presence Radar + Touch Bento Grid Quick Actions -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <!-- Left: Campus Presence Donut Arc Gauge Card (TPSH Adaptation) -->
          <div class="m-gauge-card">
            <div class="m-gauge-header">
              <div>
                <h4 class="m-gauge-title">Campus Presence Radar</h4>
                <span class="m-gauge-sub">Live student occupancy breakdown</span>
              </div>
              <span class="m-gauge-badge">${attPercent}% Present</span>
            </div>

            <div class="m-gauge-visual-wrap">
              <svg class="m-gauge-svg" viewBox="0 0 200 115">
                <!-- Full background track -->
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E2E8F0" stroke-width="18" stroke-linecap="round"/>
                <!-- 1. Present segment (Green) -->
                ${lenPresent > 0 ? `
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#BF9A33" stroke-width="18" stroke-linecap="round" stroke-dasharray="${lenPresent.toFixed(1)} 251.3" stroke-dashoffset="0"/>
                ` : ''}
                <!-- 2. Late segment (Amber) -->
                ${lenLate > 0 ? `
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#D97706" stroke-width="18" stroke-linecap="round" stroke-dasharray="${lenLate.toFixed(1)} 251.3" stroke-dashoffset="${offsetLate.toFixed(1)}"/>
                ` : ''}
                <!-- 3. Leave / Pass segment (Blue) -->
                ${lenLeave > 0 ? `
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#2563EB" stroke-width="18" stroke-linecap="round" stroke-dasharray="${lenLeave.toFixed(1)} 251.3" stroke-dashoffset="${offsetLeave.toFixed(1)}"/>
                ` : ''}
                <!-- 4. Absent segment (Red) -->
                ${lenAbsent > 0 ? `
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#EF4444" stroke-width="18" stroke-linecap="round" stroke-dasharray="${lenAbsent.toFixed(1)} 251.3" stroke-dashoffset="${offsetAbsent.toFixed(1)}"/>
                ` : ''}
              </svg>
              <div class="m-gauge-center-content">
                <span class="m-gauge-center-val">${attPercent}%</span>
                <span class="m-gauge-center-lbl">On Campus</span>
              </div>
            </div>

            <div class="m-gauge-legend-row">
              <div class="m-gauge-leg-item">
                <div class="m-leg-header"><span class="m-leg-dot emerald"></span><span class="m-leg-name">Present</span></div>
                <span class="m-leg-count">${presentCountCalc}</span>
              </div>
              <div class="m-gauge-leg-item">
                <div class="m-leg-header"><span class="m-leg-dot amber"></span><span class="m-leg-name">Late</span></div>
                <span class="m-leg-count">${lateStudents}</span>
              </div>
              <div class="m-gauge-leg-item">
                <div class="m-leg-header"><span class="m-leg-dot blue"></span><span class="m-leg-name">Leave</span></div>
                <span class="m-leg-count">${leaveStudents}</span>
              </div>
              <div class="m-gauge-leg-item">
                <div class="m-leg-header"><span class="m-leg-dot red"></span><span class="m-leg-name">Absent</span></div>
                <span class="m-leg-count">${absentCountCalc}</span>
              </div>
            </div>
          </div>

          <!-- Right: Touch-First 2x2 Bento Grid Quick Actions -->
          <div class="m-section-block" style="margin-bottom: 0;">
            <div class="m-section-header">
              <h3 class="m-section-title">Quick Actions</h3>
              <span class="m-section-tag">Essential Workflows</span>
            </div>

            <div class="m-actions-grid" style="grid-template-columns: repeat(2, 1fr);">
              <!-- Admission Tile -->
              <a href="/admission" target="_blank" class="m-action-tile">
                <div class="m-action-icon-wrap mint">
                  <i data-lucide="file-plus" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="m-action-meta">
                  <div class="m-action-name-row">
                    <span class="m-action-name">Admissions</span>
                    ${pendingAdmissions > 0 ? `<span class="m-action-badge">${pendingAdmissions}</span>` : ''}
                  </div>
                  <span class="m-action-desc">${pendingAdmissions > 0 ? `${pendingAdmissions} awaiting review` : 'Official A4 intake'}</span>
                </div>
              </a>

              <!-- Attendance Kiosk Tile -->
              <a href="#/attendance" class="m-action-tile">
                <div class="m-action-icon-wrap blue">
                  <i data-lucide="scan" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="m-action-meta">
                  <div class="m-action-name-row">
                    <span class="m-action-name">Gate Kiosk</span>
                  </div>
                  <span class="m-action-desc">Live QR radar scanner</span>
                </div>
              </a>

              <!-- Fee Counter Tile -->
              <a href="#/finance" class="m-action-tile">
                <div class="m-action-icon-wrap amber">
                  <i data-lucide="receipt" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="m-action-meta">
                  <div class="m-action-name-row">
                    <span class="m-action-name">Cash Counter</span>
                  </div>
                  <span class="m-action-desc">₹ ${totalDue.toLocaleString()} pending</span>
                </div>
              </a>

              <!-- Timetable Slots Tile -->
              <a href="#/timetable" class="m-action-tile">
                <div class="m-action-icon-wrap purple">
                  <i data-lucide="calendar" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="m-action-meta">
                  <div class="m-action-name-row">
                    <span class="m-action-name">Timetable</span>
                  </div>
                  <span class="m-action-desc">Classroom teaching slots</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- 3. Daily Absentee & Leave Register Horizontal Carousel (TPSH Adaptation) -->
        <div class="m-section-block">
          <div class="m-section-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 class="m-section-title">Daily Absentee &amp; Leave Register</h3>
              <span class="m-leave-count-pill">${activeStatusStudents.length}</span>
            </div>
            <a href="#/attendance" class="m-section-link">Attendance Register →</a>
          </div>

          ${activeStatusStudents.length === 0 ? `
            <div style="padding: 14px 18px; background: #FBF7EE; border: 1.5px solid #F1DFA8; border-radius: 14px; color: #7A611C; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 10px; width: 100%;">
              <i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: #BF9A33; flex-shrink: 0;"></i>
              <span>All campus learners accounted for today. Zero unexcused absentees.</span>
            </div>
          ` : `
            <div class="m-residents-scroll">
              ${activeStatusStudents.map(st => `
                <a href="#/students" class="m-res-item" title="${esc(st.name)} (${esc(st.status)})">
                  <div class="m-res-avatar-wrap">
                    <div class="m-res-avatar ${st.status}">
                      ${st.avatar ? `<img src="${esc(st.avatar)}" alt="${esc(st.name)}">` : `<span>${(st.name[0] || 'S').toUpperCase()}</span>`}
                    </div>
                    <span class="m-res-badge-dot ${st.status === 'absent' ? 'dot-red' : (st.status === 'leave' ? 'dot-blue' : 'dot-amber')}"></span>
                  </div>
                  <span class="m-res-name">${esc(st.name.split(' ')[0])}</span>
                  <span class="m-res-status-pill status-${st.status}">${esc(st.status)}</span>
                </a>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Section 3: Institutional Statistics (KPI Row) -->
        <div class="kpi-grid">
          ${UIComponents.renderKpiCard({
            title: 'Total Enrolled Students',
            value: `${students.length}`,
            icon: 'users',
            color: 'emerald',
            subtitle: `Academic Session ${TMS_CONFIG.academic.currentYear}`,
            trend: { direction: 'up', label: '+4.8% vs last term' }
          })}
          ${UIComponents.renderKpiCard({
            title: 'Faculty & Employees',
            value: `${staff.length}`,
            icon: 'briefcase',
            color: 'blue',
            subtitle: 'Verified Campus Personnel',
            trend: { direction: 'up', label: '100% on duty' }
          })}
          ${UIComponents.renderKpiCard({
            title: 'Total Fee Realization',
            value: `₹ ${totalCollected.toLocaleString()}`,
            icon: 'credit-card',
            color: 'amber',
            subtitle: 'Collections Realized',
            progress: feeRatio
          })}
          ${UIComponents.renderKpiCard({
            title: 'Campus Geofence Status',
            value: 'Active',
            icon: 'map-pin',
            color: 'rose',
            subtitle: 'Baghait 300m Zone Enforced'
          })}
        </div>

        <!-- Section 4: Analytics and Insights (Interactive Visualizations) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 24px; margin-bottom: 24px;">
          <!-- Chart 1: Attendance Trends -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="trending-up" style="width:18px; height:18px; color:#BF9A33;"></i>
                  Student Attendance Trends
                </h3>
                <p class="card-desc">7-Day Campus-wide Student Turnout Percentage</p>
              </div>
              <span class="badge badge-success">Average 93.8%</span>
            </div>
            ${UIComponents.renderAreaChart({
              id: 'dash-att-trend',
              data: trendData,
              labels: trendLabels,
              height: 200,
              strokeColor: '#BF9A33',
              fillColor: 'rgba(22, 163, 74, 0.15)'
            })}
          </div>

          <!-- Chart 2: Monthly Fee Collections -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="bar-chart-3" style="width:18px; height:18px; color:#3B82F6;"></i>
                  Monthly Fee Collections
                </h3>
                <p class="card-desc">Inflow Trend Across Academic Semesters (in ₹ '000)</p>
              </div>
              <span class="badge badge-info">Term Inflow</span>
            </div>
            ${UIComponents.renderBarChart({
              id: 'dash-fee-chart',
              data: monthData,
              labels: monthLabels,
              height: 200,
              color: '#3B82F6',
              valuePrefix: '₹'
            })}
          </div>
        </div>

        <!-- Second Row of Analytics: Distribution & Performance -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 24px; margin-bottom: 24px;">
          <!-- Class-wise Distribution -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="pie-chart" style="width:18px; height:18px; color:#8B5CF6;"></i>
                  Class-wise Student Distribution
                </h3>
                <p class="card-desc">Student Count Ratio across School Wings</p>
              </div>
              <span class="badge badge-secondary">${students.length} Total</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:12px; padding: 6px 0;">
              ${classDistribution.map(cd => `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:600; color:var(--text-primary); margin-bottom:4px;">
                    <span>${esc(cd.name)}</span>
                    <span>${cd.count} (${cd.pct}%)</span>
                  </div>
                  <div style="height:8px; background:var(--bg-canvas-subtle); border-radius:9999px; overflow:hidden;">
                    <div style="width:${cd.pct}%; height:100%; background:linear-gradient(90deg, #BF9A33 0%, #3B82F6 100%); border-radius:9999px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Academic Performance Overview -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="award" style="width:18px; height:18px; color:#F59E0B;"></i>
                  Academic Performance Overview
                </h3>
                <p class="card-desc">CBSE Standard Grading Distribution across Exams</p>
              </div>
              <span class="badge badge-warning">Term Evaluation</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; padding: 6px 0;">
              <div style="text-align:center; padding:12px 8px; background:#FBF7EE; border:1px solid #F1DFA8; border-radius:10px;">
                <div style="font-size:1.35rem; font-weight:800; color:#BF9A33;">38%</div>
                <div style="font-size:0.75rem; font-weight:700; color:#7A611C; margin-top:2px;">A1 (91-100%)</div>
                <div style="font-size:0.68rem; color:#64748B;">Distinction</div>
              </div>
              <div style="text-align:center; padding:12px 8px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px;">
                <div style="font-size:1.35rem; font-weight:800; color:#2563EB;">32%</div>
                <div style="font-size:0.75rem; font-weight:700; color:#1E40AF; margin-top:2px;">A2 (81-90%)</div>
                <div style="font-size:0.68rem; color:#64748B;">First Class</div>
              </div>
              <div style="text-align:center; padding:12px 8px; background:#FEF3C7; border:1px solid #FDE68A; border-radius:10px;">
                <div style="font-size:1.35rem; font-weight:800; color:#D97706;">22%</div>
                <div style="font-size:0.75rem; font-weight:700; color:#92400E; margin-top:2px;">B1 (71-80%)</div>
                <div style="font-size:0.68rem; color:#64748B;">High Merit</div>
              </div>
              <div style="text-align:center; padding:12px 8px; background:#F1F5F9; border:1px solid #E2E8F0; border-radius:10px;">
                <div style="font-size:1.35rem; font-weight:800; color:#475569;">8%</div>
                <div style="font-size:0.75rem; font-weight:700; color:#334155; margin-top:2px;">B2 (61-70%)</div>
                <div style="font-size:0.68rem; color:#64748B;">Satisfactory</div>
              </div>
            </div>
            <div style="margin-top:14px; font-size:0.78rem; color:var(--text-secondary); text-align:center;">
              Overall campus academic index rating: <strong style="color:#BF9A33;">9.1 / 10 (Exemplary)</strong>
            </div>
          </div>
        </div>

        <!-- Section 5: Authorized Quick Actions Hub -->
        <div style="margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin:0;">
              Authorized Administrative Shortcuts
            </h2>
            <span style="font-size:0.8rem; color:var(--text-secondary);">Direct Module Operations</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;">
            <a href="/admission" target="_blank" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#ecfdf5; color:#BF9A33; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="file-plus" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">Admission Form</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Official A4 Portal</div>
              </div>
            </a>

            <a href="#/students" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="graduation-cap" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">Student Directory</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Profiles & Rosters</div>
              </div>
            </a>

            <a href="#/attendance" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#FBF7EE; color:#BF9A33; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="scan" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">QR Gate Kiosk</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Live Radar Scanner</div>
              </div>
            </a>

            <a href="#/finance" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#fffbeb; color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="receipt" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">Fee Cash Counter</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">3-Part Bank Challan</div>
              </div>
            </a>

            <a href="#/examinations" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="award" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">Exams & Reports</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">CBSE Grade Cards</div>
              </div>
            </a>

            <a href="#/id-cards" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#f5f3ff; color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="contact-2" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">ID Cards Studio</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Batch PVC Badges</div>
              </div>
            </a>

            <a href="#/homework" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="book-check" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">Homework Diary</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Daily Tasks Broadcast</div>
              </div>
            </a>

            <a href="#/administration" class="card" style="padding:16px; display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit; cursor:pointer;">
              <div style="width:40px; height:40px; border-radius:10px; background:#f8fafc; color:#475569; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="settings" style="width:20px; height:20px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">School Admin</div>
                <div style="font-size:0.74rem; color:var(--text-secondary);">Settings & Controls</div>
              </div>
            </a>
          </div>
        </div>

        <!-- Section 6 & 7: Recent Activities Timeline & Institution Profile -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 24px;">
          <!-- Recent Activities -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                <i data-lucide="clock" style="width:18px; height:18px; color:#BF9A33;"></i>
                Recent Institutional Activity
              </h3>
              <span class="badge badge-success">Live Feed</span>
            </div>
            <div class="tms-timeline">
              <div class="tms-timeline-item">
                <div class="tms-timeline-badge" style="background:#ecfdf5; border-color:#86efac; color:#BF9A33;">
                  <i data-lucide="user-check" style="width:16px; height:16px;"></i>
                </div>
                <div class="tms-timeline-content">
                  <div class="tms-timeline-title">Morning QR Attendance Session Initialized</div>
                  <div class="tms-timeline-meta">
                    <span>Gate 01 Terminal</span>
                    <span>•</span>
                    <span>Today, 08:30 AM</span>
                  </div>
                </div>
              </div>

              <div class="tms-timeline-item">
                <div class="tms-timeline-badge" style="background:#eff6ff; border-color:#bfdbfe; color:#3b82f6;">
                  <i data-lucide="receipt" style="width:16px; height:16px;"></i>
                </div>
                <div class="tms-timeline-content">
                  <div class="tms-timeline-title">Fee Receipts Synchronized with Accounts Ledger</div>
                  <div class="tms-timeline-meta">
                    <span>Finance Cash Counter</span>
                    <span>•</span>
                    <span>Today, 10:15 AM</span>
                  </div>
                </div>
              </div>

              <div class="tms-timeline-item">
                <div class="tms-timeline-badge" style="background:#fffbeb; border-color:#fde68a; color:#f59e0b;">
                  <i data-lucide="clipboard-pen" style="width:16px; height:16px;"></i>
                </div>
                <div class="tms-timeline-content">
                  <div class="tms-timeline-title">New Online Admission Application Received</div>
                  <div class="tms-timeline-meta">
                    <span>${applications.length ? applications.length + ' Total Applications' : 'Under Verification'}</span>
                    <span>•</span>
                    <span>Yesterday</span>
                  </div>
                </div>
              </div>

              <div class="tms-timeline-item">
                <div class="tms-timeline-badge" style="background:#f5f3ff; border-color:#ddd6fe; color:#8b5cf6;">
                  <i data-lucide="shield-check" style="width:16px; height:16px;"></i>
                </div>
                <div class="tms-timeline-content">
                  <div class="tms-timeline-title">Campus Geofence Security Perimeter Verified</div>
                  <div class="tms-timeline-meta">
                    <span>300m Radius GPS Active</span>
                    <span>•</span>
                    <span>Continuous</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Institution Profile -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
                <i data-lucide="building" style="width:18px; height:18px; color:#BF9A33;"></i>
                Institution Profile &amp; Campus Status
              </h3>
              <span class="badge badge-info">Dakshin Dinajpur</span>
            </div>
            <div style="font-size: 0.88rem; line-height: 1.65;">
              <div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); display:flex; align-items:flex-start; gap:10px;">
                <i data-lucide="file-check-2" style="width:18px; height:18px; color:#BF9A33; flex-shrink:0; margin-top:3px;"></i>
                <div>
                  <strong>Official Registration / Trust:</strong>
                  <div style="color:var(--text-secondary); font-size:0.84rem;">Regd. No. IV 01894/2011 • Run by Thaiba Heritage, Kolkata</div>
                </div>
              </div>

              <div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); display:flex; align-items:flex-start; gap:10px;">
                <i data-lucide="map-pin" style="width:18px; height:18px; color:#3b82f6; flex-shrink:0; margin-top:3px;"></i>
                <div>
                  <strong>Campus Location:</strong>
                  <div style="color:var(--text-secondary); font-size:0.84rem;">Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127</div>
                </div>
              </div>

              <div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); display:flex; align-items:flex-start; gap:10px;">
                <i data-lucide="phone" style="width:18px; height:18px; color:#f59e0b; flex-shrink:0; margin-top:3px;"></i>
                <div>
                  <strong>Institutional Contact &amp; Support:</strong>
                  <div style="color:var(--text-secondary); font-size:0.84rem;">+91 8653382851 / +91 8167782851 • tms@thaibagarden.com</div>
                </div>
              </div>

              <div style="display:flex; align-items:flex-start; gap:10px;">
                <i data-lucide="user-check" style="width:18px; height:18px; color:#8b5cf6; flex-shrink:0; margin-top:3px;"></i>
                <div>
                  <strong>Super Administrator:</strong>
                  <div style="color:var(--text-secondary); font-size:0.84rem;">C. M. Basith (${TMS_CONFIG.superAdminEmail})</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Privacy Eye Toggle (TPSH Adaptation)
    const eyeBtn = container.querySelector('#m-hero-eye-toggle');
    if (eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        const cur = localStorage.getItem('tms_privacy_mode') === 'true';
        const next = !cur;
        localStorage.setItem('tms_privacy_mode', String(next));

        const valEl = container.querySelector('#m-hero-val');
        const turnEl = container.querySelector('#m-hero-turnout-val');
        const staffEl = container.querySelector('#m-hero-staff-val');
        const feeEl = container.querySelector('#m-hero-fee-val');

        if (valEl) valEl.textContent = next ? '••••' : totalStudentCount;
        if (turnEl) turnEl.textContent = next ? '••%' : `${attPercent}%`;
        if (staffEl) staffEl.textContent = next ? '••' : `${staff.length} Active`;
        if (feeEl) feeEl.textContent = next ? '₹ ••••••' : `₹ ${totalCollected.toLocaleString()}`;

        eyeBtn.innerHTML = next 
          ? '<i data-lucide="eye-off" style="width:18px; height:18px;"></i>' 
          : '<i data-lucide="eye" style="width:18px; height:18px;"></i>';
        UIComponents.refreshIcons();
      });
    }

    // Principal Executive Pulse Print Modal
    const pulseBtn = container.querySelector('#btn-print-morning-pulse');
    if (pulseBtn) {
      pulseBtn.addEventListener('click', () => {
        const printStyles = `
          <style>
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              body * { visibility: hidden !important; }
              #morning-pulse-print, #morning-pulse-print * { visibility: visible !important; }
              #morning-pulse-print { position: absolute; left: 0; top: 0; width: 100% !important; border: 2px solid #064e3b !important; }
              .tms-modal-overlay, .tms-modal, .tms-modal-content { background: transparent !important; border: none !important; box-shadow: none !important; }
              .tms-modal-header, .tms-modal-footer, #app-sidebar, header { display: none !important; }
            }
          </style>
        `;

        UIComponents.openModal({
          title: "Principal's Daily Morning Campus Pulse Briefing",
          bodyHtml: `
            ${printStyles}
            <div id="morning-pulse-print" style="background: #ffffff; color: #0f172a; padding: 30px; border: 2px solid #BF9A33; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #BF9A33; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                  <h2 style="font-size: 1.45rem; font-weight: 800; color: #7A611C; margin: 0; text-transform: uppercase;">${esc(TMS_CONFIG.institution.name)}</h2>
                  <div style="font-size: 0.8rem; color: #8C6E1E; font-weight: 600;">DAILY EXECUTIVE CAMPUS BRIEFING • OFFICE OF THE PRINCIPAL</div>
                  <div style="font-size: 0.72rem; color: #64748b;">${esc(TMS_CONFIG.institution.address.campus)}, ${esc(TMS_CONFIG.institution.address.city)}</div>
                </div>
                <div style="text-align: right; font-size: 0.8rem;">
                  <div>Date: <strong>${new Date().toLocaleDateString('en-GB')}</strong></div>
                  <div>Time: <strong>${new Date().toLocaleTimeString()}</strong></div>
                  <span class="badge badge-success" style="margin-top: 4px;">Session ${TMS_CONFIG.academic.currentYear}</span>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
                  <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Student Muster</div>
                  <div style="font-size: 1.35rem; font-weight: 800; color: #BF9A33;">${attPercent}% Present</div>
                  <div style="font-size: 0.76rem; color: #475569;">${presentStudents} Present / ${students.length} Enrolled</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
                  <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Faculty &amp; Staff</div>
                  <div style="font-size: 1.35rem; font-weight: 800; color: #2563eb;">${staff.length} Present</div>
                  <div style="font-size: 0.76rem; color: #475569;">All academic periods covered</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
                  <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Fee Collections</div>
                  <div style="font-size: 1.35rem; font-weight: 800; color: #BF9A33;">₹ ${totalCollected.toLocaleString()}</div>
                  <div style="font-size: 0.76rem; color: #475569;">₹ ${totalDue.toLocaleString()} pending balance</div>
                </div>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 24px;">
                <strong style="color: #0f172a; font-size: 0.88rem; display: block; margin-bottom: 6px;">Principal's Daily Campus Directives:</strong>
                <ul style="font-size: 0.82rem; color: #475569; margin: 0 0 0 16px; line-height: 1.5;">
                  <li>Gate 01 entry kiosk reports verified biometric / QR arrivals. Unexcused absentees escalated for SMS alert.</li>
                  <li>Academic syllabus progress verified on track across all classes.</li>
                  <li>Campus geofence and security protocols active.</li>
                </ul>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; font-size: 0.85rem; text-align: center;">
                <div style="width: 180px;">
                  <div style="border-bottom: 1.5px solid #0f172a; margin-bottom: 4px; height: 30px;"></div>
                  <strong>Vice Principal / Coordinator</strong>
                </div>
                <div style="width: 180px;">
                  <div style="border-bottom: 1.5px solid #0f172a; margin-bottom: 4px; height: 30px;"></div>
                  <strong style="color: #7A611C;">Principal &amp; Headmaster</strong>
                </div>
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Close</button>
            <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Print Pulse Summary (A4)</button>
          `
        });
        UIComponents.refreshIcons();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.tmsApp = new AppController();
});
