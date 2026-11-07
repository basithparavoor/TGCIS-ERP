/**
 * THAIBA HERITAGE GROUP OF INSTITUTIONS — ERP Master Configuration
 * Multi-Campus Architecture: Central Management & Campuses
 */

export const TMS_CONFIG = {
  // Central Group of Institutions Hierarchy
  group: {
    name: "THAIBA HERITAGE GROUP OF INSTITUTIONS",
    shortName: "Thaiba Heritage Group",
    trust: "Thaiba Heritage, Kolkata",
    regNo: "IV 01894/2011",
    tagline: "Central Educational Trust & Group Governance",
    hq: {
      campus: "Thaiba Heritage Headquarters",
      city: "Kolkata",
      state: "West Bengal",
      country: "India",
      phone: "+91 8653382851",
      email: "central@thaibaheritage.org",
      director: "C. M. Basith",
      directorEmail: "cmbasith786@gmail.com"
    },
    // Campuses / Operating Units
    schools: [
      {
        id: "tgcis",
        code: "TGCIS-TAPAN",
        name: "THAIBA COLLEGE OF INTEGRATED STUDIES",
        shortName: "TGCIS (Main)",
        tagline: "Higher Secondary & Integrated Studies",
        board: "State / Central Affiliated",
        status: "Active",
        principal: "C. M. Basith",
        principalEmail: "cmbasith786@gmail.com",
        contact: {
          phone1: "+91 8653382851",
          phone2: "+91 8167782851",
          email: "tgcis@thaibagarden.com",
          website: "https://tgcis.clubad.space"
        },
        address: {
          campus: "Baghait, Tapan",
          village: "Baghait",
          city: "Tapan",
          district: "Dakshin Dinajpur",
          state: "West Bengal",
          country: "India",
          pin: "733127",
          locality: "Thaiba Garden, Tapan"
        },
        themeColor: "#1A659F",
        logo: "tps-logo.png",
        logoBadge: "TGCIS",
        founded: "2011",
        gpsGeofence: {
          latitude: 25.2891,
          longitude: 88.5832,
          radiusMeters: 300
        }
      },
      {
        id: "tms",
        code: "TMS-TAPAN",
        name: "THAIBA MODEL SCHOOL",
        shortName: "TMS (Main)",
        tagline: "Excellence in Islamic & Contemporary Education",
        board: "State / Central Affiliated",
        status: "Active",
        principal: "Dr. Z. A. Rahman",
        principalEmail: "principal@thaibamodel.school",
        contact: {
          phone1: "+91 8653382850",
          phone2: "+91 8167782850",
          email: "tms@thaibagarden.com",
          website: "https://tms.thaibagarden.com"
        },
        address: {
          campus: "Thaiba Garden Campus",
          village: "Baghait",
          city: "Tapan",
          district: "Dakshin Dinajpur",
          state: "West Bengal",
          country: "India",
          pin: "733127",
          locality: "Thaiba Garden, Tapan"
        },
        themeColor: "#16a34a",
        logo: "icons/tms-logo.png",
        logoBadge: "TMS",
        founded: "2015",
        gpsGeofence: {
          latitude: 25.2910,
          longitude: 88.5850,
          radiusMeters: 300
        }
      }
    ]
  },

  institution: {
    name: "THAIBA COLLEGE OF INTEGRATED STUDIES",
    tagline: "Run by : Thaiba Heritage, Kolkata",
    code: "TGCIS-TAPAN",
    trust: "Thaiba Heritage, Kolkata",
    regNo: "IV 01894/2011",
    founded: "2011",
    logoText: "TGCIS",
    logoBadge: "TGCIS",
    address: {
      campus: "Baghait, Tapan",
      village: "Baghait",
      city: "Tapan",
      district: "Dakshin Dinajpur",
      state: "West Bengal",
      country: "India",
      pin: "733127",
      locality: "Thaiba Garden, Tapan"
    },
    contact: {
      phone1: "+91 8653382851",
      phone2: "+91 8167782851",
      email: "tgcis@thaibagarden.com",
      website: "https://tgcis.clubad.space"
    },
    gpsGeofence: {
      latitude: 25.2891,
      longitude: 88.5832,
      radiusMeters: 300,
      pollIntervalMs: 5 * 60 * 1000,
      exitGracePeriodMs: 3 * 60 * 1000
    }
  },

  // Highest-level Super Administrator Email
  superAdminEmail: "cmbasith786@gmail.com",

  // Parent logins are auto-generated as <username>@<parentEmailDomain>
  parentEmailDomain: "parents.thaibamodel.school",

  admissionStatuses: {
    SUBMITTED: "Submitted",
    UNDER_VERIFICATION: "Under Verification",
    APPROVED: "Approved",
    REJECTED: "Rejected"
  },

  supabase: {
    url: "https://oyttyawpiqdfdzaasvvr.supabase.co",
    anonKey: "sb_publishable_-yMIbrh_pbkb-x4kx4uAXg_wWo9ZRqO",
    storageBuckets: {
      documents: "tms-documents",
      avatars: "avatars",
      receipts: "tms-receipts",
      assignments: "tms-assignments"
    }
  },

  roles: {
    SUPER_ADMIN: "super_admin",
    CENTRAL_ADMIN: "central_admin",
    ACADEMIC_DIRECTOR: "academic_director",
    DEPUTY_DIRECTOR: "deputy_director",
    CHAIRMAN: "chairman",
    MD: "md",
    DMD: "dmd",
    ADMIN: "admin",
    PRINCIPAL: "principal",
    COORDINATOR: "coordinator",
    TEACHER: "teacher",
    FINANCE: "finance",
    HR: "hr",
    LIBRARIAN: "librarian",
    OPERATIONS: "operations",
    OFFICE_BOY: "office_boy",
    STUDENT: "student",
    PARENT: "parent"
  },

  scopes: {
    GROUP_WIDE: "group_wide",
    SCHOOL_WIDE: "school_wide",
    ASSIGNED_CLASS: "assigned_class",
    ASSIGNED_SUBJECT: "assigned_subject",
    OWN_RECORDS: "own_records",
    LINKED_WARDS: "linked_wards",
    DEPARTMENT_SCOPE: "department_scope",
    FINANCE_SCOPE: "finance_scope",
    OPERATIONS_SCOPE: "operations_scope"
  },

  academic: {
    currentYear: "2026-2027",
    classes: [
      "Nursery", "LKG", "UKG",
      "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
      "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
      "Grade 11 (Science)", "Grade 11 (Commerce)", "Grade 11 (Arts)",
      "Grade 12 (Science)", "Grade 12 (Commerce)", "Grade 12 (Arts)"
    ],
    sections: ["A", "B", "C"],
    gradingTiers: [
      { grade: "A+", min: 90, max: 100, gpa: 10.0, remark: "Outstanding" },
      { grade: "A", min: 80, max: 89, gpa: 9.0, remark: "Excellent" },
      { grade: "B+", min: 70, max: 79, gpa: 8.0, remark: "Very Good" },
      { grade: "B", min: 60, max: 69, gpa: 7.0, remark: "Good" },
      { grade: "C+", min: 50, max: 59, gpa: 6.0, remark: "Satisfactory" },
      { grade: "C", min: 40, max: 49, gpa: 5.0, remark: "Pass" },
      { grade: "D", min: 33, max: 39, gpa: 4.0, remark: "Marginal" },
      { grade: "F", min: 0, max: 32, gpa: 0.0, remark: "Needs Remedial Support" }
    ]
  },

  // Admission form/fee defaults now live in admission-service.js (DB-backed, admin-editable).

  finance: {
    currencySymbol: "₹",
    currencyCode: "INR",
    paymentModes: ["Cash Counter", "UPI QR", "Net Banking / NEFT", "Credit / Debit Card", "Cheque / DD"]
  },

  version: "4.0.0-Strict",
  systemStatus: "Operational"
};

export default TMS_CONFIG;
