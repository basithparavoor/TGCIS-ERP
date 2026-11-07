/**
 * THAIBA PUBLIC SCHOOL — Admission Service
 * Drives the customizable admission form, fee selection, UPI payment reference,
 * the application lifecycle (submit -> verify -> approve/reject), parent
 * credential generation and payment ledger.
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { createUserViaRpc, describeAccountError } from './account-utils.js';
import { websiteService } from './website-service.js';

const STATUS = TMS_CONFIG.admissionStatuses;

/* ------------------------------------------------------------------ */
/* Defaults (used to seed the builder / fall back when no config yet) */
/* ------------------------------------------------------------------ */

export const DEFAULT_FIELDS = [
  { key: 'candidateName', label: "Candidate's Name", type: 'text', section: 'Candidate Details', required: true, order: 1, placeholder: 'Full name as per birth certificate' },
  { key: 'dob', label: 'Date of Birth', type: 'date', section: 'Candidate Details', required: true, order: 2 },
  { key: 'gender', label: 'Gender', type: 'select', section: 'Candidate Details', required: true, order: 3, options: ['Male', 'Female', 'Other'] },
  { key: 'bloodGroup', label: 'Blood Group', type: 'select', section: 'Candidate Details', required: false, order: 4, options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
  { key: 'applyingClass', label: 'Applying for Class', type: 'select', section: 'Candidate Details', required: true, order: 5, options: ['Nursery', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] },
  { key: 'religion', label: 'Religion', type: 'text', section: 'Candidate Details', required: false, order: 6 },
  { key: 'aadhaar', label: 'Aadhaar / ID Number', type: 'text', section: 'Candidate Details', required: false, order: 7 },
  { key: 'identificationMarks', label: 'Identification Marks', type: 'text', section: 'Candidate Details', required: false, order: 8 },

  { key: 'fatherName', label: "Father's Name", type: 'text', section: 'Guardian Details', required: true, order: 9 },
  { key: 'fatherOccupation', label: "Father's Occupation", type: 'text', section: 'Guardian Details', required: false, order: 10 },
  { key: 'fatherQualification', label: "Father's Qualification", type: 'text', section: 'Guardian Details', required: false, order: 11 },
  { key: 'fatherIncome', label: 'Annual Family Income', type: 'number', section: 'Guardian Details', required: false, order: 12 },
  { key: 'motherName', label: "Mother's Name", type: 'text', section: 'Guardian Details', required: true, order: 13 },
  { key: 'motherOccupation', label: "Mother's Occupation", type: 'text', section: 'Guardian Details', required: false, order: 14 },
  { key: 'motherQualification', label: "Mother's Qualification", type: 'text', section: 'Guardian Details', required: false, order: 15 },

  { key: 'phone', label: 'Mobile Number', type: 'tel', section: 'Contact & Address', required: true, order: 16, placeholder: '+91 XXXXX XXXXX' },
  { key: 'email', label: 'E-mail', type: 'email', section: 'Contact & Address', required: false, order: 17 },
  { key: 'village', label: 'Village / Street', type: 'text', section: 'Contact & Address', required: true, order: 18 },
  { key: 'po', label: 'Post Office', type: 'text', section: 'Contact & Address', required: false, order: 19 },
  { key: 'ps', label: 'Police Station', type: 'text', section: 'Contact & Address', required: false, order: 20 },
  { key: 'district', label: 'District', type: 'text', section: 'Contact & Address', required: false, order: 21 },
  { key: 'pin', label: 'PIN Code', type: 'text', section: 'Contact & Address', required: true, order: 22 },

  { key: 'previousSchool', label: 'Previous School Name', type: 'text', section: 'Previous School', required: false, order: 23 },
  { key: 'lastClass', label: 'Last Class Passed', type: 'text', section: 'Previous School', required: false, order: 24 },
  { key: 'lastMarks', label: 'Last Percentage / Marks', type: 'number', section: 'Previous School', required: false, order: 25 },
  { key: 'referenceSource', label: 'How did you hear about us?', type: 'select', section: 'Previous School', required: false, order: 26, options: ['Newspaper', 'Social Media', 'Friend / Relative', 'Local Notice', 'Other'] },

  { key: 'photo', label: 'Student Photograph', type: 'file', section: 'Photo & Documents', required: false, order: 27, helpText: 'Recent passport-size photograph (JPG or PNG, up to 2 MB)' },
  { key: 'aadhaarDoc', label: 'Aadhaar / ID Proof', type: 'file', section: 'Photo & Documents', required: false, order: 28, helpText: 'Image or PDF' },
  { key: 'birthCertificate', label: 'Birth Certificate', type: 'file', section: 'Photo & Documents', required: false, order: 29, helpText: 'Image or PDF' },
  { key: 'marksheet', label: 'Previous Marksheet / Transfer Certificate', type: 'file', section: 'Photo & Documents', required: false, order: 30, helpText: 'Image or PDF' }
];

export const DEFAULT_FEES = [
  { name: 'Registration Fee', amount: 200, mandatory: true, description: 'Non-refundable registration charge.' },
  { name: 'Admission Fee (one time)', amount: 2500, mandatory: true, description: 'One-time admission charge.' },
  { name: 'Tuition Fee (1st month)', amount: 1200, mandatory: false, description: 'First monthly tuition.' },
  { name: 'Library Fee', amount: 0, mandatory: false, description: 'Optional annual library membership.' },
  { name: 'Transport Fee (optional)', amount: 0, mandatory: false, description: 'Choose based on your route.' }
];

const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'tel', 'email', 'select', 'checkbox', 'file', 'photo', 'image'];

