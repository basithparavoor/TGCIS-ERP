/**
 * THAIBA PUBLIC SCHOOL — Institution Details & Campus Profile Service
 * 
 * Manages institutional registration, trust, campus location, contact,
 * and Head of Institution profile. Persists to Supabase `app_settings`
 * under the `institution_profile` key, caches in localStorage, and dynamically
 * synchronizes with `TMS_CONFIG.institution` so that all ERP modules,
 * admission forms, printouts, and reports use the updated institutional details.
 */

import { dbService } from './supabase-client.js';
import { TMS_CONFIG } from './config.js';
import { UIComponents } from './ui-components.js';

const SETTINGS_ID = 'institution_profile';
const CACHE_KEY = 'tms_institution_profile';

const DEFAULT_PROFILE = {
  name: 'THAIBA PUBLIC SCHOOL',
  code: 'TMS-TAPAN',
  tagline: 'Run by : Thaiba Heritage, Kolkata',
  trust: 'Thaiba Heritage, Kolkata',
  regNo: 'Regd. No. IV 01894/2011',
  campusDistrict: 'Dakshin Dinajpur',
  campusLocation: 'Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127',
  contactPhones: '+91 8653382851 / +91 8167782851',
  contactEmail: 'tps@thaibagarden.com',
  website: 'https://tps.clubad.space',
  headOfInstitutionName: 'C. M. Basith',
  headOfInstitutionEmail: 'cmbasith786@gmail.com',
  headOfInstitutionDesignation: 'Head of Institution'
};

class InstitutionService {
  constructor() {
    this.data = this.readCache();
    this.syncConfig(this.data);
    this._loaded = false;
  }

  readCache() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) {
      /* storage unavailable */
    }
    return { ...DEFAULT_PROFILE };
  }

  writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || {}));
    } catch (e) {
      /* storage unavailable */
    }
  }

  /**
   * Synchronize the institutional details with runtime TMS_CONFIG.institution
   * so all modules across the application reflect the latest values immediately.
   */
  syncConfig(data) {
    if (!TMS_CONFIG || !TMS_CONFIG.institution) return;
    const inst = TMS_CONFIG.institution;

    if (data.name) inst.name = data.name;
    if (data.tagline) inst.tagline = data.tagline;
    if (data.trust) inst.trust = data.trust;
    if (data.regNo) inst.regNo = data.regNo.replace(/^Regd\.\s*No\.?\s*:?\s*/i, '');

    if (!inst.address) inst.address = {};
    if (data.campusDistrict) inst.address.district = data.campusDistrict;
    if (data.campusLocation) {
      inst.address.campus = data.campusLocation;
      inst.address.locality = data.campusLocation;
    }

    if (!inst.contact) inst.contact = {};
    if (data.contactEmail) inst.contact.email = data.contactEmail;
    if (data.contactPhones) {
      const parts = data.contactPhones.split('/').map(s => s.trim());
      inst.contact.phone1 = parts[0] || '';
      inst.contact.phone2 = parts[1] || '';
      inst.contact.phone = parts[0] || data.contactPhones;
    }
    if (data.website) inst.contact.website = data.website;

    inst.headOfInstitution = data.headOfInstitutionName || 'Head of Institution';
    inst.headOfInstitutionEmail = data.headOfInstitutionEmail || '';
  }

  /**
   * Get current institutional details.
   */
  getDetails() {
    return { ...this.data };
  }

  /**
   * Re-read latest institutional details from Supabase app_settings.
   */
  async refresh() {
    try {
      const rows = await dbService.select('app_settings');
      const row = rows.find(r => r.id === SETTINGS_ID);
      if (row && row.value && typeof row.value === 'object') {
        this.data = { ...DEFAULT_PROFILE, ...row.value };
        this.writeCache(this.data);
        this.syncConfig(this.data);
        this._loaded = true;
        window.dispatchEvent(new CustomEvent('tms_institution_changed', { detail: this.data }));
      }
    } catch (err) {
      console.warn('Could not refresh institutional profile from database:', err.message);
    }
    return this.data;
  }

  /**
   * Save updated institutional details to Supabase app_settings and localStorage.
   */
  async saveDetails(updates) {
    const next = { ...this.data, ...updates, updatedAt: new Date().toISOString() };
    this.data = next;
    this.writeCache(next);
    this.syncConfig(next);

    try {
      await dbService.upsert('app_settings', {
        id: SETTINGS_ID,
        value: next
      });
    } catch (err) {
      console.warn('Could not upsert institutional details to app_settings:', err.message);
    }

    window.dispatchEvent(new CustomEvent('tms_institution_changed', { detail: next }));
    return { success: true, data: next };
  }

  /**
   * Reset institutional details back to official defaults.
   */
  async resetToDefaults() {
    return await this.saveDetails(DEFAULT_PROFILE);
  }

  /**
   * Generates the luxury HTML card matching the user's uploaded image.
   * Can be rendered anywhere institutional details and campus status are shown.
   */
  renderStatusCardHtml(customData = null) {
    const d = customData || this.data || DEFAULT_PROFILE;
    const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

    const regDisplay = `${esc(d.regNo || 'Regd. No. IV 01894/2011')} • Run by ${esc(d.trust || 'Thaiba Heritage, Kolkata')}`;
    const headDisplay = `${esc(d.headOfInstitutionName || 'C. M. Basith')}${d.headOfInstitutionEmail ? ` (${esc(d.headOfInstitutionEmail)})` : ''}`;

    return `
      <div class="inst-campus-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:22px 24px; box-shadow:0 4px 16px rgba(15,23,42,0.04); font-family:var(--font-body, inherit); width:100%; max-width:640px;">
        <!-- Header: Title & Campus Badge -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:10px; background:#ecfdf5; color:#BF9A33; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="building-2" style="width:20px; height:20px;"></i>
            </div>
            <h3 style="margin:0; font-family:var(--font-display, inherit); font-size:1.15rem; font-weight:800; color:#0f172a; letter-spacing:-0.01em;">
              Institution Profile &amp; Campus Status
            </h3>
          </div>
          <span style="display:inline-flex; align-items:center; padding:4px 14px; border-radius:9999px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-size:0.78rem; font-weight:700; white-space:nowrap;">
            ${esc(d.campusDistrict || 'Dakshin Dinajpur')}
          </span>
        </div>

        <!-- Section 1: Official Registration / Trust -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#FDF8E8; color:#BF9A33; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="file-text" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Official Registration / Trust:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${regDisplay}
            </div>
          </div>
        </div>

        <!-- Section 2: Campus Location -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="map-pin" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Campus Location:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.campusLocation || 'Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127')}
            </div>
          </div>
        </div>

        <!-- Section 3: Institutional Contact & Support -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#fffbeb; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="phone" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Institutional Contact &amp; Support:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.contactPhones || '+91 8653382851 / +91 8167782851')} • ${esc(d.contactEmail || 'tps@thaibagarden.com')}
            </div>
          </div>
        </div>

        <!-- Section 4: Head Of Institution -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0 2px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#faf5ff; color:#9333ea; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="user" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Head Of Institution:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${headDisplay}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const institutionService = new InstitutionService();
