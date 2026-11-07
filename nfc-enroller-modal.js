/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Universal NFC & RFID Smart Card Enroller
 * Supports both Single Student Enrollment and Interactive Bulk Queue Card Programming.
 */

import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';
import { auditService } from './audit-service.js';

class EnrollerAudio {
  static init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  static playCardBeep() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  static playSuccessChime() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }
}

export class NfcEnrollerModal {
  /**
   * Open NFC Enroller Modal
   * @param {Object} options
   * @param {Array} [options.students] - Array of student records
   * @param {string} [options.preselectedStudentId] - Pre-selected student ID
   * @param {string} [options.defaultMode] - 'single' | 'bulk'
   * @param {Function} [options.onUpdate] - Callback when student NFC credentials update
   */
  static async open({ students = null, preselectedStudentId = null, defaultMode = 'single', onUpdate = null } = {}) {
    const esc = (v) => UIComponents.escapeHtml(v);

    let allStudents = students;
    if (!allStudents || !allStudents.length) {
      try {
        allStudents = (await dbService.select('students')) || [];
      } catch (e) {
        allStudents = [];
      }
    }

    if (!allStudents.length) {
      UIComponents.showToast('No students enrolled in the system to assign NFC cards.', 'warning');
      return;
    }

    let activeMode = defaultMode; // 'single' or 'bulk'
    let currentSelectedId = preselectedStudentId || allStudents[0]?.id;
    let bulkGradeFilter = 'all';
    let bulkSearchTerm = '';
    let bulkOnlyUnassigned = false;
    let webNfcAbortController = null;

    // Distinct grades
    const grades = Array.from(new Set(allStudents.map(s => s.grade || s.class || 'STD-I'))).filter(Boolean).sort();

    const renderModalContent = () => {
      const selectedStudent = allStudents.find(s => s.id === currentSelectedId) || allStudents[0];
      const hasCard = Boolean(selectedStudent?.rfidCardId || selectedStudent?.rfid_uid || selectedStudent?.nfcUid);
      const currentUid = selectedStudent?.rfidCardId || selectedStudent?.rfid_uid || selectedStudent?.nfcUid || '';

      // Filtered list for bulk mode
      let bulkList = allStudents.filter(s => {
        if (bulkGradeFilter !== 'all' && (s.grade || s.class) !== bulkGradeFilter) return false;
        if (bulkOnlyUnassigned && (s.rfidCardId || s.rfid_uid || s.nfcUid)) return false;
        if (bulkSearchTerm) {
          const q = bulkSearchTerm.toLowerCase();
          const name = (s.fullName || '').toLowerCase();
          const adm = (s.admissionNo || '').toLowerCase();
          if (!name.includes(q) && !adm.includes(q)) return false;
        }
        return true;
      });

      return `
        <div style="font-family:var(--font-sans, system-ui); color:#0F172A;">
          <!-- Top Mode Selector & Info -->
          <div style="background:#eef5fa; border:1px solid #bfdbfe; border-radius:14px; padding:12px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); color:#FFFFFF; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="radio" style="width:20px; height:20px;"></i>
              </div>
              <div>
                <div style="font-weight:800; font-size:1.02rem; color:#134e7a;">NFC &amp; RFID Card Programming Suite</div>
                <div style="font-size:0.78rem; color:#134e7a;">Issue, program, and tap 13.56MHz contactless chips for campus gate and roll call access.</div>
              </div>
            </div>

            <!-- Mode Switcher -->
            <div style="display:flex; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:12px; padding:3px; gap:4px;">
              <button type="button" class="btn btn-sm btn-nfc-mode-pill ${activeMode === 'single' ? 'active' : ''}" data-mode="single" style="border-radius:9px; font-weight:700; padding:6px 16px; border:none; ${activeMode === 'single' ? 'background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); color:#FFFFFF;' : 'background:transparent; color:#64748B;'}">
                <i data-lucide="user"></i> Single Enroller
              </button>
              <button type="button" class="btn btn-sm btn-nfc-mode-pill ${activeMode === 'bulk' ? 'active' : ''}" data-mode="bulk" style="border-radius:9px; font-weight:700; padding:6px 16px; border:none; ${activeMode === 'bulk' ? 'background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); color:#FFFFFF;' : 'background:transparent; color:#64748B;'}">
                <i data-lucide="layers"></i> Bulk Queue Programmer
              </button>
            </div>
          </div>

          <!-- ================= SINGLE STUDENT ENROLLER PANE ================= -->
          <div id="nfc-pane-single" style="display:${activeMode === 'single' ? 'block' : 'none'};">
            <!-- Student Search Dropdown -->
            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:0.82rem; font-weight:700; color:#475569; margin-bottom:6px;">Select Student to Program Card:</label>
              <select id="nfc-single-student-select" class="form-select font-mono" style="border-radius:10px; font-weight:700;">
                ${allStudents.map(s => `
                  <option value="${esc(s.id)}" ${s.id === selectedStudent?.id ? 'selected' : ''}>
                    ${esc(s.fullName)} • ${esc(s.admissionNo || 'No ID')} • Class ${esc(s.grade || s.class || 'STD-I')} ${s.rfidCardId ? `[Card: ${s.rfidCardId}]` : '[Unassigned]'}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Student Profile Badge & NFC Programming Box -->
            <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:18px; margin-bottom:16px;">
              <!-- Left: Student Badge Card -->
              <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:18px; text-align:center;">
                <div class="tms-student-avatar" style="width:72px; height:72px; border:3px solid #1A659F; border-radius:50%; margin:0 auto 12px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:2rem; background:#E2E8F0;">
                  ${selectedStudent?.photo ? `<img src="${esc(selectedStudent.photo)}" style="width:100%;height:100%;object-fit:cover;">` : (selectedStudent?.gender === 'Girl' ? '👧' : '👦')}
                </div>
                <div style="font-weight:800; font-size:1.1rem; color:#0F172A;">${esc(selectedStudent?.fullName || 'Student')}</div>
                <div style="margin-top:4px;">
                  <span class="tms-id-badge font-mono">${esc(selectedStudent?.admissionNo || 'ADM-000')}</span>
                  <span class="badge" style="background:#eef5fa; color:#1A659F; border:1px solid #bfdbfe; font-weight:700; margin-left:4px;">Class ${esc(selectedStudent?.grade || selectedStudent?.class || 'STD-I')}</span>
                </div>
                <div style="font-size:0.78rem; color:#64748B; margin-top:8px;">
                  Guardian: ${esc(selectedStudent?.guardianName || 'Parent')} • Ph: ${esc(selectedStudent?.guardianPhone || '—')}
                </div>
                <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #CBD5E1;">
                  ${hasCard ? `
                    <span class="badge badge-success" style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:9999px;">
                      ● NFC CARD ACTIVE: <span class="font-mono">${esc(currentUid)}</span>
                    </span>
                  ` : `
                    <span class="badge" style="background:#F1F5F9; color:#64748B; border:1px solid #CBD5E1; padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:9999px;">
                      ⚠️ NO PHYSICAL CARD ASSIGNED
                    </span>
                  `}
                </div>
              </div>

              <!-- Right: Card Programming Input & Tap Detection -->
              <div style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:14px; padding:18px;">
                <label style="display:block; font-size:0.84rem; font-weight:700; color:#1E293B; margin-bottom:6px;">
                  Physical NFC / RFID Card UID:
                </label>
                <div style="position:relative; margin-bottom:12px;">
                  <input type="text" id="nfc-single-uid-input" class="form-input font-mono" value="${esc(currentUid)}" placeholder="Swipe/Tap card or enter UID (e.g. 04:A2:8F:B1)" autofocus style="font-size:1.05rem; font-weight:800; padding:10px 14px; border-radius:10px; border-color:#93c5fd; letter-spacing:0.04em;">
                  <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:0.72rem; color:#64748B; font-weight:700;">13.56MHz</span>
                </div>

                <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline btn-xs" id="btn-nfc-gen-uid" style="border-radius:8px; font-weight:700;">
                    ⚡ Auto-Generate UID
                  </button>
                  <button type="button" class="btn btn-outline btn-xs" id="btn-nfc-activate-webnfc" style="border-radius:8px; font-weight:700; color:#1A659F; border-color:#93c5fd;">
                    <i data-lucide="radio"></i> Android Web NFC Sensor
                  </button>
                  <button type="button" class="btn btn-outline btn-xs" id="btn-nfc-test-sound" style="border-radius:8px; font-weight:700;">
                    🔊 Test Chime
                  </button>
                </div>

                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px 12px; font-size:0.75rem; color:#64748B; line-height:1.4;">
                  <strong style="color:#0F172A;">Plug-and-Play Compatibility:</strong> Connect any USB RFID / barcode card reader. Swiping a physical card will instantly populate the UID field above.
                </div>

                <div style="margin-top:16px;">
                  <button type="button" class="btn btn-primary" id="btn-nfc-single-save" style="width:100%; border-radius:10px; padding:10px; font-weight:800; background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); border:none; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="check"></i> Program &amp; Activate NFC Card
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= BULK QUEUE PROGRAMMER PANE ================= -->
          <div id="nfc-pane-bulk" style="display:${activeMode === 'bulk' ? 'block' : 'none'};">
            <!-- Filter Bar -->
            <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:12px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <div>
                  <label style="font-size:0.74rem; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Filter by Class:</label>
                  <select id="nfc-bulk-class-select" class="form-select font-mono" style="padding:5px 10px; font-size:0.82rem; border-radius:8px;">
                    <option value="all" ${bulkGradeFilter === 'all' ? 'selected' : ''}>All Classes (${allStudents.length})</option>
                    ${grades.map(g => `
                      <option value="${esc(g)}" ${bulkGradeFilter === g ? 'selected' : ''}>${esc(g)}</option>
                    `).join('')}
                  </select>
                </div>

                <div>
                  <label style="font-size:0.74rem; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Search Student:</label>
                  <input type="text" id="nfc-bulk-search" class="form-input" value="${esc(bulkSearchTerm)}" placeholder="Search name or ID..." style="padding:5px 10px; font-size:0.82rem; border-radius:8px; width:160px;">
                </div>

                <div style="padding-top:16px;">
                  <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; color:#1E293B; cursor:pointer;">
                    <input type="checkbox" id="nfc-bulk-only-unassigned" ${bulkOnlyUnassigned ? 'checked' : ''} style="accent-color:#1A659F;">
                    Unassigned Cards Only
                  </label>
                </div>
              </div>

              <!-- Active Target Banner -->
              <div style="background:#FFFFFF; border:1.5px solid #1A659F; border-radius:10px; padding:8px 14px; display:flex; align-items:center; gap:10px; box-shadow:0 2px 8px rgba(26,101,159,0.15);">
                <div class="live-pulse-dot" style="width:10px; height:10px; background:#1A659F;"></div>
                <div>
                  <div style="font-size:0.7rem; font-weight:800; color:#1A659F; text-transform:uppercase; letter-spacing:0.04em;">CURRENT CARD TARGET</div>
                  <div style="font-weight:800; font-size:0.92rem; color:#0F172A;" id="bulk-target-label">
                    ${esc(selectedStudent?.fullName || 'Select a student')} (${esc(selectedStudent?.admissionNo || '')})
                  </div>
                </div>
                <!-- Hidden auto-focus input for USB reader -->
                <input type="text" id="nfc-bulk-reader-input" class="form-input font-mono" placeholder="Tap card now..." style="width:140px; font-size:0.82rem; font-weight:700; border-radius:8px; text-align:center; border-color:#1A659F; background:#eff6ff;" autofocus>
              </div>
            </div>

            <!-- Student Cards Gallery / Screen -->
            <div style="max-height:360px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:14px; padding:12px; background:#FFFFFF;">
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
                ${bulkList.map(s => {
                  const sHasCard = Boolean(s.rfidCardId || s.rfid_uid || s.nfcUid);
                  const sUid = s.rfidCardId || s.rfid_uid || s.nfcUid || '';
                  const isTarget = s.id === selectedStudent?.id;
                  return `
                    <div class="bulk-student-card ${isTarget ? 'active-target-card' : ''}" data-student-id="${esc(s.id)}" style="background:${isTarget ? '#eff6ff' : '#F8FAFC'}; border:2px solid ${isTarget ? '#1A659F' : '#E2E8F0'}; border-radius:12px; padding:12px; cursor:pointer; transition:all 0.15s ease; position:relative; box-shadow:${isTarget ? '0 4px 12px rgba(26,101,159,0.2)' : 'none'};">
                      ${isTarget ? `
                        <div style="position:absolute; top:8px; right:8px; background:#1A659F; color:#FFFFFF; font-size:0.62rem; font-weight:800; padding:2px 8px; border-radius:9999px; text-transform:uppercase; letter-spacing:0.03em;">
                          READY TO TAP
                        </div>
                      ` : ''}
                      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <div class="tms-student-avatar" style="width:42px; height:42px; border:2px solid ${isTarget ? '#1A659F' : '#CBD5E1'}; border-radius:50%; overflow:hidden; font-size:1.3rem; display:flex; align-items:center; justify-content:center; background:#E2E8F0; flex-shrink:0;">
                          ${s.photo ? `<img src="${esc(s.photo)}" style="width:100%;height:100%;object-fit:cover;">` : (s.gender === 'Girl' ? '👧' : '👦')}
                        </div>
                        <div style="flex:1; min-width:0;">
                          <div style="font-weight:800; font-size:0.88rem; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s.fullName)}</div>
                          <div style="font-size:0.74rem; color:#64748B;">
                            <span class="font-mono">${esc(s.admissionNo || '—')}</span> • Class ${esc(s.grade || s.class || 'STD-I')}
                          </div>
                        </div>
                      </div>

                      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #E2E8F0; padding-top:8px; margin-top:4px;">
                        <div>
                          ${sHasCard ? `
                            <span class="badge badge-success" style="font-size:0.7rem; font-weight:700; border-radius:6px; padding:2px 8px;">
                              ✓ UID: ${esc(sUid.slice(0, 11))}
                            </span>
                          ` : `
                            <span class="badge" style="background:#F1F5F9; color:#94A3B8; border:1px solid #E2E8F0; font-size:0.7rem; font-weight:700; border-radius:6px; padding:2px 8px;">
                              Not Assigned
                            </span>
                          `}
                        </div>
                        <button type="button" class="btn btn-xs ${isTarget ? 'btn-primary' : 'btn-outline'} btn-bulk-select-card" data-student-id="${esc(s.id)}" style="border-radius:8px; font-weight:700; font-size:0.72rem; ${isTarget ? 'background:#1A659F; border-color:#1A659F;' : ''}">
                          ${isTarget ? '⚡ Tap Reader Now' : 'Tap This Card'}
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <div style="font-size:0.8rem; color:#64748B;">
          Total Enrolled: <strong style="color:#0F172A;">${allStudents.length} Students</strong> • Cards Assigned: <strong style="color:#1A659F;">${allStudents.filter(s => s.rfidCardId || s.rfid_uid).length}</strong>
        </div>
        <button class="btn btn-secondary" id="btn-nfc-modal-close" style="border-radius:12px; font-weight:700; padding:10px 24px;">
          Close Enroller
        </button>
      </div>
    `;

    UIComponents.openModal({
      title: 'Smart Card & NFC Enroller — Single & Bulk Queue Terminal',
      bodyHtml: renderModalContent(),
      footerHtml,
      maxWidth: '920px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    // Helper to refresh modal without destroying overlay
    const updateModalUI = () => {
      const bodyEl = modal.querySelector('.tms-modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = renderModalContent();
        wireListeners();
        UIComponents.refreshIcons();
      }
    };

    const wireListeners = () => {
      // Mode tabs
      modal.querySelectorAll('.btn-nfc-mode-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          activeMode = btn.dataset.mode;
          updateModalUI();
        });
      });

      // Close
      modal.querySelector('#btn-nfc-modal-close')?.addEventListener('click', () => {
        if (webNfcAbortController) {
          try { webNfcAbortController.abort(); } catch (e) {}
        }
        UIComponents.closeModal();
      });

      // Single Mode Dropdown
      const singleSelect = modal.querySelector('#nfc-single-student-select');
      if (singleSelect) {
        singleSelect.addEventListener('change', () => {
          currentSelectedId = singleSelect.value;
          updateModalUI();
        });
      }

      // Auto-generate UID button
      modal.querySelector('#btn-nfc-gen-uid')?.addEventListener('click', () => {
        EnrollerAudio.playCardBeep();
        const randHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
        const genUid = `04:${randHex()}:${randHex()}:${randHex()}`;
        const input = modal.querySelector('#nfc-single-uid-input');
        if (input) input.value = genUid;
        UIComponents.showToast(`Generated Mifare Card UID: ${genUid}`, 'info');
      });

      // Test sound
      modal.querySelector('#btn-nfc-test-sound')?.addEventListener('click', () => {
        EnrollerAudio.playSuccessChime();
      });

      // Web NFC
      modal.querySelector('#btn-nfc-activate-webnfc')?.addEventListener('click', async () => {
        if (!('NDEFReader' in window)) {
          UIComponents.showToast('Web NFC is supported on Android Chrome. Use USB RFID card reader or manual UID input on desktop.', 'warning');
          return;
        }
        try {
          webNfcAbortController = new AbortController();
          const ndef = new window.NDEFReader();
          await ndef.scan({ signal: webNfcAbortController.signal });
          UIComponents.showToast('Web NFC Sensor Active! Present physical card near phone back.', 'info');
          ndef.onreading = (event) => {
            const serialNumber = event.serialNumber || '04:A2:8F:B1';
            EnrollerAudio.playCardBeep();
            const input = modal.querySelector('#nfc-single-uid-input');
            if (input) input.value = serialNumber;
            assignCardToStudent(currentSelectedId, serialNumber);
          };
        } catch (err) {
          UIComponents.showToast(`Web NFC scan error: ${err.message}`, 'warning');
        }
      });

      // Single Save Button
      modal.querySelector('#btn-nfc-single-save')?.addEventListener('click', async () => {
        const uid = modal.querySelector('#nfc-single-uid-input')?.value.trim();
        if (!uid) {
          UIComponents.showToast('Please swipe card or enter a valid Card UID.', 'warning');
          return;
        }
        await assignCardToStudent(currentSelectedId, uid);
      });

      // Single UID input enter key
      const singleUidInput = modal.querySelector('#nfc-single-uid-input');
      if (singleUidInput) {
        singleUidInput.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const uid = singleUidInput.value.trim();
            if (uid) await assignCardToStudent(currentSelectedId, uid);
          }
        });
      }

      // Bulk Class Filter
      const bulkClassSelect = modal.querySelector('#nfc-bulk-class-select');
      if (bulkClassSelect) {
        bulkClassSelect.addEventListener('change', () => {
          bulkGradeFilter = bulkClassSelect.value;
          updateModalUI();
        });
      }

      // Bulk Search
      const bulkSearchInput = modal.querySelector('#nfc-bulk-search');
      if (bulkSearchInput) {
        bulkSearchInput.addEventListener('input', () => {
          bulkSearchTerm = bulkSearchInput.value.trim();
          updateModalUI();
        });
      }

      // Bulk Unassigned Checkbox
      const bulkUnassignedChk = modal.querySelector('#nfc-bulk-only-unassigned');
      if (bulkUnassignedChk) {
        bulkUnassignedChk.addEventListener('change', () => {
          bulkOnlyUnassigned = bulkUnassignedChk.checked;
          updateModalUI();
        });
      }

      // Card selection in Bulk mode
      modal.querySelectorAll('.bulk-student-card, .btn-bulk-select-card').forEach(el => {
        el.addEventListener('click', (e) => {
          const sid = el.dataset.studentId || el.closest('.bulk-student-card')?.dataset.studentId;
          if (sid) {
            currentSelectedId = sid;
            updateModalUI();
            const readerInput = modal.querySelector('#nfc-bulk-reader-input');
            if (readerInput) {
              readerInput.focus();
              readerInput.value = '';
            }
          }
        });
      });

      // Bulk Reader Input (Auto-focus & listens for USB RFID swipe/tap)
      const bulkReaderInput = modal.querySelector('#nfc-bulk-reader-input');
      if (bulkReaderInput) {
        bulkReaderInput.focus();
        bulkReaderInput.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const uid = bulkReaderInput.value.trim();
            if (uid && currentSelectedId) {
              await assignCardToStudent(currentSelectedId, uid, true);
            }
          }
        });
      }
    };

    // Card assignment logic
    const assignCardToStudent = async (studentId, uid, isBulkProgression = false) => {
      const student = allStudents.find(s => s.id === studentId);
      if (!student) return;

      const updates = {
        rfidCardId: uid,
        rfid_uid: uid,
        nfcEnabled: true,
        nfcIssuedDate: new Date().toISOString().split('T')[0],
        biometricStatus: 'Active'
      };

      try {
        await dbService.update('students', studentId, updates);
      } catch (e) {}

      // Update in-memory reference
      Object.assign(student, updates);

      EnrollerAudio.playSuccessChime();
      UIComponents.showToast(`✓ Card ${uid} assigned to ${student.fullName}!`, 'success');

      // Audit log
      try {
        auditService.log('NFC_CARD_ASSIGNED', `Physical card UID ${uid} bound to student ${student.fullName} (${student.admissionNo})`, {
          studentId,
          admissionNo: student.admissionNo,
          uid
        });
      } catch (e) {}

      if (typeof onUpdate === 'function') {
        onUpdate(student);
      }

      window.dispatchEvent(new CustomEvent('tms_student_biometrics_updated', {
        detail: { id: studentId, updates }
      }));

      // In bulk mode: automatically advance target to next unassigned student!
      if (isBulkProgression || activeMode === 'bulk') {
        const nextTarget = allStudents.find(s => s.id !== studentId && (!s.rfidCardId && !s.rfid_uid));
        if (nextTarget) {
          currentSelectedId = nextTarget.id;
        }
      }

      updateModalUI();

      if (activeMode === 'bulk') {
        const readerInp = modal.querySelector('#nfc-bulk-reader-input');
        if (readerInp) {
          readerInp.value = '';
          readerInp.focus();
        }
      }
    };

    wireListeners();
    UIComponents.refreshIcons();
  }
}