/* ------------------------------------------------------------------ */

function ephemeralClient() {
  const cfg = TMS_CONFIG.supabase || {};
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
  return window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

function randomToken(len) {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, len).padEnd(len, '0');
}

export const DEFAULT_INSTRUCTIONS = [
  'Fill all mandatory (*) fields carefully, preferably in BLOCK letters.',
  'Self-attested copies of the birth certificate and previous marksheet must be produced at verification.',
  'The application is provisional until verified and approved by the school administration.',
  'Save your Form No. and the login credentials shown after submission to track your admission status.',
  'Original documents must be brought to the school office on the date of verification / admission test.'
];

export function getEmbedVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const str = rawUrl.trim();
  if (!str) return null;

  // YouTube watch, short, embed links
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  }

  // Vimeo
  const vimeoMatch = str.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  return str;
}

export function renderVideoPlayerHtml(url, title = 'Admission Process Video Walkthrough', ratio = 'auto') {
  if (!url) return '';
  const embedUrl = getEmbedVideoUrl(url);
  if (!embedUrl) return '';

  const isDirectFile = /\.(mp4|webm|ogg|mov)($|\?)/i.test(embedUrl);
  const isShorts = /shorts|reel/i.test(url) || ratio === '9:16' || ratio === 'portrait';
  const playerId = 'tms-player-' + Math.random().toString(36).substr(2, 6);

  return `
    <div class="instruction-video-wrapper ${isShorts ? 'ratio-portrait' : 'ratio-auto'}" id="${playerId}" style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--border-color, #e2e8f0); background: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
      <div style="background: #0f172a; color: #fff; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.86rem; font-weight: 700; min-width: 0;">
          <span style="color: #ef4444; display: inline-flex;"><i data-lucide="play-circle" style="width: 18px; height: 18px;"></i></span>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title || 'Admission Form Video Guide'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="
            const wrap = document.getElementById('${playerId}');
            const box = wrap.querySelector('.video-aspect-box');
            if (wrap.classList.contains('ratio-portrait')) {
              wrap.classList.remove('ratio-portrait');
              wrap.classList.add('ratio-landscape');
              box.style.paddingBottom = '56.25%';
              box.style.maxHeight = 'none';
              this.querySelector('span').innerText = 'Phone (9:16)';
            } else {
              wrap.classList.remove('ratio-landscape');
              wrap.classList.remove('ratio-auto');
              wrap.classList.add('ratio-portrait');
              box.style.paddingBottom = '177.77%';
              box.style.maxHeight = 'min(78vh, 620px)';
              this.querySelector('span').innerText = 'Wide (16:9)';
            }
          " style="padding: 3px 8px; font-size: 0.72rem; background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); display: inline-flex; align-items: center; gap: 4px;" title="Switch aspect ratio">
            <i data-lucide="smartphone" style="width: 13px; height: 13px;"></i>
            <span>${isShorts ? 'Wide (16:9)' : 'Phone (9:16)'}</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="
            const wrap = document.getElementById('${playerId}');
            const frame = wrap.querySelector('iframe, video');
            if (frame) {
              if (frame.requestFullscreen) frame.requestFullscreen();
              else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
            }
          " style="padding: 3px 8px; font-size: 0.72rem; background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); display: inline-flex; align-items: center; gap: 4px;" title="Fullscreen">
            <i data-lucide="maximize-2" style="width: 13px; height: 13px;"></i>
            <span>Full</span>
          </button>
        </div>
      </div>
      <div class="video-aspect-box" style="position: relative; width: 100%; height: 0; overflow: hidden; background: #000; transition: padding-bottom 0.25s ease, max-height 0.25s ease;">
        ${isDirectFile ? `
          <video src="${embedUrl}" controls playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; object-fit: contain;"></video>
        ` : `
          <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
        `}
      </div>
    </div>
  `;
}

export const DEFAULT_POPUP_INSTRUCTIONS = [
  'Please note down or take a screenshot of your unique Application ID for future reference.',
  'Print or save your Application Form & Admit Card using the button below.',
  'Affix recent passport-size photographs on the printed Application Form and Admit Card.',
  'Produce self-attested copies of birth certificate and previous marksheet on the verification date.',
  'Original documents must be brought to the school office for physical verification.'
];

class AdmissionService {
  /* ---------------- Settings ---------------- */

