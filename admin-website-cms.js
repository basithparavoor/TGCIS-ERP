/**
 * THAIBA PUBLIC SCHOOL — Institutional Website CMS Admin Controller
 *
 * Provides comprehensive, end-to-end administration for the public institutional website:
 * - Brand identity, motto & custom logo color theme
 * - Sticky navigation & topbar marquee
 * - Hero banner, headlines, CTA buttons & floating stats
 * - Key metrics / stats ribbon
 * - About institution, leadership message, vision & core values
 * - Academic programs & wings management (CRUD)
 * - Campus facilities & infrastructure (CRUD)
 * - Live notice board & circulars (CRUD)
 * - Campus photo gallery (CRUD)
 * - Parent & alumni testimonials (CRUD)
 * - Admission call-to-action banner & contact channels
 * - Disaster recovery JSON backup, restore & factory reset
 */

import { websiteService, DEFAULT_WEBSITE_CONFIG } from './website-service.js';
import { brandingService } from './branding-service.js';
import { UIComponents } from './ui-components.js';
import { TMS_LOGO } from './logo.js';

const esc = (v) => UIComponents.escapeHtml(v);

export class AdminWebsiteCms {
  static _config = null;
  static _activeSubtab = 'website-general';
  static _hasUnsaved = false;

  static async initConfig() {
    if (!this._config) {
      await websiteService.refresh();
      this._config = JSON.parse(JSON.stringify(websiteService.getConfig()));
    }
    return this._config;
  }

  static async render(tabContent, subKey = 'website-general') {
    this._activeSubtab = subKey;
    await this.initConfig();

    tabContent.innerHTML = `
      <div class="card tms-cms-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
        <!-- CMS Action Header (Light Theme) -->
        <div class="tms-cms-header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="tms-cms-icon-box">
              <i data-lucide="globe" style="width: 24px; height: 24px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h3 class="tms-cms-title">
                  Institutional Website CMS &amp; Live Customizer
                </h3>
                <span class="badge" style="font-size: 0.72rem; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 9px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 0.04em;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                  Live Editor
                </span>
              </div>
              <p class="tms-cms-subtitle">
                Fully customize all content, hero headlines, programs, facilities, notices, colors &amp; branding in real-time.
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="tms-btn-cms-preview" id="btn-cms-open-sections" title="Toggle ON/OFF sections, tabs and elements across the public website" style="${subKey === 'website-sections' ? 'background:#ecfdf5; border-color:#10b981;' : ''}">
              <i data-lucide="toggle-right" style="width: 15px; height: 15px; color: #059669;"></i>
              <span>Sections Visibility (ON/OFF)</span>
            </button>

            <a href="/" target="_blank" class="tms-btn-cms-preview">
              <i data-lucide="external-link" style="width: 15px; height: 15px; color: #059669;"></i>
              <span>Preview Live Website</span>
            </a>

            <button class="tms-btn-cms-publish" id="btn-cms-save-all">
              <i data-lucide="save" style="width: 16px; height: 16px;"></i>
              <span>Save &amp; Publish Website</span>
            </button>

            <button class="tms-btn-cms-reset" id="btn-cms-reset-factory" title="Reset all content to school factory defaults">
              <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        <!-- CMS Sub-Body -->
        <div style="padding: 24px; background: #ffffff;" id="cms-subtab-container">
          <!-- Injected by specific subtab renderer -->
        </div>
      </div>
    `;

    const subContainer = document.getElementById('cms-subtab-container');
    if (!subContainer) return;

    if (subKey === 'website-inquiries') {
      const { AdminModule } = await import('./admin-module.js');
      await AdminModule.renderInquiriesTab(subContainer);
    }
    else if (subKey === 'website-sections') this.renderSectionsTab(subContainer);
    else if (subKey === 'website-general') this.renderGeneralTab(subContainer);
    else if (subKey === 'website-hero') this.renderHeroTab(subContainer);
    else if (subKey === 'website-about') this.renderAboutTab(subContainer);
    else if (subKey === 'website-academics') this.renderAcademicsTab(subContainer);
    else if (subKey === 'website-facilities') this.renderFacilitiesTab(subContainer);
    else if (subKey === 'website-hostel') this.renderHostelTab(subContainer);
    else if (subKey === 'website-notices') this.renderNoticesTab(subContainer);
    else if (subKey === 'website-gallery') this.renderGalleryTab(subContainer);
    else if (subKey === 'website-testimonials') this.renderTestimonialsTab(subContainer);
    else if (subKey === 'website-contact') this.renderContactTab(subContainer);
    else if (subKey === 'website-backup') this.renderBackupTab(subContainer);

    this.bindHeaderActions();
    UIComponents.refreshIcons();
  }

  static harvestActiveInputs() {
    if (!this._config) return;
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : null;
    };

    // General / Identity
    if (!this._config.meta) this._config.meta = {};
    const metaName = getVal('meta-name'); if (metaName !== null) this._config.meta.name = metaName;
    const metaRunBy = getVal('meta-runby'); if (metaRunBy !== null) this._config.meta.runBy = metaRunBy;
    const metaRegNo = getVal('meta-regno'); if (metaRegNo !== null) this._config.meta.regNo = metaRegNo;
    const metaYear = getVal('meta-year'); if (metaYear !== null) this._config.meta.foundedYear = metaYear;
    const metaAff = getVal('meta-affiliation'); if (metaAff !== null) this._config.meta.affiliation = metaAff;
    const metaLogin = getVal('meta-loginbtn'); if (metaLogin !== null) this._config.meta.loginButtonText = metaLogin;

    // Theme
    if (!this._config.theme) this._config.theme = {};
    const themePrim = getVal('theme-primary-txt') || getVal('theme-primary'); if (themePrim !== null) this._config.theme.primaryColor = themePrim;
    const themeAcc = getVal('theme-accent-txt') || getVal('theme-accent'); if (themeAcc !== null) this._config.theme.accentColor = themeAcc;
    const themeLogo = getVal('theme-logourl'); if (themeLogo !== null) this._config.theme.customLogoUrl = themeLogo;

    // Hero
    if (!this._config.hero) this._config.hero = {};
    const hBadge = getVal('hero-badge'); if (hBadge !== null) this._config.hero.badge = hBadge;
    const hHead = getVal('hero-headline'); if (hHead !== null) this._config.hero.headline = hHead;
    const hSub = getVal('hero-subheadline'); if (hSub !== null) this._config.hero.subheadline = hSub;
    const hCta1 = getVal('hero-cta1-txt'); if (hCta1 !== null) this._config.hero.primaryCtaText = hCta1;
    const hCta1U = getVal('hero-cta1-url'); if (hCta1U !== null) this._config.hero.primaryCtaUrl = hCta1U;
    const hCta2 = getVal('hero-cta2-txt'); if (hCta2 !== null) this._config.hero.secondaryCtaText = hCta2;
    const hCta2U = getVal('hero-cta2-url'); if (hCta2U !== null) this._config.hero.secondaryCtaUrl = hCta2U;
    const hImg = getVal('hero-imgurl'); if (hImg !== null) this._config.hero.heroImageUrl = hImg;
    const s1v = getVal('hero-s1-val'); if (s1v !== null) this._config.hero.stat1Number = s1v;
    const s1l = getVal('hero-s1-lbl'); if (s1l !== null) this._config.hero.stat1Label = s1l;
    const s2v = getVal('hero-s2-val'); if (s2v !== null) this._config.hero.stat2Number = s2v;
    const s2l = getVal('hero-s2-lbl'); if (s2l !== null) this._config.hero.stat2Label = s2l;
    const s3v = getVal('hero-s3-val'); if (s3v !== null) this._config.hero.stat3Number = s3v;
    const s3l = getVal('hero-s3-lbl'); if (s3l !== null) this._config.hero.stat3Label = s3l;

    // About
    if (!this._config.about) this._config.about = {};
    const abEye = getVal('about-eyebrow'); if (abEye !== null) this._config.about.eyebrow = abEye;
    const abTit = getVal('about-title'); if (abTit !== null) this._config.about.title = abTit;
    const abBody = getVal('about-body'); if (abBody !== null) this._config.about.body = abBody;
    const abQuo = getVal('lead-quote'); if (abQuo !== null) this._config.about.quote = abQuo;
    const abAut = getVal('lead-author'); if (abAut !== null) this._config.about.quoteAuthor = abAut;
    const abRol = getVal('lead-role'); if (abRol !== null) this._config.about.quoteRole = abRol;
    const abImg = getVal('lead-imgurl'); if (abImg !== null) this._config.about.leaderImageUrl = abImg;

