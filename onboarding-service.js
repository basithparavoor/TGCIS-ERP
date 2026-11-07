import { dbService } from './supabase-client.js';
import { TMS_CONFIG } from './config.js';

const CONFIG_SETTING_KEY = 'staff_onboarding_config';
const META_SETTING_KEY = 'staff_profiles_metadata';
const LOCAL_CONFIG_KEY = 'tms_staff_onboarding_config';
const LOCAL_META_PREFIX = 'tms_staff_meta_';

const DEFAULT_CONFIG = {
  editWindowDays: 7, // days from initial staff login to edit profile
  questions: [
    {
      id: 'q_highest_qualification',
      label: 'Highest Educational Qualification',
      type: 'text',
      required: true,
      placeholder: 'e.g. M.Ed, B.Sc Mathematics, B.A English',
      subtext: 'Your highest degree or professional certification'
    },
    {
      id: 'q_emergency_contact',
      label: 'Emergency Contact Person & Phone',
      type: 'text',
      required: true,
      placeholder: 'e.g. Spouse / Brother (+91 98470 ...)',
      subtext: 'Person to reach in case of medical or institutional emergency'
    },
    {
      id: 'q_address',
      label: 'Residential / Current Address',
      type: 'textarea',
      required: false,
      placeholder: 'House / Street name, City, Pincode',
      subtext: 'Your current residential address'
    }
  ]
};

export class OnboardingService {
  static _cachedConfig = null;
  static _cachedMetaMap = null;

  /**
   * Retrieve the onboarding configuration (grace period days & questions).
   */
  static async getConfig() {
    if (this._cachedConfig) return this._cachedConfig;

    try {
      // 1. Try Supabase app_settings
      const settings = await dbService.select('app_settings');
      const row = (settings || []).find((s) => s.id === CONFIG_SETTING_KEY);
      if (row && row.value && typeof row.value === 'object') {
        this._cachedConfig = {
          editWindowDays: Number(row.value.editWindowDays) || DEFAULT_CONFIG.editWindowDays,
          questions: Array.isArray(row.value.questions) && row.value.questions.length > 0
            ? row.value.questions
            : DEFAULT_CONFIG.questions
        };
        try {
          localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(this._cachedConfig));
        } catch (e) {}
        return this._cachedConfig;
      }
    } catch (err) {
      console.warn('Could not load onboarding config from Supabase:', err.message);
    }

    // 2. Local storage fallback
    try {
      const local = localStorage.getItem(LOCAL_CONFIG_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        this._cachedConfig = {
          editWindowDays: Number(parsed.editWindowDays) || DEFAULT_CONFIG.editWindowDays,
          questions: Array.isArray(parsed.questions) && parsed.questions.length > 0
            ? parsed.questions
            : DEFAULT_CONFIG.questions
        };
        return this._cachedConfig;
      }
    } catch (e) {}

