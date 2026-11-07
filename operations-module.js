/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Campus Logistics, Library, Transport & Inventory Module
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';
import { websiteService } from './website-service.js';

export class OperationsModule {
  static async render(container) {
    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'Campus Logistics & Operations',
          subtitle: 'Library circulation, school transport fleet, hostel dormitories, and physical asset inventory.',
          icon: 'truck',
          breadcrumbs: [
            { label: 'Campus Core' },
            { label: 'Operations' },
            { label: 'Logistics' }
          ],
          actions: `
            <button class="btn btn-primary" id="btn-issue-book"><i data-lucide="book-open"></i> Issue Library Book</button>
          `
        })}

        <div class="kpi-grid">
          ${UIComponents.renderKpiCard({ title: 'Library Catalogued Books', value: '—', icon: 'library', color: 'blue', subtitle: 'No Records Available' })}
          ${UIComponents.renderKpiCard({ title: 'School Bus Fleet', value: '—', icon: 'bus', color: 'Gold', subtitle: 'No Records Available' })}
          ${websiteService.isHostelEnabled() ? UIComponents.renderKpiCard({ title: 'Hostel Residents', value: '126 / 150', icon: 'home', color: 'amber', subtitle: '84% Occupancy' }) : ''}
          ${UIComponents.renderKpiCard({ title: 'Tracked Campus Assets', value: '—', icon: 'package', color: 'rose', subtitle: 'No Records Available' })}
        </div>

        <!-- Segmented Pill Tabs Rail -->
        <div class="tms-tab-scroll-wrapper">
          <button type="button" class="tms-tab-nav-btn tms-tab-nav-prev" aria-label="Scroll left" title="Scroll tabs left">
            <i data-lucide="chevron-left"></i>
          </button>
          <div class="tms-segmented-tabs tms-tab-scroll-rail">
            <button class="tms-tab-pill active ops-tab" data-tab="library">
              <i data-lucide="book"></i>
              <span>Library &amp; ISBN Catalogue</span>
            </button>
            <button class="tms-tab-pill ops-tab" data-tab="transport">
              <i data-lucide="bus"></i>
              <span>Transport &amp; Bus Routes</span>
            </button>
            ${websiteService.isHostelEnabled() ? `
            <button class="tms-tab-pill ops-tab" data-tab="hostel">
              <i data-lucide="home"></i>
              <span>Hostel &amp; Dormitories</span>
            </button>` : ''}
            <button class="tms-tab-pill ops-tab" data-tab="inventory">
              <i data-lucide="package"></i>
              <span>Asset Inventory</span>
            </button>
          </div>
        </div>

        <div id="ops-tab-content"></div>
      </div>
    `;

    this.bindEvents(container);
    this.renderTab('library', container);
    UIComponents.refreshIcons();
  }

  static renderTab(tabKey, container) {
    if (tabKey === 'hostel' && !websiteService.isHostelEnabled()) {
      tabKey = 'library';
      const libTab = container.querySelector('.ops-tab[data-tab="library"]');
      if (libTab) {
        container.querySelectorAll('.ops-tab').forEach(b => b.classList.remove('active'));
        libTab.classList.add('active');
      }
    }
    const content = container.querySelector('#ops-tab-content');
    if (!content) return;

    if (tabKey === 'library') {
      content.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Central Thaiba Library — Active Circulation</h3>
              <p class="card-desc">Book checkouts, RFID/Barcode tracking, due dates, and fine calculations.</p>
            </div>
            <span class="badge badge-info">Circulation Ledger</span>
          </div>

          <div class="table-responsive">
            <table class="tms-table font-mono" style="font-size: 0.84rem;">
              <thead>
                <tr>
                  <th>Accession No</th>
                  <th>ISBN</th>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Issued To</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No records available yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (tabKey === 'transport') {
      content.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">School Bus Fleet & City Transit Routes</h3>
            <span class="badge badge-info">Fleet Tracking</span>
          </div>
          <div class="table-responsive">
            <table class="tms-table">
              <thead>
                <tr>
                  <th>Route No</th>
                  <th>Bus Reg No</th>
                  <th>Route Name & Key Stops</th>
                  <th>Driver Name</th>
                  <th>Driver Mobile</th>
                  <th>Enrolled Students</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No records available yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (tabKey === 'hostel') {
      let allocations = [];
      try {
        const stored = localStorage.getItem('tms_hostel_allocations');
        if (stored) allocations = JSON.parse(stored);
        if (!Array.isArray(allocations) || allocations.length === 0) {
          allocations = [
            { id: 'ha-1', studentName: 'Rehan Ahmed', rollNo: 'TMS-2601', classGrade: 'Grade 9 - A', wing: 'Hazrat Bilal Boys Wing', roomNo: 'Room 102', bedNo: 'Bed B-1', guardianPhone: '+91 9832101122', status: 'Active' },
            { id: 'ha-2', studentName: 'Tariq Mahmood', rollNo: 'TMS-2608', classGrade: 'Grade 10 - B', wing: 'Hazrat Bilal Boys Wing', roomNo: 'Room 104', bedNo: 'Bed B-2', guardianPhone: '+91 9832145566', status: 'Active' },
            { id: 'ha-3', studentName: 'Fatima Siddiqua', rollNo: 'TMS-2615', classGrade: 'Grade 8 - A', wing: 'Fatima-tuz-Zahra Girls Wing', roomNo: 'Room 201', bedNo: 'Bed G-1', guardianPhone: '+91 9732112233', status: 'Active' },
            { id: 'ha-4', studentName: 'Zainab Parveen', rollNo: 'TMS-2622', classGrade: 'Grade 11 - Science', wing: 'Fatima-tuz-Zahra Girls Wing', roomNo: 'Room 205', bedNo: 'Bed G-3', guardianPhone: '+91 9434098877', status: 'On Leave' }
          ];
          localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
        }
      } catch (e) { /* ignore */ }

      const cfg = websiteService.getConfig();
      const h = cfg.hostel || {};
      const wings = h.wings || [];

      content.innerHTML = `
        <div class="card" style="margin-bottom: 20px; border: 1.5px solid var(--border-color);">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 class="card-title" style="font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                <i data-lucide="home" style="color:#1A659F;"></i>
                Student Hostel &amp; Dormitory Operations
              </h3>
              <p class="card-desc" style="margin:2px 0 0;">Residential wings, student bed allotments, pastoral warden contact, and leave status.</p>
            </div>
            <div style="display:flex; gap:8px;">
              <a href="/#hostel" target="_blank" class="btn btn-secondary btn-sm"><i data-lucide="external-link"></i> View #hostel</a>
              <button class="btn btn-primary btn-sm" id="btn-ops-allot-bed"><i data-lucide="user-plus"></i> Allot Bed to Student</button>
            </div>
          </div>

          <!-- Dormitory Wings Progress Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:18px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
            ${wings.map(w => `
              <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="badge ${w.gender === 'Girls' ? 'badge-warning' : 'badge-info'}" style="font-weight:700;">${w.gender || 'Wing'}</span>
                  <span style="font-size:0.8rem; font-weight:800; color:#1A659F;">${w.occupied || 0} / ${w.capacity || 0} Beds Occupied</span>
                </div>
                <h4 style="font-size:1rem; font-weight:800; margin:0 0 4px; color:var(--text-main);">${w.name}</h4>
                <div style="font-size:0.78rem; color:#64748b; margin-bottom:8px;">${w.rooms || 'Dormitory'} &bull; Supervisor: <strong>${w.supervisor || 'Warden'}</strong></div>
                <div style="width:100%; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                  <div style="width:${Math.round(((w.occupied || 0) / (w.capacity || 1)) * 100)}%; height:100%; background:#1A659F; border-radius:999px;"></div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Resident Students Roster -->
          <div class="table-responsive">
            <table class="tms-table font-mono" style="font-size: 0.84rem; margin:0;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Assigned Wing</th>
                  <th>Room &amp; Bed</th>
                  <th>Guardian Mobile</th>
                  <th>Status</th>
                  <th style="width:80px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${allocations.length === 0 ? `
                  <tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No resident students registered.</td></tr>
                ` : allocations.map((a, idx) => `
                  <tr>
                    <td><strong style="font-family:var(--font-sans); color:var(--text-main);">${a.studentName}</strong></td>
                    <td>${a.rollNo}</td>
                    <td>${a.classGrade}</td>
                    <td><span class="badge ${a.wing.includes('Boys') ? 'badge-info' : 'badge-warning'}">${a.wing}</span></td>
                    <td><strong>${a.roomNo}</strong> &bull; ${a.bedNo}</td>
                    <td>${a.guardianPhone}</td>
                    <td><span class="badge ${a.status === 'Active' ? 'badge-success' : 'badge-warning'}">${a.status}</span></td>
                    <td style="text-align:center;">
                      <button class="btn-ops-vacate" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Vacate Bed">
                        <i data-lucide="log-out" style="width:14px; height:14px;"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const allotBtn = content.querySelector('#btn-ops-allot-bed');
      if (allotBtn) {
        allotBtn.addEventListener('click', () => {
          const name = prompt('Enter Student Full Name:');
          if (!name) return;
          const roll = prompt('Enter Roll Number (e.g. TMS-2655):', 'TMS-' + Math.floor(1000 + Math.random() * 9000));
          const cls = prompt('Enter Class & Section (e.g. Grade 9 - A):', 'Grade 9 - A');
          const wing = prompt('Enter Wing (Hazrat Bilal Boys Wing / Fatima-tuz-Zahra Girls Wing):', 'Hazrat Bilal Boys Wing');
          const room = prompt('Enter Room Number (e.g. Room 106):', 'Room 106');
          const bed = prompt('Enter Bed Number (e.g. Bed B-2):', 'Bed B-2');
          const phone = prompt('Enter Guardian Mobile Number:', '+91 9832000000');

          allocations.push({
            id: 'ha-' + Date.now(),
            studentName: name,
            rollNo: roll || 'TMS-2600',
            classGrade: cls || 'Grade 9',
            wing: wing || 'Hazrat Bilal Boys Wing',
            roomNo: room || 'Room 101',
            bedNo: bed || 'Bed 1',
            guardianPhone: phone || '+91 8653382851',
            status: 'Active'
          });
          localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
          OperationsModule.renderTab('hostel', container);
          UIComponents.refreshIcons();
        });
      }

      content.querySelectorAll('.btn-ops-vacate').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          if (confirm('Vacate student bed allocation?')) {
            allocations.splice(idx, 1);
            localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
            OperationsModule.renderTab('hostel', container);
            UIComponents.refreshIcons();
          }
        });
      });
    } else if (tabKey === 'inventory') {
      content.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Physical Assets & Laboratory Inventory</h3>
            <button class="btn btn-secondary btn-sm" onclick="alert('Asset audit report generated.')"><i data-lucide="printer"></i> Print Asset Register</button>
          </div>
          <div class="table-responsive">
            <table class="tms-table font-mono" style="font-size: 0.82rem;">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No records available yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    UIComponents.refreshIcons();
  }

  static bindEvents(container) {
    window.addEventListener('tms_hostel_toggled', () => {
      if (document.body.contains(container)) {
        this.render(container);
      }
    });
    container.querySelectorAll('.ops-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.ops-tab').forEach(b => {
          b.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        this.renderTab(e.currentTarget.dataset.tab, container);
      });
    });

    const issueBtn = container.querySelector('#btn-issue-book');
    if (issueBtn) {
      issueBtn.addEventListener('click', () => {
        UIComponents.openModal({
          title: 'Issue Book to Student or Faculty',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label">Book Accession Number / Barcode</label>
              <input class="form-input font-mono" id="lib-acc" placeholder="e.g. ACC-2024-554">
            </div>
            <div class="form-group">
              <label class="form-label">Borrower ID / Admission No</label>
              <input class="form-input font-mono" id="lib-borrower" placeholder="e.g. TMS/2024/001">
            </div>
            <div class="form-group">
              <label class="form-label">Loan Duration</label>
              <select class="form-select" id="lib-days">
                <option value="14">14 Days (Standard)</option>
                <option value="28">28 Days (Faculty)</option>
              </select>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-issue">Confirm Loan</button>
          `
        });

        document.getElementById('btn-save-issue').addEventListener('click', async () => {
          const accession = document.getElementById('lib-acc').value;
          const borrower = document.getElementById('lib-borrower').value;
          await auditService.log('LIBRARY_BOOK_ISSUED', 'OPERATIONS', {
            accession,
            borrower
          });
          UIComponents.closeModal();
          UIComponents.showToast('Book loan recorded in Central Library circulation ledger!', 'success');
        });
      });
    }
  }
}

export default OperationsModule;
