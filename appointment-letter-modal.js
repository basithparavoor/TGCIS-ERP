/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Staff Appointment Letter & Job Description Suite
 * Super Admin & Central Management Directorate Executive Issuance Studio
 */

import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';

export class AppointmentLetterModal {
  /**
   * Open the Appointment Letter & Job Description Studio Modal
   * @param {Object} options
   * @param {Object} [options.staffMember] - Optional pre-selected staff member
   * @param {Array} [options.staffList] - Array of all staff members
   * @param {Function} [options.onIssued] - Callback when letter is saved/issued
   */
  static async open({ staffMember = null, staffList = null, onIssued = null } = {}) {
    const esc = (v) => UIComponents.escapeHtml(v);

    let allStaff = staffList;
    if (!allStaff || !allStaff.length) {
      try {
        allStaff = (await dbService.select('staff')) || [];
      } catch (e) {
        allStaff = [];
      }
    }

    if (!allStaff.length) {
      allStaff = [
        { id: 'st-1', name: 'muhammad mubashir', designation: 'Assistant Professor of Islamic Studies', department: 'Islamic Studies & Arabic', phone: '+91 8653382851', email: 'mubashir@tgcis.clubad.space', salary: 35000, campus: 'TGCIS-TAPAN' },
        { id: 'st-2', name: 'Hafiz Tariq', designation: 'Senior Faculty & Hifz Coordinator', department: 'Hifz Wing', phone: '+91 8167782851', email: 'tariq@tgcis.clubad.space', salary: 32000, campus: 'TGCIS-TAPAN' },
        { id: 'st-3', name: 'Dr. Z. A. Rahman', designation: 'Campus Principal', department: 'Institutional Administration', phone: '+91 8653382850', email: 'principal@thaibamodel.school', salary: 55000, campus: 'TMS-TAPAN' }
      ];
    }

    let selectedStaff = staffMember || allStaff[0];

    // Default letter data generator
    const generateLetterData = (st) => {
      const year = new Date().getFullYear();
      const randRef = Math.floor(100 + Math.random() * 900);
      return {
        refNo: `TGCIS/DIR/APT/${year}/${randRef}`,
        issueDate: new Date().toISOString().split('T')[0],
        candidateName: st?.fullName || st?.name || 'Staff Member',
        candidateEmail: st?.email || 'staff@tgcis.clubad.space',
        candidatePhone: st?.phone || st?.phone1 || '+91 9876543210',
        candidateAddress: st?.address || 'Baghait, Tapan, Dakshin Dinajpur, West Bengal - 733127',
        designation: st?.designation || 'Lecturer & Faculty Member',
        department: st?.department || 'Academics & Student Mentorship',
        campus: st?.campus || 'THAIBA COLLEGE OF INTEGRATED STUDIES (TGCIS-TAPAN)',
        employmentType: 'Full-Time Regular (Probation 1 Year)',
        reportingAuthority: 'Director C. M. Basith & Central Academic Council',
        joiningDate: st?.joiningDate || new Date().toISOString().split('T')[0],
        probationMonths: '12 Months',
        basicSalary: Math.round((st?.salary || 32000) * 0.6),
        hra: Math.round((st?.salary || 32000) * 0.2),
        specialAllowance: Math.round((st?.salary || 32000) * 0.2),
        totalSalary: st?.salary || 32000,
        jobDescription: `1. Academic Instruction & Curriculum Delivery:
   • Deliver scheduled classroom lectures, tutorials, and practical mentoring per TGCIS approved syllabi.
   • Prepare structured lesson plans, continuous assessments, and term evaluations.

2. Student Ethical Formation & Moral Integrity:
   • Foster moral rectitude, intellectual curiosity, and ethical discipline among students.
   • Serve as academic mentor and counselor for assigned student wards.

3. Campus Attendance & Telemetry Governance:
   • Maintain punctual biometric turnstile and GPS geofence verified attendance.
   • Comply with scheduled faculty duty tenures, examination duties, and student hostel moral monitoring.

4. Institutional Citizenship:
   • Actively participate in departmental seminars, faculty development programs, and Central Directorate initiatives.
   • Uphold the noble ethos, vision, and charitable mission of Thaiba Heritage, Kolkata.`,
        signatoryName: 'C. M. Basith',
        signatoryTitle: 'Super Administrator & Executive Director\nThaiba Heritage Group of Institutions'
      };
    };

    let data = generateLetterData(selectedStaff);

    const renderContent = () => {
      return `
        <div style="font-family:var(--font-sans, system-ui); color:#0F172A;">
          <!-- Top Toolbar: Staff Switcher -->
          <div style="background:#eef5fa; border:1px solid #bfdbfe; border-radius:14px; padding:12px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); color:#FFFFFF; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="file-badge" style="width:20px; height:20px;"></i>
              </div>
              <div>
                <div style="font-weight:800; font-size:1rem; color:#134e7a;">Central Management Directorate — Appointment &amp; Job Description Studio</div>
                <div style="font-size:0.78rem; color:#134e7a;">Generate, customize, and issue institutional employment contracts and duty mandates.</div>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:0.8rem; font-weight:700; color:#134e7a;">Select Staff:</label>
              <select id="apt-staff-select" class="form-select font-mono" style="border-radius:10px; font-weight:700; font-size:0.84rem; min-width:240px;">
                ${allStaff.map(st => `
                  <option value="${esc(st.id)}" ${st.id === selectedStaff.id ? 'selected' : ''}>
                    ${esc(st.fullName || st.name)} (${esc(st.designation || 'Faculty')})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Studio Grid: 2 Columns (Left: Customization Inputs, Right: Live Printable A4 Preview) -->
          <div style="display:grid; grid-template-columns:1fr 1.25fr; gap:20px;">
            <!-- Left Column: Customization Fields -->
            <div style="max-height:560px; overflow-y:auto; padding-right:8px;">
              <!-- Basic Info -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; margin-bottom:14px;">
                <div style="font-size:0.84rem; font-weight:800; color:#1E293B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="hash" style="width:15px; height:15px; color:#1A659F;"></i>
                  Reference &amp; Candidate Particulars
                </div>
                <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:10px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Reference Number</label>
                    <input type="text" id="inp-apt-ref" class="form-input font-mono" value="${esc(data.refNo)}" style="font-size:0.82rem; font-weight:700; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Issue Date</label>
                    <input type="date" id="inp-apt-date" class="form-input" value="${esc(data.issueDate)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                </div>

                <div style="margin-bottom:8px;">
                  <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Candidate Full Name</label>
                  <input type="text" id="inp-apt-name" class="form-input" value="${esc(data.candidateName)}" style="font-size:0.85rem; font-weight:700; border-radius:8px;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Phone</label>
                    <input type="text" id="inp-apt-phone" class="form-input font-mono" value="${esc(data.candidatePhone)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Email</label>
                    <input type="email" id="inp-apt-email" class="form-input font-mono" value="${esc(data.candidateEmail)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                </div>

                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Residential Address</label>
                  <input type="text" id="inp-apt-address" class="form-input" value="${esc(data.candidateAddress)}" style="font-size:0.82rem; border-radius:8px;">
                </div>
              </div>

              <!-- Position & Department -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; margin-bottom:14px;">
                <div style="font-size:0.84rem; font-weight:800; color:#1E293B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="briefcase" style="width:15px; height:15px; color:#1A659F;"></i>
                  Designation, Campus &amp; Tenure
                </div>
                <div style="margin-bottom:8px;">
                  <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Official Designation</label>
                  <input type="text" id="inp-apt-designation" class="form-input" value="${esc(data.designation)}" style="font-size:0.85rem; font-weight:700; border-radius:8px;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Department</label>
                    <input type="text" id="inp-apt-department" class="form-input" value="${esc(data.department)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Campus Unit</label>
                    <input type="text" id="inp-apt-campus" class="form-input" value="${esc(data.campus)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Effective Joining Date</label>
                    <input type="date" id="inp-apt-joining" class="form-input" value="${esc(data.joiningDate)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Probation Period</label>
                    <input type="text" id="inp-apt-probation" class="form-input" value="${esc(data.probationMonths)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                </div>
              </div>

              <!-- Remuneration -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; margin-bottom:14px;">
                <div style="font-size:0.84rem; font-weight:800; color:#1E293B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="credit-card" style="width:15px; height:15px; color:#1A659F;"></i>
                  Remuneration &amp; Salary Structure (Monthly INR)
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px;">
                  <div>
                    <label style="font-size:0.7rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Basic Pay (₹)</label>
                    <input type="number" id="inp-apt-basic" class="form-input font-mono" value="${esc(data.basicSalary)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.7rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">HRA (₹)</label>
                    <input type="number" id="inp-apt-hra" class="form-input font-mono" value="${esc(data.hra)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.7rem; font-weight:700; color:#64748B; display:block; margin-bottom:3px;">Allowances (₹)</label>
                    <input type="number" id="inp-apt-allowance" class="form-input font-mono" value="${esc(data.specialAllowance)}" style="font-size:0.82rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.7rem; font-weight:800; color:#1A659F; display:block; margin-bottom:3px;">Net Monthly CTC (₹)</label>
                    <input type="number" id="inp-apt-total" class="form-input font-mono" value="${esc(data.totalSalary)}" style="font-size:0.84rem; font-weight:800; border-radius:8px; border-color:#93c5fd;">
                  </div>
                </div>
              </div>

              <!-- Job Description Textarea -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
                <div style="font-size:0.84rem; font-weight:800; color:#1E293B; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="list-checks" style="width:15px; height:15px; color:#1A659F;"></i>
                  Detailed Job Description &amp; Faculty Responsibilities
                </div>
                <textarea id="inp-apt-jd" class="form-textarea" rows="8" style="font-size:0.8rem; line-height:1.45; border-radius:8px; width:100%; font-family:var(--font-mono);">${esc(data.jobDescription)}</textarea>
              </div>
            </div>

            <!-- Right Column: Live Printable A4 Document Preview -->
            <div style="background:#525659; border-radius:12px; padding:16px; overflow-y:auto; max-height:560px; display:flex; justify-content:center;">
              <div id="apt-printable-document" style="background:#FFFFFF; width:100%; max-width:540px; min-height:760px; padding:28px 32px; box-shadow:0 8px 24px rgba(0,0,0,0.3); border-radius:4px; font-family:'Times New Roman', Times, serif; color:#0F172A; position:relative; font-size:0.78rem; line-height:1.45;">
                <!-- Official Letterhead Header -->
                <div style="text-align:center; border-bottom:2px double #1A659F; padding-bottom:12px; margin-bottom:14px;">
                  <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:4px;">
                    <img src="tps-logo.png" style="width:42px; height:42px; object-fit:contain;" onerror="this.style.display='none';">
                    <div>
                      <div style="font-family:system-ui, sans-serif; font-size:1.05rem; font-weight:900; color:#1A659F; letter-spacing:0.04em;">
                        THAIBA COLLEGE OF INTEGRATED STUDIES
                      </div>
                      <div style="font-family:system-ui, sans-serif; font-size:0.68rem; font-weight:700; color:#64748B;">
                        Run by : THAIBA HERITAGE, KOLKATA • Regd. Under Trust Act IV 01894/2011
                      </div>
                    </div>
                  </div>
                  <div style="font-size:0.65rem; color:#64748B; font-family:system-ui, sans-serif;">
                    Campus: Baghait, Tapan, Dakshin Dinajpur, WB - 733127 • Directorate: Kolkata, WB • Web: tgcis.clubad.space
                  </div>
                </div>

                <!-- Reference & Date Line -->
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-weight:700; font-size:0.76rem; font-family:system-ui, sans-serif;">
                  <span>Ref: <span id="pv-ref" class="font-mono">${esc(data.refNo)}</span></span>
                  <span>Date: <span id="pv-date">${esc(data.issueDate)}</span></span>
                </div>

                <!-- Recipient Address Block -->
                <div style="margin-bottom:12px; font-family:system-ui, sans-serif;">
                  <div>To,</div>
                  <div style="font-weight:800; font-size:0.86rem; color:#0F172A;" id="pv-name">${esc(data.candidateName)}</div>
                  <div id="pv-address" style="color:#475569; font-size:0.74rem;">${esc(data.candidateAddress)}</div>
                  <div style="color:#64748B; font-size:0.72rem;">Ph: <span id="pv-phone">${esc(data.candidatePhone)}</span> • Email: <span id="pv-email">${esc(data.candidateEmail)}</span></div>
                </div>

                <!-- Subject Line -->
                <div style="text-align:center; font-weight:800; font-size:0.84rem; color:#1A659F; margin-bottom:12px; text-decoration:underline; font-family:system-ui, sans-serif;">
                  APPOINTMENT ORDER &amp; OFFICIAL JOB DESCRIPTION MANDATE
                </div>

                <!-- Letter Body -->
                <div style="text-align:justify; margin-bottom:10px;">
                  Dear <span id="pv-salute" style="font-weight:700;">${esc(data.candidateName)}</span>,
                </div>
                <div style="text-align:justify; margin-bottom:10px;">
                  We are pleased to inform you that upon evaluation of your qualifications and meritorious standing, the Executive Trust Board of <strong>Thaiba Heritage</strong> is pleased to appoint you as <strong id="pv-designation">${esc(data.designation)}</strong> in the <strong>Department of <span id="pv-department">${esc(data.department)}</span></strong>, tenured at <strong><span id="pv-campus">${esc(data.campus)}</span></strong>, effective from <strong id="pv-joining">${esc(data.joiningDate)}</strong>.
                </div>

                <!-- Terms Table -->
                <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:0.72rem; font-family:system-ui, sans-serif;">
                  <tr style="background:#F8FAFC;">
                    <td style="border:1px solid #CBD5E1; padding:4px 8px; font-weight:700; width:40%;">Tenure &amp; Cadre:</td>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px;" id="pv-tenure">${esc(data.employmentType)}</td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px; font-weight:700;">Probation Window:</td>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px;" id="pv-probation">${esc(data.probationMonths)}</td>
                  </tr>
                  <tr style="background:#F8FAFC;">
                    <td style="border:1px solid #CBD5E1; padding:4px 8px; font-weight:700;">Consolidated Monthly CTC:</td>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px; font-weight:800; color:#1A659F;" id="pv-salary">₹${esc(data.totalSalary.toLocaleString())} / Month</td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px; font-weight:700;">Reporting Directorate:</td>
                    <td style="border:1px solid #CBD5E1; padding:4px 8px;" id="pv-reporting">${esc(data.reportingAuthority)}</td>
                  </tr>
                </table>

                <!-- Job Description Section -->
                <div style="font-weight:800; font-size:0.76rem; color:#1E293B; margin-bottom:4px; font-family:system-ui, sans-serif;">
                  KEY RESPONSIBILITIES &amp; SCOPE OF WORK:
                </div>
                <div id="pv-jd" style="white-space:pre-wrap; font-size:0.7rem; color:#334155; line-height:1.4; margin-bottom:14px; background:#F8FAFC; border:1px solid #E2E8F0; padding:8px 10px; border-radius:6px;">
${esc(data.jobDescription)}
                </div>

                <!-- Signatories -->
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:24px; font-family:system-ui, sans-serif;">
                  <div style="text-align:center;">
                    <div style="font-size:0.7rem; font-weight:700; border-top:1px solid #0F172A; padding-top:4px; min-width:140px;">
                      Candidate Acceptance Signature
                    </div>
                  </div>
                  <div style="text-align:center;">
                    <div style="font-size:0.65rem; color:#1A659F; font-weight:800; margin-bottom:2px;">[OFFICIAL SEAL]</div>
                    <div style="font-size:0.75rem; font-weight:800; color:#0F172A; border-top:1px solid #0F172A; padding-top:4px; min-width:150px;">
                      C. M. Basith
                    </div>
                    <div style="font-size:0.65rem; color:#64748B;">Super Administrator &amp; Executive Director</div>
                    <div style="font-size:0.62rem; color:#64748B;">Thaiba Heritage, Kolkata</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <button class="btn btn-secondary" id="btn-modal-apt-cancel" style="border-radius:12px; font-weight:700; padding:10px 20px;">
          Close
        </button>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline" id="btn-modal-apt-print" style="border-radius:12px; font-weight:700; padding:10px 20px; color:#1A659F; border-color:#93c5fd;">
            <i data-lucide="printer"></i> Print / Save as PDF
          </button>
          <button class="btn btn-primary" id="btn-modal-apt-save" style="border-radius:12px; font-weight:700; padding:10px 26px; background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); border:none; color:#FFFFFF;">
            <i data-lucide="check"></i> Save &amp; Issue to Staff Profile
          </button>
        </div>
      </div>
    `;

    UIComponents.openModal({
      title: `Issue Appointment Letter & Job Description — ${esc(data.candidateName)}`,
      bodyHtml: renderContent(),
      footerHtml,
      maxWidth: '1080px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    // Synchronize inputs with preview in real-time
    const wireLivePreview = () => {
      const bindInp = (inpId, pvId, fmt = null) => {
        const inp = modal.querySelector(inpId);
        const pv = modal.querySelector(pvId);
        if (inp && pv) {
          inp.addEventListener('input', () => {
            pv.innerText = fmt ? fmt(inp.value) : inp.value;
          });
        }
      };

      bindInp('#inp-apt-ref', '#pv-ref');
      bindInp('#inp-apt-date', '#pv-date');
      bindInp('#inp-apt-name', '#pv-name');
      bindInp('#inp-apt-name', '#pv-salute');
      bindInp('#inp-apt-phone', '#pv-phone');
      bindInp('#inp-apt-email', '#pv-email');
      bindInp('#inp-apt-address', '#pv-address');
      bindInp('#inp-apt-designation', '#pv-designation');
      bindInp('#inp-apt-department', '#pv-department');
      bindInp('#inp-apt-campus', '#pv-campus');
      bindInp('#inp-apt-joining', '#pv-joining');
      bindInp('#inp-apt-probation', '#pv-probation');
      bindInp('#inp-apt-total', '#pv-salary', (v) => `₹${parseInt(v || 0, 10).toLocaleString()} / Month`);
      bindInp('#inp-apt-jd', '#pv-jd');

      // Salary auto calculator
      const basicInp = modal.querySelector('#inp-apt-basic');
      const hraInp = modal.querySelector('#inp-apt-hra');
      const allwInp = modal.querySelector('#inp-apt-allowance');
      const totalInp = modal.querySelector('#inp-apt-total');
      const pvSalary = modal.querySelector('#pv-salary');

      [basicInp, hraInp, allwInp].forEach(el => {
        el?.addEventListener('input', () => {
          const total = (parseFloat(basicInp?.value) || 0) + (parseFloat(hraInp?.value) || 0) + (parseFloat(allwInp?.value) || 0);
          if (totalInp) totalInp.value = total;
          if (pvSalary) pvSalary.innerText = `₹${total.toLocaleString()} / Month`;
        });
      });

      // Staff Switcher
      modal.querySelector('#apt-staff-select')?.addEventListener('change', (e) => {
        const st = allStaff.find(x => x.id === e.target.value);
        if (st) {
          selectedStaff = st;
          data = generateLetterData(st);
          const bodyEl = modal.querySelector('.tms-modal-body');
          if (bodyEl) {
            bodyEl.innerHTML = renderContent();
            wireLivePreview();
            UIComponents.refreshIcons();
          }
        }
      });
    };

    wireLivePreview();

    // Close
    modal.querySelector('#btn-modal-apt-cancel')?.addEventListener('click', () => {
      UIComponents.closeModal();
    });

    // Print
    modal.querySelector('#btn-modal-apt-print')?.addEventListener('click', () => {
      const docEl = modal.querySelector('#apt-printable-document');
      if (!docEl) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        UIComponents.showToast('Please allow popups to print the appointment letter.', 'warning');
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Appointment Letter — ${data.candidateName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { margin: 0; font-family: 'Times New Roman', Times, serif; color: #0F172A; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${docEl.outerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
    });

    // Save & Issue to Staff Profile
    modal.querySelector('#btn-modal-apt-save')?.addEventListener('click', async () => {
      const saveBtn = modal.querySelector('#btn-modal-apt-save');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Issuing Contract...';
      }

      const refNo = modal.querySelector('#inp-apt-ref')?.value.trim();
      const issueDate = modal.querySelector('#inp-apt-date')?.value;
      const designation = modal.querySelector('#inp-apt-designation')?.value.trim();
      const department = modal.querySelector('#inp-apt-department')?.value.trim();
      const salary = parseFloat(modal.querySelector('#inp-apt-total')?.value) || 0;
      const jd = modal.querySelector('#inp-apt-jd')?.value.trim();

      const updates = {
        appointmentLetterIssued: true,
        appointmentLetterRef: refNo,
        appointmentDate: issueDate,
        designation: designation || selectedStaff.designation,
        department: department || selectedStaff.department,
        salary,
        jobDescription: jd
      };

      try {
        await dbService.update('staff', selectedStaff.id, updates);
      } catch (e) {}

      Object.assign(selectedStaff, updates);

      try {
        auditService.log(
          'STAFF_APPOINTMENT_LETTER_ISSUED',
          `Official appointment letter & job description issued to ${selectedStaff.name || selectedStaff.fullName} (Ref: ${refNo}) by Director C. M. Basith`,
          { staffId: selectedStaff.id, refNo, designation, salary }
        );
      } catch (e) {}

      UIComponents.showToast(`✓ Official Appointment Letter successfully issued to ${selectedStaff.name || selectedStaff.fullName}!`, 'success');
      UIComponents.closeModal();

      if (typeof onIssued === 'function') {
        onIssued(selectedStaff);
      }
    });

    UIComponents.refreshIcons();
  }
}
