/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Staff Geofence & WiFi Governance Service
 * Manages campus WiFi networks, GPS geofences, and distance calculations for staff attendance.
 */

import { TMS_CONFIG } from './config.js';
import { dbService } from './supabase-client.js';
import { UIComponents } from './ui-components.js';

const STORAGE_KEY_WIFI = 'tgcis_campus_wifi_networks';
const STORAGE_KEY_GEOFENCE = 'tgcis_campus_geofence_zones';

export class StaffGeofenceService {
  /**
   * Calculate distance between two coordinates in meters (Haversine formula)
   */
  static calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Get authorized campus WiFi networks
   */
  static async getWifiNetworks() {
    try {
      const dbNetworks = await dbService.select('campus_wifi_networks');
      if (dbNetworks && dbNetworks.length) return dbNetworks;
    } catch (e) {}

    const local = localStorage.getItem(STORAGE_KEY_WIFI);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }

    const defaultNetworks = [
      { id: 'wifi-1', ssid: 'TGCIS-Campus-Faculty-5G', bssid: 'F4:8C:EB:A1:22:90', block: 'Main Academic Directorate', status: 'Active' },
      { id: 'wifi-2', ssid: 'TGCIS-Academic-Block-2.4G', bssid: 'F4:8C:EB:A1:22:91', block: 'Junior & Senior Classrooms', status: 'Active' },
      { id: 'wifi-3', ssid: 'Thaiba-Heritage-Staff-Net', bssid: 'D8:0D:17:88:44:10', block: 'Administrative & Principal Office', status: 'Active' },
      { id: 'wifi-4', ssid: 'Thaiba-Hostel-Faculty-Mesh', bssid: 'A0:B5:49:EE:12:33', block: 'Hostel Moral Wing', status: 'Active' }
    ];
    localStorage.setItem(STORAGE_KEY_WIFI, JSON.stringify(defaultNetworks));
    return defaultNetworks;
  }

  /**
   * Save WiFi networks
   */
  static async saveWifiNetworks(networks) {
    localStorage.setItem(STORAGE_KEY_WIFI, JSON.stringify(networks));
    try {
      for (const n of networks) {
        await dbService.upsert('campus_wifi_networks', n);
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('tgcis_wifi_networks_updated', { detail: networks }));
    return networks;
  }

  /**
   * Get campus geofence zones
   */
  static async getGeofenceZones() {
    try {
      const dbZones = await dbService.select('campus_geofence_zones');
      if (dbZones && dbZones.length) return dbZones;
    } catch (e) {}

    const local = localStorage.getItem(STORAGE_KEY_GEOFENCE);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }

    const baseLat = TMS_CONFIG.institution?.gpsGeofence?.latitude || 25.2891;
    const baseLng = TMS_CONFIG.institution?.gpsGeofence?.longitude || 88.5832;
    const baseRadius = TMS_CONFIG.institution?.gpsGeofence?.radiusMeters || 300;

    const defaultZones = [
      { id: 'geo-1', name: 'Main Academic Campus Zone', latitude: baseLat, longitude: baseLng, radiusMeters: baseRadius, campus: 'TGCIS-TAPAN', isPrimary: true },
      { id: 'geo-2', name: 'Hostel Moral & Hifz Wing', latitude: 25.2898, longitude: 88.5841, radiusMeters: 150, campus: 'TGCIS-TAPAN', isPrimary: false },
      { id: 'geo-3', name: 'Thaiba Model School Wing', latitude: 25.2910, longitude: 88.5850, radiusMeters: 250, campus: 'TMS-TAPAN', isPrimary: false }
    ];
    localStorage.setItem(STORAGE_KEY_GEOFENCE, JSON.stringify(defaultZones));
    return defaultZones;
  }

  /**
   * Save Geofence zones
   */
  static async saveGeofenceZones(zones) {
    localStorage.setItem(STORAGE_KEY_GEOFENCE, JSON.stringify(zones));
    try {
      for (const z of zones) {
        await dbService.upsert('campus_geofence_zones', z);
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('tgcis_geofence_zones_updated', { detail: zones }));
    return zones;
  }

  /**
   * Request device current GPS coordinates via browser Geolocation API
   */
  static getCurrentCoordinates() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  /**
   * Open configuration modal for WiFi networks, Geofence zones, and Distance radius
   */
  static async openConfigModal({ onSave = null } = {}) {
    const esc = (v) => UIComponents.escapeHtml(v);
    const wifiList = await this.getWifiNetworks();
    const geofenceList = await this.getGeofenceZones();

    const bodyHtml = `
      <div style="font-family:var(--font-sans, system-ui); color:#0F172A;">
        <!-- Header Info -->
        <div style="background:#eef5fa; border:1px solid #bfdbfe; border-radius:14px; padding:14px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="font-weight:800; font-size:1rem; color:#134e7a; display:flex; align-items:center; gap:8px;">
              <i data-lucide="shield-check" style="width:18px; height:18px; color:#1A659F;"></i>
              Staff Attendance Geofence &amp; WiFi Verification Engine
            </div>
            <div style="font-size:0.8rem; color:#134e7a; margin-top:2px;">
              Configure permitted GPS boundaries, maximum allowed radius distance, and authorized campus WiFi networks.
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline" id="btn-detect-current-gps" style="border-radius:10px; font-weight:700; background:#FFFFFF; color:#1A659F; border-color:#93c5fd;">
            <i data-lucide="crosshair"></i> Use My Current Location
          </button>
        </div>

        <!-- Section 1: Geofence Zones & Distance Settings -->
        <div style="margin-bottom:22px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:800; font-size:0.9rem; color:#1E293B; display:flex; align-items:center; gap:6px;">
              <i data-lucide="map-pin" style="width:16px; height:16px; color:#1A659F;"></i>
              1. Campus Geofence Zones &amp; Distance Radius
            </div>
            <button type="button" class="btn btn-xs btn-outline" id="btn-add-geofence-row" style="font-weight:700; border-radius:8px;">
              + Add Geofence Zone
            </button>
          </div>

          <div id="geofence-zones-container" style="display:flex; flex-direction:column; gap:10px;">
            ${geofenceList.map((z, idx) => `
              <div class="geo-zone-card" data-index="${idx}" style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:14px; position:relative;">
                <div style="display:grid; grid-template-columns:1.8fr 1fr 1fr 1fr auto; gap:10px; align-items:center;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Zone Name</label>
                    <input type="text" class="form-input geo-zone-name font-mono" value="${esc(z.name)}" style="font-size:0.84rem; font-weight:700; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Latitude (°N)</label>
                    <input type="number" step="0.0001" class="form-input geo-zone-lat font-mono" value="${esc(z.latitude)}" style="font-size:0.84rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Longitude (°E)</label>
                    <input type="number" step="0.0001" class="form-input geo-zone-lng font-mono" value="${esc(z.longitude)}" style="font-size:0.84rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Radius / Distance (m)</label>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <input type="number" min="20" max="2000" step="10" class="form-input geo-zone-radius font-mono" value="${esc(z.radiusMeters || 150)}" style="font-size:0.84rem; font-weight:700; border-radius:8px; width:70px;">
                      <span style="font-size:0.75rem; color:#64748B; font-weight:600;">meters</span>
                    </div>
                  </div>
                  <div style="padding-top:16px;">
                    <button type="button" class="btn btn-xs btn-outline btn-remove-geo-zone" title="Remove Zone" style="color:#EF4444; border-color:#FECACA; border-radius:8px;">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 2: Authorized Campus WiFi Networks -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:800; font-size:0.9rem; color:#1E293B; display:flex; align-items:center; gap:6px;">
              <i data-lucide="wifi" style="width:16px; height:16px; color:#1A659F;"></i>
              2. Authorized Campus WiFi Networks (SSID / BSSID)
            </div>
            <button type="button" class="btn btn-xs btn-outline" id="btn-add-wifi-row" style="font-weight:700; border-radius:8px;">
              + Add WiFi Network
            </button>
          </div>

          <div id="wifi-networks-container" style="display:flex; flex-direction:column; gap:10px;">
            ${wifiList.map((w, idx) => `
              <div class="wifi-row-card" data-index="${idx}" style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:12px 14px;">
                <div style="display:grid; grid-template-columns:1.8fr 1.4fr 1.4fr auto; gap:10px; align-items:center;">
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Network Name (SSID) *</label>
                    <input type="text" class="form-input wifi-ssid font-mono" value="${esc(w.ssid)}" placeholder="e.g. TGCIS-Campus-5G" style="font-size:0.84rem; font-weight:700; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Campus Block / Zone</label>
                    <input type="text" class="form-input wifi-block" value="${esc(w.block || '')}" placeholder="Academic Block" style="font-size:0.84rem; border-radius:8px;">
                  </div>
                  <div>
                    <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Router BSSID / MAC (Optional)</label>
                    <input type="text" class="form-input wifi-bssid font-mono" value="${esc(w.bssid || '')}" placeholder="F4:8C:EB:..." style="font-size:0.84rem; border-radius:8px;">
                  </div>
                  <div style="padding-top:16px;">
                    <button type="button" class="btn btn-xs btn-outline btn-remove-wifi" title="Remove WiFi" style="color:#EF4444; border-color:#FECACA; border-radius:8px;">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <button class="btn btn-secondary" id="btn-modal-geofence-cancel" style="border-radius:12px; font-weight:700; padding:10px 20px;">
          Cancel
        </button>
        <button class="btn btn-primary" id="btn-modal-geofence-save" style="border-radius:12px; font-weight:700; padding:10px 28px; background:linear-gradient(135deg, #1A659F 0%, #134e7a 100%); border:none; color:#FFFFFF;">
          <i data-lucide="check"></i> Save Verification Settings
        </button>
      </div>
    `;

    UIComponents.openModal({
      title: 'Staff Attendance Verification — WiFi & Geofence Settings',
      bodyHtml,
      footerHtml,
      maxWidth: '820px'
    });

    const modal = document.querySelector('#global-modal-overlay');
    if (!modal) return;

    // Detect Current Location
    modal.querySelector('#btn-detect-current-gps')?.addEventListener('click', async () => {
      const btn = modal.querySelector('#btn-detect-current-gps');
      if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Locating...';
      try {
        const coords = await this.getCurrentCoordinates();
        const firstLat = modal.querySelector('.geo-zone-lat');
        const firstLng = modal.querySelector('.geo-zone-lng');
        if (firstLat && firstLng) {
          firstLat.value = coords.latitude.toFixed(6);
          firstLng.value = coords.longitude.toFixed(6);
          UIComponents.showToast(`Updated GPS coordinates (Accuracy: ±${coords.accuracy}m)`, 'success');
        }
      } catch (err) {
        UIComponents.showToast(`GPS Error: ${err.message}`, 'warning');
      } finally {
        if (btn) btn.innerHTML = '<i data-lucide="crosshair"></i> Use My Current Location';
        UIComponents.refreshIcons();
      }
    });

    // Add Geofence Row
    modal.querySelector('#btn-add-geofence-row')?.addEventListener('click', () => {
      const container = modal.querySelector('#geofence-zones-container');
      const newCard = document.createElement('div');
      newCard.className = 'geo-zone-card';
      newCard.style.cssText = 'background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:14px;';
      newCard.innerHTML = `
        <div style="display:grid; grid-template-columns:1.8fr 1fr 1fr 1fr auto; gap:10px; align-items:center;">
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Zone Name</label>
            <input type="text" class="form-input geo-zone-name font-mono" value="New Campus Zone" style="font-size:0.84rem; font-weight:700; border-radius:8px;">
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Latitude (°N)</label>
            <input type="number" step="0.0001" class="form-input geo-zone-lat font-mono" value="25.2891" style="font-size:0.84rem; border-radius:8px;">
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Longitude (°E)</label>
            <input type="number" step="0.0001" class="form-input geo-zone-lng font-mono" value="88.5832" style="font-size:0.84rem; border-radius:8px;">
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Radius / Distance (m)</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" min="20" max="2000" step="10" class="form-input geo-zone-radius font-mono" value="150" style="font-size:0.84rem; font-weight:700; border-radius:8px; width:70px;">
              <span style="font-size:0.75rem; color:#64748B; font-weight:600;">meters</span>
            </div>
          </div>
          <div style="padding-top:16px;">
            <button type="button" class="btn btn-xs btn-outline btn-remove-geo-zone" title="Remove Zone" style="color:#EF4444; border-color:#FECACA; border-radius:8px;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(newCard);
      UIComponents.refreshIcons();
    });

    // Add WiFi Row
    modal.querySelector('#btn-add-wifi-row')?.addEventListener('click', () => {
      const container = modal.querySelector('#wifi-networks-container');
      const newCard = document.createElement('div');
      newCard.className = 'wifi-row-card';
      newCard.style.cssText = 'background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:12px 14px;';
      newCard.innerHTML = `
        <div style="display:grid; grid-template-columns:1.8fr 1.4fr 1.4fr auto; gap:10px; align-items:center;">
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Network Name (SSID) *</label>
            <input type="text" class="form-input wifi-ssid font-mono" placeholder="e.g. TGCIS-Staff-5G" style="font-size:0.84rem; font-weight:700; border-radius:8px;">
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Campus Block / Zone</label>
            <input type="text" class="form-input wifi-block" placeholder="Main Campus" style="font-size:0.84rem; border-radius:8px;">
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Router BSSID / MAC</label>
            <input type="text" class="form-input wifi-bssid font-mono" placeholder="Optional" style="font-size:0.84rem; border-radius:8px;">
          </div>
          <div style="padding-top:16px;">
            <button type="button" class="btn btn-xs btn-outline btn-remove-wifi" title="Remove WiFi" style="color:#EF4444; border-color:#FECACA; border-radius:8px;">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(newCard);
      UIComponents.refreshIcons();
    });

    // Delegated Remove
    modal.addEventListener('click', (e) => {
      const btnRemZone = e.target.closest('.btn-remove-geo-zone');
      if (btnRemZone) {
        btnRemZone.closest('.geo-zone-card')?.remove();
      }
      const btnRemWifi = e.target.closest('.btn-remove-wifi');
      if (btnRemWifi) {
        btnRemWifi.closest('.wifi-row-card')?.remove();
      }
    });

    // Cancel
    modal.querySelector('#btn-modal-geofence-cancel')?.addEventListener('click', () => {
      UIComponents.closeModal();
    });

    // Save
    modal.querySelector('#btn-modal-geofence-save')?.addEventListener('click', async () => {
      // Collect zones
      const zoneCards = modal.querySelectorAll('.geo-zone-card');
      const updatedZones = [];
      zoneCards.forEach((c, idx) => {
        const name = c.querySelector('.geo-zone-name')?.value.trim() || `Zone ${idx + 1}`;
        const lat = parseFloat(c.querySelector('.geo-zone-lat')?.value) || 25.2891;
        const lng = parseFloat(c.querySelector('.geo-zone-lng')?.value) || 88.5832;
        const rad = parseInt(c.querySelector('.geo-zone-radius')?.value, 10) || 150;
        updatedZones.push({
          id: `geo-${idx + 1}`,
          name,
          latitude: lat,
          longitude: lng,
          radiusMeters: rad,
          campus: 'TGCIS-TAPAN',
          isPrimary: idx === 0
        });
      });

      // Collect WiFi
      const wifiCards = modal.querySelectorAll('.wifi-row-card');
      const updatedWifi = [];
      wifiCards.forEach((c, idx) => {
        const ssid = c.querySelector('.wifi-ssid')?.value.trim();
        if (ssid) {
          const block = c.querySelector('.wifi-block')?.value.trim() || 'Campus';
          const bssid = c.querySelector('.wifi-bssid')?.value.trim() || '';
          updatedWifi.push({
            id: `wifi-${idx + 1}`,
            ssid,
            block,
            bssid,
            status: 'Active'
          });
        }
      });

      await this.saveGeofenceZones(updatedZones);
      await this.saveWifiNetworks(updatedWifi);

      UIComponents.showToast('Campus Geofence & WiFi Settings updated successfully.', 'success');
      UIComponents.closeModal();

      if (typeof onSave === 'function') {
        onSave({ zones: updatedZones, wifi: updatedWifi });
      }
    });

    UIComponents.refreshIcons();
  }
}
