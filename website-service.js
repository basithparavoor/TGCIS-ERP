/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Institutional Website Service & CMS Engine
 *
 * Manages full institutional website data, color theme, navigation, hero,
 * about, academic programs, facilities, notice board, photo gallery,
 * testimonials, admissions banner, and contact information.
 *
 * Persisted in Supabase `app_settings` (id: 'website_cms') with instant
 * localStorage caching ('tps_website_cms') for zero-latency public visits.
 */

import { dbService } from './supabase-client.js';
import { TMS_CONFIG } from './config.js';
import { brandingService } from './branding-service.js';
import { TMS_LOGO } from './logo.js';

const CACHE_KEY = 'tps_website_cms';
const SETTINGS_ID = 'website_cms';

export const DEFAULT_WEBSITE_CONFIG = {
  // 1. Branding & Color Theme
  theme: {
    primaryColor: '#1A659F',     // Gold brand color matching logo
    primaryHover: '#134e7a',
    primaryLight: '#ddebf5',
    primaryDark: '#0f3d61',
    accentColor: '#f59e0b',      // Golden amber accent
    accentLight: '#fef3c7',
    darkBg: '#0f172a',
    lightBg: '#f8fafc',
    heroGradient: 'linear-gradient(135deg, #0d324d 0%, #1A659F 100%)',
    customLogoUrl: ''
  },

  // 2. Institution Meta & Topbar
  meta: {
    name: 'THAIBA COLLEGE OF INTEGRATED STUDIES',
    subtitle: 'Excellence in Academic & Moral Education',
    runBy: 'Thaiba Heritage, Kolkata',
    regNo: 'IV 01894/2011',
    foundedYear: '2011',
    affiliation: 'Recognized by Govt. of West Bengal • English Medium & Value Integrated',
    phone: '+91 8653382851',
    altPhone: '+91 8167782851',
    whatsapp: '+91 8653382851',
    email: 'tps@thaibagarden.com',
    workingHours: 'Mon – Sat: 8:30 AM – 4:00 PM',
    campusAddress: 'Baghait, Tapan, Dakshin Dinajpur, West Bengal, PIN 733127',
    topbarAlert: '📢 Admissions Open for Academic Session 2026-27 • Limited Seats Available for Nursery to Grade 11',
    topbarAlertLink: '/admission',
    loginButtonText: 'Login'
  },

  // 2b. Section & Tab Visibility Controls (Toggle ON/OFF each area of public website)
  sections: {
    // Header Navigation & Public Tabs
    headerLoginBtn: true,
    navAbout: true,
    navAcademics: true,
    navFacilities: true,
    navHostel: true,
    navNotices: true,
    navGallery: true,
    navTestimonials: true,
    navAdmissions: true,
    navContact: true,

    // Major Landing Page Sections
    hero: true,
    quickStats: true,
    about: true,
    academics: true,
    facilities: true,
    hostel: true,
    notices: true,
    gallery: true,
    testimonials: true,
    admissionCta: true,
    contact: true,

    // Sub-Components & Buttons
    heroBadge: true,
    heroApplyBtn: true,
    heroExploreBtn: true,
    heroStats: true,
    heroVisualCard: true,
    aboutPrincipal: true,
    aboutValues: true,
    ctaApplyBtn: true,
    ctaLoginBtn: true,
    contactOfficeCard: true,
    contactInquiryForm: true,
    contactWaBtn: true,
    contactDirBtn: true,

    // Institutional Footer
    footer: true,
    footerAboutCol: true,
    footerNavCol: true,
    footerPortalsCol: true,
    footerTrustCol: true,
    footerBottom: true
  },

  // 3. Hero Section
  hero: {
    badge: '★ ADMISSIONS OPEN FOR 2026–2027',
    headline: 'Nurturing Intellect, Inspiring Character, Leading Tomorrow',
    subheadline: 'A premier educational sanctuary in Dakshin Dinajpur where academic distinction blends seamlessly with ethical integrity, modern STEM facilities, and individual student mentorship.',
    primaryCtaText: 'Apply for Admission',
    primaryCtaUrl: '/admission',
    secondaryCtaText: 'Explore Programs',
    secondaryCtaUrl: '#academics',
    heroImageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    stat1Number: '100%',
    stat1Label: 'Board Pass Rate',
    stat2Number: '25+',
    stat2Label: 'Years of Legacy',
    stat3Number: '15:1',
    stat3Label: 'Student-Teacher Ratio'
  },

  // 4. Quick Stats Bar
  stats: [
    { number: '2,400+', label: 'Active Students', icon: 'users' },
    { number: '120+', label: 'Expert Faculty', icon: 'award' },
    { number: '100%', label: 'Board Results', icon: 'trending-up' },
    { number: '18+', label: 'Campus Acres & Labs', icon: 'building' }
  ],

  // 5. About Section
  about: {
    sectionTag: 'DISCOVER OUR HERITAGE',
    title: 'A Visionary Journey in Holistic Education',
    narrative: 'Thaiba College of Integrated Studies, operated under the aegis of Thaiba Heritage, Kolkata (Regd. No. IV 01894/2011), was established to bridge modern 21st-century academic rigor with profound moral groundedness. Set in a serene, eco-conscious campus in Baghait, Tapan, we cultivate curiosity, critical thinking, creative expression, and strong civic responsibility.',
    vision: 'To be a beacon of transformative education that empowers students with intellectual mastery, moral steadfastness, and global competence.',
    mission: 'To foster an inclusive, stimulating learning community where every student achieves academic excellence, develops exemplary character, and is prepared to thrive in higher education and society.',
    principalName: 'Br. Abdul Basith & Academic Council',
    principalTitle: 'Principal & Secretary, TMS',
    principalMessage: 'Education is not merely the accumulation of facts, but the training of the mind to think critically and the heart to act ethically. At Thaiba College of Integrated Studies, every learner is seen, valued, and propelled toward their highest potential.',
    principalPhoto: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    coreValues: [
      { title: 'Academic Rigor', desc: 'Comprehensive curriculum aligned with state and national benchmarks.' },
      { title: 'Moral Ethics', desc: 'Character education, moral fortitude, and social responsibility.' },
      { title: 'STEM & Innovation', desc: 'Experiential science, computational thinking, and robotics.' },
      { title: 'Holistic Development', desc: 'Fine arts, sportsmanship, oratory, and leadership training.' }
    ]
  },

  // 6. Academic Programs
  programs: [
    {
      id: 'pre-primary',
      title: 'Pre-Primary Wing',
      subtitle: 'Nursery, LKG, UKG',
      icon: 'sparkles',
      description: 'Activity-driven foundational learning focused on phonetic awareness, fine motor skills, expressive language, and social joy.',
      highlights: ['Montessori & playway methods', 'Interactive sensory play', 'Caring mother-teachers', 'Early bilingual foundations']
    },
    {
      id: 'primary',
      title: 'Primary School',
      subtitle: 'Grades 1 – 5',
      icon: 'book-open',
      description: 'Strengthening numeracy, reading comprehension, scientific curiosity, and moral consciousness in a supportive, vibrant environment.',
      highlights: ['Conceptual math & science', 'Moral & value education', 'Art, craft & physical agility', 'Weekly language lab']
    },
    {
      id: 'middle',
      title: 'Middle School',
      subtitle: 'Grades 6 – 8',
      icon: 'compass',
      description: 'Cultivating analytical problem-solving, digital fluency, collaborative research, and deeper understanding of sciences and humanities.',
      highlights: ['Hands-on science labs', 'Computer coding & robotics', 'Debate & declamation clubs', 'Organized team sports']
    },
    {
      id: 'secondary',
      title: 'Secondary & Higher Secondary',
      subtitle: 'Grades 9 – 12 (Science, Commerce, Arts)',
      icon: 'graduation-cap',
      description: 'Targeted preparation for board examinations and competitive entrance tests (NEET, JEE, CUET) with specialized faculty mentorship.',
      highlights: ['Dedicated stream mentoring', 'Advanced modern laboratories', 'Rigorous test series & analytics', 'Career counseling cell']
    },
    {
      id: 'islamic-heritage',
      title: 'Integrated Moral & Heritage Wing',
      subtitle: 'Holistic Islamic & Moral Studies',
      icon: 'sun',
      description: 'A dedicated track incorporating Quranic recitation, Arabic linguistics, and Islamic moral philosophy alongside standard curriculum.',
      highlights: ['Daily moral assemblies', 'Tajweed & ethical studies', 'Community service initiatives', 'Universal character values']
    }
  ],

  // 7. Campus Facilities
  facilities: [
    {
      id: 'smart-classrooms',
      title: 'Smart Interactive Classrooms',
      icon: 'monitor',
      desc: 'High-definition interactive touch panels, multimedia audio-visual aids, and ergonomically designed furniture.',
      badge: 'Modern'
    },
    {
      id: 'science-labs',
      title: 'Advanced Science Labs',
      icon: 'flask-conical',
      desc: 'Separate, fully equipped Physics, Chemistry, and Biology laboratories adhering to strict safety protocols.',
      badge: 'Practical'
    },
    {
      id: 'computer-lab',
      title: 'Next-Gen IT & Robotics Lab',
      icon: 'cpu',
      desc: 'High-speed internet workstations, coding platforms, Python & web dev tools, and STEM robotics kits.',
      badge: 'STEM'
    },
    {
      id: 'library',
      title: 'Central Library & Reading Lounge',
      icon: 'library',
      desc: 'Over 12,000 titles spanning academics, fiction, encyclopedias, Islamic history, and digital e-journals.',
      badge: 'Resource'
    },
    {
      id: 'sports',
      title: 'Expansive Sports Complex',
      icon: 'trophy',
      desc: 'Full-size football ground, cricket pitch, badminton courts, table tennis arena, and athletics track.',
      badge: 'Athletics'
    },
    {
      id: 'transport',
      title: 'Secure GPS-Tracked Fleet',
      icon: 'bus',
      desc: 'Dedicated school bus service covering Tapan, Balurghat, Gangarampur, and surrounding rural routes.',
      badge: 'Safety'
    },
    {
      id: 'safety',
      title: '24/7 Monitored Campus',
      icon: 'shield-check',
      desc: 'Comprehensive high-res CCTV surveillance across all corridors and grounds, staffed security gate.',
      badge: 'Secure'
    },
    {
      id: 'wellness',
      title: 'Health & RO Pure Water',
      icon: 'heart-pulse',
      desc: 'On-campus first-aid infirmary, visiting pediatrician, and multi-stage commercial RO drinking stations.',
      badge: 'Hygiene'
    }
  ],

  // 7b. Hostel & Residential Campus Setup (Toggleable by Admin)
  hostel: {
    enabled: true,               // Admin turn on/off toggle for hostel module & section (Default: OFF)
    showNavButton: true,         // Admin turn on/off toggle for "Hostel" navbar button (Default: OFF)
    navButtonText: 'Hostel',
    badge: 'RESIDENTIAL CAMPUS & BOARDING',
    title: 'Student Hostel & Residential Dormitories',
    subtitle: 'A secure, disciplined and nurturing home away from home with round-the-clock pastoral care, guided evening study, and nutritious dining.',
    overview: 'Thaiba College of Integrated Studies provides comfortable, safe, and hygienic hostel accommodations with separate wings for boys and girls. Students enjoy an enriching residential environment combining structured daily routines, mentored study halls, ethical character guidance, nutritious wholesome meals, and supervised recreational sports.',
    eligibility: 'Available for Boys & Girls (Grades 3 to 12)',
    totalCapacity: 150,
    occupiedBeds: 126,
    availableBeds: 24,
    wings: [
      {
        id: 'boys-wing',
        name: 'Hazrat Bilal Boys Wing',
        gender: 'Boys',
        rooms: '20 Spacious Dorm Rooms',
        capacity: 90,
        occupied: 74,
        supervisor: 'Janab Maulana Hafizullah (Superintendent)',
        contact: '+91 8653382851',
        description: 'Well-ventilated dorm rooms with individual study desks, secure wardrobes, ceiling fans, and RO pure water points.'
      },
      {
        id: 'girls-wing',
        name: 'Fatima-tuz-Zahra Girls Wing',
        gender: 'Girls',
        rooms: '15 Dedicated Dorm Rooms',
        capacity: 60,
        occupied: 52,
        supervisor: 'Sister Rabia Khatun (Resident Matron)',
        contact: '+91 8167782851',
        description: 'Complete security enclosure, 24/7 lady wardens, dedicated indoor activity hall, and personal counseling support.'
      }
    ],
    features: [
      {
        id: 'f-1',
        title: '24/7 Resident Wardens & CCTV',
        icon: 'shield-check',
        badge: 'Security',
        desc: 'Continuous perimeter CCTV monitoring, biometric access checkpoints, and resident teacher wardens on duty day and night.'
      },
      {
        id: 'f-2',
        title: 'Nutritious & Pure Halal Dining',
        icon: 'utensils',
        badge: 'Nutrition',
        desc: '4 wholesome meals daily: breakfast, lunch, evening snack, and dinner prepared under rigorous hygiene and dietary standards.'
      },
      {
        id: 'f-3',
        title: 'Supervised Evening Study Halls',
        icon: 'book-open',
        badge: 'Academics',
        desc: 'Mandatory 3 hours of supervised evening study under subject matter teachers for homework clearance and exam readiness.'
      },
      {
        id: 'f-4',
        title: 'Moral Routines & Character Building',
        icon: 'sun',
        badge: 'Values',
        desc: 'Daily congregational prayers, morning Quranic recitation, ethical mentoring, and character development workshops.'
      },
      {
        id: 'f-5',
        title: 'Medical Sick Bay & Doctor on Call',
        icon: 'heart-pulse',
        badge: 'Healthcare',
        desc: 'Dedicated on-campus infirmary with first-aid trained personnel, periodic pediatric check-ups, and 24/7 emergency clinic tie-up.'
      },
      {
        id: 'f-6',
        title: 'Clean RO Water & Solar Hot Water',
        icon: 'droplets',
        badge: 'Hygiene',
        desc: 'Multi-stage commercial RO drinking stations on every floor, solar water heating systems, and hygienic sanitized washrooms.'
      }
    ],
    dailyRoutine: [
      { time: '05:00 AM – 05:45 AM', activity: 'Fajr Congregational Prayer & Quranic Recitation', icon: 'sun' },
      { time: '06:00 AM – 07:00 AM', activity: 'Morning Physical Fitness / Calisthenics & Self-Study', icon: 'activity' },
      { time: '07:00 AM – 07:45 AM', activity: 'Wholesome Breakfast & School Readiness', icon: 'coffee' },
      { time: '08:00 AM – 02:30 PM', activity: 'Regular Academic Sessions & Campus Lunch', icon: 'graduation-cap' },
      { time: '02:30 PM – 03:45 PM', activity: 'Asr Prayer, Relaxation & Evening Milk/Snacks', icon: 'clock' },
      { time: '04:00 PM – 05:30 PM', activity: 'Organized Sports, Football, Badminton & Recreation', icon: 'trophy' },
      { time: '05:45 PM – 08:15 PM', activity: 'Maghrib Prayer & Supervised Academic Study Hall', icon: 'book-open' },
      { time: '08:30 PM – 09:30 PM', activity: 'Isha Congregational Prayer & Wholesome Dinner', icon: 'utensils' },
      { time: '09:30 PM – 10:00 PM', activity: 'Bedtime Preparation, Silent Reading & Lights Out', icon: 'moon' }
    ],
    messMenu: [
      { day: 'Monday', breakfast: 'Puri Sabzi / Boiled Egg + Milk/Tea', lunch: 'Rice, Yellow Dal, Seasonal Veg, Fish Curry', dinner: 'Tawa Roti, Chicken Korma, Fresh Salad' },
      { day: 'Tuesday', breakfast: 'Idli-Sambar / Vegetable Paratha + Tea', lunch: 'Rice, Dal, Crispy Aloo Bhaja, Egg Curry', dinner: 'Roti, Paneer Butter Masala, Mixed Dal' },
      { day: 'Wednesday', breakfast: 'Chana Masala, Butter Toast + Milk', lunch: 'Rice, Moong Dal, Seasonal Subji, Fish Kalia', dinner: 'Roti / Jeera Rice, Chicken Stew, Kheer' },
      { day: 'Thursday', breakfast: 'Aloo Paratha, Fresh Curd + Tea', lunch: 'Rice, Sambar, Bhindi Fry, Boiled Egg Roast', dinner: 'Tawa Roti, Tadka Dal, Seasonal Vegetable' },
      { day: 'Friday', breakfast: 'Halwa Puri / Masala Omelette + Milk', lunch: 'Special Friday Chicken Biryani / Polao, Raita', dinner: 'Roti, Rich Mutton / Chicken Curry, Salad' },
      { day: 'Saturday', breakfast: 'Vegetable Upma / Poha + Milk/Tea', lunch: 'Rice, Dal, Mixed Vegetable, Rohu Fish Fry', dinner: 'Roti, Chana Dal Fry, Fruit Custard' },
      { day: 'Sunday', breakfast: 'Stuffed Paratha, Butter + Milk/Tea', lunch: 'Feast Lunch: Basmati Rice, Fish / Chicken Curry', dinner: 'Light Moong Khichdi / Roti, Dal Fry, Papad' }
    ],
    fees: {
      admissionFee: '₹ 5,000 (One-time Admission & Bedding Kit)',
      monthlyBoarding: '₹ 4,500 / month (Lodging + 4 Meals Daily)',
      securityDeposit: '₹ 3,000 (Refundable Caution Deposit)'
    },
    wardens: {
      chiefWardenName: 'Janab Maulana Hafizullah',
      chiefWardenTitle: 'Senior Resident Superintendent',
      phone: '+91 8653382851',
      altPhone: '+91 8167782851',
      email: 'hostel@thaibagarden.com',
      visitingHours: 'Sundays & Second Saturdays: 10:00 AM – 4:00 PM'
    },
    rules: [
      'Strict adherence to daily prayer, study hours, and lights-out timings is mandatory for all hostel residents.',
      'Parents and guardians are welcomed exclusively during authorized visiting hours on weekends.',
      'Personal smartphones, video games, and unauthorized electronic devices are strictly prohibited inside dormitories.',
      'Hostel outpass / home visit leaves require prior written or portal approval by the registered guardian.',
      'Any breach of moral conduct, bullying, or insubordination will result in immediate suspension or expulsion.'
    ]
  },

  // 8. Notices / Announcements
  notices: [
    {
      id: 'not-1',
      title: 'Admission Open for Session 2026-27 (Nursery to Class XI)',
      date: '2026-11-01',
      category: 'Admissions',
      content: 'Online and offline registration for the upcoming academic session 2026-27 is now open. Parents can submit admission forms online through the portal or visit the campus office.',
      isPinned: true
    },
    {
      id: 'not-2',
      title: 'Annual Sports Meet & Winter Athletic Championship',
      date: '2026-11-15',
      category: 'Events',
      content: 'The Annual Sports Championship will be held from December 12th to 14th. All students are requested to finalize event selections with their sports master.',
      isPinned: true
    },
    {
      id: 'not-3',
      title: 'Pre-Board Examination Schedule for Grades 10 & 12',
      date: '2026-11-20',
      category: 'Examination',
      content: 'Pre-Board examination routines have been published in the Student and Parent portals. Admit cards will be issued from December 5th onwards.',
      isPinned: false
    },
    {
      id: 'not-4',
      title: 'Parent-Teacher Interaction & Progress Review Meeting',
      date: '2026-11-28',
      category: 'Academic',
      content: 'Parent-Teacher Meeting for Grades 1 to 9 is scheduled for Saturday, 10:00 AM to 2:00 PM. Parents can check their assigned time slots in the Parent Portal.',
      isPinned: false
    }
  ],

  // 9. Photo Gallery
  gallery: [
    { title: 'Lush Green Academic Campus', category: 'Campus', url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80' },
    { title: 'Interactive Science Laboratory', category: 'Academics', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
    { title: 'Annual Athletics & Football Cup', category: 'Sports', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80' },
    { title: 'Central Resource & Digital Library', category: 'Campus', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
    { title: 'Computer Programming & STEM Center', category: 'Academics', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80' },
    { title: 'Cultural Exhibition & Heritage Day', category: 'Cultural', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' }
  ],

  // 10. Testimonials
  testimonials: [
    {
      name: 'Mohammad Farooq Alam',
      role: 'Parent of Class 8 Student',
      rating: 5,
      content: 'Enrolling my son at Thaiba College of Integrated Studies was the best decision. The dedicated faculty and moral atmosphere have brought extraordinary positive changes in his confidence and studies.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      name: 'Dr. Sumana Roy',
      role: 'Guardian & Educationist',
      rating: 5,
      content: 'The campus infrastructure, scientific labs, and balance of character development with board curriculum make TMS a standout model school in North Bengal.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    },
    {
      name: 'Nayeem Akhtar',
      role: 'Alumnus (Now pursuing B.Tech CSE)',
      rating: 5,
      content: 'The teacher mentorship at TMS gave me the analytical foundation to crack competitive exams. The moral values and discipline I learned here stay with me every single day.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    }
  ],

  // 11. Admission CTA Banner
  admissionCta: {
    badge: 'ENROLLMENT 2026–27',
    headline: 'Give Your Child the Foundation for a Brilliant Future',
    subtext: 'Join hundreds of thriving young minds in an inspiring environment designed for academic distinction and character growth.',
    buttonText: 'Apply Online Today',
    buttonUrl: '/admission',
    prospectusUrl: '/admission'
  },

  // 12. Social & Links
  socials: {
    facebook: 'https://facebook.com/thaibapublicschool',
    youtube: 'https://youtube.com/@thaibaheritage',
    instagram: 'https://instagram.com/thaiba_school',
    twitter: ''
  },

  // 13. Footer
  footer: {
    about: 'Thaiba College of Integrated Studies, operated by Thaiba Heritage Kolkata (Regd. IV 01894/2011), is committed to providing world-class holistic education rooted in academic rigor, integrity, and ethical leadership.',
    copyright: '© 2026 THAIBA COLLEGE OF INTEGRATED STUDIES. All Rights Reserved. Run by Thaiba Heritage, Kolkata.',
    emergencyHelpline: '+91 8653382851'
  }
};

class WebsiteService {
  constructor() {
    this.data = this.readCache();
    this.applyThemeVars();
    this.initSyncListeners();
  }

  initSyncListeners() {
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (e.key === CACHE_KEY && e.newValue) {
            try {
              this.data = this.readCache();
              this.applyThemeVars();
              window.dispatchEvent(new CustomEvent('tms_website_config_changed', { detail: this.data }));
            } catch (_) {}
          }
        });
        if (typeof BroadcastChannel !== 'undefined') {
          this._bc = new BroadcastChannel('tms_website_cms_channel');
          this._bc.onmessage = (msg) => {
            if (msg.data && msg.data.type === 'config_updated' && msg.data.config) {
              this.data = msg.data.config;
              this.applyThemeVars();
              window.dispatchEvent(new CustomEvent('tms_website_config_changed', { detail: this.data }));
            }
          };
        }
      }
    } catch (_) {}
  }

  readCache() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = this.deepMerge(DEFAULT_WEBSITE_CONFIG, parsed);
        // Only default hostel to false if it was NEVER explicitly set in the saved config
        if (!merged.hostel) merged.hostel = {};
        if (localStorage.getItem('tms_hostel_force_on') !== 'done') {
          merged.hostel.enabled = true;
          merged.hostel.showNavButton = true;
          try { localStorage.setItem('tms_hostel_force_on', 'done'); } catch (_) {}
        }
        const wasExplicitlyConfigured = parsed.hostel && typeof parsed.hostel.enabled === 'boolean';
        if (!wasExplicitlyConfigured && !localStorage.getItem('tms_hostel_explicitly_toggled')) {
          if (!merged.hostel) merged.hostel = {};
          merged.hostel.enabled = false;
          merged.hostel.showNavButton = false;
        }
        if (!merged.sections) {
          merged.sections = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG.sections));
        }
        // Keep hostel and sections.hostel synchronized
        if (merged.hostel) {
          merged.sections.hostel = merged.hostel.enabled === true;
          merged.sections.navHostel = merged.hostel.showNavButton !== false && merged.hostel.enabled === true;
        }
        // Automatic migration of legacy defaults
        if (merged.meta && merged.meta.loginButtonText === 'Institutional Login') {
          merged.meta.loginButtonText = 'Login';
        }
        if (merged.hero && merged.hero.secondaryCtaText === 'Institutional Login') {
          merged.hero.secondaryCtaText = 'Explore Programs';
          merged.hero.secondaryCtaUrl = '#academics';
        }
        return merged;
      }
    } catch (e) {
      console.warn('Error reading website CMS cache:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
  }

  writeCache(val) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(val));
    } catch (e) {
      console.warn('Unable to write to localStorage for website CMS:', e);
    }
  }

  deepMerge(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  getConfig() {
    return this.data || this.readCache();
  }

  isHostelEnabled() {
    const cfg = this.getConfig();
    const h = (cfg && cfg.hostel) || {};
    return h.enabled === true;
  }

  isSectionEnabled(key, defaultValue = true) {
    const cfg = this.getConfig();
    const s = (cfg && cfg.sections) || {};
    if (s[key] !== undefined) return s[key] === true;
    return defaultValue;
  }

  applyThemeVars() {
    try {
      const theme = this.data?.theme || DEFAULT_WEBSITE_CONFIG.theme;
      const root = document.documentElement;
      if (!root) return;
      root.style.setProperty('--brand-theme-primary', theme.primaryColor || '#1A659F');
      root.style.setProperty('--brand-theme-hover', theme.primaryHover || '#134e7a');
      root.style.setProperty('--brand-theme-light', theme.primaryLight || '#ddebf5');
      root.style.setProperty('--brand-theme-dark', theme.primaryDark || '#0f3d61');
      root.style.setProperty('--brand-theme-accent', theme.accentColor || '#f59e0b');
      root.style.setProperty('--brand-theme-accent-light', theme.accentLight || '#fef3c7');
    } catch (e) { /* ignore */ }
  }

  /**
   * Re-fetch the website config from the database (best effort)
   */
  async refresh() {
    const cached = this.readCache();
    try {
      const rows = await dbService.select('app_settings');
      const row = rows.find((r) => r.id === SETTINGS_ID);
      if (row && row.value && Object.keys(row.value).length > 0) {
        // Compare save timestamps if available
        const remoteTime = new Date(row.value._savedAt || row.updated_at || 0).getTime();
        const localTime = new Date((cached && cached._savedAt) || 0).getTime();

        // If local has newer un-synced edits, keep local and sync to cloud
        if (localTime > remoteTime && cached) {
          this.data = this.deepMerge(DEFAULT_WEBSITE_CONFIG, cached);
          this.writeCache(this.data);
          try {
            dbService.upsert('app_settings', {
              id: SETTINGS_ID,
              value: this.data,
              updated_at: new Date().toISOString()
            }).catch(() => {});
          } catch (_) {}
        } else {
          this.data = this.deepMerge(DEFAULT_WEBSITE_CONFIG, row.value);
          this.writeCache(this.data);
        }
      } else {
        // Cloud does not have the website_cms row yet!
        // CRITICAL: NEVER wipe the user's cached edits!
        const hasCustomData = cached && (
          Boolean(cached._savedAt) ||
          JSON.stringify(cached) !== JSON.stringify(DEFAULT_WEBSITE_CONFIG)
        );
        if (hasCustomData) {
          this.data = cached;
          this.writeCache(this.data);
          // Attempt to bootstrap remote row so all devices can see it
          try {
            dbService.upsert('app_settings', {
              id: SETTINGS_ID,
              value: this.data,
              updated_at: new Date().toISOString()
            }).catch(() => {});
          } catch (_) {}
        } else {
          this.data = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
          this.writeCache(this.data);
        }
      }
    } catch (e) {
      console.warn('WebsiteService.refresh offline or error:', e);
      if (!this.data) this.data = cached;
    }
    this.applyThemeVars();
    window.dispatchEvent(new CustomEvent('tms_website_config_changed', { detail: this.data }));
    return this.data;
  }

  /**
   * Save updated website configuration to Supabase & localStorage
   */
  async saveConfig(nextConfig) {
    try {
      const current = this.data || this.readCache();
      const merged = this.deepMerge(current, nextConfig);
      merged._savedAt = new Date().toISOString();

      // Synchronize hostel enabled flag with sections.hostel
      if (merged.sections && merged.sections.hostel !== undefined) {
        if (!merged.hostel) merged.hostel = {};
        merged.hostel.enabled = merged.sections.hostel === true;
        if (merged.sections.navHostel !== undefined) {
          merged.hostel.showNavButton = merged.sections.navHostel === true;
        }
      } else if (merged.hostel && merged.sections) {
        merged.sections.hostel = merged.hostel.enabled === true;
        merged.sections.navHostel = merged.hostel.showNavButton !== false && merged.hostel.enabled === true;
      }
      this.data = merged;
      this.writeCache(merged);
      try {
        localStorage.setItem('tms_hostel_explicitly_toggled', 'true');
      } catch (e) {}
      this.applyThemeVars();

      // Instant live cross-tab broadcast
      try {
        window.dispatchEvent(new CustomEvent('tms_website_config_changed', { detail: merged }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('tms_website_cms_channel');
          bc.postMessage({ type: 'config_updated', config: merged });
          bc.close();
        }
      } catch (_) {}

      const saved = await dbService.upsert('app_settings', {
        id: SETTINGS_ID,
        value: merged,
        updated_at: new Date().toISOString()
      });

      if (saved && saved._syncError) {
        return { data: merged, success: true, warning: 'Saved locally in browser cache. Cloud sync notice: ' + saved._syncError };
      }

      return { data: merged, success: true };
    } catch (e) {
      console.error('Failed to save website CMS configuration:', e);
      return { error: e.message || 'Failed to save configuration' };
    }
  }

  /**
   * Reset the entire website CMS back to factory default configuration
   */
  async resetToDefault() {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
    return await this.saveConfig(defaults);
  }

  /**
   * Get effective institute logo for website
   */
  getLogo() {
    if (this.data?.theme?.customLogoUrl) {
      return this.data.theme.customLogoUrl;
    }
    return brandingService.getLogoUrl() || TMS_LOGO.getCustomLogo() || './tps-logo.png';
  }

  /* ================================================================== */
  /* Admission Inquiries Engine & Cloud Sync                            */
  /* ================================================================== */

  /**
   * List all admission inquiries
   */
  async listInquiries() {
    let inquiries = [];
    if (this._inquiriesTableAvailable !== false) {
      try {
        const rows = await dbService.select('admission_inquiries', null, false);
        if (Array.isArray(rows) && rows.length > 0) {
          inquiries = rows;
        }
      } catch (e) {
        if (e && (e.code === '42P01' || e.status === 404 || String(e.message || '').includes('404'))) {
          this._inquiriesTableAvailable = false;
        }
      }
    }

    if (inquiries.length === 0) {
      try {
        const raw = localStorage.getItem('tms_admission_inquiries');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) inquiries = parsed;
        }
      } catch (e) {}
    }

    // Try cloud backup in app_settings if still empty
    if (inquiries.length === 0) {
      try {
        const rows = await dbService.select('app_settings');
        const backupRow = rows.find(r => r.id === 'tms_admission_inquiries_backup' || r.key === 'tms_admission_inquiries_backup');
        if (backupRow && Array.isArray(backupRow.value) && backupRow.value.length > 0) {
          inquiries = backupRow.value;
          localStorage.setItem('tms_admission_inquiries', JSON.stringify(inquiries));
        }
      } catch (e) {}
    }

    return inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  /**
   * Save or insert a new admission inquiry
   */
  async saveInquiry(inquiry) {
    const item = {
      id: inquiry.id || ('INQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
      guardianName: String(inquiry.guardianName || '').trim(),
      phone: String(inquiry.phone || '').trim(),
      grade: inquiry.grade || 'General Admission',
      email: String(inquiry.email || '').trim(),
      message: String(inquiry.message || '').trim(),
      status: inquiry.status || 'new', // 'new' | 'contacted' | 'admitted' | 'closed'
      source: inquiry.source || 'Institutional Website',
      notes: inquiry.notes || '',
      createdAt: inquiry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Update localStorage cache
    let list = [];
    try {
      const raw = localStorage.getItem('tms_admission_inquiries');
      list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
    } catch (e) { list = []; }

    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.unshift(item);
    }
    try {
      localStorage.setItem('tms_admission_inquiries', JSON.stringify(list));
    } catch (e) {}

    // 2. Persist to database
    try {
      await dbService.upsert('admission_inquiries', item);
    } catch (e) {
      console.warn('Database upsert for admission_inquiries:', e);
    }

    // 3. Cloud app_settings backup so inquiries sync across devices
    try {
      await dbService.upsert('app_settings', {
        id: 'tms_admission_inquiries_backup',
        value: list,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('tms_inquiry_added', { detail: item }));
    return item;
  }

  /**
   * Update inquiry status and admin notes
   */
  async updateInquiry(id, updates = {}) {
    const inquiries = await this.listInquiries();
    const target = inquiries.find(i => i.id === id);
    if (!target) return null;
    const updated = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.saveInquiry(updated);
  }

  /**
   * Delete an inquiry
   */
  async deleteInquiry(id) {
    let list = await this.listInquiries();
    list = list.filter(i => i.id !== id);
    try {
      localStorage.setItem('tms_admission_inquiries', JSON.stringify(list));
    } catch (e) {}
    try {
      await dbService.delete('admission_inquiries', id);
    } catch (e) {}
    try {
      await dbService.upsert('app_settings', {
        id: 'tms_admission_inquiries_backup',
        value: list,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}
    return true;
  }
}

export const websiteService = new WebsiteService();