  async loadSettings() {
    const rows = await dbService.select('admission_settings');
    const existing = rows.find((r) => r.id === 'default') || {};
    return {
      id: 'default',
      session: existing.session || '2027 - 2028',
      formTitle: existing.formTitle || 'Admission Application Form',
      formSubtitle: existing.formSubtitle || 'Run by : Thaiba Heritage, Kolkata',
      admitCardTitle: existing.admitCardTitle || 'ADMIT CARD',
      admitCardSubtitle: existing.admitCardSubtitle || 'THAIBA PUBLIC SCHOOL',
      admitCardAddress: existing.admitCardAddress || 'Baghait, Tapan, Dakshin Dinajpur • Contact : +91 8653382851, +91 8167782851',
      formFee: Number(existing.formFee || 0),
      showFeeStructure: existing.showFeeStructure === true,
      showGuidelines: existing.showGuidelines !== false, // default enabled
      instructionVideoUrl: existing.instructionVideoUrl || '',
      instructionVideoTitle: existing.instructionVideoTitle || 'How to Fill Admission Application Form',
      instructionVideoRatio: existing.instructionVideoRatio || 'auto',
      showInstructionVideo: existing.showInstructionVideo !== false,
      paymentRequired: !!existing.paymentRequired,
      upiId: existing.upiId || '',
      upiPayeeName: existing.upiPayeeName || TMS_CONFIG.institution.name,
      paymentInstructions: existing.paymentInstructions || '',
      instructions: Array.isArray(existing.instructions) && existing.instructions.length
        ? existing.instructions
        : DEFAULT_INSTRUCTIONS,
      popupInstructions: Array.isArray(existing.popupInstructions) && existing.popupInstructions.length
        ? existing.popupInstructions
        : DEFAULT_POPUP_INSTRUCTIONS,
      successMessage: existing.successMessage || '',
      testCentre: existing.testCentre || `${TMS_CONFIG.institution.name}, ${TMS_CONFIG.institution.address.campus}, ${TMS_CONFIG.institution.address.district}`
    };
  }

  async saveSettings(settings) {
    return dbService.upsert('admission_settings', { ...settings, id: 'default' });
  }

  /* ---------------- Form fields ---------------- */

  /** Ensure default fields are persisted so adding a custom question never wipes out defaults */
  async ensureCoreDefaultsSeeded() {
    const rows = await dbService.select('admission_form_fields');
    const existingKeys = new Set((rows || []).map(f => (f.fieldKey || f.key || '').trim().toLowerCase()));
    const hasCore = existingKeys.has('candidatename') && existingKeys.has('dob');
    if (!hasCore) {
      let maxOrder = (rows || []).reduce((max, f) => Math.max(max, f.displayOrder || 0), 0);
      for (const f of DEFAULT_FIELDS) {
        const k = (f.key || '').trim().toLowerCase();
        if (!existingKeys.has(k)) {
          maxOrder += 1;
          const record = {
            id: `fld-${f.key}`,
            fieldKey: f.key,
            label: f.label,
            fieldType: f.type,
            section: f.section || 'General Information',
            placeholder: f.placeholder || '',
            helpText: f.helpText || '',
            options: Array.isArray(f.options) ? f.options : [],
            required: !!f.required,
            isActive: true,
            displayOrder: f.order || maxOrder
          };
          // eslint-disable-next-line no-await-in-loop
          await dbService.upsert('admission_form_fields', record);
          existingKeys.add(k);
        }
      }
    }
  }

