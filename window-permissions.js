/**
 * THAIBA PUBLIC SCHOOL — Window-Level RBAC & Permissions Engine
 * Reference: https://tpsh.vercel.app/#users
 */

import { TMS_CONFIG } from './config.js';

export const WINDOW_ROLES = [
  {
    key: "admin",
    label: "Master Admin",
    subtitle: "Academic & Records Governance",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
  },
  {
    key: "teacher",
    label: "Teacher / Faculty",
    subtitle: "Timetable, Attendance & Marks",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>'
  },
  {
    key: "boys_mentor",
    label: "Boys Hostel Mentor",
    subtitle: "Boys Hostel Units, Leaves & Coaching Class",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
  },
  {
    key: "girls_mentor",
    label: "Girls Hostel Mentor",
    subtitle: "Girls Hostel Units, Leaves & Coaching Class",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
  },
  {
    key: "mentor",
    label: "Hostel Mentor",
    subtitle: "Hostel Operations, Leaves & Welfare",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
  },
  {
    key: "hostel_leader",
    label: "Hostel Leader",
    subtitle: "Peer Roll-Call & Room Monitoring",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  },
  {
    key: "parent",
    label: "Parents",
    subtitle: "Ward Academic, Attendance & Fees",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    key: "student",
    label: "Students",
    subtitle: "Personal Attendance & Study Portal",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'
  }
];

export const ROLE_THEMES = {
  admin: { color: "#059669", light: "#ECFDF5", border: "#A7F3D0", badgeBg: "#D1FAE5", badgeColor: "#065F46" },
  super_admin: { color: "#0F172A", light: "#F8FAFC", border: "#CBD5E1", badgeBg: "#0F172A", badgeColor: "#FFFFFF" },
  teacher: { color: "#2563EB", light: "#EFF6FF", border: "#BFDBFE", badgeBg: "#DBEAFE", badgeColor: "#1E40AF" },
  boys_mentor: { color: "#0284C7", light: "#F0F9FF", border: "#BAE6FD", badgeBg: "#E0F2FE", badgeColor: "#0369A1" },
  girls_mentor: { color: "#DB2777", light: "#FDF2F8", border: "#FBCFE8", badgeBg: "#FCE7F3", badgeColor: "#9D174D" },
  mentor: { color: "#7C3AED", light: "#F5F3FF", border: "#DDD6FE", badgeBg: "#EDE9FE", badgeColor: "#5B21B6" },
  hostel_leader: { color: "#D97706", light: "#FFFBEB", border: "#FDE68A", badgeBg: "#FEF3C7", badgeColor: "#92400E" },
  parent: { color: "#E11D48", light: "#FFF1F2", border: "#FECDD3", badgeBg: "#FFE4E6", badgeColor: "#9F1239" },
  student: { color: "#0891B2", light: "#ECFEFF", border: "#A5F3FC", badgeBg: "#CFFAFE", badgeColor: "#155E75" },
  coordinator: { color: "#0284C7", light: "#F0F9FF", border: "#BAE6FD", badgeBg: "#E0F2FE", badgeColor: "#0369A1" },
  principal: { color: "#059669", light: "#ECFDF5", border: "#A7F3D0", badgeBg: "#D1FAE5", badgeColor: "#065F46" },
  finance: { color: "#BF9A33", light: "#FDF8E8", border: "#F7E8B5", badgeBg: "#FCF4D9", badgeColor: "#8C6E1E" },
  hr: { color: "#9333EA", light: "#FAF5FF", border: "#E9D5FF", badgeBg: "#F3E8FF", badgeColor: "#7E22CE" },
  librarian: { color: "#EA580C", light: "#FFF7ED", border: "#FED7AA", badgeBg: "#FFEDD5", badgeColor: "#C2410C" },
  operations: { color: "#475569", light: "#F8FAFC", border: "#E2E8F0", badgeBg: "#F1F5F9", badgeColor: "#334155" },
  office_boy: { color: "#64748B", light: "#F8FAFC", border: "#E2E8F0", badgeBg: "#F1F5F9", badgeColor: "#334155" }
};

