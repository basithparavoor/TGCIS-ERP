/**
 * THAIBA HERITAGE GROUP OF INSTITUTIONS — Group & Multi-Institution Service
 * Central Management & Sub-Managements Architecture
 * 
 * Manages:
 * 1. Central Group Governance (Trust, Central HQ, Central Directorate)
 * 2. Sub-Managements & Campuses Registry (TPS, TMS, and dynamic member schools)
 * 3. Active School Context ('all' for Group HQ overview or specific school ID)
 * 4. Multi-tenant filtering helpers and persistence across Supabase & localStorage.
 */

import { dbService } from './supabase-client.js';
import { TMS_CONFIG } from './config.js';
import { UIComponents } from './ui-components.js';

const SETTINGS_ID = 'institution_profile';
const GROUP_SETTINGS_ID = 'group_profile';
const SCHOOLS_REGISTRY_ID = 'group_schools_registry';

const CACHE_KEY = 'tms_institution_profile';
const GROUP_CACHE_KEY = 'tms_group_profile';
const SCHOOLS_CACHE_KEY = 'tms_group_schools';
const ACTIVE_SCHOOL_KEY = 'tms_active_school_id';

const DEFAULT_PROFILE = {
  name: 'THAIBA COLLEGE OF INTEGRATED STUDIES',
  code: 'TGCIS-TAPAN',
  tagline: 'Run by : Thaiba Heritage, Kolkata',
  trust: 'Thaiba Heritage, Kolkata',
  regNo: 'Regd. No. IV 01894/2011',
  campusDistrict: 'Dakshin Dinajpur',
  campusLocation: 'Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127',
  contactPhones: '+91 8653382851 / +91 8167782851',
  contactEmail: 'tgcis@thaibagarden.com',
  website: 'https://tgcis.clubad.space',
  headOfInstitutionName: 'C. M. Basith',
  headOfInstitutionEmail: 'cmbasith786@gmail.com',
  headOfInstitutionDesignation: 'Head of Institution'
};

const DEFAULT_GROUP_PROFILE = {
  name: 'THAIBA HERITAGE GROUP OF INSTITUTIONS',
  shortName: 'Thaiba Heritage Group',
  trust: 'Thaiba Heritage, Kolkata',
  regNo: 'Regd. No. IV 01894/2011',
  tagline: 'Central Educational Trust & Group Governance',
  headquarters: 'Kolkata, West Bengal, India',
  executiveDirector: 'C. M. Basith',
  directorEmail: 'cmbasith786@gmail.com',
  contactPhone: '+91 8653382851',
  contactEmail: 'central@thaibaheritage.org',
  website: 'https://tgcis.clubad.space'
};

class InstitutionService {
  constructor() {
    this.data = this.readCache();
    this.groupProfile = this.readGroupCache();
    this.schools = this.readSchoolsCache();
    this.activeSchoolId = this.readActiveSchoolId();
    this.syncConfigWithActiveSchool();
    this._loaded = false;
  }

  /* -------------------------------------------------------------------------- */
  /* Local Storage & Cache Handlers                                             */
  /* -------------------------------------------------------------------------- */

