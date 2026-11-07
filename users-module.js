/**
 * User & Permissions Module
 * Dedicated workspace for institutional identity, RBAC window-level permissions,
 * Google SSO approvals queue, staff onboarding, user sessions, and security audit trail.
 */

import { AdminModule } from './admin-module.js';

export class UsersModule {
  static async render(container, targetTab = 'users') {
    return AdminModule.renderUsers(container, targetTab);
  }
}