    this._cachedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return this._cachedConfig;
  }

  /**
   * Save onboarding configuration (admin only).
   */
  static async saveConfig(config) {
    const payload = {
      editWindowDays: Math.max(1, Math.min(180, Number(config.editWindowDays) || 7)),
      questions: Array.isArray(config.questions) ? config.questions : DEFAULT_CONFIG.questions
    };

    this._cachedConfig = payload;
    try {
      localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(payload));
    } catch (e) {}

    try {
      await dbService.upsert('app_settings', {
        id: CONFIG_SETTING_KEY,
        value: payload
      });
      return { success: true, config: payload };
    } catch (err) {
      console.error('Failed to save onboarding config to app_settings:', err);
      return { success: true, config: payload, localOnly: true };
    }
  }

  /**
   * Load the all-staff metadata map from app_settings and localStorage.
   */
  static async getAllStaffMeta() {
    if (this._cachedMetaMap) return this._cachedMetaMap;

    let map = {};
    try {
      const settings = await dbService.select('app_settings');
      const row = (settings || []).find((s) => s.id === META_SETTING_KEY);
      if (row && row.value && typeof row.value === 'object') {
        map = row.value;
      }
    } catch (err) {
      console.warn('Could not load staff metadata from Supabase:', err.message);
    }

    // Also blend any local storage overrides
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_META_PREFIX)) {
          const userId = key.replace(LOCAL_META_PREFIX, '');
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          map[userId] = { ...(map[userId] || {}), ...val };
        }
      }
    } catch (e) {}

    this._cachedMetaMap = map;
    return map;
  }

  /**
   * Retrieve metadata for a specific user (tgiId, bloodGroup, firstLoginAt, answers, etc.).
   */
  static async getStaffMeta(userId) {
    if (!userId) return {};
    const map = await this.getAllStaffMeta();
    let meta = map[userId] || {};

    // Check localStorage cache for immediate freshness
    try {
      const local = localStorage.getItem(LOCAL_META_PREFIX + userId);
      if (local) {
        meta = { ...meta, ...JSON.parse(local) };
      }
    } catch (e) {}

    return meta;
  }

  /**
   * Save metadata for a specific user.
   */
  static async saveStaffMeta(userId, updates) {
    if (!userId) return false;
    const current = await this.getStaffMeta(userId);
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save to local cache immediately
    try {
      localStorage.setItem(LOCAL_META_PREFIX + userId, JSON.stringify(updated));
    } catch (e) {}

    // Update in-memory map
    if (!this._cachedMetaMap) this._cachedMetaMap = {};
    this._cachedMetaMap[userId] = updated;

    // Upsert to Supabase app_settings only if authenticated user is administrative
    try {
      const storedUser = localStorage.getItem('tms_user');
      const cur = storedUser ? JSON.parse(storedUser) : null;
      const canManageSettings = cur && (cur.role === 'admin' || cur.role === 'principal' || cur.role === 'super_admin' || cur.isSuperAdmin);
      if (canManageSettings) {
        await dbService.upsert('app_settings', {
          id: META_SETTING_KEY,
          value: this._cachedMetaMap
        });
      }
    } catch (_) {}

    return updated;
  }

  /**
   * Ensure firstLoginAt is recorded when a user logs in.
   */
  static async recordFirstLogin(user) {
    if (!user || !user.id) return null;
    const meta = await this.getStaffMeta(user.id);
    if (!meta.firstLoginAt) {
      const updated = await this.saveStaffMeta(user.id, {
        firstLoginAt: new Date().toISOString()
      });
      return updated.firstLoginAt;
    }
    return meta.firstLoginAt;
  }

  /**
   * Check if a staff member is eligible to edit their profile based on grace period.
   * Returns: { isEligible, isExpired, isSuperAdmin, daysRemaining, hoursRemaining, deadlineDate, formattedDeadline }
   */
  static async checkEditEligibility(user) {
    if (!user || !user.id) {
      return { isEligible: false, isExpired: true, daysRemaining: 0, reason: 'No user session' };
    }

    // Super Admin is ALWAYS eligible to edit anything, anytime.
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'super_admin' ||
      (user.email || '').toLowerCase().trim() === (TMS_CONFIG.superAdminEmail || '').toLowerCase().trim();

    if (isSuperAdmin) {
      return {
        isEligible: true,
        isExpired: false,
        isSuperAdmin: true,
        daysRemaining: 999,
        deadlineDate: null,
        formattedDeadline: 'Unlimited (Super Administrator Authority)'
      };
    }

    const config = await this.getConfig();
    const meta = await this.getStaffMeta(user.id);

    // If initial login timestamp hasn't been recorded yet, record it now
    let firstLoginTime = meta.firstLoginAt;
    if (!firstLoginTime) {
      firstLoginTime = await this.recordFirstLogin(user);
    }

    const firstLoginMs = new Date(firstLoginTime || Date.now()).getTime();
    const editWindowMs = (Number(config.editWindowDays) || 7) * 24 * 60 * 60 * 1000;
    let deadlineMs = firstLoginMs + editWindowMs;

    // Check if an explicit admin extension was granted for this staff
    if (meta.editWindowExtensionUntil) {
      const extMs = new Date(meta.editWindowExtensionUntil).getTime();
      if (extMs > deadlineMs) {
        deadlineMs = extMs;
      }
    }

    const nowMs = Date.now();
    const msRemaining = deadlineMs - nowMs;
    const isExpired = msRemaining <= 0;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (60 * 60 * 1000)));
    const deadlineDate = new Date(deadlineMs);

    return {
      isEligible: !isExpired,
      isExpired,
      isSuperAdmin: false,
      daysRemaining,
      hoursRemaining,
      deadlineDate,
      formattedDeadline: deadlineDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Helper to format a 10-digit phone number as "XXXXX XXXXX" (5-5 digits).
   */
  static formatPhone55(phone) {
    if (!phone) return '';
    const clean = phone.toString().replace(/\D/g, '').slice(-10);
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }

  /**
   * Format display of TGI ID:
   * e.g. "001" or "TGI-001".
   */
  static formatTgiId(rawId) {
    if (!rawId) return 'Not Allocated';
    const clean = rawId.toString().trim();
    if (clean.toUpperCase().startsWith('TGI')) {
      return clean.toUpperCase();
    }
    return `TGI-${clean}`;
  }
}
