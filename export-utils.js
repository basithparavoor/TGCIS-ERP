/**
 * THAIBA PUBLIC SCHOOL — Enterprise Export Utilities & PDF Engine
 * Professional High-DPI Print-to-PDF, Standardized Filenames,
 * Institutional Header/Footer Branding, and UTF-8 CSV Exporter.
 */

import { TMS_CONFIG } from './config.js';
import { TMS_LOGO } from './logo.js';

const attrEsc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Standardize and sanitize a clean, safe filename for PDF & CSV downloads.
 * Default format: TMS_<DocType>_<Identifier>_<Date>
 * @param {string} docType - e.g. 'Admission_Form', 'Fee_Receipt', 'Report_Card'
 * @param {string} [identifier=''] - e.g. 'APP-2027-0104', 'INV-102', 'Grade-5'
 * @param {string} [extraDate=''] - e.g. '2027-03-15'
 * @returns {string} Clean, safe filename without illegal filesystem characters
 */
export function formatPdfFilename(docType, identifier = '', extraDate = '') {
  const sanitize = (s) => String(s || '')
    .trim()
    .replace(/[\\/:*?"<>|#%&{}\\$!'@`=+~]/g, '-')
    .replace(/[\s_]+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^_+|_+$/g, '');

  let baseType = sanitize(docType || 'Document');
  if (!baseType.toLowerCase().startsWith('tms')) {
    baseType = `TMS_${baseType}`;
  }

  const parts = [baseType];
  const cleanId = sanitize(identifier);
  if (cleanId && !baseType.toLowerCase().includes(cleanId.toLowerCase())) {
    parts.push(cleanId);
  }

  const cleanDate = sanitize(extraDate);
  if (cleanDate) {
    parts.push(cleanDate);
  }

  return parts.join('_').replace(/_+/g, '_').slice(0, 100);
}

/**
 * Download rows as an Excel-safe, UTF-8 BOM encoded CSV file.
 * @param {string} filename
 * @param {Array<Array<any>>} rows - First row is treated as the header.
 */
export function downloadCsv(filename, rows) {
  const cleanName = formatPdfFilename(filename.replace(/\.csv$/i, ''));
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Render standard institutional branding header for official PDF documents.
 */
export function renderDocumentHeader(opts = {}) {
  const inst = TMS_CONFIG?.institution || {};
  const instName = opts.institutionName || inst.name || 'THAIBA PUBLIC SCHOOL';
  const tagline = opts.tagline || inst.tagline || 'Run by : Thaiba Heritage, Kolkata';
  const regNo = opts.regNo || inst.regNo || 'IV 01894/2011';
  const address = opts.address || `${inst.address?.campus || 'Baghait, Tapan'}, ${inst.address?.district || 'Dakshin Dinajpur'} - ${inst.address?.pin || '733127'} (W.B.)`;
  const contact = opts.contact || `Helpline: ${inst.contact?.phone1 || '+91 8653382851'}, ${inst.contact?.phone2 || '+91 8167782851'} • Email: ${inst.contact?.email || 'tps@thaibagarden.com'}`;
  const website = opts.website || inst.contact?.website || 'tps.clubad.space';
  const badge = opts.badge || 'Official Record';
  const title = opts.title || '';
  const subtitle = opts.subtitle || '';
  const docRef = opts.documentId || opts.refNo || '';
  const currentDate = opts.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Resolve emblem logo
  let logoSrc = './tps-logo.png';
  try {
    const rawLogo = (typeof TMS_LOGO !== 'undefined' && TMS_LOGO.getCustomLogo) ? TMS_LOGO.getCustomLogo() : './tps-logo.png';
    logoSrc = new URL(rawLogo, document.baseURI).href;
  } catch (e) {
    logoSrc = './tps-logo.png';
  }

  return `
    <header class="tms-doc-header">
      <div class="tms-header-grid">
        <div class="tms-header-logo-wrap">
          <img src="${attrEsc(logoSrc)}" alt="${attrEsc(instName)}" class="tms-header-logo" onerror="this.style.display='none'">
        </div>
        <div class="tms-header-center">
          <div class="tms-inst-sub">${attrEsc(tagline)}</div>
          <h1 class="tms-inst-name">${attrEsc(instName)}</h1>
          <div class="tms-inst-address">
            ${attrEsc(address)}
            <span class="tms-reg-pill">Regd. No. : ${attrEsc(regNo)}</span>
          </div>
          <div class="tms-inst-contact">
            ${attrEsc(contact)} • Web: <strong>${attrEsc(website.replace(/^https?:\/\//, ''))}</strong>
          </div>
        </div>
        <div class="tms-header-badge-col">
          <div class="tms-doc-badge">${attrEsc(badge)}</div>
          <div class="tms-meta-date">Date: <strong>${attrEsc(currentDate)}</strong></div>
          ${docRef ? `<div class="tms-meta-ref">Ref: <span class="font-mono"><strong>${attrEsc(docRef)}</strong></span></div>` : ''}
        </div>
      </div>

      <div class="tms-header-accent-band">
        <div class="tms-accent-emerald"></div>
        <div class="tms-accent-gold"></div>
        <div class="tms-accent-navy"></div>
      </div>

      ${title ? `
        <div class="tms-doc-banner">
          <div>
            <h2 class="tms-doc-heading">${attrEsc(title)}</h2>
            ${subtitle ? `<div class="tms-doc-meta">${attrEsc(subtitle)}</div>` : ''}
          </div>
          <div class="tms-doc-session">Academic Session: <strong>${attrEsc(TMS_CONFIG?.academic?.currentYear || '2027 - 2028')}</strong></div>
        </div>
      ` : ''}
    </header>
  `;
}

/**
 * Render standard institutional branding footer with security verification & optional signatures.
 */
export function renderDocumentFooter(opts = {}) {
  const signatures = Array.isArray(opts.signatures) ? opts.signatures : [];
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const sigsHtml = signatures.length ? `
    <div class="tms-signatures-row">
      ${signatures.map((title) => `
        <div class="tms-sig-block">
          <div class="tms-sig-line"></div>
          <div class="tms-sig-title">${attrEsc(title)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <footer class="tms-doc-footer">
      ${sigsHtml}
      <div class="tms-footer-meta-row">
        <div class="tms-footer-left">
          <span style="color:#16a34a; font-weight:800;">●</span>
          <strong>Thaiba Public School ERP</strong>
          <span class="tms-footer-dim">• Computer Generated Official Record • Tamper Evident</span>
        </div>
        <div class="tms-footer-center">
          <span>Portal Verification: <strong>tps.clubad.space</strong></span>
        </div>
        <div class="tms-footer-right">
          <span>Issued: <strong>${attrEsc(currentDate)} ${attrEsc(currentTime)}</strong></span>
        </div>
      </div>
    </footer>
  `;
}

/**
 * Build a structured, high-contrast Key/Value table for printable documents.
 * @param {Array<[string, any]>} pairs
 * @param {object} [options] - { columns: 2 | 4 }
 */
export function kvTable(pairs, options = {}) {
  const formatVal = (v) => {
    if (v === null || v === undefined || v === '') return '&mdash;';
    return String(v);
  };

  const cols = options.columns || 2;
  if (cols === 4) {
    let rows = '';
    for (let i = 0; i < pairs.length; i += 2) {
      const p1 = pairs[i] || ['', ''];
      const p2 = pairs[i + 1] || ['', ''];
      rows += `
        <tr>
          <th style="width:18%;">${attrEsc(p1[0])}</th>
          <td style="width:32%;">${formatVal(p1[1])}</td>
          <th style="width:18%;">${attrEsc(p2[0])}</th>
          <td style="width:32%;">${formatVal(p2[1])}</td>
        </tr>`;
    }
    return `<table class="tms-kv-table tms-kv-4col"><tbody>${rows}</tbody></table>`;
  }

  return `
    <table class="tms-kv-table">
      <tbody>
        ${pairs.map(([k, v]) => `
          <tr>
            <th style="width:30%;">${attrEsc(k)}</th>
            <td>${formatVal(v)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

/**
 * Open a high-DPI, print-ready popup window and trigger PDF print/export.
 * The user can then click "Save as PDF" with a clean, standardized filename.
 *
 * @param {string} title - Primary document title or filename descriptor
 * @param {string} bodyHtml - Main HTML payload
 * @param {object} [options] - Extended formatting options
 * @param {string} [options.filename] - Custom standardized filename (omitting .pdf)
 * @param {string} [options.subtitle] - Subtitle beneath the title
 * @param {string} [options.badge] - Category/status badge ('Official Record', 'Confidential', etc.)
 * @param {string} [options.documentId] - Optional tracking/reference code
 * @param {boolean} [options.showHeader=true] - Whether to render standard institutional header
 * @param {boolean} [options.showFooter=true] - Whether to render standard institutional footer
 * @param {Array<string>} [options.signatures] - Array of signature titles for footer
 * @param {string} [options.orientation='portrait'] - 'portrait' or 'landscape'
 * @param {string} [options.watermark] - Optional faint background watermark
 * @param {boolean} [options.autoPrint=true] - Whether to trigger window.print() automatically
 */
export function exportPdf(title, bodyHtml, options = {}) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups for this site to export the PDF document.');
    return;
  }

  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const showHeader = options.showHeader !== false;
  const showFooter = options.showFooter !== false;
  const autoPrint = options.autoPrint !== false;

  // Resolve sanitized filename (this becomes document.title -> default PDF file name)
  const defaultFilename = options.filename
    ? formatPdfFilename(options.filename)
    : formatPdfFilename(title, options.documentId || options.id);

  // Resolve application stylesheet against current origin
  let cssHref = '';
  try {
    cssHref = new URL('app.css', document.baseURI).href;
  } catch (e) {
    cssHref = 'app.css';
  }

  // Header and footer generation
  const headerHtml = showHeader
    ? renderDocumentHeader({
        title: title || '',
        subtitle: options.subtitle || '',
        badge: options.badge || 'Official Record',
        documentId: options.documentId || options.refNo || '',
        date: options.date
      })
    : '';

  const footerHtml = showFooter
    ? renderDocumentFooter({
        signatures: options.signatures || []
      })
    : '';

  const watermarkHtml = options.watermark ? `
    <div class="tms-watermark-overlay">${attrEsc(options.watermark)}</div>
  ` : '';

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${attrEsc(defaultFilename)}</title>
  <link rel="stylesheet" href="${cssHref}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }

    @page {
      size: A4 ${orientation};
      margin: 10mm 12mm 12mm 12mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Top Action Toolbar (Screen Only) */
    .tms-pdf-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }

    .tms-toolbar-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tms-toolbar-badge {
      background: #16a34a;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tms-toolbar-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 13.5px;
      color: #ffffff;
      letter-spacing: 0.3px;
    }

    .tms-toolbar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .tms-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .tms-btn-primary {
      background: #16a34a;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);
    }
    .tms-btn-primary:hover {
      background: #15803d;
    }

    .tms-btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }
    .tms-btn-secondary:hover {
      background: #475569;
    }

    .tms-toolbar-tip {
      background: #fef3c7;
      color: #92400e;
      border-bottom: 1px solid #fde68a;
      padding: 7px 24px;
      font-size: 11px;
      text-align: center;
      font-weight: 500;
    }

    /* Document Sheet Wrapper */
    .tms-pdf-sheet {
      max-width: ${orientation === 'landscape' ? '287mm' : '210mm'};
      margin: 16px auto;
      background: #ffffff;
      padding: 12mm 14mm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      position: relative;
      min-height: ${orientation === 'landscape' ? '190mm' : '285mm'};
      box-sizing: border-box;
    }

    /* Print Overrides */
    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print, .tms-pdf-toolbar, .tms-toolbar-tip {
        display: none !important;
      }
      .tms-pdf-sheet {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        min-height: auto !important;
      }
    }

    /* Header Styling */
    .tms-doc-header {
      margin-bottom: 14px;
      position: relative;
    }

    .tms-header-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .tms-header-logo-wrap {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tms-header-logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .tms-header-center {
      flex: 1;
      text-align: center;
    }

    .tms-inst-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #16a34a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }

    .tms-inst-name {
      font-family: 'Outfit', sans-serif;
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.6px;
      line-height: 1.15;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }

    .tms-inst-address {
      font-size: 9px;
      color: #334155;
      margin-bottom: 2px;
    }

    .tms-reg-pill {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      font-weight: 700;
      font-size: 8px;
      color: #0f172a;
    }

    .tms-inst-contact {
      font-size: 8.5px;
      color: #64748b;
    }

    .tms-header-badge-col {
      width: 100px;
      text-align: right;
      flex-shrink: 0;
    }

    .tms-doc-badge {
      display: inline-block;
      padding: 3px 8px;
      background: #f0fdf4;
      border: 1.5px solid #16a34a;
      color: #15803d;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .tms-meta-date, .tms-meta-ref {
      font-size: 8.5px;
      color: #475569;
      margin-top: 4px;
    }

    .tms-header-accent-band {
      display: flex;
      height: 4px;
      width: 100%;
      margin: 10px 0 12px 0;
      border-radius: 2px;
      overflow: hidden;
    }
    .tms-accent-emerald { flex: 4; background: #16a34a; }
    .tms-accent-gold { flex: 1; background: #f59e0b; }
    .tms-accent-navy { flex: 2; background: #0f172a; }

    .tms-doc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #16a34a;
      padding: 7px 12px;
      margin-bottom: 14px;
      border-radius: 4px;
    }

    .tms-doc-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .tms-doc-meta {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 1px;
    }

    .tms-doc-session {
      font-size: 9.5px;
      color: #334155;
    }

    /* Content Tables & Elements */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
      font-size: 10px;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }

    .tms-kv-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      text-align: left;
      border: 1px solid #e2e8f0;
      font-size: 10px;
    }
    .tms-kv-table td {
      border: 1px solid #e2e8f0;
      font-size: 10px;
    }

    .font-mono {
      font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace !important;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
    }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }

    /* Footer Styling */
    .tms-doc-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1.5px solid #cbd5e1;
      font-size: 8.5px;
      color: #64748b;
      page-break-inside: avoid;
    }

    .tms-signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 22px;
      padding-top: 28px;
    }

    .tms-sig-block {
      text-align: center;
      min-width: 140px;
    }

    .tms-sig-line {
      border-top: 1.5px solid #0f172a;
      margin-bottom: 4px;
    }

    .tms-sig-title {
      font-size: 9px;
      font-weight: 700;
      color: #0f172a;
    }

    .tms-footer-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Watermark */
    .tms-watermark-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 64px;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.04);
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 6px;
    }
  </style>
  ${options.styles ? `<style>${options.styles}</style>` : ''}
</head>
<body>
  <!-- Print Screen Toolbar -->
  <div class="tms-pdf-toolbar no-print">
    <div class="tms-toolbar-info">
      <span class="tms-toolbar-badge">TMS PDF Export</span>
      <div>
        <div class="tms-toolbar-title">${attrEsc(defaultFilename)}</div>
      </div>
    </div>
    <div class="tms-toolbar-actions">
      <button class="tms-btn tms-btn-secondary" onclick="window.close()" title="Close document preview">
        ✕ Close
      </button>
      <button class="tms-btn tms-btn-primary" onclick="window.print()" title="Print or Save as PDF (Ctrl + P)">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="tms-toolbar-tip no-print">
    💡 <strong>Tip:</strong> In the print preview, select <strong>"Save as PDF"</strong>, ensure Paper Size is set to <strong>A4</strong>, and turn ON <strong>"Background graphics"</strong> under More Settings for sharp colors and logos.
  </div>

  <main class="tms-pdf-sheet">
    ${watermarkHtml}
    ${headerHtml}
    ${bodyHtml}
    ${footerHtml}
  </main>

  ${autoPrint ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 450);
    });
  <\/script>` : ''}
</body>
</html>`;

  win.document.open();
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
}

/**
 * Universal Native Web Share API helper with clipboard fallback
 */
export async function shareContent({ title, text, url }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: title || 'Thaiba Public School',
        text: text || '',
        url: url || window.location.href
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }
  const sharePayload = `${title ? '*' + title + '*\n' : ''}${text || ''}${url ? '\n' + url : ''}`;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(sharePayload);
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

export default { downloadCsv, exportPdf, formatPdfFilename, renderDocumentHeader, renderDocumentFooter, kvTable, shareContent };
