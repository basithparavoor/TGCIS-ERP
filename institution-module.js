/**
 * THAIBA HERITAGE GROUP OF INSTITUTIONS — Central Management & Member Schools Directory
 * Central Management controlling all Sub-Managements (Schools & Campuses)
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { institutionService } from './institution-service.js';
import { auditService } from './audit-service.js';
import { downloadCsv } from './export-utils.js';

export class InstitutionModule {
  static async render(container, activeTab = 'sub-managements') {
    this._currentTab = activeTab;
    const esc = (v) => UIComponents.escapeHtml(v);

    const [facilities, students, staff] = await Promise.all([
      dbService.select('facilities').catch(() => []),
      dbService.select('students').catch(() => []),
      dbService.select('staff_directory').catch(() => [])
    ]);

    this._facilities = facilities || [];
    this._students = students || [];
    this._staff = staff || [];

    const schools = institutionService.getSchools();
    const groupProfile = institutionService.getGroupProfile();
    const activeSchoolId = institutionService.getActiveSchoolId();
    const isCentral = institutionService.isCentralManagementMode();

    // Calculate group totals
    const totalSchools = schools.length;
    const totalStudents = students.length;
    const totalStaff = staff.length;
    const totalSpaces = facilities.length;

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'Central Management & Member Schools',
          subtitle: 'Central governance, sub-management school branches, multi-campus infrastructure & trust credentials.',
          breadcrumbs: [{ label: 'Central Management' }, { label: 'Schools & Campuses' }],
          badge: isCentral ? 'Central Group HQ' : `Active: ${institutionService.getActiveSchool()?.shortName || 'Campus'}`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-group-trust-modal">
              <i data-lucide="shield-check"></i> Group Trust Profile
            </button>
            <button class="btn btn-primary btn-sm" id="btn-register-school">
              <i data-lucide="plus-circle"></i> Register School Branch
            </button>
          `
        })}

        <!-- Central Group Consolidated KPI Row -->
        <div class="kpi-grid">
          ${UIComponents.renderKpiCard({ title: 'Member Schools', value: `${totalSchools}`, icon: 'building-2', color: 'blue' })}
          ${UIComponents.renderKpiCard({ title: 'Total Group Students', value: `${totalStudents.toLocaleString()}`, icon: 'graduation-cap', color: 'Gold' })}
          ${UIComponents.renderKpiCard({ title: 'Total Faculty & Staff', value: `${totalStaff.toLocaleString()}`, icon: 'users', color: 'amber' })}
          ${UIComponents.renderKpiCard({ title: 'Campus Facilities / Rooms', value: `${totalSpaces.toLocaleString()}`, icon: 'door-open', color: 'rose' })}
        </div>

        <!-- Tab Navigation Bar -->
        <div class="tms-tab-bar" style="margin-bottom: 20px; display: flex; gap: 8px; border-bottom: 2px solid var(--border-color); padding-bottom: 2px;">
          <button class="tms-tab-pill ${this._currentTab === 'sub-managements' ? 'active' : ''}" data-tab="sub-managements" style="padding: 10px 18px; border-radius: 8px 8px 0 0; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; background: ${this._currentTab === 'sub-managements' ? 'var(--primary, #BF9A33)' : 'transparent'}; color: ${this._currentTab === 'sub-managements' ? '#ffffff' : 'var(--text-main, #334155)'};">
            <i data-lucide="building-2"></i>
            <span>Sub-Managements &amp; Schools (${schools.length})</span>
          </button>
          <button class="tms-tab-pill ${this._currentTab === 'facilities' ? 'active' : ''}" data-tab="facilities" style="padding: 10px 18px; border-radius: 8px 8px 0 0; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; background: ${this._currentTab === 'facilities' ? 'var(--primary, #BF9A33)' : 'transparent'}; color: ${this._currentTab === 'facilities' ? '#ffffff' : 'var(--text-main, #334155)'};">
            <i data-lucide="door-open"></i>
            <span>Physical Facilities &amp; Rooms (${facilities.length})</span>
          </button>
          <button class="tms-tab-pill ${this._currentTab === 'governance' ? 'active' : ''}" data-tab="governance" style="padding: 10px 18px; border-radius: 8px 8px 0 0; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; background: ${this._currentTab === 'governance' ? 'var(--primary, #BF9A33)' : 'transparent'}; color: ${this._currentTab === 'governance' ? '#ffffff' : 'var(--text-main, #334155)'};">
            <i data-lucide="shield"></i>
            <span>Central Trust &amp; Group Governance</span>
          </button>
        </div>

        <!-- Tab 1: Sub-Managements & Member Schools -->
        <div id="tab-pane-sub-managements" style="display: ${this._currentTab === 'sub-managements' ? 'block' : 'none'};">
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 class="card-title">Controlled Sub-Managements (Member Schools)</h3>
                <p class="card-desc">Central Management directs, audits, and supervises all operating campus branches.</p>
              </div>
              <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary btn-sm" id="btn-export-schools">
                  <i data-lucide="download"></i> Export Directory (CSV)
                </button>
                <button class="btn btn-primary btn-sm" id="btn-register-school-2">
                  <i data-lucide="plus"></i> Add School
                </button>
              </div>
            </div>

            <!-- Schools Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; padding: 4px;">
              ${schools.map(sch => {
                const isActiveBranch = activeSchoolId === sch.id;
                const branchStudents = students.filter(s => (s.school_id || s.schoolId || 'tps').toLowerCase() === sch.id.toLowerCase()).length;
                const branchStaff = staff.filter(s => (s.school_id || s.schoolId || 'tps').toLowerCase() === sch.id.toLowerCase()).length;
                const branchFacilities = facilities.filter(f => (f.school_id || f.schoolId || 'tps').toLowerCase() === sch.id.toLowerCase()).length;

                return `
                  <div class="school-branch-card" style="background: #ffffff; border: 2px solid ${isActiveBranch ? 'var(--primary, #BF9A33)' : '#e2e8f0'}; border-radius: 16px; padding: 22px; position: relative; box-shadow: ${isActiveBranch ? '0 8px 24px rgba(191,154,51,0.14)' : '0 4px 14px rgba(15,23,42,0.03)'}; transition: all 0.2s ease;">
                    ${isActiveBranch ? `
                      <span style="position: absolute; top: -11px; right: 20px; background: var(--primary, #BF9A33); color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 3px 12px; border-radius: 999px; letter-spacing: 0.04em;">
                        CURRENT ACTIVE CONSOLE
                      </span>
                    ` : ''}

                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: ${sch.themeColor ? sch.themeColor + '18' : '#eff6ff'}; color: ${sch.themeColor || '#2563eb'}; border: 1.5px solid ${sch.themeColor ? sch.themeColor + '40' : '#bfdbfe'}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; flex-shrink: 0;">
                          ${esc(sch.logoBadge || sch.code?.substring(0, 3) || 'SCH')}
                        </div>
                        <div>
                          <h4 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; line-height: 1.2;">
                            ${esc(sch.name)}
                          </h4>
                          <div style="font-size: 0.78rem; color: #64748b; font-weight: 600; margin-top: 2px;">
                            Code: <span class="font-mono" style="color: #0f172a; font-weight: 700;">${esc(sch.code)}</span> &bull; ${esc(sch.board || 'Affiliated')}
                          </div>
                        </div>
                      </div>
                      <span class="badge ${sch.status === 'Active' ? 'badge-success' : 'badge-warning'}" style="flex-shrink: 0;">
                        ${esc(sch.status || 'Active')}
                      </span>
                    </div>

                    <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 14px; font-style: italic;">
                      &ldquo;${esc(sch.tagline || 'Excellence in Education')}&rdquo;
                    </p>

                    <!-- Campus Details List -->
                    <div style="background: #f8fafc; border-radius: 10px; padding: 12px 14px; font-size: 0.82rem; color: #334155; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="user-check" style="width: 15px; height: 15px; color: #BF9A33; flex-shrink: 0;"></i>
                        <span style="font-weight: 600;">Head / Principal:</span>
                        <span style="color: #0f172a; font-weight: 700;">${esc(sch.principal || 'Basith Sir')}</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="map-pin" style="width: 15px; height: 15px; color: #2563eb; flex-shrink: 0;"></i>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${esc(sch.address?.campus || sch.address?.city || 'Tapan Campus')}, ${esc(sch.address?.district || 'Dakshin Dinajpur')}
                        </span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="phone" style="width: 15px; height: 15px; color: #16a34a; flex-shrink: 0;"></i>
                        <span>${esc(sch.contact?.phone1 || '+91 8653382851')}</span>
                      </div>
                    </div>

                    <!-- Mini Live Stats -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; text-align: center;">
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${branchStudents}</div>
                        <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Students</div>
                      </div>
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${branchStaff}</div>
                        <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Staff &amp; HR</div>
                      </div>
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${branchFacilities}</div>
                        <div style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Rooms/Labs</div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <button class="btn btn-primary btn-sm btn-switch-school" data-id="${esc(sch.id)}" style="flex: 1; min-width: 130px; justify-content: center;">
                        <i data-lucide="arrow-right-circle"></i>
                        ${isActiveBranch ? 'In Active Console' : 'Switch To Branch'}
                      </button>
                      <button class="btn btn-secondary btn-sm btn-edit-school" data-id="${esc(sch.id)}" title="Configure school settings">
                        <i data-lucide="settings"></i> Configure
                      </button>
                      ${schools.length > 1 ? `
                        <button class="btn btn-secondary btn-sm btn-del-school" data-id="${esc(sch.id)}" title="Archive / Delete School Branch" style="color: #ef4444;">
                          <i data-lucide="trash-2"></i>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Tab 2: Facilities Directory -->
        <div id="tab-pane-facilities" style="display: ${this._currentTab === 'facilities' ? 'block' : 'none'};">
          <div class="card">
            <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 class="card-title">Campus Physical Spaces Directory</h3>
                <p class="card-desc">Classrooms, science laboratories, computer wings, library, and faculty lounges across campuses.</p>
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <label style="font-size: 0.82rem; font-weight: 700; color: #64748b;">Filter by Campus:</label>
                <select class="form-select form-select-sm" id="fac-filter-school" style="width: auto; min-width: 180px;">
                  <option value="all">All Schools &amp; Campuses</option>
                  ${schools.map(s => `<option value="${esc(s.id)}">${esc(s.shortName || s.name)}</option>`).join('')}
                </select>
                <button class="btn btn-primary btn-sm" id="btn-add-facility">
                  <i data-lucide="plus-circle"></i> Add Facility / Room
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
              <button class="btn btn-secondary btn-sm" id="btn-fac-select-all"><i data-lucide="check-square"></i> Select All</button>
              <button class="btn btn-secondary btn-sm" id="btn-fac-clear">Clear</button>
              <button class="btn btn-secondary btn-sm" id="btn-fac-bulk-export"><i data-lucide="download"></i> Export Selected</button>
              <button class="btn btn-secondary btn-sm" id="btn-fac-bulk-delete" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete Selected (<span id="fac-selected-count">0</span>)</button>
            </div>

            <div class="table-responsive">
              <table class="tms-table" id="facilities-table">
                <thead>
                  <tr>
                    <th style="width:34px;"><input type="checkbox" id="fac-select-all-cb"></th>
                    <th>Facility ID</th>
                    <th>Campus / School</th>
                    <th>Building / Wing</th>
                    <th>Floor</th>
                    <th>Room Name</th>
                    <th>Capacity</th>
                    <th>Operating Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="facilities-tbody">
                  ${this.renderFacilitiesRows(facilities, esc)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 3: Central Trust & Group Profile -->
        <div id="tab-pane-governance" style="display: ${this._currentTab === 'governance' ? 'block' : 'none'};">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 24px;">
            <!-- Central Group Governance Card -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Central Educational Trust &amp; Governance</h3>
                  <p class="card-desc">Controlling entity overseeing all member schools in the network.</p>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-edit-group-profile">
                  <i data-lucide="pencil"></i> Edit Trust Profile
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                  <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.04em;">Group Name</div>
                  <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${esc(groupProfile.name)}</div>
                  <div style="font-size: 0.85rem; color: #BF9A33; font-weight: 700; margin-top: 2px;">${esc(groupProfile.tagline || 'Central Group Governance')}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                    <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">Educational Trust</div>
                    <div style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${esc(groupProfile.trust)}</div>
                  </div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                    <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">Registration No</div>
                    <div style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${esc(groupProfile.regNo)}</div>
                  </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                  <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">Executive Director &amp; Central Management Head</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 2px;">
                    ${esc(groupProfile.executiveDirector || 'C. M. Basith')}
                    <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">(${esc(groupProfile.directorEmail || 'cmbasith786@gmail.com')})</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                    <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">Central Headquarters</div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: #0f172a; margin-top: 2px;">${esc(groupProfile.headquarters || 'Kolkata, West Bengal')}</div>
                  </div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                    <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">Central Helpline</div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: #0f172a; margin-top: 2px;">${esc(groupProfile.contactPhone || '+91 8653382851')}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active Context Status Card -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Active Operating Console Card</h3>
                  <p class="card-desc">Preview of credentials rendered across official certificates, invoices &amp; ID cards.</p>
                </div>
              </div>
              <div style="display: flex; justify-content: center; padding: 10px 0;">
                ${institutionService.renderStatusCardHtml()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
    UIComponents.refreshIcons();
  }

  static renderFacilitiesRows(facilities, esc) {
    if (!facilities.length) {
      return `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No facility records available.</td></tr>`;
    }
    const schools = institutionService.getSchools();
    return facilities.map(f => {
      const schId = (f.school_id || f.schoolId || 'tps').toLowerCase();
      const school = schools.find(s => s.id.toLowerCase() === schId);
      const schoolBadge = school ? school.shortName || school.code : 'TPS';

      return `
        <tr data-school="${esc(schId)}">
          <td><input type="checkbox" class="fac-row-check" value="${esc(f.id)}"></td>
          <td><span class="font-mono" style="font-weight: 600; font-size:0.74rem;">${esc(f.id)}</span></td>
          <td><span class="badge badge-info" style="font-size: 0.74rem;">${esc(schoolBadge)}</span></td>
          <td><strong>${esc(f.building)}</strong></td>
          <td>${esc(f.floor)}</td>
          <td>${esc(f.name)}</td>
          <td>${esc(f.capacity)} Seats</td>
          <td><span class="badge ${/maint/i.test(String(f.status || '')) ? 'badge-warning' : 'badge-success'}">${esc(f.status || 'Active')}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn btn-secondary btn-sm btn-maint-facility" data-id="${esc(f.id)}" title="Toggle maintenance status"><i data-lucide="wrench"></i></button>
            <button class="btn btn-secondary btn-sm btn-edit-facility" data-id="${esc(f.id)}" title="Edit facility"><i data-lucide="pencil"></i></button>
            <button class="btn btn-secondary btn-sm btn-del-facility" data-id="${esc(f.id)}" title="Delete facility" style="color:#ef4444;"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  static bindEvents(container) {
    const facilities = this._facilities || [];

    // Tab navigation pills
    container.querySelectorAll('.tms-tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        InstitutionModule.render(container, targetTab);
      });
    });

    // Register School Branch modal
    const openAddSchool = () => this.openSchoolModal(null, container);
    container.querySelector('#btn-register-school')?.addEventListener('click', openAddSchool);
    container.querySelector('#btn-register-school-2')?.addEventListener('click', openAddSchool);

    // Switch school branch buttons
    container.querySelectorAll('.btn-switch-school').forEach(b => {
      b.addEventListener('click', () => {
        const schId = b.dataset.id;
        const switched = institutionService.setActiveSchoolId(schId);
        UIComponents.showToast(`Switched active context to ${switched.name}!`, 'success');
        InstitutionModule.render(container, 'sub-managements');
      });
    });

    // Edit school configuration
    container.querySelectorAll('.btn-edit-school').forEach(b => {
      b.addEventListener('click', () => {
        const schId = b.dataset.id;
        const school = institutionService.getSchool(schId);
        if (school) this.openSchoolModal(school, container);
      });
    });

    // Delete school branch
    container.querySelectorAll('.btn-del-school').forEach(b => {
      b.addEventListener('click', async () => {
        const schId = b.dataset.id;
        const school = institutionService.getSchool(schId);
        if (!school) return;
        if (!confirm(`Are you sure you want to remove "${school.name}" (${school.code}) from the group registry?\n\nThis will unbind this campus branch from Central Management.`)) return;

        const res = await institutionService.deleteSchool(schId);
        if (res.success) {
          UIComponents.showToast(`School branch "${school.name}" removed from group.`, 'success');
          InstitutionModule.render(container, 'sub-managements');
        } else {
          UIComponents.showToast(res.error || 'Could not remove school', 'danger');
        }
      });
    });

    // Edit Group Trust Profile modal
    const openGroupModal = () => this.openGroupProfileModal(container);
    container.querySelector('#btn-group-trust-modal')?.addEventListener('click', openGroupModal);
    container.querySelector('#btn-edit-group-profile')?.addEventListener('click', openGroupModal);

    // Export schools directory
    container.querySelector('#btn-export-schools')?.addEventListener('click', () => {
      const schools = institutionService.getSchools();
      const header = ['School Code', 'School Name', 'Board', 'Principal', 'Email', 'Phone', 'District', 'Status'];
      const data = schools.map(s => [
        s.code,
        s.name,
        s.board || 'Affiliated',
        s.principal || 'Basith Sir',
        s.contact?.email || s.principalEmail || '',
        s.contact?.phone1 || '',
        s.address?.district || 'Dakshin Dinajpur',
        s.status || 'Active'
      ]);
      downloadCsv(`Group-Schools-Directory-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
      UIComponents.showToast('Group schools directory exported.', 'success');
    });

    // Filter facilities by school
    const facFilter = container.querySelector('#fac-filter-school');
    if (facFilter) {
      facFilter.addEventListener('change', () => {
        const val = facFilter.value.toLowerCase();
        const rows = container.querySelectorAll('#facilities-tbody tr');
        rows.forEach(r => {
          const sch = (r.dataset.school || '').toLowerCase();
          if (val === 'all' || sch === val) {
            r.style.display = '';
          } else {
            r.style.display = 'none';
          }
        });
      });
    }

    // Facility CRUD Events
    const addBtn = container.querySelector('#btn-add-facility');
    if (addBtn) addBtn.addEventListener('click', () => this.openFacilityModal(null, container));

    container.querySelectorAll('.btn-edit-facility').forEach((b) =>
      b.addEventListener('click', () => {
        const f = facilities.find((x) => x.id === b.dataset.id);
        if (f) this.openFacilityModal(f, container);
      }));

    container.querySelectorAll('.btn-del-facility').forEach((b) =>
      b.addEventListener('click', () => {
        const f = facilities.find((x) => x.id === b.dataset.id);
        if (f) this.deleteFacilities([f], container);
      }));

    container.querySelectorAll('.btn-maint-facility').forEach((b) =>
      b.addEventListener('click', async () => {
        const f = facilities.find((x) => x.id === b.dataset.id);
        if (!f) return;
        const next = /maint/i.test(String(f.status || '')) ? 'Active' : 'Under Maintenance';
        await dbService.update('facilities', f.id, { status: next });
        await auditService.log('FACILITY_MAINTENANCE_LOGGED', 'OPERATIONS', { facilityId: f.id, status: next }, f.id);
        UIComponents.showToast(`${f.name} marked as ${next}.`, 'success');
        await InstitutionModule.render(container, 'facilities');
      }));

    // Selection & Bulk Actions for facilities
    const checked = () => Array.from(container.querySelectorAll('.fac-row-check:checked')).map((c) => c.value);
    const syncCount = () => {
      const el = container.querySelector('#fac-selected-count');
      if (el) el.innerText = checked().length;
    };
    const selectedFacilities = () => facilities.filter((f) => checked().includes(f.id));

    container.querySelectorAll('.fac-row-check').forEach((c) => c.addEventListener('change', syncCount));
    container.querySelector('#fac-select-all-cb')?.addEventListener('change', (e) => {
      container.querySelectorAll('.fac-row-check').forEach((c) => { c.checked = e.target.checked; });
      syncCount();
    });
    container.querySelector('#btn-fac-select-all')?.addEventListener('click', () => {
      container.querySelectorAll('.fac-row-check').forEach((c) => { c.checked = true; });
      syncCount();
    });
    container.querySelector('#btn-fac-clear')?.addEventListener('click', () => {
      container.querySelectorAll('.fac-row-check').forEach((c) => { c.checked = false; });
      syncCount();
    });
    container.querySelector('#btn-fac-bulk-delete')?.addEventListener('click', () => {
      const rows = selectedFacilities();
      if (!rows.length) { UIComponents.showToast('Select at least one facility.', 'warning'); return; }
      this.deleteFacilities(rows, container);
    });
    container.querySelector('#btn-fac-bulk-export')?.addEventListener('click', () => {
      const rows = selectedFacilities();
      if (!rows.length) { UIComponents.showToast('Select at least one facility.', 'warning'); return; }
      const header = ['Facility ID', 'Campus', 'Building', 'Floor', 'Room Name', 'Capacity', 'Status'];
      const data = rows.map((f) => [f.id, f.school_id || 'TPS', f.building, f.floor, f.name, f.capacity, f.status]);
      downloadCsv(`Facilities-Export-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
      UIComponents.showToast('Selected facilities exported.', 'success');
    });
  }

  /* -------------------------------------------------------------------------- */
  /* School Branch Modal (Register / Edit Sub-Management)                       */
  /* -------------------------------------------------------------------------- */

  static openSchoolModal(school, container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const isEdit = !!school;
    const s = school || {};

    UIComponents.openModal({
      title: isEdit ? `Configure Sub-Management — ${s.name || ''}` : 'Register New Sub-Management / School Branch',
      bodyHtml: `
        <form id="form-school-modal" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">School / Campus Full Name <span class="req-star">*</span></label>
              <input class="form-input" id="sch-name" required value="${esc(s.name || '')}" placeholder="e.g. Thaiba Public School">
            </div>
            <div class="form-group">
              <label class="form-label">Short Code <span class="req-star">*</span></label>
              <input class="form-input font-mono" id="sch-code" required ${isEdit ? 'readonly' : ''} value="${esc(s.code || '')}" placeholder="e.g. TPS-TAPAN">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Tagline / Mission</label>
              <input class="form-input" id="sch-tagline" value="${esc(s.tagline || 'Modern Education with Morality')}" placeholder="Tagline">
            </div>
            <div class="form-group">
              <label class="form-label">Affiliation Board</label>
              <input class="form-input" id="sch-board" value="${esc(s.board || 'State / Central Affiliated')}" placeholder="e.g. CBSE / State Board">
            </div>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #BF9A33; margin-bottom: 8px;">Sub-Management Leadership &amp; Contact</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Head of Institution / Principal Name <span class="req-star">*</span></label>
                <input class="form-input" id="sch-principal" required value="${esc(s.principal || 'C. M. Basith')}" placeholder="Principal Name">
              </div>
              <div class="form-group">
                <label class="form-label">Principal Email</label>
                <input type="email" class="form-input" id="sch-principal-email" value="${esc(s.principalEmail || '')}" placeholder="principal@domain.com">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Contact Phone(s) <span class="req-star">*</span></label>
                <input class="form-input" id="sch-phone" required value="${esc(s.contact?.phone1 || s.contactPhone || '+91 8653382851')}" placeholder="+91 xxxxxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label">Campus Email</label>
                <input type="email" class="form-input" id="sch-email" value="${esc(s.contact?.email || s.contactEmail || '')}" placeholder="school@thaibagarden.com">
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #BF9A33; margin-bottom: 8px;">Campus Location &amp; Geofence</div>
            <div class="form-group">
              <label class="form-label">Campus Address &amp; Locality</label>
              <input class="form-input" id="sch-address" value="${esc(s.address?.campus || 'Baghait, Tapan, Dakshin Dinajpur')}" placeholder="Full address">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">District</label>
                <input class="form-input" id="sch-district" value="${esc(s.address?.district || 'Dakshin Dinajpur')}">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input class="form-input" id="sch-state" value="${esc(s.address?.state || 'West Bengal')}">
              </div>
              <div class="form-group">
                <label class="form-label">Theme Color</label>
                <input type="color" class="form-input" id="sch-color" value="${esc(s.themeColor || '#BF9A33')}" style="height: 38px; padding: 2px;">
              </div>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="sch-cancel">Cancel</button>
        <button class="btn btn-primary" id="btn-save-school"><i data-lucide="save"></i> ${isEdit ? 'Save Changes' : 'Register Sub-Management'}</button>
      `
    });

    document.getElementById('sch-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('btn-save-school').addEventListener('click', async () => {
      const name = document.getElementById('sch-name').value.trim();
      const code = document.getElementById('sch-code').value.trim().toUpperCase();
      const tagline = document.getElementById('sch-tagline').value.trim();
      const board = document.getElementById('sch-board').value.trim();
      const principal = document.getElementById('sch-principal').value.trim();
      const principalEmail = document.getElementById('sch-principal-email').value.trim();
      const phone = document.getElementById('sch-phone').value.trim();
      const email = document.getElementById('sch-email').value.trim();
      const campus = document.getElementById('sch-address').value.trim();
      const district = document.getElementById('sch-district').value.trim();
      const state = document.getElementById('sch-state').value.trim();
      const themeColor = document.getElementById('sch-color').value;

      if (!name || !code) {
        UIComponents.showToast('Please enter both School Name and Code.', 'warning');
        return;
      }

      const payload = {
        name,
        code,
        shortName: name.length > 18 ? name.substring(0, 18) + '...' : name,
        tagline,
        board,
        principal,
        principalEmail,
        contact: { phone1: phone, email },
        address: { campus, district, state },
        themeColor,
        status: s.status || 'Active'
      };

      if (isEdit) {
        const res = await institutionService.updateSchool(s.id, payload);
        if (!res.success) {
          UIComponents.showToast(res.error || 'Update failed', 'danger');
          return;
        }
        await auditService.log('SCHOOL_BRANCH_UPDATED', 'GOVERNANCE', { code, name }, s.id);
        UIComponents.showToast(`School ${name} updated successfully!`, 'success');
      } else {
        const res = await institutionService.addSchool(payload);
        if (!res.success) {
          UIComponents.showToast(res.error || 'Registration failed', 'danger');
          return;
        }
        await auditService.log('SCHOOL_BRANCH_REGISTERED', 'GOVERNANCE', { code, name }, res.school.id);
        UIComponents.showToast(`New sub-management "${name}" registered successfully!`, 'success');
      }

      UIComponents.closeModal();
      await InstitutionModule.render(container, 'sub-managements');
    });

    UIComponents.refreshIcons();
  }

  /* -------------------------------------------------------------------------- */
  /* Central Group Trust Profile Modal                                          */
  /* -------------------------------------------------------------------------- */

  static openGroupProfileModal(container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const grp = institutionService.getGroupProfile();

    UIComponents.openModal({
      title: 'Central Trust & Group Governance Settings',
      bodyHtml: `
        <form id="form-group-modal" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Central Group / Organization Name <span class="req-star">*</span></label>
            <input class="form-input" id="grp-name" required value="${esc(grp.name || '')}">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Educational Trust / Society Name <span class="req-star">*</span></label>
              <input class="form-input" id="grp-trust" required value="${esc(grp.trust || 'Thaiba Heritage, Kolkata')}">
            </div>
            <div class="form-group">
              <label class="form-label">Trust Registration No <span class="req-star">*</span></label>
              <input class="form-input font-mono" id="grp-reg" required value="${esc(grp.regNo || 'IV 01894/2011')}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Executive Group Director Name <span class="req-star">*</span></label>
              <input class="form-input" id="grp-director" required value="${esc(grp.executiveDirector || 'C. M. Basith')}">
            </div>
            <div class="form-group">
              <label class="form-label">Director Central Email</label>
              <input type="email" class="form-input" id="grp-director-email" value="${esc(grp.directorEmail || 'cmbasith786@gmail.com')}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Central Headquarters Address</label>
              <input class="form-input" id="grp-hq" value="${esc(grp.headquarters || 'Kolkata, West Bengal, India')}">
            </div>
            <div class="form-group">
              <label class="form-label">Central Helpline Phone</label>
              <input class="form-input" id="grp-phone" value="${esc(grp.contactPhone || '+91 8653382851')}">
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="grp-cancel">Cancel</button>
        <button class="btn btn-primary" id="btn-save-group"><i data-lucide="save"></i> Save Group Profile</button>
      `
    });

    document.getElementById('grp-cancel').addEventListener('click', () => UIComponents.closeModal());
    document.getElementById('btn-save-group').addEventListener('click', async () => {
      const name = document.getElementById('grp-name').value.trim();
      const trust = document.getElementById('grp-trust').value.trim();
      const regNo = document.getElementById('grp-reg').value.trim();
      const executiveDirector = document.getElementById('grp-director').value.trim();
      const directorEmail = document.getElementById('grp-director-email').value.trim();
      const headquarters = document.getElementById('grp-hq').value.trim();
      const contactPhone = document.getElementById('grp-phone').value.trim();

      if (!name || !trust) {
        UIComponents.showToast('Please enter Group Name and Trust Name.', 'warning');
        return;
      }

      const updates = { name, trust, regNo, executiveDirector, directorEmail, headquarters, contactPhone };
      await institutionService.updateGroupProfile(updates);
      await auditService.log('GROUP_PROFILE_UPDATED', 'GOVERNANCE', updates);
      UIComponents.closeModal();
      UIComponents.showToast('Central Group Profile updated successfully!', 'success');
      await InstitutionModule.render(container, 'governance');
    });

    UIComponents.refreshIcons();
  }

  /* -------------------------------------------------------------------------- */
  /* Facilities Modal                                                           */
  /* -------------------------------------------------------------------------- */

  static openFacilityModal(facility, container) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const f = facility || {};
    const isEdit = !!facility;
    const schools = institutionService.getSchools();
    const floors = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'];
    const statuses = ['Active', 'Under Maintenance', 'Closed'];

    UIComponents.openModal({
      title: isEdit ? `Edit Facility — ${f.name || ''}` : 'Register New Campus Space / Facility',
      bodyHtml: `
        <form id="form-new-facility">
          <div class="form-group">
            <label class="form-label">School / Campus Branch <span class="req-star">*</span></label>
            <select class="form-select" id="fac-school">
              ${schools.map(s => `
                <option value="${esc(s.id)}" ${(f.school_id || institutionService.getActiveSchoolId()) === s.id ? 'selected' : ''}>
                  ${esc(s.name)} (${esc(s.code)})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Building / Wing Name *</label>
            <input class="form-input" id="fac-building" required value="${esc(f.building || '')}" placeholder="e.g. Ibn Sina Academic Block">
          </div>
          <div class="form-group">
            <label class="form-label">Floor</label>
            <select class="form-select" id="fac-floor">
              ${floors.map((v) => `<option ${f.floor === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Facility / Room Name *</label>
            <input class="form-input" id="fac-name" required value="${esc(f.name || '')}" placeholder="e.g. Grade 10-A Smart Classroom">
          </div>
          <div class="form-group">
            <label class="form-label">Seating Capacity</label>
            <input type="number" class="form-input" id="fac-capacity" required value="${f.capacity != null ? esc(f.capacity) : ''}" placeholder="35">
          </div>
          <div class="form-group">
            <label class="form-label">Operating Status</label>
            <select class="form-select" id="fac-status">
              ${statuses.map((v) => `<option ${(f.status || 'Active') === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" id="fac-cancel">Cancel</button>
        ${isEdit ? '<button class="btn btn-secondary" id="fac-delete" style="color:#ef4444;"><i data-lucide="trash-2"></i> Delete</button>' : ''}
        <button class="btn btn-primary" id="btn-save-facility"><i data-lucide="save"></i> ${isEdit ? 'Save Changes' : 'Save Facility'}</button>
      `
    });

    document.getElementById('fac-cancel').addEventListener('click', () => UIComponents.closeModal());
    const delBtn = document.getElementById('fac-delete');
    if (delBtn) delBtn.addEventListener('click', () => { UIComponents.closeModal(); this.deleteFacilities([f], container); });

    document.getElementById('btn-save-facility').addEventListener('click', async () => {
      const schoolId = document.getElementById('fac-school').value;
      const building = document.getElementById('fac-building').value.trim();
      const floor = document.getElementById('fac-floor').value;
      const name = document.getElementById('fac-name').value.trim();
      const capacity = parseInt(document.getElementById('fac-capacity').value, 10) || 30;
      const status = document.getElementById('fac-status').value;

      if (!name) {
        UIComponents.showToast('Please enter room name.', 'warning');
        return;
      }

      const payload = { school_id: schoolId, building, floor, name, capacity, status };
      const record = isEdit
        ? await dbService.update('facilities', f.id, payload)
        : await dbService.insert('facilities', payload);

      if (record && record._syncError) {
        UIComponents.showToast(`Facility could not be saved: ${record._syncError}`, 'danger');
        return;
      }

      await auditService.log(isEdit ? 'FACILITY_UPDATED' : 'FACILITY_ADDED', 'OPERATIONS', { name, building, capacity, schoolId }, isEdit ? f.id : record.id);
      UIComponents.closeModal();
      UIComponents.showToast(`Facility ${name} ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
      await InstitutionModule.render(container, 'facilities');
    });

    UIComponents.refreshIcons();
  }

  static async deleteFacilities(rows, container) {
    const label = rows.length === 1 ? `Delete ${rows[0].name}?` : `Delete ${rows.length} facilities?`;
    if (!confirm(`${label}\n\nThis permanently removes the facility record. This cannot be undone.`)) return;
    for (const f of rows) {
      await dbService.delete('facilities', f.id);
      await auditService.log('FACILITY_DELETED', 'OPERATIONS', { facilityId: f.id, name: f.name }, f.id);
    }
    UIComponents.showToast(`${rows.length} facility(ies) deleted.`, 'success');
    await InstitutionModule.render(container, 'facilities');
  }
}

export default InstitutionModule;