export const WINDOW_CATEGORIES = [
  {
    title: "Student & Academic Windows",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    modules: [
      {
        key: "timetable",
        label: "Teacher Timetable",
        desc: "View assigned class schedules and coaching periods",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
      },
      {
        key: "attendance",
        label: "Attendance Management",
        desc: "Daily classroom roll-call, coaching & teacher duty register",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
      },
      {
        key: "exams",
        label: "Exam Management",
        desc: "Examination dates, syllabi, seating arrangements & timings",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
      },
      {
        key: "marks",
        label: "Marks & Results",
        desc: "Enter subject marks, grade calculation and official report cards",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
      },
      {
        key: "admissions",
        label: "Student Admissions",
        desc: "Process new student admission forms, parents data & documents",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y1="11"/></svg>'
      },
      {
        key: "students",
        label: "Student Directory",
        desc: "Browse complete student directory, guardian contacts & history",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      },
      {
        key: "sections",
        label: "Sections & Classrooms",
        desc: "Manage classrooms, standards, and batch divisions",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
      },
      {
        key: "assignments",
        label: "Student Assignments",
        desc: "Review hostel coaching homework and assign academic tasks",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>'
      }
    ]
  },
  {
    title: "Hostel Operations Windows",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    modules: [
      {
        key: "leaves",
        label: "Hostel Leave Register",
        desc: "Request, approve & record student leaves, departures & returns",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l3.54 1.77L13 8l-1.5-3 2.5-1 3.5 7.5 4.5 2.25a2.5 2.5 0 0 1 0 4.5l-4.5.75L12 21l-2.5-.5 1-3.5z"/></svg>'
      },
      {
        key: "fines",
        label: "Late Fine Management",
        desc: "Track ₹200/day delay penalties and fine collections",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
      },
      {
        key: "discipline",
        label: "Discipline & Black Marks",
        desc: "Log behavioural infractions, demerits, and warnings",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      },
      {
        key: "hostel",
        label: "Hostel Rooms & Beds",
        desc: "Dormitory room layout, bunk beds & student room allocations",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>'
      },
      {
        key: "maintenance",
        label: "Hostel Maintenance",
        desc: "Submit and track hostel repairs, electrical & plumbing issues",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
      }
    ]
  },
  {
    title: "Administration & Communication Windows",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    modules: [
      {
        key: "users",
        label: "User & Permissions",
        desc: "Manage institutional accounts, role approvals, and window permissions",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
      },
      {
        key: "notices",
        label: "Notices & WhatsApp",
        desc: "Send school notifications, reminders and circulars",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
      },
      {
        key: "fees",
        label: "Fees & Payments",
        desc: "Monitor student fee balances and collect payments",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
      },
      {
        key: "reports",
        label: "Reports Center",
        desc: "Generate monthly attendance and fine register reports",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
      },
      {
        key: "settings",
        label: "Institution Settings",
        desc: "Configure institutional details, logo, and fine rates",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
      }
    ]
  }
];