  readCache() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        if (stored.includes('PUBLIC SCHOOL') || stored.includes('TPS-TAPAN')) {
          localStorage.removeItem(CACHE_KEY);
          return { ...DEFAULT_PROFILE };
        }
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) { /* ignore */ }
    return { ...DEFAULT_PROFILE };
  }

  writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || {}));
    } catch (e) { /* ignore */ }
  }

  readGroupCache() {
    try {
      const stored = localStorage.getItem(GROUP_CACHE_KEY);
      if (stored) return { ...DEFAULT_GROUP_PROFILE, ...JSON.parse(stored) };
    } catch (e) { /* ignore */ }
    return { ...DEFAULT_GROUP_PROFILE, ...(TMS_CONFIG.group || {}) };
  }

  writeGroupCache(data) {
    try {
      localStorage.setItem(GROUP_CACHE_KEY, JSON.stringify(data || {}));
    } catch (e) { /* ignore */ }
  }

  readSchoolsCache() {
    try {
      const stored = localStorage.getItem(SCHOOLS_CACHE_KEY);
      if (stored) {
        if (stored.includes('PUBLIC SCHOOL') || stored.includes('TPS-TAPAN')) {
          localStorage.removeItem(SCHOOLS_CACHE_KEY);
        } else {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) { /* ignore */ }
    // Fall back to default initial schools from config
    return (TMS_CONFIG.group?.schools && TMS_CONFIG.group.schools.length > 0)
      ? JSON.parse(JSON.stringify(TMS_CONFIG.group.schools))
      : [
          {
            id: 'tgcis',
            code: 'TGCIS-TAPAN',
            name: 'THAIBA COLLEGE OF INTEGRATED STUDIES',
            shortName: 'TGCIS (Main)',
            tagline: 'Higher Secondary & Integrated Studies',
            board: 'State / Central Affiliated',
            status: 'Active',
            principal: 'C. M. Basith',
            principalEmail: 'cmbasith786@gmail.com',
            contact: {
              phone1: '+91 8653382851',
              phone2: '+91 8167782851',
              email: 'tgcis@thaibagarden.com',
              website: 'https://tgcis.clubad.space'
            },
            address: {
              campus: 'Baghait, Tapan',
              city: 'Tapan',
              district: 'Dakshin Dinajpur',
              state: 'West Bengal',
              pin: '733127'
            },
            themeColor: '#1A659F',
            logo: 'tps-logo.png',
            logo: 'tps-logo.png',
            logoBadge: 'TGCIS',
            founded: '2011'
          },
          {
            id: 'tms',
            code: 'TMS-TAPAN',
            name: 'THAIBA MODEL SCHOOL',
            shortName: 'TMS (Main)',
            tagline: 'Excellence in Islamic & Contemporary Education',
            board: 'State / Central Affiliated',
            status: 'Active',
            principal: 'Dr. Z. A. Rahman',
            principalEmail: 'principal@thaibamodel.school',
            contact: {
              phone1: '+91 8653382850',
              phone2: '+91 8167782850',
              email: 'tms@thaibagarden.com',
              website: 'https://tms.thaibagarden.com'
            },
            address: {
              campus: 'Thaiba Garden Campus',
              city: 'Tapan',
              district: 'Dakshin Dinajpur',
              state: 'West Bengal',
              pin: '733127'
            },
            themeColor: '#16a34a',
            logo: 'icons/tms-logo.png',
            logo: 'icons/tms-logo.png',
            logoBadge: 'TMS',
            founded: '2015'
          }
        ];
  }

  writeSchoolsCache(schools) {
    try {
      localStorage.setItem(SCHOOLS_CACHE_KEY, JSON.stringify(schools || []));
    } catch (e) { /* ignore */ }
  }

  readActiveSchoolId() {
    try {
      const stored = localStorage.getItem(ACTIVE_SCHOOL_KEY);
      if (stored) return stored;
    } catch (e) { /* ignore */ }
    return 'all'; // Default to Central Management Group Overview
  }

  writeActiveSchoolId(id) {
    try {
      localStorage.setItem(ACTIVE_SCHOOL_KEY, id);
    } catch (e) { /* ignore */ }
  }

  /* -------------------------------------------------------------------------- */
  /* Central Group Governance & Schools Registry                                */
  /* -------------------------------------------------------------------------- */

  getGroupProfile() {
    return { ...this.groupProfile };
  }

  async updateGroupProfile(updates) {
    this.groupProfile = { ...this.groupProfile, ...updates, updatedAt: new Date().toISOString() };
    this.writeGroupCache(this.groupProfile);

    try {
      await dbService.upsert('app_settings', {
        id: GROUP_SETTINGS_ID,
        value: this.groupProfile
      });
    } catch (err) {
      console.warn('Could not sync group profile to cloud:', err.message);
    }

    window.dispatchEvent(new CustomEvent('tms_group_profile_changed', { detail: this.groupProfile }));
    return { success: true, data: this.groupProfile };
  }

  getSchools() {
    return [...this.schools];
  }

  getSchool(idOrCode) {
    if (!idOrCode) return null;
    const q = String(idOrCode).toLowerCase().trim();
    return this.schools.find(s => (s.id && s.id.toLowerCase() === q) || (s.code && s.code.toLowerCase() === q)) || null;
  }

  async addSchool(schoolData) {
    const cleanId = (schoolData.id || schoolData.code || 'sch_' + Date.now().toString(36))
      .toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    if (this.schools.some(s => s.id === cleanId)) {
      return { success: false, error: `A school with ID "${cleanId}" already exists.` };
    }

    const newSchool = {
      id: cleanId,
      code: (schoolData.code || cleanId.toUpperCase()).trim(),
      name: schoolData.name || 'New Campus',
      shortName: schoolData.shortName || schoolData.short_name || schoolData.name,
      tagline: schoolData.tagline || 'Excellence in Education',
      board: schoolData.board || 'CBSE / State Affiliated',
      status: schoolData.status || 'Active',
      principal: schoolData.principal || schoolData.principal_name || 'Branch Principal',
      principalEmail: schoolData.principalEmail || schoolData.principal_email || '',
      contact: {
        phone1: schoolData.contactPhone || schoolData.contact?.phone1 || schoolData.contact_phone || '',
        phone2: schoolData.contactPhone2 || schoolData.contact?.phone2 || '',
        email: schoolData.contactEmail || schoolData.contact?.email || schoolData.contact_email || '',
        website: schoolData.website || ''
      },
      address: {
        campus: schoolData.campusLocation || schoolData.address?.campus || schoolData.campus_location || '',
        city: schoolData.city || schoolData.address?.city || 'Tapan',
        district: schoolData.district || schoolData.address?.district || 'Dakshin Dinajpur',
        state: schoolData.state || schoolData.address?.state || 'West Bengal',
        country: schoolData.country || schoolData.address?.country || 'India',
        pin: schoolData.pin || schoolData.address?.pin || '733127'
      },
      themeColor: schoolData.themeColor || schoolData.theme_color || '#1A659F',
      logo: schoolData.logo || 'tps-logo.png',
      logoBadge: (schoolData.logoBadge || schoolData.logo_badge || schoolData.code || 'SCH').substring(0, 4).toUpperCase(),
      bannerImage: schoolData.bannerImage || schoolData.banner_image || '',
      description: schoolData.description || '',
      facilitiesList: schoolData.facilitiesList || schoolData.facilities_list || ['Smart Classrooms', 'Science Lab', 'Library', 'Sports Arena', 'Computer Lab'],
      gradesOffered: schoolData.gradesOffered || schoolData.grades_offered || 'Nursery to Grade 12',
      founded: schoolData.founded || String(new Date().getFullYear()),
      createdAt: new Date().toISOString()
    };

    this.schools.push(newSchool);
    this.writeSchoolsCache(this.schools);

    // Sync to Supabase 'schools' table
    try {
      await dbService.upsert('schools', {
        id: newSchool.id,
        code: newSchool.code,
        name: newSchool.name,
        short_name: newSchool.shortName,
        tagline: newSchool.tagline,
        board: newSchool.board,
        status: newSchool.status,
        principal_name: newSchool.principal,
        principal_email: newSchool.principalEmail,
        contact_phone: newSchool.contact.phone1,
        contact_email: newSchool.contact.email,
        website: newSchool.contact.website,
        campus_location: newSchool.address.campus,
        district: newSchool.address.district,
        state: newSchool.address.state,
        country: newSchool.address.country,
        pin: newSchool.address.pin,
        theme_color: newSchool.themeColor,
        logo_badge: newSchool.logoBadge,
        banner_image: newSchool.bannerImage,
        description: newSchool.description,
        facilities_list: newSchool.facilitiesList,
        grades_offered: newSchool.gradesOffered,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not sync school to Supabase schools table:', e.message);
    }

    // Also sync to app_settings registry
    try {
      await dbService.upsert('app_settings', {
        id: SCHOOLS_REGISTRY_ID,
        value: this.schools
      });
    } catch (e) {
      console.warn('Could not sync schools registry to cloud app_settings:', e.message);
    }

    window.dispatchEvent(new CustomEvent('tms_schools_changed', { detail: this.schools }));
    return { success: true, school: newSchool };
  }

  async updateSchool(id, updates) {
    const idx = this.schools.findIndex(s => s.id === id);
    if (idx === -1) return { success: false, error: 'School not found' };

    const updated = {
      ...this.schools[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.contactPhone || updates.contactEmail) {
      updated.contact = {
        ...(updated.contact || {}),
        phone1: updates.contactPhone || updated.contact?.phone1 || '',
        email: updates.contactEmail || updated.contact?.email || ''
      };
    }
    if (updates.campusLocation || updates.district) {
      updated.address = {
        ...(updated.address || {}),
        campus: updates.campusLocation || updated.address?.campus || '',
        district: updates.district || updated.address?.district || ''
      };
    }

    this.schools[idx] = updated;
    this.writeSchoolsCache(this.schools);

    // Sync to Supabase 'schools' table
    try {
      await dbService.upsert('schools', {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        short_name: updated.shortName || updated.short_name,
        tagline: updated.tagline,
        board: updated.board,
        status: updated.status,
        principal_name: updated.principal || updated.principal_name,
        principal_email: updated.principalEmail || updated.principal_email,
        contact_phone: updated.contact?.phone1 || updated.contactPhone,
        contact_email: updated.contact?.email || updated.contactEmail,
        website: updated.contact?.website || updated.website,
        campus_location: updated.address?.campus || updated.campusLocation,
        district: updated.address?.district || updated.district,
        state: updated.address?.state || updated.state,
        pin: updated.address?.pin || updated.pin,
        theme_color: updated.themeColor || updated.theme_color,
        logo_badge: updated.logoBadge || updated.logo_badge,
        banner_image: updated.bannerImage || updated.banner_image,
        description: updated.description,
        facilities_list: updated.facilitiesList || updated.facilities_list,
        grades_offered: updated.gradesOffered || updated.grades_offered,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not sync school update to Supabase schools table:', e.message);
    }

    try {
      await dbService.upsert('app_settings', {
        id: SCHOOLS_REGISTRY_ID,
        value: this.schools
      });
    } catch (e) {
      console.warn('Could not update schools registry in cloud app_settings:', e.message);
    }

    if (this.activeSchoolId === id) {
      this.syncConfigWithActiveSchool();
    }

    window.dispatchEvent(new CustomEvent('tms_schools_changed', { detail: this.schools }));
    return { success: true, school: updated };
  }

  async deleteSchool(id) {
    if (this.schools.length <= 1) {
      return { success: false, error: 'Cannot remove the last remaining school in the group.' };
    }

    this.schools = this.schools.filter(s => s.id !== id);
    this.writeSchoolsCache(this.schools);

    if (this.activeSchoolId === id) {
      this.setActiveSchoolId('all');
    }

    try {
      await dbService.delete('schools', id);
    } catch (e) {
      console.warn('Could not delete school from Supabase schools table:', e.message);
    }

    try {
      await dbService.upsert('app_settings', {
        id: SCHOOLS_REGISTRY_ID,
        value: this.schools
      });
    } catch (e) {
      console.warn('Could not sync school deletion to cloud app_settings:', e.message);
    }

    window.dispatchEvent(new CustomEvent('tms_schools_changed', { detail: this.schools }));
    return { success: true };
  }

  /* -------------------------------------------------------------------------- */
  /* Active School Switcher & Context Management                               */
  /* -------------------------------------------------------------------------- */

  getActiveSchoolId() {
    try {
      const user = (typeof window !== 'undefined' && (window.tmsCurrentUser || JSON.parse(localStorage.getItem('tms_auth_session') || '{}'))) || null;
      if (user && user.role && !this.isUserCentralAdmin(user)) {
        const assignedSchool = user.school_id || user.schoolId;
        if (assignedSchool) return String(assignedSchool).toLowerCase();
      }
    } catch (e) {}
    return this.activeSchoolId || 'all';
  }

  isCentralManagementMode() {
    return this.getActiveSchoolId() === 'all';
  }

  getActiveSchool() {
    if (this.isCentralManagementMode()) {
      return {
        id: 'all',
        isCentral: true,
        code: 'GROUP-HQ',
        name: this.groupProfile.name || 'Central Group HQ (All Schools)',
        shortName: 'Central Group HQ',
        tagline: 'Consolidated Governance & All Sub-Managements Overview',
        trust: this.groupProfile.trust,
        regNo: this.groupProfile.regNo,
        principal: this.groupProfile.executiveDirector || 'C. M. Basith',
        principalEmail: this.groupProfile.directorEmail,
        themeColor: '#0F172A',
        badge: 'HQ',
        contact: {
          phone1: this.groupProfile.contactPhone,
          email: this.groupProfile.contactEmail,
          website: this.groupProfile.website
        },
        address: {
          campus: this.groupProfile.headquarters || 'Kolkata Central Office',
          city: 'Kolkata',
          state: 'West Bengal'
        }
      };
    }
    return this.getSchool(this.getActiveSchoolId()) || this.schools[0] || DEFAULT_PROFILE;
  }

  setActiveSchoolId(id) {
    let targetId = id || 'all';
    try {
      const user = (typeof window !== 'undefined' && (window.tmsCurrentUser || JSON.parse(localStorage.getItem('tms_auth_session') || '{}'))) || null;
      if (user && user.role && !this.isUserCentralAdmin(user)) {
        const assignedSchool = user.school_id || user.schoolId;
        if (assignedSchool) targetId = String(assignedSchool).toLowerCase();
      }
    } catch (e) {}

    this.activeSchoolId = targetId;
    this.writeActiveSchoolId(this.activeSchoolId);
    this.syncConfigWithActiveSchool();

    const activeSchool = this.getActiveSchool();
    window.dispatchEvent(new CustomEvent('tms_school_switched', { detail: { schoolId: this.activeSchoolId, school: activeSchool } }));
    window.dispatchEvent(new CustomEvent('tms_institution_changed', { detail: activeSchool }));
    return activeSchool;
  }

  syncConfigWithActiveSchool() {
    if (!TMS_CONFIG) return;
    const active = this.getActiveSchool();

    if (!TMS_CONFIG.institution) TMS_CONFIG.institution = {};
    const inst = TMS_CONFIG.institution;

    inst.name = active.name || 'THAIBA COLLEGE OF INTEGRATED STUDIES';
    inst.code = active.code || 'TGCIS-TAPAN';
    inst.tagline = active.tagline || 'Run by : Thaiba Heritage, Kolkata';
    inst.trust = active.trust || this.groupProfile.trust;
    inst.regNo = active.regNo || this.groupProfile.regNo;
    inst.headOfInstitution = active.principal || active.headOfInstitutionName || 'Head of Institution';
    inst.headOfInstitutionEmail = active.principalEmail || '';

    if (active.address) {
      inst.address = { ...(inst.address || {}), ...active.address };
    }
    if (active.contact) {
      inst.contact = { ...(inst.contact || {}), ...active.contact };
    }
    if (active.themeColor) {
      inst.themeColor = active.themeColor;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Multi-School Record Filtering & Auto-Stamping Helpers                      */
  /* -------------------------------------------------------------------------- */

  filterByActiveSchool(items, schoolIdKey = 'school_id') {
    if (!Array.isArray(items)) return [];

    let currentId = this.getActiveSchoolId();
    try {
      const user = (typeof window !== 'undefined' && (window.tmsCurrentUser || JSON.parse(localStorage.getItem('tms_auth_session') || '{}'))) || null;
      if (user && user.role && !this.isUserCentralAdmin(user)) {
        const assignedSchool = user.school_id || user.schoolId;
        if (assignedSchool) currentId = String(assignedSchool).toLowerCase();
      }
    } catch (e) {}

    if (currentId === 'all') {
      return items; // In Central Group Mode, show all records across all schools
    }
    const target = currentId.toLowerCase();
    return items.filter(item => {
      const sid = (item[schoolIdKey] || item.schoolId || item.school_code || '').toLowerCase();
      // If item has no school_id, associate with default school 'tps'
      if (!sid) return target === 'tps';
      return sid === target;
    });
  }

  stampSchoolId(record) {
    if (!record || typeof record !== 'object') return record;
    if (!record.school_id && !record.schoolId) {
      let currentId = this.getActiveSchoolId();
      try {
        const user = (typeof window !== 'undefined' && (window.tmsCurrentUser || JSON.parse(localStorage.getItem('tms_auth_session') || '{}'))) || null;
        if (user && user.role && !this.isUserCentralAdmin(user)) {
          const assignedSchool = user.school_id || user.schoolId;
          if (assignedSchool) currentId = String(assignedSchool).toLowerCase();
        }
      } catch (e) {}
      record.school_id = (currentId === 'all') ? 'tps' : currentId;
    }
    return record;
  }

  isUserCentralAdmin(user) {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    const superEmail = (TMS_CONFIG.superAdminEmail || '').toLowerCase().trim();
    const role = (user.role || '').toLowerCase();

    return user.isSuperAdmin === true ||
      user.is_super_admin === true ||
      role === 'super_admin' ||
      role === 'central_admin' ||
      role === 'academic_director' ||
      role === 'deputy_director' ||
      role === 'md' ||
      role === 'chairman' ||
      role === 'dmd' ||
      user.scope === 'group_wide' ||
      email === superEmail;
  }

  /* -------------------------------------------------------------------------- */
  /* Backwards Compatibility Methods for Existing Modules                      */
  /* -------------------------------------------------------------------------- */

  getDetails() {
    return { ...this.getActiveSchool() };
  }

  syncConfig(data) {
    this.syncConfigWithActiveSchool();
  }

  async saveDetails(updates) {
    if (this.isCentralManagementMode()) {
      return await this.updateGroupProfile(updates);
    } else {
      return await this.updateSchool(this.getActiveSchoolId(), updates);
    }
  }

  async resetToDefaults() {
    this.schools = JSON.parse(JSON.stringify(TMS_CONFIG.group.schools));
    this.writeSchoolsCache(this.schools);
    this.groupProfile = { ...DEFAULT_GROUP_PROFILE };
    this.writeGroupCache(this.groupProfile);
    this.syncConfigWithActiveSchool();
    window.dispatchEvent(new CustomEvent('tms_schools_changed', { detail: this.schools }));
    return { success: true };
  }

  async refresh() {
    try {
      // 1. Try fetching from schools table in Supabase
      try {
        const dbSchools = await dbService.select('schools');
        if (Array.isArray(dbSchools) && dbSchools.length > 0) {
          this.schools = dbSchools.map(r => ({
            id: r.id,
            code: r.code || r.id.toUpperCase(),
            name: r.name,
            shortName: r.short_name || r.name,
            tagline: r.tagline || 'Excellence in Education',
            board: r.board || 'CBSE / State Affiliated',
            status: r.status || 'Active',
            principal: r.principal_name || 'Branch Principal',
            principalEmail: r.principal_email || '',
            contact: {
              phone1: r.contact_phone || '',
              email: r.contact_email || '',
              website: r.website || ''
            },
            address: {
              campus: r.campus_location || '',
              city: r.district || 'Tapan',
              district: r.district || 'Dakshin Dinajpur',
              state: r.state || 'West Bengal',
              country: r.country || 'India',
              pin: r.pin || '733127'
            },
            themeColor: r.theme_color || '#1A659F',
            logo: 'tps-logo.png',
            logoBadge: r.logo_badge || r.code?.substring(0, 3) || 'SCH',
            bannerImage: r.banner_image || '',
            description: r.description || '',
            facilitiesList: r.facilities_list || ['Smart Classrooms', 'Science Lab', 'Library', 'Sports Arena'],
            gradesOffered: r.grades_offered || 'Nursery to Grade 12',
            createdAt: r.created_at
          }));
          this.writeSchoolsCache(this.schools);
        }
      } catch (schErr) {
        console.warn('Could not select from schools table:', schErr.message);
      }

      // 2. Fetch app_settings for group and fallback
      const rows = await dbService.select('app_settings');

      const groupRow = rows.find(r => r.id === GROUP_SETTINGS_ID);
      if (groupRow && groupRow.value && typeof groupRow.value === 'object') {
        this.groupProfile = { ...DEFAULT_GROUP_PROFILE, ...groupRow.value };
        this.writeGroupCache(this.groupProfile);
      }

      if (this.schools.length === 0) {
        const schoolsRow = rows.find(r => r.id === SCHOOLS_REGISTRY_ID);
        if (schoolsRow && Array.isArray(schoolsRow.value) && schoolsRow.value.length > 0) {
          this.schools = schoolsRow.value;
          this.writeSchoolsCache(this.schools);
        }
      }

      this.syncConfigWithActiveSchool();
      this._loaded = true;
      window.dispatchEvent(new CustomEvent('tms_schools_changed', { detail: this.schools }));
    } catch (err) {
      console.warn('Could not refresh group & school settings from cloud:', err.message);
    }
    return this.getActiveSchool();
  }

  renderStatusCardHtml(customData = null) {
    const d = customData || this.getActiveSchool();
    const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
    const isCentral = d.id === 'all' || d.isCentral;

    return `
      <div class="inst-campus-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:22px 24px; box-shadow:0 4px 16px rgba(15,23,42,0.04); font-family:var(--font-body, inherit); width:100%; max-width:680px;">
        <!-- Header: Title & Campus Badge -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:12px; background:${isCentral ? '#f1f5f9' : '#ecfdf5'}; color:${isCentral ? '#0f172a' : '#1A659F'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="${isCentral ? 'layers' : 'building-2'}" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="margin:0; font-family:var(--font-display, inherit); font-size:1.15rem; font-weight:800; color:#0f172a; letter-spacing:-0.01em;">
                ${esc(d.name)}
              </h3>
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">
                ${isCentral ? 'Central Group Governance' : `Code: ${esc(d.code || 'CAMPUS')}`}
              </div>
            </div>
          </div>
          <span style="display:inline-flex; align-items:center; padding:4px 14px; border-radius:9999px; background:${isCentral ? '#f8fafc' : '#eff6ff'}; color:${isCentral ? '#475569' : '#2563eb'}; border:1px solid ${isCentral ? '#cbd5e1' : '#bfdbfe'}; font-size:0.78rem; font-weight:700; white-space:nowrap;">
            ${isCentral ? 'Group HQ' : esc(d.address?.district || 'Campuses')}
          </span>
        </div>

        <!-- Section 1: Official Registration / Trust -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#eef5fa; color:#1A659F; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="shield-check" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Trust &amp; Controlling Authority:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.trust || this.groupProfile.trust)} &bull; ${esc(d.regNo || this.groupProfile.regNo)}
            </div>
          </div>
        </div>

        <!-- Section 2: Campus Location -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="map-pin" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Location &amp; Coordinates:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.address?.campus || d.address?.locality || 'Baghait, Tapan, Dakshin Dinajpur, West Bengal 733127')}
            </div>
          </div>
        </div>

        <!-- Section 3: Institutional Contact & Support -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#fffbeb; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="phone" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">Contact &amp; Administrative Desk:</div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.contact?.phone1 || '+91 8653382851')} &bull; ${esc(d.contact?.email || 'tps@thaibagarden.com')}
            </div>
          </div>
        </div>

        <!-- Section 4: Head Of Institution -->
        <div style="border-top:1px solid #f1f5f9; padding:13px 0 2px 0; display:flex; align-items:flex-start; gap:14px;">
          <div style="width:28px; height:28px; border-radius:8px; background:#faf5ff; color:#9333ea; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="user-check" style="width:16px; height:16px;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:#0f172a;">
              ${isCentral ? 'Executive Group Director:' : 'Campus Principal / Head:'}
            </div>
            <div style="font-size:0.86rem; color:#64748b; margin-top:3px; word-break:break-word;">
              ${esc(d.principal || d.executiveDirector || 'C. M. Basith')}${d.principalEmail || d.directorEmail ? ` (${esc(d.principalEmail || d.directorEmail)})` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const institutionService = new InstitutionService();