    // Contact
    if (!this._config.contact) this._config.contact = {};
    const cPhone = getVal('contact-phone'); if (cPhone !== null) this._config.contact.phone = cPhone;
    const cAlt = getVal('contact-altphone'); if (cAlt !== null) this._config.contact.secondaryPhone = cAlt;
    const cEmail = getVal('contact-email'); if (cEmail !== null) this._config.contact.email = cEmail;
    const cHours = getVal('contact-hours'); if (cHours !== null) this._config.contact.hours = cHours;
    const cMap = getVal('contact-mapembed'); if (cMap !== null) this._config.contact.mapEmbed = cMap;
  }

  static bindHeaderActions() {
    const openSecBtn = document.getElementById('btn-cms-open-sections');
    if (openSecBtn) {
      openSecBtn.addEventListener('click', async () => {
        const { AdminModule } = await import('./admin-module.js');
        AdminModule.renderTab('website-sections');
      });
    }

    const saveBtn = document.getElementById('btn-cms-save-all');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        this.harvestActiveInputs();
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner" style="width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite;"></span> Saving...`;

        const res = await websiteService.saveConfig(this._config);
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="check" style="width:15px; height:15px;"></i> <span>Published!</span>`;
        UIComponents.refreshIcons();

        if (res.error) {
          UIComponents.showToast('Save error: ' + res.error, 'error');
        } else if (res.warning) {
          UIComponents.showToast('Saved to website! (Offline/Cloud notice: ' + res.warning + ')', 'info');
        } else {
          UIComponents.showToast('Institutional website updated & published live!', 'success');
        }

        setTimeout(() => {
          if (saveBtn) {
            saveBtn.innerHTML = `<i data-lucide="save" style="width:15px; height:15px;"></i> <span>Save &amp; Publish Website</span>`;
            UIComponents.refreshIcons();
          }
        }, 2500);
      });
    }

    const resetBtn = document.getElementById('btn-cms-reset-factory');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        UIComponents.showModal({
          title: 'Reset Website to Factory Defaults?',
          content: `
            <div style="font-size:0.92rem; color:var(--text-main); line-height:1.6;">
              This will reset all headlines, academic programs, facilities, and about content back to the official TMS preset.
              <br><br>
              <strong>Are you sure you want to proceed?</strong>
            </div>
          `,
          confirmText: 'Yes, Reset Content',
          cancelText: 'Cancel',
          onConfirm: async () => {
            this._config = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
            await websiteService.resetToDefault();
            UIComponents.showToast('Website content reset to factory defaults', 'info');
            const subContainer = document.getElementById('cms-subtab-container');
            if (subContainer) this.render(document.getElementById('admin-tab-content'), this._activeSubtab);
          }
        });
      });
    }
  }

  /* ========================================================================== */
  /* Section Definitions Registry for Complete Website Management               */
  /* ========================================================================== */
  static getSectionDefinitions() {
    return [
      {
        group: 'header_nav',
        groupLabel: 'Header Navigation & Public Tabs',
        groupDesc: 'Control which tabs, buttons, and links appear in the top header and mobile navigation drawer.',
        groupIcon: 'compass',
        items: [
          {
            key: 'headerLoginBtn',
            label: 'Header "Login" Button',
            target: '#btn-open-institutional-login',
            desc: 'Displays the primary Login button on the right side of the main header and in the mobile menu drawer.',
            icon: 'lock',
            shortcutTab: 'website-general'
          },
          {
            key: 'navAbout',
            label: '"About" Navigation Tab',
            target: '#nav-about-link',
            desc: 'Displays the "About" link in top navigation bar and mobile drawer.',
            icon: 'info',
            shortcutTab: 'website-about'
          },
          {
            key: 'navAcademics',
            label: '"Academics" Navigation Tab',
            target: '#nav-academics-link',
            desc: 'Displays the "Academics" link in top navigation bar and mobile drawer.',
            icon: 'graduation-cap',
            shortcutTab: 'website-academics'
          },
          {
            key: 'navFacilities',
            label: '"Facilities" Navigation Tab',
            target: '#nav-facilities-link',
            desc: 'Displays the "Facilities" link in top navigation bar and mobile drawer.',
            icon: 'building-2',
            shortcutTab: 'website-facilities'
          },
          {
            key: 'navHostel',
            label: '"Hostel" Navigation Tab',
            target: '#nav-hostel-link',
            desc: 'Displays the "Hostel" residential boarding tab in top navigation bar and mobile drawer.',
            icon: 'home',
            shortcutTab: 'website-hostel'
          },
          {
            key: 'navNotices',
            label: '"Notices" Navigation Tab',
            target: '#nav-notices-link',
            desc: 'Displays the "Notices" bulletin board link in top navigation bar and mobile drawer.',
            icon: 'bell',
            shortcutTab: 'website-notices'
          },
          {
            key: 'navGallery',
            label: '"Gallery" Navigation Tab',
            target: '#nav-gallery-link',
            desc: 'Displays the "Gallery" photo gallery link in top navigation bar and mobile drawer.',
            icon: 'image',
            shortcutTab: 'website-gallery'
          },
          {
            key: 'navTestimonials',
            label: '"Reviews" Navigation Tab',
            target: '#nav-testimonials-link',
            desc: 'Displays the "Reviews" testimonials link in top navigation bar and mobile drawer.',
            icon: 'message-square',
            shortcutTab: 'website-testimonials'
          },
          {
            key: 'navAdmissions',
            label: '"Admission" Navigation Tab',
            target: '#nav-admissions-link',
            desc: 'Displays the "Admission" link in top navigation bar and mobile drawer apply button.',
            icon: 'sparkles',
            shortcutTab: 'website-contact'
          },
          {
            key: 'navContact',
            label: '"Contact" Navigation Tab',
            target: '#nav-contact-link',
            desc: 'Displays the "Contact" link in top navigation bar and mobile drawer.',
            icon: 'phone',
            shortcutTab: 'website-contact'
          }
        ]
      },

      {
        group: 'page_sections',
        groupLabel: 'Major Landing Page Sections',
        groupDesc: 'Show or completely hide full main sections on the public home page.',
        groupIcon: 'layout',
        items: [
          {
            key: 'hero',
            label: 'Hero Main Showcase Section',
            target: '#home',
            desc: 'The prominent banner at the very top of the home page with headline, CTAs, and campus visual.',
            icon: 'sparkles',
            shortcutTab: 'website-hero'
          },
          {
            key: 'quickStats',
            label: 'Quick Stats Counter Ribbon',
            target: '#quick-stats-ribbon',
            desc: 'High-impact 4-counter bar (Active Students, Faculty, Results, Acres & Labs) below hero.',
            icon: 'trending-up',
            shortcutTab: 'website-general'
          },
          {
            key: 'about',
            label: 'About Our Institution & Heritage Section',
            target: '#about',
            desc: 'Heritage story, Principal message card, and 4 core values cards.',
            icon: 'book-open',
            shortcutTab: 'website-about'
          },
          {
            key: 'academics',
            label: 'Academic Programs & Wings Section',
            target: '#academics',
            desc: 'Comprehensive learning tracks: Pre-Primary, Primary, Middle, Secondary, and Moral Wing.',
            icon: 'graduation-cap',
            shortcutTab: 'website-academics'
          },
          {
            key: 'facilities',
            label: 'Campus Life & Facilities Section',
            target: '#facilities',
            desc: 'Grid of campus facilities (smart classrooms, science labs, IT lab, library, sports, etc.).',
            icon: 'building',
            shortcutTab: 'website-facilities'
          },
          {
            key: 'hostel',
            label: 'Student Hostel & Residential Dormitories Section',
            target: '#hostel',
            desc: 'Complete boarding module: residential wings, hostel facilities, daily routine, and mess menu.',
            icon: 'home',
            shortcutTab: 'website-hostel'
          },
          {
            key: 'notices',
            label: 'Live Notice Board & Bulletins Section',
            target: '#notices',
            desc: 'Public notices board with date tags, categories, filter pills, and popup bulletin view.',
            icon: 'megaphone',
            shortcutTab: 'website-notices'
          },
          {
            key: 'gallery',
            label: 'Campus Photo Gallery Section',
            target: '#gallery',
            desc: 'Visual photography gallery showcasing campus, activities, labs, sports, and cultural life.',
            icon: 'image',
            shortcutTab: 'website-gallery'
          },
          {
            key: 'testimonials',
            label: 'Reviews & Testimonials Section',
            target: '#testimonials',
            desc: 'Quotes and 5-star ratings from parents, guardians, educationists, and alumni.',
            icon: 'message-square-quote',
            shortcutTab: 'website-testimonials'
          },
          {
            key: 'admissionCta',
            label: 'Admissions Call-to-Action Banner',
            target: '#admissions',
            desc: 'Full-width high-contrast enrollment banner with "Apply Online Today" & "Login" buttons.',
            icon: 'badge-percent',
            shortcutTab: 'website-contact'
          },
          {
            key: 'contact',
            label: 'Campus Visit & Contact Helpdesk Section',
            target: '#contact',
            desc: 'Administrative office address, phone helplines, WhatsApp button, and inquiry form.',
            icon: 'map-pin',
            shortcutTab: 'website-contact'
          }
        ]
      },

      {
        group: 'components',
        groupLabel: 'Interactive Components & Action Buttons',
        groupDesc: 'Fine-tune specific cards, form blocks, and call-to-action buttons inside sections.',
        groupIcon: 'sliders',
        items: [
          {
            key: 'heroBadge',
            label: 'Hero "Admissions Open" Pill Badge',
            target: '#hero-badge-pill',
            desc: 'Pulse-dot badge pill displaying "★ ADMISSIONS OPEN FOR 2026–2027" above hero headline.',
            icon: 'sparkles',
            shortcutTab: 'website-hero'
          },
          {
            key: 'heroApplyBtn',
            label: 'Hero Primary "Apply for Admission" Button',
            target: '#hero-apply-btn',
            desc: 'Primary green action button in the hero section directing visitors to /admission.',
            icon: 'pen-tool',
            shortcutTab: 'website-hero'
          },
          {
            key: 'heroExploreBtn',
            label: 'Hero Secondary "Explore Programs" Button',
            target: '#hero-explore-btn',
            desc: 'Secondary outlined action button in the hero linking smoothly down to #academics.',
            icon: 'compass',
            shortcutTab: 'website-hero'
          },
          {
            key: 'heroStats',
            label: 'Hero Floating 3-Stats Row',
            target: '#hero-meta-row',
            desc: 'Displays the 100% Board Pass Rate, 25+ Years Legacy, and 15:1 Ratio row in hero.',
            icon: 'award',
            shortcutTab: 'website-hero'
          },
          {
            key: 'heroVisualCard',
            label: 'Hero Campus Photo Showcase Card',
            target: '#hero-visual-card',
            desc: 'Right-side photographic showcase card with Baghait Campus tag and active student pill.',
            icon: 'image',
            shortcutTab: 'website-hero'
          },
          {
            key: 'aboutPrincipal',
            label: 'About: Principal & Leadership Message Card',
            target: '#about-principal-card',
            desc: 'Card featuring the Principal photo, leadership quote, and ISO accreditation seal.',
            icon: 'user-check',
            shortcutTab: 'website-about'
          },
          {
            key: 'aboutValues',
            label: 'About: 4 Core Values Grid',
            target: '#about-values-grid',
            desc: 'Grid displaying Academic Rigor, Moral Ethics, STEM, and Holistic Development cards.',
            icon: 'check-circle',
            shortcutTab: 'website-about'
          },
          {
            key: 'ctaApplyBtn',
            label: 'Admission CTA "Apply Online Today" Button',
            target: '#cta-btn',
            desc: 'White action button in the enrollment banner directing parents to the online admission portal.',
            icon: 'pen-tool',
            shortcutTab: 'website-contact'
          },
          {
            key: 'ctaLoginBtn',
            label: 'Admission CTA "Login" Button',
            target: '#cta-login-btn',
            desc: 'Direct Login button in the enrollment banner directing users to /login.',
            icon: 'lock',
            shortcutTab: 'website-contact'
          },
          {
            key: 'contactOfficeCard',
            label: 'Contact: Administrative Office Info Card',
            target: '#contact-info-card',
            desc: 'Card with campus address, helplines, email, office hours, WhatsApp & Maps buttons.',
            icon: 'building-2',
            shortcutTab: 'website-contact'
          },
          {
            key: 'contactInquiryForm',
            label: 'Contact: "Send an Admission Inquiry" Form',
            target: '#contact-form-card',
            desc: 'Interactive public inquiry form that submits parent inquiries directly to Admin page.',
            icon: 'send',
            shortcutTab: 'website-contact'
          },
          {
            key: 'contactWaBtn',
            label: 'Contact: WhatsApp Support Helpdesk Button',
            target: '#contact-wa-btn',
            desc: 'Quick WhatsApp chat button for immediate mobile messaging with school administration.',
            icon: 'message-circle',
            shortcutTab: 'website-contact'
          },
          {
            key: 'contactDirBtn',
            label: 'Contact: Google Maps Directions Button',
            target: '#contact-dir-btn',
            desc: 'One-click navigation button opening Google Maps with directions to campus.',
            icon: 'navigation',
            shortcutTab: 'website-contact'
          }
        ]
      },

      {
        group: 'footer',
        groupLabel: 'Institutional Footer & Columns',
        groupDesc: 'Control the visibility of footer columns, links, and bottom copyright bar.',
        groupIcon: 'panel-bottom',
        items: [
          {
            key: 'footer',
            label: 'Entire Institutional Footer',
            target: '#website-footer',
            desc: 'Turns the entire dark institutional footer at the bottom of the page ON or OFF.',
            icon: 'panel-bottom',
            shortcutTab: 'website-contact'
          },
          {
            key: 'footerAboutCol',
            label: 'Footer: About School & Registration Column',
            target: '#footer-about-col',
            desc: 'First column with school emblem, registered society name, summary, and campus address.',
            icon: 'shield-check',
            shortcutTab: 'website-contact'
          },
          {
            key: 'footerNavCol',
            label: 'Footer: Navigation Links Column',
            target: '#footer-nav-col',
            desc: 'Second column with quick links to About, Academics, Facilities, Notices, Gallery, etc.',
            icon: 'list',
            shortcutTab: 'website-contact'
          },
          {
            key: 'footerPortalsCol',
            label: 'Footer: Institutional Portals Column',
            target: '#footer-portals-col',
            desc: 'Third column containing the direct Login and Admission Form buttons.',
            icon: 'lock',
            shortcutTab: 'website-contact'
          },
          {
            key: 'footerTrustCol',
            label: 'Footer: Trust & Governance Column',
            target: '#footer-trust-col',
            desc: 'Fourth column with society registration number and emergency helpline number.',
            icon: 'landmark',
            shortcutTab: 'website-contact'
          },
          {
            key: 'footerBottom',
            label: 'Footer: Bottom Copyright & Back to Top Bar',
            target: '#footer-bottom-row',
            desc: 'Bottom copyright disclaimer row with "Back to Top" navigation link.',
            icon: 'copyright',
            shortcutTab: 'website-contact'
          }
        ]
      }
    ];
  }

  /* ========================================================================== */
  /* Subtab: Sections & Tabs Visibility (Master Toggle Center)                  */
  /* ========================================================================== */
  static renderSectionsTab(container) {
    if (!this._config.sections) {
      this._config.sections = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG.sections || {}));
    }

    const groups = this.getSectionDefinitions();
    const allItems = groups.flatMap(g => g.items);
    const activeCount = allItems.filter(it => this._config.sections[it.key] !== false).length;
    const hiddenCount = allItems.length - activeCount;

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Header Banner & Stats -->
        <div class="card" style="margin-bottom: 24px; padding: 22px 24px; border: 1.5px solid #F7E8B5; background: linear-gradient(180deg, #FDF8E8 0%, #ffffff 100%); border-radius: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 18px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: #ecfdf5; border: 1.5px solid #a7f3d0; display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;">
                <i data-lucide="sliders" style="width: 24px; height: 24px;"></i>
              </div>
              <div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 4px;">
                  Website Sections, Tabs &amp; Areas Manager
                </h3>
                <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
                  Turn ON or OFF any navigation tab, page section, CTA banner, button or footer area across the public website in real-time.
                </p>
              </div>
            </div>

            <!-- Quick Batch Controls -->
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-sec-enable-all" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                <i data-lucide="check-check" style="width: 15px; height: 15px; color: #BF9A33;"></i>
                <span>Turn All ON</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-sec-reset-defaults" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
                <span>Reset Recommended</span>
              </button>
            </div>
          </div>

          <!-- Statistics Badges & Search Filter Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span class="badge" style="font-size: 0.80rem; font-weight: 800; background: #ffffff; border: 1.5px solid #cbd5e1; color: #334155; padding: 6px 12px; border-radius: 999px;">
                Total Areas: <strong style="color: #0f172a;">${allItems.length}</strong>
              </span>
              <span class="badge" style="font-size: 0.80rem; font-weight: 800; background: #FCF4D9; border: 1.5px solid #F2D88C; color: #8C6E1E; padding: 6px 12px; border-radius: 999px;">
                ● Visible (Active): <strong id="sec-active-count">${activeCount}</strong>
              </span>
              <span class="badge" style="font-size: 0.80rem; font-weight: 800; background: #fee2e2; border: 1.5px solid #fca5a5; color: #b91c1c; padding: 6px 12px; border-radius: 999px;">
                ○ Hidden (Disabled): <strong id="sec-hidden-count">${hiddenCount}</strong>
              </span>
            </div>

            <!-- Instant Search Input -->
            <div style="position: relative; min-width: 260px; flex: 1; max-width: 380px;">
              <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none;"></i>
              <input type="text" id="sec-search-input" class="form-input" placeholder="Search areas, tabs, buttons..." style="padding-left: 36px; height: 38px; border-radius: 999px; font-size: 0.85rem;">
            </div>
          </div>
        </div>

        <!-- Groups and Cards -->
        <div id="sec-groups-container" style="display: flex; flex-direction: column; gap: 28px;">
          ${groups.map(group => `
            <div class="card sec-group-box" data-group-id="${group.group}" style="padding: 22px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 34px; height: 34px; border-radius: 9px; background: #FDF8E8; color: #BF9A33; display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="${group.groupIcon}" style="width: 18px; height: 18px;"></i>
                  </div>
                  <div>
                    <h4 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0;">${esc(group.groupLabel)}</h4>
                    <p style="font-size: 0.78rem; color: #64748b; margin: 2px 0 0;">${esc(group.groupDesc)}</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button type="button" class="btn btn-secondary btn-sm btn-sec-group-all-on" data-group="${group.group}" style="padding: 3px 10px; font-size: 0.74rem; font-weight: 700;">All ON</button>
                  <button type="button" class="btn btn-secondary btn-sm btn-sec-group-all-off" data-group="${group.group}" style="padding: 3px 10px; font-size: 0.74rem; font-weight: 700;">All OFF</button>
                </div>
              </div>

              <!-- Grid of Section Cards in this Group -->
              <div class="sec-items-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;">
                ${group.items.map(item => {
                  const isChecked = this._config.sections[item.key] !== false;
                  return `
                    <div class="tms-section-toggle-card" data-key="${item.key}" data-title="${esc(item.label.toLowerCase())} ${esc(item.desc.toLowerCase())} ${esc(item.target.toLowerCase())}" style="border: 1.5px solid ${isChecked ? '#F7E8B5' : '#e2e8f0'}; background: ${isChecked ? '#ffffff' : '#f8fafc'}; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                      <div>
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="sec-item-icon-box" style="width: 36px; height: 36px; border-radius: 10px; background: ${isChecked ? '#ecfdf5' : '#e2e8f0'}; color: ${isChecked ? '#059669' : '#64748b'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                              <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
                            </div>
                            <div>
                              <div style="font-weight: 800; font-size: 0.90rem; color: #0f172a; line-height: 1.25;">${esc(item.label)}</div>
                              <span class="badge" style="font-size: 0.68rem; font-family: monospace; background: ${isChecked ? '#FCF4D9' : '#e2e8f0'}; color: ${isChecked ? '#8C6E1E' : '#64748b'}; padding: 1px 6px; border-radius: 6px; margin-top: 3px; display: inline-block;">${esc(item.target)}</span>
                            </div>
                          </div>

                          <!-- The Toggle Switch -->
                          <label class="switch" style="cursor: pointer; flex-shrink: 0; margin: 0;">
                            <input type="checkbox" class="tms-section-checkbox" data-key="${item.key}" ${isChecked ? 'checked' : ''}>
                            <span class="slider round"></span>
                          </label>
                        </div>

                        <p style="font-size: 0.80rem; color: #64748b; margin: 0; line-height: 1.45;">${esc(item.desc)}</p>
                      </div>

                      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid ${isChecked ? '#FDF8E8' : '#e2e8f0'}; padding-top: 10px; margin-top: 4px;">
                        <span class="sec-status-text" style="font-size: 0.72rem; font-weight: 800; color: ${isChecked ? '#8C6E1E' : '#94a3b8'};">
                          ${isChecked ? '● VISIBLE' : '○ HIDDEN'}
                        </span>

                        ${item.shortcutTab ? `
                          <button type="button" class="btn btn-secondary btn-sm btn-sec-shortcut" data-subtab="${item.shortcutTab}" style="padding: 3px 9px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px;">
                            <span>Edit Content</span>
                            <i data-lucide="chevron-right" style="width: 11px; height: 11px;"></i>
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindSectionsEvents(container, groups);
    UIComponents.refreshIcons();
  }

  static bindSectionsEvents(container, groups) {
    const allItems = groups.flatMap(g => g.items);

    const updateStats = () => {
      const active = allItems.filter(it => this._config.sections[it.key] !== false).length;
      const hidden = allItems.length - active;
      const actEl = container.querySelector('#sec-active-count');
      const hidEl = container.querySelector('#sec-hidden-count');
      if (actEl) actEl.innerText = active;
      if (hidEl) hidEl.innerText = hidden;
    };

    const applyCardStyles = (card, isChecked) => {
      card.style.borderColor = isChecked ? '#F7E8B5' : '#e2e8f0';
      card.style.background = isChecked ? '#ffffff' : '#f8fafc';
      const iconBox = card.querySelector('.sec-item-icon-box');
      if (iconBox) {
        iconBox.style.background = isChecked ? '#ecfdf5' : '#e2e8f0';
        iconBox.style.color = isChecked ? '#059669' : '#64748b';
      }
      const stText = card.querySelector('.sec-status-text');
      if (stText) {
        stText.innerText = isChecked ? '● VISIBLE' : '○ HIDDEN';
        stText.style.color = isChecked ? '#8C6E1E' : '#94a3b8';
      }
    };

    // Checkbox change handlers
    container.querySelectorAll('.tms-section-checkbox').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const key = e.target.dataset.key;
        const val = e.target.checked;
        const card = e.target.closest('.tms-section-toggle-card');

        this._config.sections[key] = val;

        // If hostel is toggled, synchronize hostel.enabled
        if (key === 'hostel') {
          if (!this._config.hostel) this._config.hostel = {};
          this._config.hostel.enabled = val;
          window.dispatchEvent(new CustomEvent('tms_hostel_toggled', { detail: { enabled: val } }));
        }
        if (key === 'navHostel') {
          if (!this._config.hostel) this._config.hostel = {};
          this._config.hostel.showNavButton = val;
        }

        if (card) applyCardStyles(card, val);
        updateStats();

        await websiteService.saveConfig(this._config);
        const itemDef = allItems.find(it => it.key === key);
        const name = itemDef ? itemDef.label : key;
        UIComponents.showToast(`"${name}" is now ${val ? 'VISIBLE' : 'HIDDEN'} on the website.`, val ? 'success' : 'info');
      });
    });

    // Search filter input
    const searchInput = container.querySelector('#sec-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim().toLowerCase();
        container.querySelectorAll('.sec-group-box').forEach(groupBox => {
          let visibleCardsInGroup = 0;
          groupBox.querySelectorAll('.tms-section-toggle-card').forEach(card => {
            const title = card.dataset.title || '';
            const match = !q || title.includes(q);
            card.style.display = match ? 'flex' : 'none';
            if (match) visibleCardsInGroup++;
          });
          groupBox.style.display = visibleCardsInGroup > 0 ? 'block' : 'none';
        });
      });
    }

    // Turn All ON
    const enableAllBtn = container.querySelector('#btn-sec-enable-all');
    if (enableAllBtn) {
      enableAllBtn.addEventListener('click', async () => {
        allItems.forEach(it => {
          this._config.sections[it.key] = true;
        });
        if (this._config.hostel) {
          this._config.hostel.enabled = true;
          this._config.hostel.showNavButton = true;
          window.dispatchEvent(new CustomEvent('tms_hostel_toggled', { detail: { enabled: true } }));
        }
        await websiteService.saveConfig(this._config);
        UIComponents.showToast('All website sections and tabs are now turned ON!', 'success');
        this.renderSectionsTab(container);
      });
    }

    // Reset Defaults
    const resetDefBtn = container.querySelector('#btn-sec-reset-defaults');
    if (resetDefBtn) {
      resetDefBtn.addEventListener('click', async () => {
        this._config.sections = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG.sections || {}));
        if (this._config.hostel) {
          this._config.hostel.enabled = false;
          this._config.hostel.showNavButton = false;
          window.dispatchEvent(new CustomEvent('tms_hostel_toggled', { detail: { enabled: false } }));
        }
        await websiteService.saveConfig(this._config);
        UIComponents.showToast('Section visibility reset to recommended defaults.', 'info');
        this.renderSectionsTab(container);
      });
    }

    // Group-level All ON / All OFF
    container.querySelectorAll('.btn-sec-group-all-on').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const grpId = e.currentTarget.dataset.group;
        const grp = groups.find(g => g.group === grpId);
        if (grp) {
          grp.items.forEach(it => {
            this._config.sections[it.key] = true;
            if (it.key === 'hostel' && this._config.hostel) this._config.hostel.enabled = true;
            if (it.key === 'navHostel' && this._config.hostel) this._config.hostel.showNavButton = true;
          });
          await websiteService.saveConfig(this._config);
          UIComponents.showToast(`All "${grp.groupLabel}" turned ON!`, 'success');
          this.renderSectionsTab(container);
        }
      });
    });

    container.querySelectorAll('.btn-sec-group-all-off').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const grpId = e.currentTarget.dataset.group;
        const grp = groups.find(g => g.group === grpId);
        if (grp) {
          grp.items.forEach(it => {
            this._config.sections[it.key] = false;
            if (it.key === 'hostel' && this._config.hostel) this._config.hostel.enabled = false;
            if (it.key === 'navHostel' && this._config.hostel) this._config.hostel.showNavButton = false;
          });
          await websiteService.saveConfig(this._config);
          UIComponents.showToast(`All "${grp.groupLabel}" turned OFF!`, 'info');
          this.renderSectionsTab(container);
        }
      });
    });

    // Shortcut button clicks
    container.querySelectorAll('.btn-sec-shortcut').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subtab = e.currentTarget.dataset.subtab;
        if (subtab) {
          const { AdminModule } = await import('./admin-module.js');
          AdminModule.renderTab(subtab);
        }
      });
    });
  }

  /* Helper to render instant visibility toggle banner at the top of specific section tabs */
  static renderSectionVisibilityBanner(container, sectionKey, sectionTitle) {
    if (!this._config.sections) {
      this._config.sections = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG.sections || {}));
    }
    const isLive = this._config.sections[sectionKey] !== false;

    const banner = document.createElement('div');
    banner.className = 'card tms-sec-banner-card';
    banner.style.cssText = `margin-bottom: 22px; border: 1.5px solid ${isLive ? '#F7E8B5' : '#e2e8f0'}; background: ${isLive ? 'linear-gradient(180deg, #FDF8E8 0%, #ffffff 100%)' : '#ffffff'}; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;`;
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:38px; height:38px; border-radius:10px; background:${isLive ? '#ecfdf5' : '#f1f5f9'}; color:${isLive ? '#059669' : '#64748b'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="eye" style="width:20px; height:20px;"></i>
        </div>
        <div>
          <div style="font-weight:800; font-size:0.95rem; color:#0f172a;">${esc(sectionTitle)} Visibility</div>
          <div style="font-size:0.76rem; color:#64748b;">Controls whether this entire section is displayed on the public institutional website.</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span class="badge" style="font-size:0.75rem; font-weight:800; background:${isLive ? '#FCF4D9' : '#f1f5f9'}; color:${isLive ? '#8C6E1E' : '#64748b'}; padding:5px 12px; border-radius:999px;">
          ${isLive ? '● Currently Visible on Website' : '○ Currently Hidden from Public'}
        </span>
        <label class="switch" style="cursor:pointer; margin:0;">
          <input type="checkbox" id="toggle-sec-banner-${sectionKey}" ${isLive ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>
    `;
    container.prepend(banner);

    const chk = banner.querySelector(`#toggle-sec-banner-${sectionKey}`);
    if (chk) {
      chk.addEventListener('change', async (e) => {
        const val = e.target.checked;
        this._config.sections[sectionKey] = val;
        if (sectionKey === 'hostel') {
          if (!this._config.hostel) this._config.hostel = {};
          this._config.hostel.enabled = val;
        }
        await websiteService.saveConfig(this._config);
        UIComponents.showToast(`${sectionTitle} is now ${val ? 'VISIBLE' : 'HIDDEN'} on the website.`, val ? 'success' : 'info');
        banner.remove();
        this.renderSectionVisibilityBanner(container, sectionKey, sectionTitle);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 1: Identity & Brand Theme                                          */
  /* ========================================================================== */
  static renderGeneralTab(container) {
    const meta = this._config.meta || {};
    const theme = this._config.theme || {};
    const logoUrl = this._config.theme?.customLogoUrl || brandingService.getLogoUrl() || './tps-logo.png';

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
        <!-- Left: Institution Identity -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="landmark" style="width:18px; height:18px; color:#BF9A33;"></i>
            <span>Institution Identity &amp; Accreditation</span>
          </h4>

          <div class="form-group">
            <label class="form-label">Institution Official Name *</label>
            <input type="text" id="meta-name" class="form-input" value="${esc(meta.name || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Trust / Operating Body</label>
            <input type="text" id="meta-runby" class="form-input" value="${esc(meta.runBy || '')}">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="form-group">
              <label class="form-label">Registration No.</label>
              <input type="text" id="meta-regno" class="form-input" value="${esc(meta.regNo || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Founded Year</label>
              <input type="text" id="meta-year" class="form-input" value="${esc(meta.foundedYear || '')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Affiliation / Board Recognition</label>
            <textarea id="meta-affiliation" class="form-input" rows="2">${esc(meta.affiliation || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Header Login Button Label</label>
            <input type="text" id="meta-loginbtn" class="form-input" value="${esc(meta.loginButtonText || 'Login')}">
          </div>
        </div>

        <!-- Right: Logo & Theme Palette -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="palette" style="width:18px; height:18px; color:#BF9A33;"></i>
            <span>Logo Color Theme &amp; Emblem</span>
          </h4>

          <div style="display:flex; align-items:center; gap:20px; padding:16px; background:var(--bg-subtle); border-radius:12px; margin-bottom:20px; border:1px solid var(--border-color);">
            <div style="width:70px; height:70px; border-radius:12px; background:#fff; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
              <img src="${esc(logoUrl)}" alt="Logo" id="cms-logo-preview" style="max-width:58px; max-height:58px; object-fit:contain;">
            </div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">Active Institution Logo</div>
              <p style="font-size:0.75rem; color:#64748b; margin:2px 0 8px;">Upload or paste an image URL. Automatically applied to the website navbar, footer and portals.</p>
              <input type="text" id="theme-logourl" class="form-input" placeholder="https://.../logo.png" value="${esc(theme.customLogoUrl || '')}" style="font-size:0.8rem;">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label">Primary Brand Color (Gold)</label>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="color" id="theme-primary" value="${esc(theme.primaryColor || '#BF9A33')}" style="width:40px; height:38px; padding:2px; border:1px solid var(--border-color); border-radius:8px; cursor:pointer;">
                <input type="text" id="theme-primary-txt" class="form-input" value="${esc(theme.primaryColor || '#BF9A33')}" style="flex:1;">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Accent Color (Amber / Gold)</label>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="color" id="theme-accent" value="${esc(theme.accentColor || '#f59e0b')}" style="width:40px; height:38px; padding:2px; border:1px solid var(--border-color); border-radius:8px; cursor:pointer;">
                <input type="text" id="theme-accent-txt" class="form-input" value="${esc(theme.accentColor || '#f59e0b')}" style="flex:1;">
              </div>
            </div>
          </div>

          <div style="margin-top:14px; padding:14px; background:#FDF8E8; border:1px solid #F7E8B5; border-radius:10px; font-size:0.82rem; color:#8C6E1E;">
            <div style="font-weight:700; margin-bottom:4px;">✨ Color Theme Inheritance</div>
            Buttons, glows, badges, navigation highlights, and card accents immediately adapt to this Gold/amber palette.
          </div>
        </div>
      </div>
    `;

    // Bind inputs to config object
    const bindVal = (id, obj, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', (e) => { obj[key] = e.target.value; });
    };

    bindVal('meta-name', this._config.meta, 'name');
    bindVal('meta-runby', this._config.meta, 'runBy');
    bindVal('meta-regno', this._config.meta, 'regNo');
    bindVal('meta-year', this._config.meta, 'foundedYear');
    bindVal('meta-affiliation', this._config.meta, 'affiliation');
    bindVal('meta-loginbtn', this._config.meta, 'loginButtonText');

    const primPick = document.getElementById('theme-primary');
    const primTxt = document.getElementById('theme-primary-txt');
    if (primPick && primTxt) {
      primPick.addEventListener('input', (e) => {
        primTxt.value = e.target.value;
        this._config.theme.primaryColor = e.target.value;
      });
      primTxt.addEventListener('input', (e) => {
        primPick.value = e.target.value;
        this._config.theme.primaryColor = e.target.value;
      });
    }

    const accPick = document.getElementById('theme-accent');
    const accTxt = document.getElementById('theme-accent-txt');
    if (accPick && accTxt) {
      accPick.addEventListener('input', (e) => {
        accTxt.value = e.target.value;
        this._config.theme.accentColor = e.target.value;
      });
      accTxt.addEventListener('input', (e) => {
        accPick.value = e.target.value;
        this._config.theme.accentColor = e.target.value;
      });
    }

    const logoUrlInp = document.getElementById('theme-logourl');
    const logoPrev = document.getElementById('cms-logo-preview');
    if (logoUrlInp && logoPrev) {
      logoUrlInp.addEventListener('input', (e) => {
        this._config.theme.customLogoUrl = e.target.value;
        logoPrev.src = e.target.value || './tps-logo.png';
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 2: Hero & Headlines                                                 */
  /* ========================================================================== */
  static renderHeroTab(container) {
    const hero = this._config.hero || {};
    const stats = this._config.stats || [];

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:24px;">
        <!-- Left: Hero Texts & CTA -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Hero Headline &amp; Call-to-Actions
          </h4>

          <div class="form-group">
            <label class="form-label">Hero Badge Pill Text</label>
            <input type="text" id="hero-badge" class="form-input" value="${esc(hero.badge || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Hero Main Headline *</label>
            <input type="text" id="hero-headline" class="form-input" value="${esc(hero.headline || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Hero Subheadline / Descriptive Lead</label>
            <textarea id="hero-subheadline" class="form-input" rows="3">${esc(hero.subheadline || '')}</textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="form-group">
              <label class="form-label">Primary CTA Label</label>
              <input type="text" id="hero-cta1-txt" class="form-input" value="${esc(hero.primaryCtaText || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Primary CTA URL</label>
              <input type="text" id="hero-cta1-url" class="form-input" value="${esc(hero.primaryCtaUrl || '')}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="form-group">
              <label class="form-label">Secondary CTA Label</label>
              <input type="text" id="hero-cta2-txt" class="form-input" value="${esc(hero.secondaryCtaText || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Secondary CTA URL</label>
              <input type="text" id="hero-cta2-url" class="form-input" value="${esc(hero.secondaryCtaUrl || '')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Hero Showcase Image URL</label>
            <input type="text" id="hero-imgurl" class="form-input" value="${esc(hero.heroImageUrl || '')}">
          </div>
        </div>

        <!-- Right: Hero Floating Badges & Stats Ribbon -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Hero Floating Badges (3 Items)
          </h4>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 1 Value</label>
              <input type="text" id="hero-s1-val" class="form-input" value="${esc(hero.stat1Number || '')}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 1 Label</label>
              <input type="text" id="hero-s1-lbl" class="form-input" value="${esc(hero.stat1Label || '')}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 2 Value</label>
              <input type="text" id="hero-s2-val" class="form-input" value="${esc(hero.stat2Number || '')}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 2 Label</label>
              <input type="text" id="hero-s2-lbl" class="form-input" value="${esc(hero.stat2Label || '')}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 3 Value</label>
              <input type="text" id="hero-s3-val" class="form-input" value="${esc(hero.stat3Number || '')}">
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Badge 3 Label</label>
              <input type="text" id="hero-s3-lbl" class="form-input" value="${esc(hero.stat3Label || '')}">
            </div>
          </div>

          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:16px;">
            Key Metrics Bar (4 Stats)
          </h4>

          <div id="stats-ribbon-editor">
            ${stats.map((s, idx) => `
              <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                <input type="text" class="form-input stat-ribbon-val" data-idx="${idx}" value="${esc(s.number)}" placeholder="Number" style="width:110px;">
                <input type="text" class="form-input stat-ribbon-lbl" data-idx="${idx}" value="${esc(s.label)}" placeholder="Label" style="flex:1;">
                <input type="text" class="form-input stat-ribbon-ico" data-idx="${idx}" value="${esc(s.icon || 'award')}" placeholder="Lucide icon" style="width:100px;">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const bindVal = (id, obj, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', (e) => { obj[key] = e.target.value; });
    };

    this.renderSectionVisibilityBanner(container, 'hero', 'Hero Main Showcase Section');
    bindVal('hero-badge', this._config.hero, 'badge');
    bindVal('hero-headline', this._config.hero, 'headline');
    bindVal('hero-subheadline', this._config.hero, 'subheadline');
    bindVal('hero-cta1-txt', this._config.hero, 'primaryCtaText');
    bindVal('hero-cta1-url', this._config.hero, 'primaryCtaUrl');
    bindVal('hero-cta2-txt', this._config.hero, 'secondaryCtaText');
    bindVal('hero-cta2-url', this._config.hero, 'secondaryCtaUrl');
    bindVal('hero-imgurl', this._config.hero, 'heroImageUrl');

    bindVal('hero-s1-val', this._config.hero, 'stat1Number');
    bindVal('hero-s1-lbl', this._config.hero, 'stat1Label');
    bindVal('hero-s2-val', this._config.hero, 'stat2Number');
    bindVal('hero-s2-lbl', this._config.hero, 'stat2Label');
    bindVal('hero-s3-val', this._config.hero, 'stat3Number');
    bindVal('hero-s3-lbl', this._config.hero, 'stat3Label');

    // Ribbon stats
    container.querySelectorAll('.stat-ribbon-val').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (this._config.stats[idx]) this._config.stats[idx].number = e.target.value;
      });
    });
    container.querySelectorAll('.stat-ribbon-lbl').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (this._config.stats[idx]) this._config.stats[idx].label = e.target.value;
      });
    });
    container.querySelectorAll('.stat-ribbon-ico').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (this._config.stats[idx]) this._config.stats[idx].icon = e.target.value;
      });
    });
  }

  /* ========================================================================== */
  /* Subtab 3: About & Leadership                                               */
  /* ========================================================================== */
  static renderAboutTab(container) {
    const about = this._config.about || {};
    const values = about.coreValues || [];

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
        <!-- Left: Story & Vision -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Institutional Heritage &amp; Vision
          </h4>

          <div class="form-group">
            <label class="form-label">Section Tag / Kicker</label>
            <input type="text" id="about-tag" class="form-input" value="${esc(about.sectionTag || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Section Headline</label>
            <input type="text" id="about-title" class="form-input" value="${esc(about.title || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Institutional History / Narrative</label>
            <textarea id="about-narrative" class="form-input" rows="4">${esc(about.narrative || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Vision Statement</label>
            <textarea id="about-vision" class="form-input" rows="2">${esc(about.vision || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Mission Statement</label>
            <textarea id="about-mission" class="form-input" rows="2">${esc(about.mission || '')}</textarea>
          </div>
        </div>

        <!-- Right: Principal's Desk & Core Values -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Principal / Secretary Desk
          </h4>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="form-group">
              <label class="form-label">Leader Name</label>
              <input type="text" id="about-pname" class="form-input" value="${esc(about.principalName || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Leader Title</label>
              <input type="text" id="about-ptitle" class="form-input" value="${esc(about.principalTitle || '')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Portrait Photo URL</label>
            <input type="text" id="about-pphoto" class="form-input" value="${esc(about.principalPhoto || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Principal / Academic Message</label>
            <textarea id="about-pmsg" class="form-input" rows="3">${esc(about.principalMessage || '')}</textarea>
          </div>

          <h4 style="font-family:var(--font-display); font-size:1rem; font-weight:700; color:var(--text-main); margin-top:20px; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:14px;">
            Core Pillars (4 Values)
          </h4>

          <div id="about-values-editor">
            ${values.map((v, i) => `
              <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" class="form-input val-title" data-idx="${i}" value="${esc(v.title)}" placeholder="Value Title" style="width:160px; font-weight:700;">
                <input type="text" class="form-input val-desc" data-idx="${i}" value="${esc(v.desc)}" placeholder="Description" style="flex:1;">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'about', 'About Our Institution Section');

    const bindVal = (id, obj, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', (e) => { obj[key] = e.target.value; });
    };

    bindVal('about-tag', this._config.about, 'sectionTag');
    bindVal('about-title', this._config.about, 'title');
    bindVal('about-narrative', this._config.about, 'narrative');
    bindVal('about-vision', this._config.about, 'vision');
    bindVal('about-mission', this._config.about, 'mission');

    bindVal('about-pname', this._config.about, 'principalName');
    bindVal('about-ptitle', this._config.about, 'principalTitle');
    bindVal('about-pphoto', this._config.about, 'principalPhoto');
    bindVal('about-pmsg', this._config.about, 'principalMessage');

    container.querySelectorAll('.val-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (this._config.about.coreValues[idx]) this._config.about.coreValues[idx].title = e.target.value;
      });
    });
    container.querySelectorAll('.val-desc').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (this._config.about.coreValues[idx]) this._config.about.coreValues[idx].desc = e.target.value;
      });
    });
  }

  /* ========================================================================== */
  /* Subtab 4: Academic Programs (CRUD)                                         */
  /* ========================================================================== */
  static renderAcademicsTab(container) {
    const programs = this._config.programs || [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
            Academic Wings &amp; Curricula
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:2px 0 0;">Add, update or reorder the educational wings displayed on the homepage.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-program">
          <i data-lucide="plus"></i> Add New Program
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;" id="programs-editor-list">
        ${programs.map((p, idx) => `
          <div class="card" style="margin:0; border:1px solid var(--border-color); padding:18px;" data-idx="${idx}">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="badge badge-success" style="font-weight:700;">#${idx + 1}</span>
                <span style="font-weight:800; font-size:1rem; color:#0f172a;">${esc(p.title)}</span>
              </div>
              <button class="btn btn-secondary btn-sm btn-del-prog" data-idx="${idx}" style="color:#ef4444;" title="Delete Program">
                <i data-lucide="trash-2"></i> Delete
              </button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 120px; gap:12px; margin-bottom:10px;">
              <div>
                <label class="form-label" style="font-size:0.75rem;">Program Title</label>
                <input type="text" class="form-input prog-title" data-idx="${idx}" value="${esc(p.title)}">
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">Grades / Subtitle</label>
                <input type="text" class="form-input prog-sub" data-idx="${idx}" value="${esc(p.subtitle)}">
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">Lucide Icon</label>
                <input type="text" class="form-input prog-icon" data-idx="${idx}" value="${esc(p.icon || 'book-open')}">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:0.75rem;">Program Description</label>
              <textarea class="form-input prog-desc" data-idx="${idx}" rows="2">${esc(p.description)}</textarea>
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:0.75rem;">Key Highlights (Comma-separated)</label>
              <input type="text" class="form-input prog-highlights" data-idx="${idx}" value="${esc((p.highlights || []).join(', '))}">
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'academics', 'Academic Programs & Wings Section');

    // Event listeners
    container.querySelectorAll('.prog-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.programs[i]) this._config.programs[i].title = e.target.value;
      });
    });
    container.querySelectorAll('.prog-sub').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.programs[i]) this._config.programs[i].subtitle = e.target.value;
      });
    });
    container.querySelectorAll('.prog-icon').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.programs[i]) this._config.programs[i].icon = e.target.value;
      });
    });
    container.querySelectorAll('.prog-desc').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.programs[i]) this._config.programs[i].description = e.target.value;
      });
    });
    container.querySelectorAll('.prog-highlights').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.programs[i]) {
          this._config.programs[i].highlights = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        }
      });
    });

    container.querySelectorAll('.btn-del-prog').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        this._config.programs.splice(i, 1);
        this.renderAcademicsTab(container);
        UIComponents.refreshIcons();
      });
    });

    const addBtn = document.getElementById('btn-add-program');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._config.programs.push({
          id: 'prog-' + Date.now(),
          title: 'New Academic Wing',
          subtitle: 'Grades X – Y',
          icon: 'graduation-cap',
          description: 'Description of the academic curriculum and developmental focus.',
          highlights: ['Dedicated mentoring', 'Advanced learning labs', 'Holistic evaluation']
        });
        this.renderAcademicsTab(container);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 5: Campus Facilities (CRUD)                                         */
  /* ========================================================================== */
  static renderFacilitiesTab(container) {
    const facilities = this._config.facilities || [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
            Campus Infrastructure &amp; Facilities
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:2px 0 0;">Manage science labs, robotics, transport, security, sports and other facilities.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-facility">
          <i data-lucide="plus"></i> Add Facility
        </button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;" id="facilities-editor-list">
        ${facilities.map((f, idx) => `
          <div class="card" style="margin:0; border:1px solid var(--border-color); padding:18px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge badge-info">${esc(f.badge || 'Campus')}</span>
                <span style="font-weight:700; color:#0f172a;">${esc(f.title)}</span>
              </div>
              <button class="icon-btn btn-del-fac" data-idx="${idx}" style="color:#ef4444;" title="Delete">
                <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
              </button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 100px 90px; gap:10px; margin-bottom:8px;">
              <input type="text" class="form-input fac-title" data-idx="${idx}" value="${esc(f.title)}" placeholder="Title">
              <input type="text" class="form-input fac-badge" data-idx="${idx}" value="${esc(f.badge)}" placeholder="Badge">
              <input type="text" class="form-input fac-icon" data-idx="${idx}" value="${esc(f.icon)}" placeholder="Icon">
            </div>

            <textarea class="form-input fac-desc" data-idx="${idx}" rows="2" placeholder="Facility description">${esc(f.desc)}</textarea>
          </div>
        `).join('')}
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'facilities', 'Campus Life & Facilities Section');

    container.querySelectorAll('.fac-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.facilities[i]) this._config.facilities[i].title = e.target.value;
      });
    });
    container.querySelectorAll('.fac-badge').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.facilities[i]) this._config.facilities[i].badge = e.target.value;
      });
    });
    container.querySelectorAll('.fac-icon').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.facilities[i]) this._config.facilities[i].icon = e.target.value;
      });
    });
    container.querySelectorAll('.fac-desc').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.facilities[i]) this._config.facilities[i].desc = e.target.value;
      });
    });

    container.querySelectorAll('.btn-del-fac').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        this._config.facilities.splice(i, 1);
        this.renderFacilitiesTab(container);
        UIComponents.refreshIcons();
      });
    });

    const addBtn = document.getElementById('btn-add-facility');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._config.facilities.push({
          id: 'fac-' + Date.now(),
          title: 'New Campus Facility',
          badge: 'Amenity',
          icon: 'building',
          desc: 'High standard campus infrastructure and safety facility.'
        });
        this.renderFacilitiesTab(container);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 5b: Hostel Managing Setup & Website Button                          */
  /* ========================================================================== */
  static renderHostelTab(container) {
    if (!this._config.hostel) {
      this._config.hostel = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG.hostel || {}));
    }
    const h = this._config.hostel;
    const wings = h.wings || [];
    const features = h.features || [];
    const routine = h.dailyRoutine || [];
    const menu = h.messMenu || [];
    const fees = h.fees || {};
    const wardens = h.wardens || {};
    const rules = h.rules || [];
    const isLive = h.enabled !== false && h.showNavButton !== false;

    // Load allocations from localStorage if any
    let allocations = [];
    try {
      const stored = localStorage.getItem('tms_hostel_allocations');
      if (stored) allocations = JSON.parse(stored);
      if (!Array.isArray(allocations) || allocations.length === 0) {
        allocations = [
          { id: 'ha-1', studentName: 'Rehan Ahmed', rollNo: 'TMS-2601', classGrade: 'Grade 9 - A', wing: 'Hazrat Bilal Boys Wing', roomNo: 'Room 102', bedNo: 'Bed B-1', guardianPhone: '+91 9832101122', status: 'Active' },
          { id: 'ha-2', studentName: 'Tariq Mahmood', rollNo: 'TMS-2608', classGrade: 'Grade 10 - B', wing: 'Hazrat Bilal Boys Wing', roomNo: 'Room 104', bedNo: 'Bed B-2', guardianPhone: '+91 9832145566', status: 'Active' },
          { id: 'ha-3', studentName: 'Fatima Siddiqua', rollNo: 'TMS-2615', classGrade: 'Grade 8 - A', wing: 'Fatima-tuz-Zahra Girls Wing', roomNo: 'Room 201', bedNo: 'Bed G-1', guardianPhone: '+91 9732112233', status: 'Active' },
          { id: 'ha-4', studentName: 'Zainab Parveen', rollNo: 'TMS-2622', classGrade: 'Grade 11 - Science', wing: 'Fatima-tuz-Zahra Girls Wing', roomNo: 'Room 205', bedNo: 'Bed G-3', guardianPhone: '+91 9434098877', status: 'On Leave' }
        ];
        localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
      }
    } catch (e) { /* ignore */ }

    container.innerHTML = `
      <!-- TOP CONTROL & MASTER TOGGLE BANNER (Light Theme) -->
      <div class="card tms-hostel-banner-card" style="margin-bottom: 24px; border: 1.5px solid ${isLive ? '#F7E8B5' : '#e2e8f0'}; background: ${isLive ? 'linear-gradient(180deg, #FDF8E8 0%, #ffffff 100%)' : '#ffffff'}; padding: 22px 24px; border-radius: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 320px;">
            <div style="width: 48px; height: 48px; border-radius: 13px; background: ${isLive ? '#ecfdf5' : '#f8fafc'}; border: 1.5px solid ${isLive ? '#a7f3d0' : '#e2e8f0'}; display: flex; align-items: center; justify-content: center; color: ${isLive ? '#059669' : '#64748b'}; box-shadow: 0 2px 6px rgba(0,0,0,0.03); flex-shrink: 0;">
              <i data-lucide="home" style="width: 24px; height: 24px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;">
                <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0;">
                  Hostel Managing Setup &amp; Public Portal
                </h3>
                <span id="hostel-live-badge" class="badge" style="font-size: 0.78rem; padding: 4px 11px; font-weight: 700; border-radius: 9999px; ${isLive ? 'background:#FCF4D9; color:#8C6E1E; border:1px solid #F2D88C;' : 'background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;'}">
                  ${isLive ? '● Live: Hostel Button Active' : '○ Disabled: Hostel Button Hidden'}
                </span>
              </div>
              <p style="font-size: 0.84rem; color: #64748b; margin: 0; font-weight: 500; max-width: 650px;">
                If Admin turns this ON, the school website enables the <strong>"Hostel"</strong> button on the navbar and activates the <strong>#hostel</strong> showcase &amp; admission inquiry.
              </p>
            </div>
          </div>

          <!-- The Master Toggle Switch -->
          <div class="tms-hostel-switch-box" style="border: 1.5px solid ${isLive ? '#F2D88C' : '#e2e8f0'}; flex-shrink: 0;">
            <div style="text-align: right;">
              <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">Have a Hostel Button</div>
              <div style="font-size: 0.74rem; font-weight: 600; color: ${isLive ? '#8C6E1E' : '#64748b'};" id="hostel-switch-status">${isLive ? 'Turned ON (Visible on Website)' : 'Turned OFF (Hidden)'}</div>
            </div>
            <label class="switch" style="cursor:pointer;">
              <input type="checkbox" id="hostel-master-toggle" ${isLive ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <a href="/#hostel" target="_blank" class="tms-btn-cms-preview" style="padding: 7px 14px; font-size: 0.82rem; border-radius: 9px;">
              <i data-lucide="external-link" style="width:14px; height:14px; color:#059669;"></i>
              <span>Test #hostel</span>
            </a>
          </div>
        </div>
      </div>

      <!-- HOSTEL INTERNAL MANAGEMENT TABS WITH SCROLL CONTROLS -->
      <div class="tms-tab-scroll-wrapper" style="margin-bottom: 20px;">
        <button type="button" class="tms-tab-nav-btn tms-tab-nav-prev" aria-label="Scroll left" title="Scroll subtabs left">
          <i data-lucide="chevron-left"></i>
        </button>
        <div class="tms-subtab-rail" id="hostel-subtabs-rail">
          <button class="tms-tab-pill active hostel-sub-pill" data-target="hostel-sec-overview"><i data-lucide="sliders"></i> <span>Overview &amp; Capacity</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-wings"><i data-lucide="building"></i> <span>Dormitories &amp; Wings (${wings.length})</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-features"><i data-lucide="sparkles"></i> <span>Amenities &amp; Care (${features.length})</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-routine"><i data-lucide="clock"></i> <span>Daily Routine (${routine.length})</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-mess"><i data-lucide="utensils"></i> <span>Mess &amp; Weekly Menu</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-wardens"><i data-lucide="phone-call"></i> <span>Wardens &amp; Rules</span></button>
          <button class="tms-tab-pill hostel-sub-pill" data-target="hostel-sec-roster"><i data-lucide="users"></i> <span>Student Roster (${allocations.length})</span></button>
        </div>
        <button type="button" class="tms-tab-nav-btn tms-tab-nav-next" aria-label="Scroll right" title="Scroll subtabs right">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>

      <!-- SECTION 1: OVERVIEW & CAPACITY -->
      <div id="hostel-sec-overview" class="hostel-tab-pane">
        <div class="card" style="margin-bottom: 20px; border: 1px solid var(--border-color); padding: 22px;">
          <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0 0 16px;">
            Hostel Public Showcase Information
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Hostel Section Title</label>
              <input type="text" class="form-input" id="hostel-title-input" value="${esc(h.title || 'Student Hostel & Residential Dormitories')}">
            </div>
            <div class="form-group">
              <label class="form-label">Top Ribbon Badge</label>
              <input type="text" class="form-input" id="hostel-badge-input" value="${esc(h.badge || 'RESIDENTIAL CAMPUS & BOARDING')}">
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="form-label">Subtitle / Key Tagline</label>
              <input type="text" class="form-input" id="hostel-subtitle-input" value="${esc(h.subtitle || 'A secure, disciplined and nurturing home away from home with round-the-clock pastoral care, guided evening study, and nutritious dining.')}">
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="form-label">Comprehensive Overview Narrative</label>
              <textarea class="form-input" id="hostel-overview-input" rows="3">${esc(h.overview || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Eligible Students / Classes</label>
              <input type="text" class="form-input" id="hostel-eligibility-input" value="${esc(h.eligibility || 'Available for Boys & Girls (Grades 3 to 12)')}">
            </div>
            <div class="form-group">
              <label class="form-label">Navbar Button Text</label>
              <input type="text" class="form-input" id="hostel-navtext-input" value="${esc(h.navButtonText || 'Hostel')}">
            </div>
          </div>

          <h5 style="font-weight: 800; margin: 18px 0 12px; color: var(--text-main);">Bed Capacity &amp; Occupancy Counters</h5>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Total Bed Capacity</label>
              <input type="number" class="form-input font-mono" id="hostel-cap-total" value="${h.totalCapacity || 150}">
            </div>
            <div class="form-group">
              <label class="form-label">Currently Occupied Beds</label>
              <input type="number" class="form-input font-mono" id="hostel-cap-occupied" value="${h.occupiedBeds || 126}">
            </div>
            <div class="form-group">
              <label class="form-label">Available Vacant Beds</label>
              <input type="number" class="form-input font-mono" id="hostel-cap-available" value="${h.availableBeds || 24}">
            </div>
          </div>

          <h5 style="font-weight: 800; margin: 18px 0 12px; color: var(--text-main);">Hostel Fee Structure Master</h5>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div class="form-group">
              <label class="form-label">One-Time Admission Fee</label>
              <input type="text" class="form-input" id="hostel-fee-admission" value="${esc(fees.admissionFee || '₹ 5,000 (One-time Admission & Bedding Kit)')}">
            </div>
            <div class="form-group">
              <label class="form-label">Monthly Boarding &amp; Mess</label>
              <input type="text" class="form-input" id="hostel-fee-monthly" value="${esc(fees.monthlyBoarding || '₹ 4,500 / month (Lodging + 4 Meals Daily)')}">
            </div>
            <div class="form-group">
              <label class="form-label">Refundable Caution Deposit</label>
              <input type="text" class="form-input" id="hostel-fee-deposit" value="${esc(fees.securityDeposit || '₹ 3,000 (Refundable Caution Deposit)')}">
            </div>
          </div>

          <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="overview">
              <i data-lucide="save"></i> Save Overview &amp; Fees
            </button>
          </div>
        </div>
      </div>

      <!-- SECTION 2: DORMITORIES & WINGS (CRUD) -->
      <div id="hostel-sec-wings" class="hostel-tab-pane" style="display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
              Residential Dormitories &amp; Campus Blocks
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">Configure separate wings for boys, girls, junior scholars and residential supervisors.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-hostel-wing">
            <i data-lucide="plus"></i> Add Dormitory Wing
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;" id="hostel-wings-list">
          ${wings.map((w, idx) => `
            <div class="card" style="margin: 0; border: 1px solid var(--border-color); padding: 18px; border-radius: 12px; position: relative;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="badge ${w.gender === 'Girls' ? 'badge-warning' : 'badge-info'}" style="font-weight: 700;">
                    ${esc(w.gender || 'Wing')}
                  </span>
                  <strong style="font-size: 0.95rem; color: var(--text-main);">${esc(w.name || 'Dormitory Wing')}</strong>
                </div>
                <button class="btn-remove-wing" data-idx="${idx}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;" title="Delete Wing">
                  <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Wing Name</label>
                  <input type="text" class="form-input form-input-sm wing-input" data-idx="${idx}" data-field="name" value="${esc(w.name)}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Gender / Section</label>
                  <select class="form-input form-input-sm wing-input" data-idx="${idx}" data-field="gender">
                    <option value="Boys" ${w.gender === 'Boys' ? 'selected' : ''}>Boys Wing</option>
                    <option value="Girls" ${w.gender === 'Girls' ? 'selected' : ''}>Girls Wing</option>
                    <option value="Junior" ${w.gender === 'Junior' ? 'selected' : ''}>Junior Scholars</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Bed Capacity</label>
                  <input type="number" class="form-input form-input-sm font-mono wing-input" data-idx="${idx}" data-field="capacity" value="${w.capacity || 50}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Occupied Beds</label>
                  <input type="number" class="form-input form-input-sm font-mono wing-input" data-idx="${idx}" data-field="occupied" value="${w.occupied || 40}">
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 10px;">
                <label class="form-label" style="font-size: 0.75rem;">Room Layout Summary</label>
                <input type="text" class="form-input form-input-sm wing-input" data-idx="${idx}" data-field="rooms" value="${esc(w.rooms || '')}">
              </div>

              <div class="form-group" style="margin-bottom: 10px;">
                <label class="form-label" style="font-size: 0.75rem;">Resident Supervisor / Warden</label>
                <input type="text" class="form-input form-input-sm wing-input" data-idx="${idx}" data-field="supervisor" value="${esc(w.supervisor || '')}">
              </div>

              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Wing Description</label>
                <textarea class="form-input form-input-sm wing-input" data-idx="${idx}" data-field="description" rows="2">${esc(w.description || '')}</textarea>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="wings">
            <i data-lucide="save"></i> Save Dormitory Wings
          </button>
        </div>
      </div>

      <!-- SECTION 3: AMENITIES & FEATURES (CRUD) -->
      <div id="hostel-sec-features" class="hostel-tab-pane" style="display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
              Hostel Facilities, Care &amp; Amenities
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">Highlights displayed on the public website showcase card grid.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-hostel-feature">
            <i data-lucide="plus"></i> Add Amenity
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;" id="hostel-features-list">
          ${features.map((f, idx) => `
            <div class="card" style="margin: 0; border: 1px solid var(--border-color); padding: 16px; border-radius: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span class="badge badge-info" style="font-size: 0.72rem;">${esc(f.badge || 'Amenity')}</span>
                <button class="btn-remove-feature" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Delete">
                  <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" style="font-size: 0.75rem;">Title</label>
                <input type="text" class="form-input form-input-sm feature-input" data-idx="${idx}" data-field="title" value="${esc(f.title)}">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Lucide Icon</label>
                  <input type="text" class="form-input form-input-sm feature-input" data-idx="${idx}" data-field="icon" value="${esc(f.icon || 'sparkles')}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Tag / Badge</label>
                  <input type="text" class="form-input form-input-sm feature-input" data-idx="${idx}" data-field="badge" value="${esc(f.badge || '')}">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Description</label>
                <textarea class="form-input form-input-sm feature-input" data-idx="${idx}" data-field="desc" rows="2">${esc(f.desc || '')}</textarea>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="features">
            <i data-lucide="save"></i> Save Amenities
          </button>
        </div>
      </div>

      <!-- SECTION 4: DAILY ROUTINE (CRUD) -->
      <div id="hostel-sec-routine" class="hostel-tab-pane" style="display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
              Daily Life &amp; Supervised Routine Timetable
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">Disciplined daily schedule from Fajr prayer to night lights out.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-hostel-routine">
            <i data-lucide="plus"></i> Add Routine Slot
          </button>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 16px;">
          <table class="tms-table" style="margin: 0; font-size: 0.85rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="width: 220px;">Time Window</th>
                <th>Activity Description</th>
                <th style="width: 140px;">Icon</th>
                <th style="width: 60px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody id="hostel-routine-tbody">
              ${routine.map((r, idx) => `
                <tr>
                  <td>
                    <input type="text" class="form-input form-input-sm routine-input" data-idx="${idx}" data-field="time" value="${esc(r.time)}">
                  </td>
                  <td>
                    <input type="text" class="form-input form-input-sm routine-input" data-idx="${idx}" data-field="activity" value="${esc(r.activity)}">
                  </td>
                  <td>
                    <input type="text" class="form-input form-input-sm routine-input" data-idx="${idx}" data-field="icon" value="${esc(r.icon || 'clock')}">
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-remove-routine" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Delete">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="routine">
            <i data-lucide="save"></i> Save Routine
          </button>
        </div>
      </div>

      <!-- SECTION 5: MESS & WEEKLY MENU -->
      <div id="hostel-sec-mess" class="hostel-tab-pane" style="display: none;">
        <div style="margin-bottom: 16px;">
          <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
            Nutritious Dining &amp; Weekly Halal Mess Menu
          </h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">Wholesome, balanced dietary planner prepared fresh daily on campus.</p>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 16px;">
          <table class="tms-table" style="margin: 0; font-size: 0.84rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="width: 110px;">Day</th>
                <th>Breakfast &amp; Milk/Tea</th>
                <th>Lunch (Wholesome Main)</th>
                <th>Dinner (Evening Feast)</th>
              </tr>
            </thead>
            <tbody id="hostel-mess-tbody">
              ${menu.map((m, idx) => `
                <tr>
                  <td><strong style="color:var(--text-main);">${esc(m.day)}</strong></td>
                  <td>
                    <input type="text" class="form-input form-input-sm mess-input" data-idx="${idx}" data-field="breakfast" value="${esc(m.breakfast || '')}">
                  </td>
                  <td>
                    <input type="text" class="form-input form-input-sm mess-input" data-idx="${idx}" data-field="lunch" value="${esc(m.lunch || '')}">
                  </td>
                  <td>
                    <input type="text" class="form-input form-input-sm mess-input" data-idx="${idx}" data-field="dinner" value="${esc(m.dinner || '')}">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="mess">
            <i data-lucide="save"></i> Save Mess Menu
          </button>
        </div>
      </div>

      <!-- SECTION 6: WARDENS & RULES -->
      <div id="hostel-sec-wardens" class="hostel-tab-pane" style="display: none;">
        <div class="card" style="margin-bottom: 20px; border: 1px solid var(--border-color); padding: 22px;">
          <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0 0 16px;">
            Hostel Wardens &amp; Emergency Pastoral Contact
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Chief Superintendent / Warden</label>
              <input type="text" class="form-input" id="hostel-warden-name" value="${esc(wardens.chiefWardenName || 'Janab Maulana Hafizullah')}">
            </div>
            <div class="form-group">
              <label class="form-label">Designation / Role Title</label>
              <input type="text" class="form-input" id="hostel-warden-title" value="${esc(wardens.chiefWardenTitle || 'Senior Resident Superintendent')}">
            </div>
            <div class="form-group">
              <label class="form-label">Superintendent Direct Phone</label>
              <input type="text" class="form-input" id="hostel-warden-phone" value="${esc(wardens.phone || '+91 8653382851')}">
            </div>
            <div class="form-group">
              <label class="form-label">Alternate / Emergency Helpline</label>
              <input type="text" class="form-input" id="hostel-warden-alt" value="${esc(wardens.altPhone || '+91 8167782851')}">
            </div>
            <div class="form-group">
              <label class="form-label">Official Hostel Email</label>
              <input type="text" class="form-input" id="hostel-warden-email" value="${esc(wardens.email || 'hostel@thaibagarden.com')}">
            </div>
            <div class="form-group">
              <label class="form-label">Guardian Visiting Hours</label>
              <input type="text" class="form-input" id="hostel-warden-visiting" value="${esc(wardens.visitingHours || 'Sundays & Second Saturdays: 10:00 AM – 4:00 PM')}">
            </div>
          </div>

          <h5 style="font-weight: 800; margin: 20px 0 10px; color: var(--text-main);">Disciplinary Rules &amp; Parent Guidelines</h5>
          <div class="form-group">
            <textarea class="form-input" id="hostel-rules-textarea" rows="5" placeholder="Enter one rule per line...">${esc((rules || []).join('\n'))}</textarea>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Each line will be displayed as a distinct guideline card on the website.</span>
          </div>

          <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm btn-save-hostel-section" data-section="wardens">
              <i data-lucide="save"></i> Save Wardens &amp; Rules
            </button>
          </div>
        </div>
      </div>

      <!-- SECTION 7: STUDENT BED ALLOTMENT ROSTER (ERP) -->
      <div id="hostel-sec-roster" class="hostel-tab-pane" style="display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h4 style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
              Active Residential Student Roster &amp; Bed Allocations
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">Manage student bed assignments, wings, and leave records in real-time.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-hostel-allot-student">
            <i data-lucide="user-plus"></i> Allot Bed to Student
          </button>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 16px;">
          <table class="tms-table" style="margin: 0; font-size: 0.84rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Wing</th>
                <th>Room &amp; Bed</th>
                <th>Guardian Mobile</th>
                <th>Status</th>
                <th style="width: 80px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${allocations.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No student bed allotments recorded yet.</td></tr>
              ` : allocations.map((a, idx) => `
                <tr>
                  <td><strong>${esc(a.studentName)}</strong></td>
                  <td class="font-mono">${esc(a.rollNo)}</td>
                  <td>${esc(a.classGrade)}</td>
                  <td><span class="badge ${a.wing.includes('Boys') ? 'badge-info' : 'badge-warning'}">${esc(a.wing)}</span></td>
                  <td><strong>${esc(a.roomNo)}</strong> &bull; ${esc(a.bedNo)}</td>
                  <td>${esc(a.guardianPhone)}</td>
                  <td><span class="badge ${a.status === 'Active' ? 'badge-success' : 'badge-warning'}">${esc(a.status)}</span></td>
                  <td style="text-align: center;">
                    <button class="btn-remove-allocation" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Vacate Bed">
                      <i data-lucide="log-out" style="width:14px; height:14px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind sub-pill switching
    container.querySelectorAll('.hostel-sub-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.hostel-sub-pill').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.hostel-tab-pane').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        const target = btn.dataset.target;
        const pane = container.querySelector('#' + target);
        if (pane) pane.style.display = 'block';
        UIComponents.refreshIcons();
      });
    });

    // Master Toggle Switch Event
    const masterToggle = container.querySelector('#hostel-master-toggle');
    if (masterToggle) {
      masterToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        this._config.hostel.enabled = val;
        this._config.hostel.showNavButton = val;

        const badge = container.querySelector('#hostel-live-badge');
        const statusText = container.querySelector('#hostel-switch-status');
        const slider = container.querySelector('.slider.round');

        if (val) {
          if (badge) {
            badge.innerText = '● LIVE: Hostel Button Active';
            badge.style.background = '#FCF4D9';
            badge.style.color = '#8C6E1E';
            badge.style.borderColor = '#F2D88C';
          }
          if (statusText) statusText.innerText = 'Turned ON (Visible on Website)';
          if (slider) slider.style.backgroundColor = '#BF9A33';
        } else {
          if (badge) {
            badge.innerText = '○ DISABLED: Hostel Button Hidden';
            badge.style.background = '#f1f5f9';
            badge.style.color = '#64748b';
            badge.style.borderColor = '#cbd5e1';
          }
          if (statusText) statusText.innerText = 'Turned OFF (Hidden)';
          if (slider) slider.style.backgroundColor = '#cbd5e1';
        }

        try {
          localStorage.setItem('tms_hostel_explicitly_toggled', 'true');
        } catch (_) {}

        // Auto save toggle change
        await websiteService.saveConfig(this._config);
        window.dispatchEvent(new CustomEvent('tms_hostel_toggled', { detail: { enabled: val } }));
        UIComponents.showToast(val ? 'Hostel turned ON (Visible on Website & ERP)!' : 'Hostel turned OFF (Hidden from Website & ERP)', val ? 'success' : 'info');
      });
    }

    // Save Handlers for sections
    container.querySelectorAll('.btn-save-hostel-section').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sec = btn.dataset.section;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite;"></span> Saving...`;

        try {
          if (sec === 'overview') {
            h.title = container.querySelector('#hostel-title-input')?.value || h.title;
            h.badge = container.querySelector('#hostel-badge-input')?.value || h.badge;
            h.subtitle = container.querySelector('#hostel-subtitle-input')?.value || h.subtitle;
            h.overview = container.querySelector('#hostel-overview-input')?.value || h.overview;
            h.eligibility = container.querySelector('#hostel-eligibility-input')?.value || h.eligibility;
            h.navButtonText = container.querySelector('#hostel-navtext-input')?.value || 'Hostel';
            h.totalCapacity = parseInt(container.querySelector('#hostel-cap-total')?.value || 150, 10);
            h.occupiedBeds = parseInt(container.querySelector('#hostel-cap-occupied')?.value || 126, 10);
            h.availableBeds = parseInt(container.querySelector('#hostel-cap-available')?.value || 24, 10);
            fees.admissionFee = container.querySelector('#hostel-fee-admission')?.value || fees.admissionFee;
            fees.monthlyBoarding = container.querySelector('#hostel-fee-monthly')?.value || fees.monthlyBoarding;
            fees.securityDeposit = container.querySelector('#hostel-fee-deposit')?.value || fees.securityDeposit;
          } else if (sec === 'wardens') {
            wardens.chiefWardenName = container.querySelector('#hostel-warden-name')?.value || wardens.chiefWardenName;
            wardens.chiefWardenTitle = container.querySelector('#hostel-warden-title')?.value || wardens.chiefWardenTitle;
            wardens.phone = container.querySelector('#hostel-warden-phone')?.value || wardens.phone;
            wardens.altPhone = container.querySelector('#hostel-warden-alt')?.value || wardens.altPhone;
            wardens.email = container.querySelector('#hostel-warden-email')?.value || wardens.email;
            wardens.visitingHours = container.querySelector('#hostel-warden-visiting')?.value || wardens.visitingHours;
            const rText = container.querySelector('#hostel-rules-textarea')?.value || '';
            h.rules = rText.split('\n').map(s => s.trim()).filter(Boolean);
          }

          await websiteService.saveConfig(this._config);
          UIComponents.showToast('Hostel settings updated successfully!', 'success');
        } catch (e) {
          UIComponents.showToast('Failed to save hostel settings: ' + e.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="save"></i> Save Settings`;
          UIComponents.refreshIcons();
        }
      });
    });

    // Inputs bindings for wings
    container.querySelectorAll('.wing-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const fld = e.target.dataset.field;
        if (h.wings && h.wings[idx]) {
          h.wings[idx][fld] = e.target.value;
        }
      });
    });

    // Remove wing
    container.querySelectorAll('.btn-remove-wing').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        if (confirm('Delete this dormitory wing?')) {
          h.wings.splice(idx, 1);
          this.renderHostelTab(container);
          UIComponents.refreshIcons();
        }
      });
    });

    // Add wing
    const addWingBtn = container.querySelector('#btn-add-hostel-wing');
    if (addWingBtn) {
      addWingBtn.addEventListener('click', () => {
        h.wings.push({
          id: 'wing-' + Date.now(),
          name: 'New Dormitory Wing',
          gender: 'Boys',
          rooms: '10 Rooms (4 Beds each)',
          capacity: 40,
          occupied: 0,
          supervisor: 'Resident Warden',
          description: 'Spacious well-lit dormitories with study tables and clean washrooms.'
        });
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-wings"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    }

    // Feature inputs
    container.querySelectorAll('.feature-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const fld = e.target.dataset.field;
        if (h.features && h.features[idx]) {
          h.features[idx][fld] = e.target.value;
        }
      });
    });

    // Remove feature
    container.querySelectorAll('.btn-remove-feature').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        h.features.splice(idx, 1);
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-features"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    });

    // Add feature
    const addFeatureBtn = container.querySelector('#btn-add-hostel-feature');
    if (addFeatureBtn) {
      addFeatureBtn.addEventListener('click', () => {
        h.features.push({
          id: 'feat-' + Date.now(),
          title: 'New Hostel Amenity',
          icon: 'sparkles',
          badge: 'Facility',
          desc: 'High standard resident facility supporting student comfort and safety.'
        });
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-features"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    }

    // Routine inputs
    container.querySelectorAll('.routine-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const fld = e.target.dataset.field;
        if (h.dailyRoutine && h.dailyRoutine[idx]) {
          h.dailyRoutine[idx][fld] = e.target.value;
        }
      });
    });

    // Remove routine
    container.querySelectorAll('.btn-remove-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        h.dailyRoutine.splice(idx, 1);
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-routine"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    });

    // Add routine
    const addRoutineBtn = container.querySelector('#btn-add-hostel-routine');
    if (addRoutineBtn) {
      addRoutineBtn.addEventListener('click', () => {
        h.dailyRoutine.push({
          time: '04:00 PM – 05:00 PM',
          activity: 'Activity & Outdoor Games',
          icon: 'activity'
        });
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-routine"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    }

    // Mess menu inputs
    container.querySelectorAll('.mess-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const fld = e.target.dataset.field;
        if (h.messMenu && h.messMenu[idx]) {
          h.messMenu[idx][fld] = e.target.value;
        }
      });
    });

    // Allot Bed to Student modal
    const allotBtn = container.querySelector('#btn-hostel-allot-student');
    if (allotBtn) {
      allotBtn.addEventListener('click', () => {
        const name = prompt('Enter Student Full Name:');
        if (!name) return;
        const roll = prompt('Enter Roll Number (e.g. TMS-2650):', 'TMS-' + Math.floor(1000 + Math.random() * 9000));
        const cls = prompt('Enter Class & Section (e.g. Grade 9 - A):', 'Grade 9 - A');
        const wing = prompt('Enter Wing (Hazrat Bilal Boys Wing / Fatima-tuz-Zahra Girls Wing):', 'Hazrat Bilal Boys Wing');
        const room = prompt('Enter Room Number (e.g. Room 105):', 'Room 105');
        const bed = prompt('Enter Bed Number (e.g. Bed B-3):', 'Bed B-3');
        const phone = prompt('Enter Guardian Mobile Number:', '+91 9832000000');

        allocations.push({
          id: 'ha-' + Date.now(),
          studentName: name,
          rollNo: roll || 'TMS-2600',
          classGrade: cls || 'Grade 9',
          wing: wing || 'Hazrat Bilal Boys Wing',
          roomNo: room || 'Room 101',
          bedNo: bed || 'Bed 1',
          guardianPhone: phone || '+91 8653382851',
          status: 'Active'
        });
        localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
        UIComponents.showToast('Student successfully allotted to ' + room + ' (' + bed + ')!', 'success');
        this.renderHostelTab(container);
        const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-roster"]');
        if (targetBtn) targetBtn.click();
        UIComponents.refreshIcons();
      });
    }

    // Remove allocation
    container.querySelectorAll('.btn-remove-allocation').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        if (confirm('Vacate and check out this student from hostel bed?')) {
          allocations.splice(idx, 1);
          localStorage.setItem('tms_hostel_allocations', JSON.stringify(allocations));
          this.renderHostelTab(container);
          const targetBtn = container.querySelector('.hostel-sub-pill[data-target="hostel-sec-roster"]');
          if (targetBtn) targetBtn.click();
          UIComponents.refreshIcons();
        }
      });
    });
  }

  /* ========================================================================== */
  /* Subtab 6: Notice Board Bulletins (CRUD)                                    */
  /* ========================================================================== */
  static renderNoticesTab(container) {
    const notices = this._config.notices || [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
            Live Campus Notices &amp; Circulars
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:2px 0 0;">These appear in real-time on the public home page notice board.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-notice">
          <i data-lucide="plus"></i> Post New Notice
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;" id="notices-editor-list">
        ${notices.map((n, idx) => `
          <div class="card" style="margin:0; border:1px solid var(--border-color); padding:18px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="badge ${n.isPinned ? 'badge-warning' : 'badge-info'}">${esc(n.category || 'General')}</span>
                <span style="font-weight:700; color:#0f172a;">${esc(n.title)}</span>
              </div>
              <button class="btn btn-secondary btn-sm btn-del-not" data-idx="${idx}" style="color:#ef4444;">
                <i data-lucide="trash-2"></i> Delete
              </button>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr 140px 100px; gap:12px; margin-bottom:10px;">
              <div>
                <label class="form-label" style="font-size:0.75rem;">Notice Title</label>
                <input type="text" class="form-input not-title" data-idx="${idx}" value="${esc(n.title)}">
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">Category</label>
                <select class="form-input not-cat" data-idx="${idx}">
                  <option value="Admissions" ${n.category === 'Admissions' ? 'selected' : ''}>Admissions</option>
                  <option value="Examination" ${n.category === 'Examination' ? 'selected' : ''}>Examination</option>
                  <option value="Events" ${n.category === 'Events' ? 'selected' : ''}>Events &amp; Sports</option>
                  <option value="Academic" ${n.category === 'Academic' ? 'selected' : ''}>Academic</option>
                  <option value="General" ${n.category === 'General' ? 'selected' : ''}>General Notice</option>
                </select>
              </div>
              <div>
                <label class="form-label" style="font-size:0.75rem;">Date</label>
                <input type="date" class="form-input not-date" data-idx="${idx}" value="${esc(n.date || '')}">
              </div>
              <div style="display:flex; flex-direction:column; justify-content:flex-end;">
                <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:700; cursor:pointer; padding-bottom:10px;">
                  <input type="checkbox" class="not-pin" data-idx="${idx}" ${n.isPinned ? 'checked' : ''}>
                  <span>Pinned 📌</span>
                </label>
              </div>
            </div>

            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:0.75rem;">Notice Content / Full Details</label>
              <textarea class="form-input not-content" data-idx="${idx}" rows="2">${esc(n.content)}</textarea>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'notices', 'Live Notice Board Section');

    container.querySelectorAll('.not-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.notices[i]) this._config.notices[i].title = e.target.value;
      });
    });
    container.querySelectorAll('.not-cat').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.notices[i]) this._config.notices[i].category = e.target.value;
      });
    });
    container.querySelectorAll('.not-date').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.notices[i]) this._config.notices[i].date = e.target.value;
      });
    });
    container.querySelectorAll('.not-pin').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.notices[i]) this._config.notices[i].isPinned = e.target.checked;
      });
    });
    container.querySelectorAll('.not-content').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.notices[i]) this._config.notices[i].content = e.target.value;
      });
    });

    container.querySelectorAll('.btn-del-not').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        this._config.notices.splice(i, 1);
        this.renderNoticesTab(container);
        UIComponents.refreshIcons();
      });
    });

    const addBtn = document.getElementById('btn-add-notice');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._config.notices.unshift({
          id: 'not-' + Date.now(),
          title: 'New Official Announcement',
          category: 'General',
          date: new Date().toISOString().split('T')[0],
          content: 'Details of the official notification for parents and students.',
          isPinned: false
        });
        this.renderNoticesTab(container);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 7: Photo Gallery (CRUD)                                             */
  /* ========================================================================== */
  static renderGalleryTab(container) {
    const gallery = this._config.gallery || [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
            Campus Photo Gallery
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:2px 0 0;">Showcase campus life, science laboratories, athletic championships &amp; events.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-gallery">
          <i data-lucide="plus"></i> Add Photo
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
        ${gallery.map((g, idx) => `
          <div class="card" style="margin:0; padding:12px; border:1px solid var(--border-color);">
            <div style="height:140px; border-radius:10px; overflow:hidden; margin-bottom:10px; background:#0f172a;">
              <img src="${esc(g.url)}" alt="${esc(g.title)}" style="width:100%; height:100%; object-fit:cover;">
            </div>

            <div class="form-group" style="margin-bottom:8px;">
              <label class="form-label" style="font-size:0.72rem;">Photo Caption</label>
              <input type="text" class="form-input gal-title" data-idx="${idx}" value="${esc(g.title)}">
            </div>

            <div class="form-group" style="margin-bottom:8px;">
              <label class="form-label" style="font-size:0.72rem;">Category</label>
              <input type="text" class="form-input gal-cat" data-idx="${idx}" value="${esc(g.category || 'Campus')}">
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:0.72rem;">Image URL</label>
              <input type="text" class="form-input gal-url" data-idx="${idx}" value="${esc(g.url)}">
            </div>

            <button class="btn btn-secondary btn-sm btn-del-gal" data-idx="${idx}" style="color:#ef4444; width:100%; justify-content:center;">
              <i data-lucide="trash-2"></i> Remove Photo
            </button>
          </div>
        `).join('')}
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'gallery', 'Campus Photo Gallery Section');

    container.querySelectorAll('.gal-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.gallery[i]) this._config.gallery[i].title = e.target.value;
      });
    });
    container.querySelectorAll('.gal-cat').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.gallery[i]) this._config.gallery[i].category = e.target.value;
      });
    });
    container.querySelectorAll('.gal-url').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.gallery[i]) this._config.gallery[i].url = e.target.value;
      });
    });

    container.querySelectorAll('.btn-del-gal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        this._config.gallery.splice(i, 1);
        this.renderGalleryTab(container);
        UIComponents.refreshIcons();
      });
    });

    const addBtn = document.getElementById('btn-add-gallery');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._config.gallery.push({
          title: 'Campus Life Moment',
          category: 'Campus',
          url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'
        });
        this.renderGalleryTab(container);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 8: Parent Testimonials (CRUD)                                       */
  /* ========================================================================== */
  static renderTestimonialsTab(container) {
    const testimonials = this._config.testimonials || [];

    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
            Parent &amp; Community Testimonials
          </h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:2px 0 0;">Manage quotes, ratings, parent/alumni names and reviews.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-test">
          <i data-lucide="plus"></i> Add Testimonial
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
        ${testimonials.map((t, idx) => `
          <div class="card" style="margin:0; padding:18px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                <span class="badge badge-warning">★ ${t.rating || 5} Stars</span>
                <button class="icon-btn btn-del-test" data-idx="${idx}" style="color:#ef4444;" title="Delete">
                  <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
                </button>
              </div>

              <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-size:0.72rem;">Guardian Name</label>
                <input type="text" class="form-input test-name" data-idx="${idx}" value="${esc(t.name)}">
              </div>

              <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-size:0.72rem;">Role / Child Grade</label>
                <input type="text" class="form-input test-role" data-idx="${idx}" value="${esc(t.role)}">
              </div>

              <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-size:0.72rem;">Avatar Image URL</label>
                <input type="text" class="form-input test-avatar" data-idx="${idx}" value="${esc(t.avatar)}">
              </div>

              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.72rem;">Review Content</label>
                <textarea class="form-input test-content" data-idx="${idx}" rows="3">${esc(t.content)}</textarea>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'testimonials', 'Reviews & Testimonials Section');

    container.querySelectorAll('.test-name').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.testimonials[i]) this._config.testimonials[i].name = e.target.value;
      });
    });
    container.querySelectorAll('.test-role').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.testimonials[i]) this._config.testimonials[i].role = e.target.value;
      });
    });
    container.querySelectorAll('.test-avatar').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.testimonials[i]) this._config.testimonials[i].avatar = e.target.value;
      });
    });
    container.querySelectorAll('.test-content').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        if (this._config.testimonials[i]) this._config.testimonials[i].content = e.target.value;
      });
    });

    container.querySelectorAll('.btn-del-test').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        this._config.testimonials.splice(i, 1);
        this.renderTestimonialsTab(container);
        UIComponents.refreshIcons();
      });
    });

    const addBtn = document.getElementById('btn-add-test');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._config.testimonials.push({
          name: 'Parent / Guardian',
          role: 'Parent of Class Student',
          rating: 5,
          content: 'TMS provides an extraordinary balance of modern academic discipline and moral grounding.',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        });
        this.renderTestimonialsTab(container);
        UIComponents.refreshIcons();
      });
    }
  }

  /* ========================================================================== */
  /* Subtab 9: Contact, Admission CTA & Footer                                  */
  /* ========================================================================== */
  static renderContactTab(container) {
    const meta = this._config.meta || {};
    const cta = this._config.admissionCta || {};
    const footer = this._config.footer || {};

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
        <!-- Left: Contact Channels & Location -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Campus Helpdesk &amp; Location
          </h4>

          <div class="form-group">
            <label class="form-label">Full Campus Postal Address</label>
            <textarea id="meta-address" class="form-input" rows="2">${esc(meta.campusAddress || '')}</textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">Primary Telephone</label>
              <input type="text" id="meta-phone" class="form-input" value="${esc(meta.phone || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Alternate Telephone</label>
              <input type="text" id="meta-altphone" class="form-input" value="${esc(meta.altPhone || '')}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">WhatsApp Helpline</label>
              <input type="text" id="meta-wa" class="form-input" value="${esc(meta.whatsapp || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Official Email</label>
              <input type="email" id="meta-email" class="form-input" value="${esc(meta.email || '')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Office Visiting Hours</label>
            <input type="text" id="meta-hours" class="form-input" value="${esc(meta.workingHours || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Topbar Announcement Ticker Text</label>
            <input type="text" id="meta-topalert" class="form-input" value="${esc(meta.topbarAlert || '')}">
          </div>
        </div>

        <!-- Right: Admission CTA Banner & Footer -->
        <div class="card" style="margin:0;">
          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:16px;">
            Admission CTA Banner
          </h4>

          <div class="form-group">
            <label class="form-label">Banner Eyebrow Badge</label>
            <input type="text" id="cta-badge-inp" class="form-input" value="${esc(cta.badge || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Banner Headline</label>
            <input type="text" id="cta-head-inp" class="form-input" value="${esc(cta.headline || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Banner Subtext</label>
            <textarea id="cta-sub-inp" class="form-input" rows="2">${esc(cta.subtext || '')}</textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">CTA Button Text</label>
              <input type="text" id="cta-btn-txt" class="form-input" value="${esc(cta.buttonText || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">CTA Button URL</label>
              <input type="text" id="cta-btn-url" class="form-input" value="${esc(cta.buttonUrl || '')}">
            </div>
          </div>

          <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin-top:20px; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:14px;">
            Institutional Footer &amp; Copyright
          </h4>

          <div class="form-group">
            <label class="form-label">Footer About Mission</label>
            <textarea id="footer-about-inp" class="form-input" rows="2">${esc(footer.about || '')}</textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">Emergency Helpline</label>
              <input type="text" id="footer-emer-inp" class="form-input" value="${esc(footer.emergencyHelpline || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">Copyright Notice</label>
              <input type="text" id="footer-copy-inp" class="form-input" value="${esc(footer.copyright || '')}">
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderSectionVisibilityBanner(container, 'contact', 'Campus Visit & Contact Helpdesk Section');

    const bindVal = (id, obj, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', (e) => { obj[key] = e.target.value; });
    };

    bindVal('meta-address', this._config.meta, 'campusAddress');
    bindVal('meta-phone', this._config.meta, 'phone');
    bindVal('meta-altphone', this._config.meta, 'altPhone');
    bindVal('meta-wa', this._config.meta, 'whatsapp');
    bindVal('meta-email', this._config.meta, 'email');
    bindVal('meta-hours', this._config.meta, 'workingHours');
    bindVal('meta-topalert', this._config.meta, 'topbarAlert');

    bindVal('cta-badge-inp', this._config.admissionCta, 'badge');
    bindVal('cta-head-inp', this._config.admissionCta, 'headline');
    bindVal('cta-sub-inp', this._config.admissionCta, 'subtext');
    bindVal('cta-btn-txt', this._config.admissionCta, 'buttonText');
    bindVal('cta-btn-url', this._config.admissionCta, 'buttonUrl');

    bindVal('footer-about-inp', this._config.footer, 'about');
    bindVal('footer-emer-inp', this._config.footer, 'emergencyHelpline');
    bindVal('footer-copy-inp', this._config.footer, 'copyright');
  }

  /* ========================================================================== */
  /* Subtab 10: Raw JSON Backup & Disaster Recovery                             */
  /* ========================================================================== */
  static renderBackupTab(container) {
    const rawJson = JSON.stringify(this._config, null, 2);

    container.innerHTML = `
      <div class="card" style="margin:0;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-main); margin:0;">
              Full Website CMS Raw Data &amp; Backup
            </h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0;">Export, import or inspect the full configuration payload for migration or offline backup.</p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-copy-json">
              <i data-lucide="copy"></i> Copy JSON
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-download-json">
              <i data-lucide="download"></i> Download .json
            </button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin:0;">
              <i data-lucide="upload"></i> Import .json
              <input type="file" id="file-import-json" accept=".json" style="display:none;">
            </label>
          </div>
        </div>

        <textarea id="raw-json-editor" class="form-input font-mono" rows="18" style="font-size:0.82rem; line-height:1.45; background:#0f172a; color:#f8fafc; border:1px solid #334155;">${esc(rawJson)}</textarea>

        <div style="margin-top:14px; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary btn-sm" id="btn-apply-json">
            <i data-lucide="check"></i> Apply Raw JSON to CMS
          </button>
        </div>
      </div>
    `;

    const ta = document.getElementById('raw-json-editor');
    const copyBtn = document.getElementById('btn-copy-json');
    if (copyBtn && ta) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(ta.value).then(() => {
          UIComponents.showToast('CMS JSON copied to clipboard!', 'info');
        });
      });
    }

    const dlBtn = document.getElementById('btn-download-json');
    if (dlBtn && ta) {
      dlBtn.addEventListener('click', () => {
        const blob = new Blob([ta.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tms-website-cms-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const impFile = document.getElementById('file-import-json');
    if (impFile && ta) {
      impFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          try {
            const parsed = JSON.parse(re.target.result);
            this._config = parsed;
            ta.value = JSON.stringify(parsed, null, 2);
            UIComponents.showToast('Imported CMS file successfully! Click "Save & Publish" to activate.', 'success');
          } catch (err) {
            UIComponents.showToast('Invalid JSON file format: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    const applyBtn = document.getElementById('btn-apply-json');
    if (applyBtn && ta) {
      applyBtn.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(ta.value);
          this._config = parsed;
          UIComponents.showToast('JSON applied to current session! Remember to click "Save & Publish".', 'success');
        } catch (err) {
          UIComponents.showToast('Syntax error in JSON: ' + err.message, 'error');
        }
      });
    }
  }
}