export const DEFAULT_RBAC_MATRIX = {
  admin: {
    dashboard: "full", users: "full", admissions: "full", students: "full", sections: "full",
    assignments: "full", timetable: "full", calendar: "full", attendance: "full",
    attendance_report: "full", faculty_leaves: "full", leaves: "full", leave_card: "full",
    fines: "full", discipline: "full", exams: "full", marks: "full", hostel: "full",
    fees: "full", notices: "full", maintenance: "full", reports: "full", settings: "full"
  },
  boys_mentor: {
    dashboard: "full", students: "view", calendar: "view", attendance: "full",
    attendance_report: "view", faculty_leaves: "view", leaves: "full", leave_card: "full",
    fines: "view", discipline: "full", hostel: "full", notices: "full", maintenance: "full",
    reports: "view"
  },
  girls_mentor: {
    dashboard: "full", students: "view", calendar: "view", attendance: "full",
    attendance_report: "view", faculty_leaves: "view", leaves: "full", leave_card: "full",
    fines: "view", discipline: "full", hostel: "full", notices: "full", maintenance: "full",
    reports: "view"
  },
  mentor: {
    dashboard: "full", students: "view", calendar: "view", attendance: "full",
    attendance_report: "view", faculty_leaves: "view", leaves: "full", leave_card: "full",
    fines: "view", discipline: "full", hostel: "full", notices: "full", maintenance: "full",
    reports: "view"
  },
  teacher: {
    dashboard: "full", students: "view", timetable: "view", calendar: "view",
    attendance: "full", attendance_report: "full", faculty_leaves: "full", leave_card: "view",
    reports: "view", exams: "view", marks: "full", notices: "view"
  },
  hostel_leader: {
    dashboard: "full", students: "view", calendar: "view", attendance: "full",
    leaves: "view", leave_card: "view", fines: "view", discipline: "view",
    hostel: "view", notices: "view", maintenance: "full"
  },
  parent: {
    dashboard: "full", students: "view", calendar: "view", attendance: "view",
    leaves: "view", leave_card: "view", fines: "view", discipline: "view",
    marks: "view", fees: "view", notices: "view"
  },
  student: {
    dashboard: "full", calendar: "view", attendance: "view", leaves: "view",
    leave_card: "view", exams: "view", marks: "view", notices: "view"
  },
  principal: {
    dashboard: "full", users: "view", admissions: "full", students: "full", sections: "full",
    assignments: "full", timetable: "full", calendar: "full", attendance: "full",
    attendance_report: "full", faculty_leaves: "full", leaves: "full", leave_card: "full",
    fines: "full", discipline: "full", exams: "full", marks: "full", hostel: "full",
    fees: "view", notices: "full", maintenance: "full", reports: "full", settings: "view"
  },
  coordinator: {
    dashboard: "full", students: "full", sections: "full", assignments: "full",
    timetable: "full", calendar: "full", attendance: "full", attendance_report: "full",
    exams: "full", marks: "full", notices: "full", reports: "full"
  },
  finance: {
    dashboard: "full", students: "view", fees: "full", reports: "full", notices: "view"
  },
  hr: {
    dashboard: "full", attendance: "full", attendance_report: "full", faculty_leaves: "full",
    reports: "view", notices: "full"
  },
  librarian: {
    dashboard: "full", students: "view", notices: "view"
  },
  operations: {
    dashboard: "full", maintenance: "full", notices: "view"
  },
  office_boy: {
    dashboard: "full", admissions: "full", notices: "view"
  }
};

const STORAGE_KEY_MATRIX = 'tps_rbac_matrix';
const STORAGE_KEY_USER_CUSTOM = 'tps_user_custom_modules';

let _cachedMatrix = null;
let _cachedUserCustom = null;

function _deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return { ...obj };
  }
}

export class WindowPermissionsService {
  /**
   * Returns a clone of the system default RBAC matrix
   */
  static getSystemDefaults() {
    return _deepClone(DEFAULT_RBAC_MATRIX);
  }

  /**
   * Sanitizes and merges an RBAC matrix to ensure dashboard is always full
   */
  static sanitizeMatrix(raw) {
    if (!raw || typeof raw !== 'object') return this.getSystemDefaults();
    const defaults = this.getSystemDefaults();
    const merged = { ...defaults };
    for (const role of Object.keys(raw)) {
      const perms = raw[role];
      if (Array.isArray(perms)) {
        merged[role] = {};
        for (const mod of perms) merged[role][mod] = 'full';
        merged[role].dashboard = 'full';
      } else if (perms && typeof perms === 'object') {
        merged[role] = { ...(merged[role] || {}), ...perms, dashboard: 'full' };
      }
    }
    return merged;
  }