  async listFields() {
    const rows = await dbService.select('admission_form_fields');
    if (rows && rows.length) {
      const hasCore = rows.some(f => (f.fieldKey || f.key) === 'candidateName');
      if (!hasCore) {
        await this.ensureCoreDefaultsSeeded();
        const refreshed = await dbService.select('admission_form_fields');
        return refreshed
          .filter((f) => f.isActive !== false)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
      const active = rows
        .filter((f) => f.isActive !== false)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      if (active.length) return active;
    }
    return DEFAULT_FIELDS.map((f, i) => ({
      id: `fld-${f.key}`,
      fieldKey: f.key,
      label: f.label,
      fieldType: f.type,
      section: f.section,
      required: f.required,
      options: f.options || [],
      placeholder: f.placeholder || '',
      helpText: '',
      isActive: true,
      displayOrder: f.order || i + 1
    }));
  }

  async listAllFields() {
    const rows = await dbService.select('admission_form_fields');
    if (rows && rows.length) {
      const hasCore = rows.some(f => (f.fieldKey || f.key) === 'candidateName');
      if (!hasCore) {
        await this.ensureCoreDefaultsSeeded();
        const refreshed = await dbService.select('admission_form_fields');
        return refreshed.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
      return rows.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
    return [];
  }

  async saveField(field, skipEnsure = false) {
    if (!skipEnsure) {
      await this.ensureCoreDefaultsSeeded();
    }
    const key = (field.fieldKey || field.key || '').trim().replace(/[^A-Za-z0-9_]/g, '');
    if (!key) throw new Error('A field key is required.');
    const type = FIELD_TYPES.includes(field.fieldType || field.type) ? (field.fieldType || field.type) : 'text';
    const record = {
      id: field.id || `fld-${key}-${randomToken(4)}`,
      fieldKey: key,
      label: field.label || key,
      fieldType: type,
      section: field.section || 'General Information',
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      options: Array.isArray(field.options) ? field.options : [],
      required: !!field.required,
      isActive: field.isActive !== false,
      displayOrder: Number(field.displayOrder || 0)
    };
    return dbService.upsert('admission_form_fields', record);
  }

  async removeField(id) {
    return dbService.delete('admission_form_fields', id);
  }

  async seedDefaultFields(force = false) {
    const existing = await dbService.select('admission_form_fields');
    const existingKeys = new Set((existing || []).map(f => (f.fieldKey || f.key || '').trim().toLowerCase()));
    let maxOrder = (existing || []).reduce((max, f) => Math.max(max, f.displayOrder || 0), 0);
    let seeded = 0;
    for (const f of DEFAULT_FIELDS) {
      const k = (f.key || '').trim().toLowerCase();
      if (force || !existingKeys.has(k)) {
        maxOrder += 1;
        const record = {
          id: `fld-${f.key}`,
          fieldKey: f.key,
          label: f.label,
          fieldType: f.type,
          section: f.section || 'General Information',
          placeholder: f.placeholder || '',
          helpText: f.helpText || '',
          options: Array.isArray(f.options) ? f.options : [],
          required: !!f.required,
          isActive: true,
          displayOrder: f.order || maxOrder
        };
        // eslint-disable-next-line no-await-in-loop
        await dbService.upsert('admission_form_fields', record);
        existingKeys.add(k);
        seeded += 1;
      }
    }
    return seeded;
  }

  /* ---------------- Fees ---------------- */

  async ensureCoreFeesSeeded() {
    const existing = await dbService.select('admission_fees');
    if (!existing || existing.length === 0) {
      await this.seedDefaultFees();
    }
  }

  async listFees() {
    const rows = await dbService.select('admission_fees');
    const active = (rows || [])
      .filter((f) => f.isActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    if (active.length) return active;
    return DEFAULT_FEES.map((f, i) => ({
      id: `fee-${i + 1}`,
      name: f.name,
      amount: f.amount,
      description: f.description,
      mandatory: f.mandatory,
      isActive: true,
      displayOrder: i + 1
    }));
  }

  async listAllFees() {
    const rows = await dbService.select('admission_fees');
    return (rows || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async saveFee(fee, skipEnsure = false) {
    if (!skipEnsure) {
      await this.ensureCoreFeesSeeded();
    }
    const record = {
      id: fee.id || `fee-${randomToken(6)}`,
      name: fee.name || 'Fee Item',
      amount: Number(fee.amount || 0),
      schedule: fee.schedule || '',
      description: fee.description || '',
      mandatory: !!fee.mandatory,
      isActive: fee.isActive !== false,
      displayOrder: Number(fee.displayOrder || 0)
    };
    return dbService.upsert('admission_fees', record);
  }

  async removeFee(id) {
    return dbService.delete('admission_fees', id);
  }

  async seedDefaultFees() {
    const existing = await this.listAllFees();
    if (existing.length) return existing.length;
    let order = 1;
    for (const f of DEFAULT_FEES) {
      // eslint-disable-next-line no-await-in-loop
      await this.saveFee({ ...f, displayOrder: order }, true);
      order += 1;
    }
    return DEFAULT_FEES.length;
  }

  /* ---------------- Files & storage ---------------- */

  generateFormNo() {
    return `TMS/${new Date().getFullYear()}/ADM-${randomDigits(6)}`;
  }

  sanitizeFileName(name) {
    return String(name || 'file').replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
  }

  async uploadFile(bucket, path, file) {
    const client = dbService.getClient();
    if (!client) return { error: 'Storage unavailable' };
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (error) return { error: error.message };
      return { path: data ? data.path : path };
    } catch (e) {
      return { error: e.message };
    }
  }

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    if (!path) return null;
    if (typeof path === 'string' && (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    const cleanPath = String(path).replace(/^\/+/, '');
    const supabaseUrl = (TMS_CONFIG.supabase && TMS_CONFIG.supabase.url) || 'https://rzcihdpzqrnzcaupjfla.supabase.co';

    // Public buckets always resolve directly to public URL (instant 0ms, zero signing network errors)
    if (bucket === 'admission-docs' || bucket === 'admissions' || bucket === 'avatars') {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
    }

    const client = dbService.getClient();
    if (!client) return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;

    try {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);
      if (error || !data || !data.signedUrl) {
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
      }
      return data.signedUrl;
    } catch (_) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
    }
  }

  getPublicUrl(bucket, path) {
    if (!path) return null;
    if (typeof path === 'string' && (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    const cleanPath = String(path).replace(/^\/+/, '');
    const supabaseUrl = (TMS_CONFIG.supabase && TMS_CONFIG.supabase.url) || 'https://rzcihdpzqrnzcaupjfla.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  }

  /* ---------------- Credentials ---------------- */

  buildCredentials(formNo) {
    const digits = String(formNo).replace(/[^0-9]/g, '').slice(-6) || randomDigits(6);
    const username = `par${digits}${randomToken(2)}`;
    return {
      username,
      email: `${username}@${TMS_CONFIG.parentEmailDomain}`,
      password: `Tms@${randomToken(4)}${randomDigits(2)}`
    };
  }

  /**
   * Create the parent login.
   *
   * Preferred: the `tms_create_user` SQL function — no sign-up endpoint, so no
   * e-mail rate limit and no confirmation step. Falls back to the legacy
   * `auth.signUp` call only when that function has not been deployed yet.
   */
  async createParentAccount(email, password, fullName) {
    const name = fullName || String(email).split('@')[0];

    const viaRpc = await createUserViaRpc(dbService.getClient(), {
      p_email: email,
      p_password: password,
      p_name: name
    });
    if (viaRpc.userId) return { userId: viaRpc.userId };
    if (viaRpc.error) return { error: viaRpc.error };

    // Legacy fallback (function not deployed).
    const client = ephemeralClient();
    if (!client) return { error: 'supabase-unavailable' };
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });
      if (error) return { error: describeAccountError(error) };
      const userId = data && data.user ? data.user.id : null;
      if (!userId) {
        return { error: 'The account was created but needs e-mail confirmation. Turn OFF "Confirm email" in Supabase Auth.' };
      }
      return { userId };
    } catch (e) {
      return { error: describeAccountError(e) };
    }
  }

  /* ---------------- Applications ---------------- */

  async listApplications() {
    const rows = await dbService.select('admissions_applications', null, true);
    return (rows || []).map((a) => {
      const pld = a.payload || {};
      const createdAt = a.createdAt || a.created_at || pld.applicationDate || new Date().toISOString();
      return {
        ...a,
        id: a.id || a.appId || a.app_id,
        appId: a.appId || a.app_id || pld.formNo || pld.appId || a.id,
        studentName: a.studentName || a.student_name || pld.candidateName || pld.studentName || '—',
        grade: a.grade || a.applyingClass || pld.applyingClass || pld.grade || '—',
        guardianName: a.guardianName || a.guardian_name || pld.fatherName || pld.guardianName || pld.motherName || '—',
        phone: a.phone || pld.phone || pld.mobile || '—',
        gender: a.gender || pld.gender || '',
        dob: a.dob || pld.dob || '',
        address: a.address || [pld.village, pld.po, pld.ps, pld.district, pld.pin].filter(Boolean).join(', ') || '',
        feeTotal: a.feeTotal != null ? Number(a.feeTotal) : (a.fee_total != null ? Number(a.fee_total) : 0),
        paymentStatus: a.paymentStatus || a.payment_status || 'Not Required',
        submittedByName: a.submittedByName || a.submitted_by_name || 'Self / Public',
        status: a.status || 'Submitted',
        createdAt
      };
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  async listApplicationsForParent(userId, email) {
    const rows = await dbService.select('admissions_applications');
    return rows.filter(
      (a) => a.parentUserId === userId || (email && (a.parentEmail || '').toLowerCase() === email)
    );
  }

  async getStats() {
    const apps = await this.listApplications();
    const byStatus = (s) => apps.filter((a) => a.status === s).length;
    return {
      total: apps.length,
      submitted: byStatus(STATUS.SUBMITTED) + byStatus(STATUS.UNDER_VERIFICATION),
      approved: byStatus(STATUS.APPROVED),
      rejected: byStatus(STATUS.REJECTED),
      collected: apps.reduce(
        (sum, a) => sum + (a.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0),
        0
      )
    };
  }

  /**
   * Submit a new application from the public/office form.
   */
  async submitApplication({ values, selectedFeeIds = [], paymentMode = '', paymentRef = '', submittedBy = null, formNo = null }) {
    const [settings, feeList] = await Promise.all([this.loadSettings(), this.listFees()]);

    let feeItems = [];
    let feeTotal = 0;
    if (Array.isArray(selectedFeeIds) && selectedFeeIds.length > 0) {
      const chosenIds = new Set(selectedFeeIds);
      feeList.forEach((f) => {
        if (f.mandatory) chosenIds.add(f.id);
      });
      const chosen = feeList.filter((f) => chosenIds.has(f.id));
      feeItems = chosen.map((f) => ({ id: f.id, name: f.name, amount: Number(f.amount || 0) }));
      feeTotal = feeItems.reduce((s, f) => s + f.amount, 0);
    }

    const appNo = (formNo || this.generateFormNo()).toString().trim();
    const credentials = this.buildCredentials(appNo);
    const guardianName = (values.fatherName || values.guardianName || values.motherName || 'Parent / Guardian').toString().trim();

    // Create parent login (best effort — application is still safely registered if this fails)
    let account = { userId: null };
    try {
      account = await this.createParentAccount(credentials.email, credentials.password, guardianName);
    } catch (e) {
      console.warn('Parent account creation notice:', e.message);
    }

    let paymentStatus = 'Not Required';
    if (feeTotal > 0) paymentStatus = paymentRef ? 'Paid' : 'Pending';

    // Strict schema sanitization: ensures Postgres NOT NULL & DATE constraints are respected
    const cleanStudentName = (values.candidateName || values.studentName || 'Applicant').toString().trim();
    const cleanGrade = (values.applyingClass || values.grade || values.class || 'LKG').toString().trim();
    const cleanPhone = (values.phone || values.mobile || 'Not Provided').toString().trim();
    const cleanEmail = (values.email && values.email.trim()) ? values.email.trim() : (credentials.email || `parent_${appNo.toLowerCase()}@thaiba.edu`);
    const cleanDob = (values.dob && values.dob.trim()) ? values.dob.trim() : null;
    const cleanGender = (values.gender && values.gender.trim()) ? values.gender.trim() : null;

    const uniqueRowId = 'app_' + appNo.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);

    const application = {
      id: uniqueRowId,
      appId: appNo,
      studentName: cleanStudentName,
      dob: cleanDob,
      gender: cleanGender,
      grade: cleanGrade,
      guardianName: guardianName,
      phone: cleanPhone,
      email: cleanEmail,
      address: [values.village, values.po, values.ps, values.district, values.pin]
        .filter(Boolean)
        .join(', '),
      status: STATUS.SUBMITTED,
      payload: values,
      feeItems,
      feeTotal,
      paymentStatus,
      paymentMode: feeTotal > 0 ? paymentMode || 'UPI' : '',
      paymentRef: paymentRef || '',
      payments: [],
      submittedBy: submittedBy ? (submittedBy.id || null) : null,
      submittedByName: submittedBy ? (submittedBy.name || 'Staff') : 'Self / Public',
      parentUserId: account.userId || null,
      parentUsername: credentials.username,
      parentEmail: credentials.email,
      remarks: ''
    };

    const saved = await dbService.insert('admissions_applications', application);

    let credentialRow = null;
    try {
      credentialRow = await dbService.insert('parent_credentials', {
        id: `cred-${credentials.username}`,
        applicationId: saved.id || uniqueRowId,
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        userId: account.userId || null,
        studentId: null,
        status: 'Active'
      });
    } catch (e) {
      console.warn('Parent credential row insert notice:', e.message);
    }

    try {
      await dbService.upsert('login_aliases', {
        id: `alias-${credentials.username.toLowerCase()}`,
        username: credentials.username.toLowerCase(),
        email: credentials.email.toLowerCase(),
        role: 'parent'
      });
    } catch (e) { /* ignore */ }

    return {
      application: saved,
      credentials,
      credentialRow,
      accountError: account.error || null,
      paymentRequired: !!settings.paymentRequired || feeItems.some((f) => f.amount > 0)
    };
  }

  async getApplication(id) {
    if (!id) return null;
    try {
      const rows = await dbService.select('admissions_applications', { eq: { id } });
      if (rows && rows.length) return rows[0];
    } catch (_) {}
    const all = await this.listApplications();
    return all.find((a) => a.id === id || a.appId === id) || null;
  }

  async updateApplication(id, { values = {}, status, paymentStatus, remarks }) {
    const existing = await this.getApplication(id);
    const prevPayload = (existing && existing.payload) ? existing.payload : {};
    const updatedPayload = { ...prevPayload, ...values };

    const guardianName =
      updatedPayload.fatherName || updatedPayload.guardianName || updatedPayload.motherName || (existing && existing.guardianName) || 'Parent / Guardian';

    const patch = {
      studentName: updatedPayload.candidateName || (existing && existing.studentName),
      grade: updatedPayload.applyingClass || (existing && existing.grade),
      guardianName,
      phone: updatedPayload.phone || (existing && existing.phone),
      email: updatedPayload.email || (existing && existing.email),
      dob: updatedPayload.dob || (existing && existing.dob),
      gender: updatedPayload.gender || (existing && existing.gender),
      address: [updatedPayload.village, updatedPayload.po, updatedPayload.ps, updatedPayload.district, updatedPayload.pin].filter(Boolean).join(', ') || (existing && existing.address),
      payload: updatedPayload
    };

    if (status !== undefined) patch.status = status;
    if (paymentStatus !== undefined) patch.paymentStatus = paymentStatus;
    if (remarks !== undefined) patch.remarks = remarks;

    const res = await dbService.update('admissions_applications', id, patch);
    return res;
  }

  async verifyApplication(id, { status, remarks = '' }) {
    return dbService.update('admissions_applications', id, {
      status,
      remarks,
      verifiedAt: new Date().toISOString()
    });
  }

  async approveApplication(id, remarks = '') {
    return this.verifyApplication(id, { status: STATUS.APPROVED, remarks });
  }

  async rejectApplication(id, remarks = '') {
    return this.verifyApplication(id, { status: STATUS.REJECTED, remarks });
  }

  /* ---------------- Payments ---------------- */

  async recordPayment(application, { amount, mode, reference, note = '' }) {
    const payments = Array.isArray(application.payments) ? application.payments.slice() : [];
    payments.push({
      amount: Number(amount || 0),
      mode: mode || 'Cash',
      reference: reference || '',
      note,
      date: new Date().toISOString()
    });
    const paidTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const feeTotal = Number(application.feeTotal || 0);

    return dbService.update('admissions_applications', application.id, {
      payments,
      paymentStatus: paidTotal >= feeTotal && feeTotal > 0 ? 'Paid' : application.paymentStatus
    });
  }

  /* ---------------- Credentials (admin) ---------------- */

  async getCredentials(applicationOrId) {
    if (!applicationOrId) return null;
    const appId = typeof applicationOrId === 'string' ? applicationOrId : applicationOrId?.id;
    const appUsername = typeof applicationOrId === 'object' ? (applicationOrId?.parentUsername || '') : '';
    const appEmail = typeof applicationOrId === 'object' ? (applicationOrId?.parentEmail || '') : '';
    const formNo = typeof applicationOrId === 'object' ? (applicationOrId?.appId || applicationOrId?.id || '') : '';

    const rows = await dbService.select('parent_credentials');
    let found = rows.find((r) => r.applicationId === appId);
    if (!found && appUsername) {
      found = rows.find((r) => r.username && r.username.toLowerCase() === appUsername.toLowerCase());
    }
    if (!found && appEmail) {
      found = rows.find((r) => r.email && r.email.toLowerCase() === appEmail.toLowerCase());
    }
    if (!found && formNo) {
      const cleanDigits = String(formNo).replace(/\D/g, '').slice(-6);
      if (cleanDigits) {
        found = rows.find((r) => r.username && r.username.includes(cleanDigits));
      }
    }
    return found || null;
  }

  /**
   * Get existing credentials or provision guaranteed credentials for an application
   * so that every admission printout and portal login tracking always has valid credentials.
   */
  async getOrCreateCredentials(app) {
    if (!app) return null;
    let cred = await this.getCredentials(app);
    if (cred) return cred;

    const formNo = app.appId || app.id || this.generateFormNo();
    const built = this.buildCredentials(formNo);
    try {
      const credentialRow = await dbService.insert('parent_credentials', {
        id: `cred-${built.username}`,
        applicationId: app.id,
        username: built.username,
        email: built.email,
        password: built.password,
        userId: app.parentUserId || null,
        studentId: null,
        status: 'Active'
      });
      await dbService.update('admissions_applications', app.id, {
        parentUsername: built.username,
        parentEmail: built.email
      });
      try {
        await dbService.upsert('login_aliases', {
          id: `alias-${built.username.toLowerCase()}`,
          username: built.username.toLowerCase(),
          email: built.email.toLowerCase(),
          role: 'parent'
        });
      } catch (e) { /* ignore */ }
      return credentialRow || built;
    } catch (e) {
      return built;
    }
  }

  /**
   * Change a parent's username / password.
   *
   * The account e-mail is fixed at creation (`<username>@parent-domain`), so a
   * rename must NOT change the e-mail — it re-points the shared `login_aliases`
   * row instead, which is what the sign-in page resolves a username through.
   */
  async updateCredentials(row, { username, password }) {
    if (!row) return { error: 'No credentials on file.' };
    const newUsername = (username || row.username || '').trim().toLowerCase();
    const newPassword = password || row.password;

    const updates = {
      username: newUsername,
      password: newPassword
    };
    // Only derive a fresh e-mail while the login has not been activated yet;
    // once the account exists its auth e-mail must stay untouched.
    if (!row.userId) updates.email = `${newUsername}@${TMS_CONFIG.parentEmailDomain}`;

    const saved = await dbService.update('parent_credentials', row.id, updates);
    if (saved && saved._syncError) return { error: saved._syncError };

    // Re-point the public username -> e-mail alias so the new username signs in.
    const aliasEmail = row.userId ? (row.email || updates.email) : updates.email;
    if (aliasEmail) {
      const { staffService } = await import('./staff-service.js');
      if (row.username && row.username.toLowerCase() !== newUsername) {
        await staffService.removeAlias(row.username);
      }
      await staffService.saveAlias({ username: newUsername, email: aliasEmail, role: 'parent' });
    }

    if (newPassword && row.userId) {
      const { staffService } = await import('./staff-service.js');
      await staffService.setPassword(row.userId, newPassword);
    }
    return saved;
  }

  /**
   * Re-send the parent's credentials as an in-portal notification.
   * @returns {Promise<{row: object|null, delivered: boolean, reason?: string}>}
   */
  async resendCredentials(application) {
    const row = await this.getCredentials(application.id);
    if (!row) return { row: null, delivered: false, reason: 'no-credentials' };

    const userId = application.parentUserId || row.userId;
    if (!userId) {
      return {
        row,
        delivered: false,
        reason: 'Use “Activate Login” first — this parent has no active account yet.'
      };
    }

    const { notificationService } = await import('./notification-service.js');
    await notificationService.create({
      title: 'Admission Portal Access',
      message: `Your admission portal access for application ${application.appId} — Username: ${row.username}, Password: ${row.password}. Please keep it safe.`,
      audience: 'user',
      recipientId: userId,
      priority: 'High'
    });
    return { row, delivered: true };
  }

  /**
   * (Re)activate a parent login whose account could not be created at submission
   * time — for example when Supabase was rate-limiting the sign-up endpoint.
   */
  async activateParentAccount(application) {
    const row = await this.getCredentials(application.id);
    if (!row) return { error: 'No credentials on file for this application.' };

    const existingUser = application.parentUserId || row.userId;
    if (existingUser) return { userId: existingUser, alreadyActive: true };

    const res = await this.createParentAccount(row.email, row.password, row.username);
    if (!res.userId) return { error: res.error || 'Account could not be created.' };

    await dbService.update('parent_credentials', row.id, { userId: res.userId });
    if (application && application.id) {
      await dbService.update('admissions_applications', application.id, { parentUserId: res.userId });
    }
    return { userId: res.userId };
  }

  /* ---------------- Student Enrollment & Verification ---------------- */

  async enrollApplicantAsStudent(applicationId, { section = 'A', rollNo = '', remarks = '' } = {}) {
    const apps = await this.listApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) return { error: 'Application not found.' };

    const payload = app.payload || {};
    const studentName = app.studentName || payload.candidateName || payload.studentName || 'Student';
    const dob = app.dob || payload.dob || '';
    const gender = app.gender || payload.gender || 'Male';
    const bloodGroup = payload.bloodGroup || 'O+';
    const grade = app.grade || payload.applyingClass || 'Grade 1';
    const guardianName = app.guardianName || payload.fatherName || payload.guardianName || '';
    const guardianPhone = app.phone || payload.phone || payload.mobile || '';
    const address = app.address || `${payload.village || ''} ${payload.district || ''}`.trim() || '';
    const photo = payload.photo || null;
    const aadhaar = payload.aadhaar || '';

    // Calculate next sequence for admission number
    const existingStudents = await dbService.select('students');
    const year = new Date().getFullYear();
    const currentYearStudents = existingStudents.filter((s) => String(s.admissionNo || '').includes(String(year)));
    const maxSeq = currentYearStudents.reduce((max, s) => {
      const match = String(s.admissionNo || '').match(/(\d+)\s*$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const nextSeq = maxSeq + 1;
    const admissionNo = `TMS/${year}/${nextSeq.toString().padStart(3, '0')}`;

    // Compute roll number if not provided
    let finalRoll = rollNo;
    if (!finalRoll) {
      const sameClassCount = existingStudents.filter((s) => s.grade === grade && s.section === section).length;
      finalRoll = (sameClassCount + 1).toString().padStart(2, '0');
    }

    const newStudent = await dbService.insert('students', {
      admissionNo,
      rollNo: finalRoll,
      fullName: studentName,
      dob,
      gender,
      bloodGroup,
      grade,
      section,
      guardianName,
      guardianPhone,
      address,
      photo,
      aadhaar,
      status: 'Active',
      leaveStatus: null,
      applicationId: app.id,
      enrolledAt: new Date().toISOString()
    });

    if (newStudent._syncError) {
      return { error: `Database insert failed: ${newStudent._syncError}` };
    }

    // Mark application as Enrolled
    await dbService.update('admissions_applications', app.id, {
      status: 'Enrolled',
      enrolledStudentId: newStudent.id,
      enrolledAdmissionNo: admissionNo,
      enrolledAt: new Date().toISOString(),
      remarks: remarks ? `${app.remarks || ''}\n${remarks}`.trim() : app.remarks
    });

    return { success: true, student: newStudent, admissionNo };
  }

  async verifyDocument(applicationId, docKey, verifiedBy = 'Authorized Staff') {
    const apps = await this.listApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) return { error: 'Application not found.' };

    const docVerifications = { ...(app.docVerifications || {}) };
    docVerifications[docKey] = {
      verified: true,
      verifiedBy: verifiedBy || 'Authorized Staff',
      verifiedAt: new Date().toISOString()
    };

    return dbService.update('admissions_applications', applicationId, { docVerifications });
  }

  async recordEntranceScore(applicationId, { writtenScore = 0, interviewScore = 0, examinerRemarks = '', evaluatedBy = 'Staff' } = {}) {
    const written = Number(writtenScore || 0);
    const interview = Number(interviewScore || 0);
    const totalScore = written + interview;

    return dbService.update('admissions_applications', applicationId, {
      entranceExam: {
        writtenScore: written,
        interviewScore: interview,
        totalScore,
        examinerRemarks: examinerRemarks || '',
        evaluatedBy: evaluatedBy || 'Staff',
        evaluatedAt: new Date().toISOString()
      }
    });
  }

  async getMeritList(grade = 'all') {
    const apps = await this.listApplications();
    let filtered = apps.filter((a) => a.entranceExam && (a.entranceExam.totalScore != null || a.entranceExam.writtenScore != null));
    if (grade && grade !== 'all') {
      filtered = filtered.filter((a) => a.grade === grade);
    }
    filtered.sort((a, b) => {
      const scoreA = Number((a.entranceExam && a.entranceExam.totalScore) || 0);
      const scoreB = Number((b.entranceExam && b.entranceExam.totalScore) || 0);
      return scoreB - scoreA;
    });
    return filtered;
  }

  /* ---------------- Website Admission Inquiries ---------------- */

  async listInquiries() {
    return websiteService.listInquiries();
  }

  async saveInquiry(inquiry) {
    return websiteService.saveInquiry(inquiry);
  }

  async updateInquiry(id, updates) {
    return websiteService.updateInquiry(id, updates);
  }

  async deleteInquiry(id) {
    return websiteService.deleteInquiry(id);
  }
}

export const admissionService = new AdmissionService();
export default admissionService;
