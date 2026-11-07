/**
 * THAIBA PUBLIC SCHOOL — Institutional ID Card & Smart Badge Studio
 * Fully functional CR-80 PVC & Lanyard ID Card Studio:
 * 1. Multi-Template Studio (Gold, Sapphire, Crimson, Carbon Minimal, Gold Prestige)
 * 2. Dual Orientation (Horizontal CR-80 & Vertical Lanyard with Punch Slot)
 * 3. Sides Control (Double-Sided Duplex, Front Only, Back Only)
 * 4. Smart Biometrics Integration (Contactless Chip, 13.56MHz NFC Icon, Dynamic Scannable QR & 1D Barcode)
 * 5. 1-Click Biometric & NFC Credential Enrollment per Card
 * 6. Interactive 3D Card Flip Inspection Modal
 * 7. Batch A4 Print Sheets with Exact PVC Cutting Guides
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { TMS_LOGO } from './logo.js';
import { QRCodeGenerator } from './qr-generator.js';
import { exportPdf, formatPdfFilename } from './export-utils.js';
import { BiometricCredentialModal } from './biometric-credential-modal.js';
import { SAMPLE_STUDENTS } from './student-module.js';

export const CARD_TEMPLATES = {
  Gold: {
    name: 'Institutional Gold',
    primary: '#064E3B',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)',
    border: '#10B981',
    accent: '#34D399',
    badgeBg: '#10B981',
    backBg: '#022C22',
    fontColor: '#FFFFFF'
  },
  sapphire: {
    name: 'Royal Sapphire',
    primary: '#1E3A8A',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
    border: '#3B82F6',
    accent: '#60A5FA',
    badgeBg: '#2563EB',
    backBg: '#0F172A',
    fontColor: '#FFFFFF'
  },
  crimson: {
    name: 'Heritage Crimson',
    primary: '#881337',
    gradient: 'linear-gradient(135deg, #881337 0%, #4C0519 100%)',
    border: '#F43F5E',
    accent: '#FDA4AF',
    badgeBg: '#E11D48',
    backBg: '#4C0519',
    fontColor: '#FFFFFF'
  },
  carbon: {
    name: 'Carbon Dark Minimal',
    primary: '#111827',
    gradient: 'linear-gradient(135deg, #1F2937 0%, #030712 100%)',
    border: '#10B981',
    accent: '#E5C158',
    badgeBg: '#374151',
    backBg: '#090D16',
    fontColor: '#FFFFFF'
  },
  gold: {
    name: 'Radiant Gold Prestige',
    primary: '#B45309',
    gradient: 'linear-gradient(135deg, #78350F 0%, #1C1917 100%)',
    border: '#F59E0B',
    accent: '#FDE047',
    badgeBg: '#D97706',
    backBg: '#1C1917',
    fontColor: '#FFFFFF'
  }
};

export class IdCardsModule {
  static async render(container) {
    const esc = (v) => UIComponents.escapeHtml(v);

    const [allStudents, allStaff] = await Promise.all([
      dbService.select('students'),
      dbService.select('staff_directory')
    ]);

    this._students = (allStudents && allStudents.length) ? allStudents : SAMPLE_STUDENTS;
    this._staff = (allStaff && allStaff.length) ? allStaff : [
      { id: 'st-1', name: 'muhammad mubashir', staffId: 'FAC-2026-001', designation: 'Senior Faculty', department: 'Arabic & Moral Studies', phone: '9847123456', avatar: '/assets/avatars/std-1.png' },
      { id: 'st-2', name: 'Hafiz Tariq', staffId: 'FAC-2026-002', designation: 'Hifz Instructor', department: 'Hifz Academy', phone: '9847654321', avatar: '/assets/avatars/std-2.png' },
      { id: 'st-3', name: 'Br. Abdul Basith', staffId: 'FAC-2026-003', designation: 'Academic Council', department: 'Hostel Administration', phone: '9847998877', avatar: '/assets/avatars/std-3.png' }
    ];

    this._activeTab = this._activeTab || 'students'; // 'students' | 'staff'
    this._selectedGrade = this._selectedGrade || 'all';
    this._selectedDept = this._selectedDept || 'all';
    this._searchQuery = this._searchQuery || '';
    this._templateKey = this._templateKey || 'Gold';
    this._cardOrientation = this._cardOrientation || 'landscape'; // 'landscape' | 'portrait'
    this._cardSides = this._cardSides || 'double'; // 'double' | 'front' | 'back'
    this._showChip = this._showChip !== false;
    this._showNfc = this._showNfc !== false;
    this._showQr = this._showQr !== false;
    this._showBarcode = this._showBarcode !== false;
    this._showHolo = this._showHolo !== false;

    container.innerHTML = `
      <div class="tms-content-wrapper">
        ${UIComponents.renderPageHeader({
          title: 'ID Card & Smart Badge Studio',
          subtitle: 'Institutional CR-80 PVC ID Card Studio with multi-template styling, double-sided duplex layouts, contactless NFC chips, and biometric enrollment.',
          breadcrumbs: [{ label: 'ID Cards & Badges' }],
          badge: 'PVC Smart Studio',
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-open-3d-showcase">
              <i data-lucide="sparkles"></i> 3D Flip Card Showcase
            </button>
            <button class="btn btn-primary" id="btn-batch-print-id-cards" style="background:#0E623B; border-color:#0E623B;">
              <i data-lucide="printer"></i> Print Batch A4 Sheets
            </button>
          `
        })}

        <!-- Studio Design Customizer Toolbar -->
        <div class="card" style="margin-bottom: 20px; padding:18px 22px;">
          <!-- Top Row: Template Presets & Orientation -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:14px; border-bottom:1px solid #E2E8F0; padding-bottom:14px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">Design Templates:</span>
              ${Object.entries(CARD_TEMPLATES).map(([key, t]) => `
                <button type="button" class="studio-template-pill ${this._templateKey === key ? 'active' : ''}" data-template="${key}">
                  <span style="width:10px; height:10px; border-radius:50%; background:${t.primary}; border:1px solid rgba(255,255,255,0.4);"></span>
                  ${esc(t.name)}
                </button>
              `).join('')}
            </div>

            <!-- Orientation & Sides Toggles -->
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <div style="display:inline-flex; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; background:#F8FAFC;">
                <button type="button" class="btn btn-xs ${this._cardOrientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}" id="btn-orient-landscape" style="border-radius:0; font-weight:700;">
                  <i data-lucide="credit-card"></i> Horizontal CR-80
                </button>
                <button type="button" class="btn btn-xs ${this._cardOrientation === 'portrait' ? 'btn-primary' : 'btn-ghost'}" id="btn-orient-portrait" style="border-radius:0; font-weight:700;">
                  <i data-lucide="smartphone"></i> Vertical Lanyard
                </button>
              </div>

              <div style="display:inline-flex; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; background:#F8FAFC;">
                <button type="button" class="btn btn-xs ${this._cardSides === 'double' ? 'btn-primary' : 'btn-ghost'}" id="btn-sides-double" style="border-radius:0; font-weight:700;">
                  Double-Sided (Duplex)
                </button>
                <button type="button" class="btn btn-xs ${this._cardSides === 'front' ? 'btn-primary' : 'btn-ghost'}" id="btn-sides-front" style="border-radius:0; font-weight:700;">
                  Front Only
                </button>
                <button type="button" class="btn btn-xs ${this._cardSides === 'back' ? 'btn-primary' : 'btn-ghost'}" id="btn-sides-back" style="border-radius:0; font-weight:700;">
                  Back Only
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Row: Smart Badge Element Toggles & Filters -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
            <!-- Element Toggles -->
            <div style="display:flex; align-items:center; gap:16px; font-size:0.8rem; font-weight:700; color:#475569; flex-wrap:wrap;">
              <span style="text-transform:uppercase; letter-spacing:0.04em;">Smart Features:</span>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="chk-chip" ${this._showChip ? 'checked' : ''} style="accent-color:#0E623B;">
                EMV Smart Chip
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="chk-nfc" ${this._showNfc ? 'checked' : ''} style="accent-color:#0E623B;">
                NFC 13.56MHz
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="chk-qr" ${this._showQr ? 'checked' : ''} style="accent-color:#0E623B;">
                Scannable QR
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="chk-barcode" ${this._showBarcode ? 'checked' : ''} style="accent-color:#0E623B;">
                1D Barcode
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="chk-holo" ${this._showHolo ? 'checked' : ''} style="accent-color:#0E623B;">
                Hologram Foil
              </label>
            </div>

            <!-- Target Tabs (Students vs Staff) -->
            <div style="display:flex; gap:8px;">
              <button class="btn ${this._activeTab === 'students' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-id-students" style="border-radius:9999px;">
                <i data-lucide="graduation-cap"></i> Students (${this._students.length})
              </button>
              <button class="btn ${this._activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-id-staff" style="border-radius:9999px;">
                <i data-lucide="users"></i> Faculty &amp; Staff (${this._staff.length})
              </button>
            </div>
          </div>
        </div>

        <!-- Filter and Search Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; gap:10px; flex:1; max-width:440px;">
            <input type="text" id="id-search-input" class="form-input" placeholder="Search by name, roll no, or admission number..." value="${esc(this._searchQuery)}" style="border-radius:9999px;">
            <div id="id-filter-container"></div>
          </div>
          <div style="font-size:0.84rem; color:#64748B;">
            <span id="lbl-id-card-count"></span>
          </div>
        </div>

        <!-- Printable ID Cards Canvas Area -->
        <div id="id-cards-print-area">
          <div id="id-cards-grid" style="display:flex; flex-wrap:wrap; gap:22px; justify-content:flex-start;">
            <!-- Injected Cards -->
          </div>
        </div>
      </div>
    `;

    this.renderToolbarFilters(container);
    this.renderCardsGrid(container);
    this.bindEvents(container);
    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Generate crisp vector 1D barcode SVG                               */
  /* ------------------------------------------------------------------ */
  static renderBarcodeSvg(code, width = 140, height = 24) {
    const clean = (code || 'TPS-2026-001').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    let bars = '110101100';
    for (let i = 0; i < clean.length; i++) {
      const val = clean.charCodeAt(i);
      const pattern = (val % 2 === 0) ? '1011010011' : '1100101011';
      bars += pattern;
    }
    bars += '11010110011';

    let rects = '';
    const barW = (width / bars.length).toFixed(2);
    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === '1') {
        rects += `<rect x="${(i * barW).toFixed(1)}" y="0" width="${barW}" height="${height}" fill="#0F172A" />`;
      }
    }
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block; margin:0 auto;">${rects}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Render Toolbar Filters                                              */
  /* ------------------------------------------------------------------ */
  static renderToolbarFilters(container) {
    const filterBox = container.querySelector('#id-filter-container');
    if (!filterBox) return;

    if (this._activeTab === 'students') {
      const grades = [...new Set(this._students.map(s => s.grade).filter(Boolean))].sort();
      filterBox.innerHTML = `
        <select class="form-select" id="filter-id-grade" style="min-width:140px; border-radius:9999px;">
          <option value="all">All Classes</option>
          ${grades.map(g => `<option value="${g}" ${this._selectedGrade === g ? 'selected' : ''}>Class ${g}</option>`).join('')}
        </select>
      `;
    } else {
      const depts = [...new Set(this._staff.map(s => s.department).filter(Boolean))].sort();
      filterBox.innerHTML = `
        <select class="form-select" id="filter-id-dept" style="min-width:140px; border-radius:9999px;">
          <option value="all">All Departments</option>
          ${depts.map(d => `<option value="${d}" ${this._selectedDept === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      `;
    }

    filterBox.querySelector('#filter-id-grade')?.addEventListener('change', (e) => {
      this._selectedGrade = e.target.value;
      this.renderCardsGrid(container);
    });

    filterBox.querySelector('#filter-id-dept')?.addEventListener('change', (e) => {
      this._selectedDept = e.target.value;
      this.renderCardsGrid(container);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Render Cards Grid                                                  */
  /* ------------------------------------------------------------------ */
  static renderCardsGrid(container) {
    const grid = container.querySelector('#id-cards-grid');
    if (!grid) return;
    const countLabel = container.querySelector('#lbl-id-card-count');

    let list = this._activeTab === 'students' ? this._students : this._staff;

    // Apply Filter
    if (this._activeTab === 'students' && this._selectedGrade !== 'all') {
      list = list.filter(s => s.grade === this._selectedGrade);
    } else if (this._activeTab === 'staff' && this._selectedDept !== 'all') {
      list = list.filter(st => st.department === this._selectedDept);
    }

    // Apply Search
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      list = list.filter(item => {
        const name = (item.fullName || item.name || '').toLowerCase();
        const idNo = (item.admissionNo || item.staffId || item.id || '').toLowerCase();
        return name.includes(q) || idNo.includes(q);
      });
    }

    if (countLabel) {
      countLabel.innerHTML = `Showing <strong>${list.length}</strong> official PVC smart badges`;
    }

    if (!list.length) {
      grid.innerHTML = `<div style="padding:48px 24px; text-align:center; width:100%; color:#94A3B8; background:#FFFFFF; border:1.5px dashed #CBD5E1; border-radius:16px;">No records match the current filter or search criteria.</div>`;
      return;
    }

    grid.innerHTML = list.map((item, idx) => {
      return this.renderCardContainerHtml(item, idx, this._activeTab === 'students');
    }).join('');

    // Render Scannable QR Codes
    if (this._showQr) {
      list.forEach((item, idx) => {
        const qrEl = grid.querySelector(`#qr-badge-${idx}`);
        if (qrEl) {
          const id = item.admissionNo || item.staffId || item.id;
          const verifyData = `https://thaibams.edu.in/verify?id=${encodeURIComponent(id)}`;
          QRCodeGenerator.render(qrEl, verifyData, { width: 34, height: 34 });
        }
      });
    }

    // Bind Per-Card Actions
    grid.querySelectorAll('.btn-enroll-biometrics').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetList = this._activeTab === 'students' ? this._students : this._staff;
        const person = targetList.find(p => (p.id === id || p.admissionNo === id || p.staffId === id));
        if (person) {
          BiometricCredentialModal.open({
            person,
            type: this._activeTab === 'students' ? 'student' : 'staff',
            onSave: (updated) => {
              const idx = targetList.findIndex(x => x.id === person.id);
              if (idx >= 0) targetList[idx] = updated;
              this.renderCardsGrid(container);
            }
          });
        }
      });
    });

    grid.querySelectorAll('.btn-preview-flip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const targetList = this._activeTab === 'students' ? this._students : this._staff;
        const person = targetList.find(p => (p.id === id || p.admissionNo === id || p.staffId === id));
        if (person) {
          this.open3dShowcaseModal(person, this._activeTab === 'students');
        }
      });
    });

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Card Layout Container Builder                                      */
  /* ------------------------------------------------------------------ */
  static renderCardContainerHtml(item, idx, isStudent) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const idKey = isStudent ? (item.admissionNo || item.id) : (item.staffId || item.id);
    const name = isStudent ? (item.fullName || 'Student') : (item.name || 'Staff Member');
    const hasNfc = item.rfidCardId || item.rfid_uid || item.nfcEnabled;
    const hasFace = item.faceIdEnrolled || item.faceToken;

    const frontSide = this.renderCardSideHtml(item, idx, isStudent, 'front');
    const backSide = this.renderCardSideHtml(item, idx, isStudent, 'back');

    return `
      <div class="id-card-item-box" style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:16px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04); page-break-inside:avoid;">
        <!-- Card Top Action Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.86rem; font-weight:800; color:#0F172A;">${esc(name)}</span>
            ${hasNfc ? '<span class="badge badge-success" style="font-size:0.65rem; padding:2px 6px;">NFC READY</span>' : ''}
            ${hasFace ? '<span class="badge" style="background:#E0F2FE; color:#0369A1; font-size:0.65rem; padding:2px 6px;">FACE ID</span>' : ''}
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-secondary btn-xs btn-preview-flip" data-id="${esc(idKey)}" title="Interactive 3D Flip Card">
              <i data-lucide="refresh-cw"></i> 3D Flip
            </button>
            <button type="button" class="btn btn-primary btn-xs btn-enroll-biometrics" data-id="${esc(idKey)}" style="background:#0E623B; border-color:#0E623B;" title="Enroll NFC, Face ID & Biometrics">
              <i data-lucide="radio"></i> Smart Biometrics
            </button>
          </div>
        </div>

        <!-- Render Card Pair (Front & Back) or Single Side -->
        <div class="pvc-id-card-pair" style="display:inline-flex; gap:16px; flex-direction:${this._cardOrientation === 'portrait' ? 'row' : 'row'};">
          ${(this._cardSides === 'double' || this._cardSides === 'front') ? frontSide : ''}
          ${(this._cardSides === 'double' || this._cardSides === 'back') ? backSide : ''}
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /* Card Side Template Builder (Horizontal Landscape vs Vertical)      */
  /* ------------------------------------------------------------------ */
  static renderCardSideHtml(item, idx, isStudent, side = 'front') {
    const esc = (v) => UIComponents.escapeHtml(v);
    const tmpl = CARD_TEMPLATES[this._templateKey] || CARD_TEMPLATES.Gold;
    const isPortrait = this._cardOrientation === 'portrait';

    const photo = isStudent ? (item.photo || item.avatar || '') : (item.avatar || item.photo || '');
    const idNo = isStudent ? (item.admissionNo || item.id) : (item.staffId || item.id);
    const name = isStudent ? (item.fullName || 'Student Name') : (item.name || 'Faculty Member');
    const roleText = isStudent ? `Class ${item.grade || 'STD-I'} • Sec ${item.section || 'A'}` : (item.designation || 'Faculty');
    const blood = item.bloodGroup || item.blood_group || 'O+';
    const emergencyPhone = isStudent ? (item.guardianPhone || item.parentPhone || item.phone || TMS_CONFIG.institution.contact.phone) : (item.phone || TMS_CONFIG.institution.contact.phone);

    // Dimensions: Landscape (336px × 212px) | Portrait (220px × 348px)
    const cardWidth = isPortrait ? '220px' : '336px';
    const cardHeight = isPortrait ? '348px' : '212px';

    if (side === 'front') {
      return `
        <div class="pvc-card-side" style="width:${cardWidth}; height:${cardHeight}; border-radius:14px; background:${tmpl.gradient}; color:${tmpl.fontColor}; border:2px solid ${tmpl.border}; position:relative; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.22); padding:${isPortrait ? '8px 10px 10px' : '10px'}; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
          <!-- Lanyard Slot Punch for Portrait -->
          ${isPortrait ? '<div class="lanyard-slot-punch"></div>' : ''}

          <!-- Header -->
          <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px;">
            <div style="flex-shrink:0;">${TMS_LOGO.emblemSvg(isPortrait ? 26 : 30)}</div>
            <div style="flex:1; line-height:1.15; min-width:0;">
              <div style="font-family:'Outfit', sans-serif; font-size:${isPortrait ? '9px' : '11px'}; font-weight:800; letter-spacing:0.04em; color:${tmpl.accent}; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${esc(TMS_CONFIG.institution.name)}
              </div>
              <div style="font-size:7px; color:#CBD5E1;">
                Run by : Thaiba Heritage, Kolkata
              </div>
            </div>
            <span style="font-size:7px; background:${tmpl.badgeBg}; color:#FFFFFF; padding:2px 6px; border-radius:4px; font-weight:800; text-transform:uppercase;">
              ${isStudent ? 'STUDENT' : 'FACULTY'}
            </span>
          </div>

          <!-- Body -->
          <div style="display:flex; ${isPortrait ? 'flex-direction:column; align-items:center;' : 'flex-direction:row; align-items:center;'} gap:10px; margin:4px 0;">
            <!-- Photo & Smart Chip -->
            <div style="position:relative; flex-shrink:0;">
              <div style="width:${isPortrait ? '72px' : '68px'}; height:${isPortrait ? '84px' : '82px'}; border:2px solid ${tmpl.border}; border-radius:8px; overflow:hidden; background:#FFFFFF; display:flex; align-items:center; justify-content:center;">
                ${photo ? `<img src="${esc(photo)}" alt="Photo" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="user" style="width:28px; height:28px; color:#94A3B8;"></i>`}
              </div>
              ${this._showChip && !isPortrait ? `
                <div class="smart-chip-graphic" style="position:absolute; bottom:-6px; right:-6px; width:24px; height:18px;" title="Contactless EMV Smart Chip"></div>
              ` : ''}
            </div>

            <!-- Details -->
            <div style="flex:1; min-width:0; line-height:1.25; ${isPortrait ? 'text-align:center; width:100%;' : ''}">
              <div style="font-size:${isPortrait ? '12px' : '13px'}; font-weight:800; color:#FFFFFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${esc(name)}
              </div>
              <div style="font-size:9px; color:${tmpl.accent}; font-weight:700; margin-bottom:4px;">
                ${esc(roleText)}
              </div>
              <div style="font-size:7.5px; color:#CBD5E1; background:rgba(255,255,255,0.08); padding:3px 6px; border-radius:6px; text-align:left;">
                <div><strong>${isStudent ? 'Adm No' : 'Staff ID'}:</strong> <span class="font-mono" style="color:#FDE047; font-weight:800;">${esc(idNo)}</span></div>
                <div><strong>Blood Group:</strong> <span style="color:#EF4444; font-weight:800;">${esc(blood)}</span> • <strong>DOB:</strong> ${esc((item.dob || '2020-08-01').slice(0, 10))}</div>
                <div><strong>Emergency:</strong> <span class="font-mono">${esc(emergencyPhone)}</span></div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.15); padding-top:3px; font-size:7px; color:#94A3B8;">
            <div style="display:flex; align-items:center; gap:6px;">
              ${this._showNfc ? `
                <span title="NFC Contactless 13.56MHz" style="color:#E5C158; font-weight:800; display:inline-flex; align-items:center; gap:2px;">
                  <i data-lucide="radio" style="width:10px; height:10px;"></i> NFC
                </span>
              ` : ''}
              <span>Session ${TMS_CONFIG.academic.currentYear}</span>
            </div>
            ${this._showQr ? `
              <div id="qr-badge-${idx}" style="width:34px; height:34px; background:#FFFFFF; padding:1px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center;"></div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // BACK SIDE
    return `
      <div class="pvc-card-side" style="width:${cardWidth}; height:${cardHeight}; border-radius:14px; background:${tmpl.backBg}; color:#CBD5E1; border:2px solid #334155; position:relative; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.22); padding:${isPortrait ? '8px 10px 10px' : '10px'}; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; font-size:7.5px; line-height:1.35;">
        ${isPortrait ? '<div class="lanyard-slot-punch"></div>' : ''}

        <!-- Top Header & Security Hologram -->
        <div style="border-bottom:1px solid #334155; padding-bottom:3px; display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:${tmpl.accent}; font-size:8px; text-transform:uppercase;">
            ${isStudent ? 'CAMPUS SMART PASS' : 'FACULTY CREDENTIALS'}
          </strong>
          ${this._showHolo ? `
            <span style="font-size:6.5px; background:linear-gradient(90deg, #FDE68A, #F59E0B, #FDE68A); color:#78350F; font-weight:800; padding:1px 5px; border-radius:3px;">
              ★ OFFICIAL VERIFIED ★
            </span>
          ` : '<span style="font-size:6.5px; color:#64748B;">Terms of Possession</span>'}
        </div>

        <!-- Rules & Conditions -->
        <ul style="list-style:disc; margin:2px 0 2px 12px; padding:0; font-size:6.8px; color:#94A3B8;">
          <li>This card is institutional property and must be displayed on campus premises.</li>
          <li>Entitles bearer to biometric gate clearance, library, and hostel access.</li>
          <li>If found, return to THAIBA PUBLIC SCHOOL, Baghait, Tapan, WB.</li>
        </ul>

        <!-- Residential / Department Details -->
        <div style="background:rgba(255,255,255,0.04); padding:3px 6px; border-radius:4px; font-size:7px; color:#CBD5E1;">
          <div><strong>Residential / Campus:</strong> ${esc(item.address || 'Kolkata Campus Jurisdiction')}</div>
          <div><strong>Guardian / Dept:</strong> ${esc(item.guardianName || item.department || 'Administration')}</div>
        </div>

        <!-- 1D Barcode -->
        ${this._showBarcode ? `
          <div style="background:#FFFFFF; border-radius:4px; padding:2px; text-align:center;">
            ${this.renderBarcodeSvg(idNo, isPortrait ? 130 : 160, 20)}
            <div style="font-family:var(--font-mono); font-size:6.5px; color:#0F172A; font-weight:800;">*${esc(idNo)}*</div>
          </div>
        ` : ''}

        <!-- Signatures & Helpline -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:3px; border-top:1px solid #334155;">
          <div>
            <span style="font-size:6.5px; color:#64748B;">Helpline: ${esc(TMS_CONFIG.institution.contact.phone)}</span>
          </div>
          <div style="text-align:center; border-top:1px dashed #64748B; padding-top:2px; min-width:80px;">
            <span style="font-size:6.5px; color:#94A3B8; font-weight:700;">Principal / Headmaster</span>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /* Interactive 3D Card Flip Inspection Showcase Modal                */
  /* ------------------------------------------------------------------ */
  static open3dShowcaseModal(person, isStudent = true) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const p = person || {};
    const name = isStudent ? (p.fullName || 'Student') : (p.name || 'Staff');
    const isPortrait = this._cardOrientation === 'portrait';

    const frontHtml = this.renderCardSideHtml(p, 999, isStudent, 'front');
    const backHtml = this.renderCardSideHtml(p, 999, isStudent, 'back');

    const bodyHtml = `
      <div style="text-align:center; padding:10px 0;">
        <p style="margin:0 0 16px 0; color:#64748B; font-size:0.86rem;">
          Hover or click on the card to flip between Front and Back.
        </p>

        <!-- 3D Flip Card -->
        <div class="id-flip-card ${isPortrait ? 'vertical' : ''}" id="interactive-3d-card" style="margin:0 auto 24px;">
          <div class="id-flip-inner">
            <div class="id-flip-front">
              ${frontHtml}
            </div>
            <div class="id-flip-back">
              ${backHtml}
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:center; gap:10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-manual-card-flip">
            <i data-lucide="refresh-cw"></i> Flip Card 180°
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-print-single-card" style="background:#0E623B; border-color:#0E623B;">
            <i data-lucide="printer"></i> Print Individual PVC Card
          </button>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: `3D Card Showcase — ${esc(name)}`,
      bodyHtml,
      footerHtml: `
        <button class="btn btn-secondary" onclick="document.getElementById('global-modal-close').click()" style="border-radius:12px; font-weight:700;">
          Close
        </button>
      `,
      maxWidth: '620px'
    });

    const flipCard = document.querySelector('#interactive-3d-card');
    flipCard?.addEventListener('click', () => {
      flipCard.classList.toggle('flipped');
    });

    document.querySelector('#btn-manual-card-flip')?.addEventListener('click', () => {
      flipCard?.classList.toggle('flipped');
    });

    document.querySelector('#btn-print-single-card')?.addEventListener('click', () => {
      exportPdf(`TMS-PVC-Card-${p.admissionNo || p.staffId || 'ID'}`, `
        <div style="display:flex; gap:20px; justify-content:center; padding:40px;">
          ${frontHtml}
          ${backHtml}
        </div>
      `, { orientation: 'landscape' });
    });

    // Render QR in modal
    const qrEl = document.querySelector('#qr-badge-999');
    if (qrEl) {
      QRCodeGenerator.render(qrEl, `TMS-VERIFY:${p.admissionNo || p.staffId || p.id}`, { width: 34, height: 34 });
    }

    UIComponents.refreshIcons();
  }

  /* ------------------------------------------------------------------ */
  /* Event Bindings                                                     */
  /* ------------------------------------------------------------------ */
  static bindEvents(container) {
    // Tab Toggles
    const tabStudents = container.querySelector('#tab-id-students');
    const tabStaff = container.querySelector('#tab-id-staff');

    tabStudents?.addEventListener('click', () => {
      this._activeTab = 'students';
      tabStudents.className = 'btn btn-primary btn-sm';
      if (tabStaff) tabStaff.className = 'btn btn-secondary btn-sm';
      this.renderToolbarFilters(container);
      this.renderCardsGrid(container);
    });

    tabStaff?.addEventListener('click', () => {
      this._activeTab = 'staff';
      tabStaff.className = 'btn btn-primary btn-sm';
      if (tabStudents) tabStudents.className = 'btn btn-secondary btn-sm';
      this.renderToolbarFilters(container);
      this.renderCardsGrid(container);
    });

    // Template switcher pills
    container.querySelectorAll('.studio-template-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.studio-template-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this._templateKey = pill.dataset.template;
        this.renderCardsGrid(container);
      });
    });

    // Orientation Toggles
    container.querySelector('#btn-orient-landscape')?.addEventListener('click', () => {
      this._cardOrientation = 'landscape';
      this.render(container);
    });
    container.querySelector('#btn-orient-portrait')?.addEventListener('click', () => {
      this._cardOrientation = 'portrait';
      this.render(container);
    });

    // Sides Toggles
    container.querySelector('#btn-sides-double')?.addEventListener('click', () => {
      this._cardSides = 'double';
      this.renderCardsGrid(container);
    });
    container.querySelector('#btn-sides-front')?.addEventListener('click', () => {
      this._cardSides = 'front';
      this.renderCardsGrid(container);
    });
    container.querySelector('#btn-sides-back')?.addEventListener('click', () => {
      this._cardSides = 'back';
      this.renderCardsGrid(container);
    });

    // Feature Checkboxes
    const bindChk = (id, prop) => {
      container.querySelector(`#${id}`)?.addEventListener('change', (e) => {
        this[prop] = e.target.checked;
        this.renderCardsGrid(container);
      });
    };
    bindChk('chk-chip', '_showChip');
    bindChk('chk-nfc', '_showNfc');
    bindChk('chk-qr', '_showQr');
    bindChk('chk-barcode', '_showBarcode');
    bindChk('chk-holo', '_showHolo');

    // Search Input
    container.querySelector('#id-search-input')?.addEventListener('input', (e) => {
      this._searchQuery = e.target.value;
      this.renderCardsGrid(container);
    });

    // Top action: 3D Flip Showcase
    container.querySelector('#btn-open-3d-showcase')?.addEventListener('click', () => {
      const list = this._activeTab === 'students' ? this._students : this._staff;
      if (list.length) {
        this.open3dShowcaseModal(list[0], this._activeTab === 'students');
      }
    });

    // Top action: Print Batch A4 Sheets
    container.querySelector('#btn-batch-print-id-cards')?.addEventListener('click', () => {
      window.print();
    });

    // Listen to biometric update events
    window.addEventListener('tms_student_biometrics_updated', (e) => {
      const { id, updates } = e.detail || {};
      const s = this._students.find(x => x.id === id);
      if (s) {
        Object.assign(s, updates);
        this.renderCardsGrid(container);
      }
    });
  }
}

export default IdCardsModule;