  /**
   * Reads current active role matrix (from localStorage or defaults)
   */
  static getRoleMatrix() {
    if (_cachedMatrix) return _deepClone(_cachedMatrix);
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_MATRIX);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            _cachedMatrix = this.sanitizeMatrix(parsed);
            return _deepClone(_cachedMatrix);
          }
        }
      } catch (err) {
        console.warn('Error reading RBAC matrix from localStorage:', err);
      }
    }
    return this.getSystemDefaults();
  }

  /**
   * Saves role matrix to localStorage and system
   */
  static saveRoleMatrix(matrix) {
    const sanitized = this.sanitizeMatrix(matrix);
    _cachedMatrix = _deepClone(sanitized);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(sanitized));
      } catch (err) {
        console.error('Error saving RBAC matrix to localStorage:', err);
        return false;
      }
    }
    this._dispatchUpdateEvent();
    return true;
  }

  /**
   * Resets role matrix back to system defaults
   */
  static resetRoleMatrix() {
    _cachedMatrix = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_MATRIX);
      } catch (err) {}
    }
    this._dispatchUpdateEvent();
    return this.getSystemDefaults();
  }

  /**
   * Reads all user custom module overrides from localStorage
   */
  static getAllUserCustomPermissions() {
    if (_cachedUserCustom) return _deepClone(_cachedUserCustom);
    if (typeof localStorage === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_CUSTOM);
      const parsed = stored ? JSON.parse(stored) : {};
      _cachedUserCustom = parsed;
      return _deepClone(parsed);
    } catch (err) {
      return {};
    }
  }

  /**
   * Gets specific user's custom window overrides (if any)
   */
  static getUserCustomPermissions(userId) {
    if (!userId) return null;
    const all = this.getAllUserCustomPermissions();
    return all[userId] ? _deepClone(all[userId]) : null;
  }

  /**
   * Sets or updates custom window permissions for a specific user
   */
  static setUserCustomPermissions(userId, customPerms) {
    if (!userId) return false;
    const all = this.getAllUserCustomPermissions();
    if (customPerms && typeof customPerms === 'object' && Object.keys(customPerms).length > 0) {
      all[userId] = _deepClone(customPerms);
    } else {
      delete all[userId];
    }
    _cachedUserCustom = _deepClone(all);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_USER_CUSTOM, JSON.stringify(all));
      } catch (err) {
        console.warn('Error saving user custom permissions to localStorage:', err);
        return false;
      }
    }
    this._dispatchUpdateEvent();
    return true;
  }

  /**
   * Resets a user's permissions back to their role defaults
   */
  static resetUserCustomPermissions(userId) {
    return this.setUserCustomPermissions(userId, null);
  }

  /**
   * Checks the exact permission for a user on a given window module:
   * Returns: 'off' | 'view' | 'full'
   */
  static getWindowPermission(user, windowKey) {
    if (!user) return 'off';
    
    // Unapproved or suspended users have no window access
    if (user.approval_status === 'pending' || user.approvalStatus === 'pending' || user.role === 'pending') {
      return 'off';
    }
    if (user.approval_status === 'suspended' || user.approvalStatus === 'suspended' || user.isActive === false) {
      return 'off';
    }

    const email = (user.email || '').toLowerCase();
    const superAdminEmail = (TMS_CONFIG.superAdminEmail || '').toLowerCase();
    const isSuperAdmin = user.is_super_admin === true || user.isSuperAdmin === true || user.role === 'super_admin' || email === superAdminEmail;

    // Super Admin has full unrestricted access to everything
    if (isSuperAdmin) return 'full';

    // Dashboard is always full for approved accounts
    if (windowKey === 'dashboard') return 'full';

    // Audit logs strictly super_admin
    if (windowKey === 'audit') return 'off';

    // Check individual custom module overrides first (user override takes precedence)
    let custom = user.custom_modules || user.customModules || user.window_permissions;
    if (!custom && user.id) {
      custom = this.getUserCustomPermissions(user.id);
    }

    if (custom) {
      if (Array.isArray(custom)) {
        return custom.includes(windowKey) ? 'full' : 'off';
      }
      if (typeof custom === 'object' && custom[windowKey] !== undefined) {
        return custom[windowKey];
      }
    }

    // Role-level defaults
    const matrix = this.getRoleMatrix();
    const role = user.role || 'teacher';
    const rolePerms = matrix[role] || matrix.teacher || {};
    return rolePerms[windowKey] || 'off';
  }

  /**
   * Boolean check: can user access window (either 'view' or 'full')
   */
  static hasWindowAccess(user, windowKey) {
    const perm = this.getWindowPermission(user, windowKey);
    return perm === 'view' || perm === 'full';
  }

  /**
   * Boolean check: is window in view-only mode for user
   */
  static isWindowViewOnly(user, windowKey) {
    return this.getWindowPermission(user, windowKey) === 'view';
  }

  /**
   * Boolean check: does user have full edit access to window
   */
  static isWindowFull(user, windowKey) {
    return this.getWindowPermission(user, windowKey) === 'full';
  }

  static _dispatchUpdateEvent() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tps:permissions-updated'));
    }
  }
}

export default WindowPermissionsService;
