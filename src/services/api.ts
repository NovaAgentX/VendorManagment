import { ApiResponse, Session, Admin, User, Vendor, Campaign, ActivityLog, DashboardStats } from '../types';
import { LocalStorageEngine } from './storageEngine';

const API_CONFIG_KEY = 'vendor_tracker_api_url';

// Default live backend — your deployed Google Apps Script Web App.
// Visitors don't need to configure anything; this is used automatically
// unless a different URL is saved in their browser's local storage
// (e.g. via the Settings page, useful if you ever redeploy and get a new URL).
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzqooOtKU8ghkFYTrCkw8IfsKB-5fRsjc4w4LUxqbxU54-euhTjoz01rPQU5lvX5Nt1Mw/exec';

export class ApiClient {
  static getApiUrl(): string {
    return localStorage.getItem(API_CONFIG_KEY) || DEFAULT_API_URL;
  }

  static setApiUrl(url: string) {
    if (!url) {
      localStorage.removeItem(API_CONFIG_KEY);
    } else {
      localStorage.setItem(API_CONFIG_KEY, url.trim());
    }
  }

  static isLiveConnected(): boolean {
    const url = this.getApiUrl();
    return Boolean(url && url.startsWith('https://script.google.com/macros/s/'));
  }

  static async testConnection(url: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
      return { success: false, message: 'Invalid Google Apps Script Web App URL. It must start with https://script.google.com/macros/s/' };
    }

    try {
      // Test using standard fetch with redirect follow
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
      });

      const json = await response.json();
      return {
        success: json.success === true,
        message: json.message || 'Connected to Google Apps Script Web App successfully!',
        data: json
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Connection failed: ${e.message}. Ensure your Google Apps Script deployment is set to 'Execute as: Me' and 'Who has access: Anyone'.`
      };
    }
  }

  private static async execute<T>(action: string, payload: any = {}, session?: Session | null): Promise<ApiResponse<T>> {
    const apiUrl = this.getApiUrl();

    // If a live Apps Script URL is configured, send request to Google Apps Script
    if (apiUrl && apiUrl.startsWith('https://script.google.com/macros/s/')) {
      try {
        const body = {
          action,
          sessionToken: session?.Session_ID || '',
          payload
        };

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body)
        });

        const json = await res.json();
        return json;
      } catch (err: any) {
        console.warn('Apps Script Web App call failed, falling back to local database engine:', err);
        // Fall through to local engine on network failure with helpful error
      }
    }

    // Local Storage / Database Engine execution
    // Small artificial delay to simulate realistic network latency
    await new Promise(r => setTimeout(r, 80));

    try {
      if (action === 'login') {
        const res = LocalStorageEngine.login(payload.identifier, payload.password, payload.portal);
        return { success: res.success, message: res.message, data: res.data as any };
      }

      if (!session) {
        return { success: false, message: 'Unauthorized: Session missing' };
      }

      const val = LocalStorageEngine.validateSession(session.Session_ID);
      if (!val.valid) {
        return { success: false, message: 'Unauthorized: Session expired' };
      }

      switch (action) {
        case 'logout': {
          const res = LocalStorageEngine.logout(session);
          return { success: true, message: res.message };
        }
        case 'validateSession':
          return { success: true, message: 'Valid', data: session as any };

        case 'getDashboard': {
          const data = LocalStorageEngine.getDashboardStats(session);
          return { success: true, message: 'Dashboard stats retrieved', data: data as any };
        }

        // Admins
        case 'getAdmins': {
          const data = LocalStorageEngine.getAdmins(session);
          return { success: true, message: 'Admins retrieved', data: data as any };
        }
        case 'createAdmin': {
          const res = LocalStorageEngine.createAdmin(session, payload);
          return { success: res.success, message: res.message, data: res.data as any };
        }
        case 'updateAdmin': {
          const res = LocalStorageEngine.updateAdmin(session, payload.adminId, payload);
          return { success: res.success, message: res.message };
        }
        case 'deactivateAdmin': {
          const res = LocalStorageEngine.updateAdmin(session, payload.adminId, { Status: payload.status || 'INACTIVE' });
          return { success: res.success, message: res.message };
        }

        // Users
        case 'getUsers': {
          const data = LocalStorageEngine.getUsers(session);
          return { success: true, message: 'Users retrieved', data: data as any };
        }
        case 'createUser': {
          const res = LocalStorageEngine.createUser(session, payload);
          return { success: res.success, message: res.message, data: res.data as any };
        }
        case 'updateUser': {
          const res = LocalStorageEngine.updateUser(session, payload.userId, payload);
          return { success: res.success, message: res.message };
        }
        case 'deactivateUser': {
          const res = LocalStorageEngine.updateUser(session, payload.userId, { Status: payload.status || 'INACTIVE' });
          return { success: res.success, message: res.message };
        }

        // Vendors
        case 'getVendors': {
          const data = LocalStorageEngine.getVendors(session);
          return { success: true, message: 'Vendors retrieved', data: data as any };
        }
        case 'createVendor': {
          const res = LocalStorageEngine.createVendor(session, payload);
          return { success: res.success, message: res.message, data: res.data as any };
        }
        case 'updateVendor': {
          const res = LocalStorageEngine.updateVendor(session, payload.vendorId, payload);
          return { success: res.success, message: res.message };
        }
        case 'assignVendor': {
          const res = LocalStorageEngine.updateVendor(session, payload.vendorId, { Assigned_User_ID: payload.assignedUserId });
          return { success: res.success, message: res.message };
        }
        case 'deactivateVendor': {
          const res = LocalStorageEngine.deactivateVendor(session, payload.vendorId);
          return { success: res.success, message: res.message };
        }
        case 'reactivateVendor': {
          const res = LocalStorageEngine.reactivateVendor(session, payload.vendorId);
          return { success: res.success, message: res.message };
        }

        // Campaigns
        case 'getCampaigns': {
          const data = LocalStorageEngine.getCampaigns(session, payload.filters);
          return { success: true, message: 'Campaigns retrieved', data: data as any };
        }
        case 'createCampaign': {
          const res = LocalStorageEngine.createCampaign(session, payload);
          return { success: res.success, message: res.message, data: res.data as any };
        }
        case 'updateCampaign': {
          const res = LocalStorageEngine.updateCampaign(session, payload.campaignId, payload);
          return { success: res.success, message: res.message };
        }
        case 'updateCampaignStatus': {
          const res = LocalStorageEngine.updateCampaign(session, payload.campaignId, { Campaign_Status: payload.status });
          return { success: res.success, message: res.message };
        }

        // Logs
        case 'getActivityLogs': {
          const data = LocalStorageEngine.getActivityLogs(session, payload.limit || 50);
          return { success: true, message: 'Logs retrieved', data: data as any };
        }

        // Duplicate Vendor Intelligence
        case 'getDuplicateSummary': {
          const data = LocalStorageEngine.getDuplicateSummary(session);
          return { success: true, message: 'Duplicate summary retrieved', data: data as any };
        }

        default:
          return { success: false, message: `Unsupported action: ${action}` };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Operation failed' };
    }
  }

  // High-Level Typed APIs
  static async login(identifier: string, password: string, portal?: 'ADMIN' | 'USER'): Promise<ApiResponse<Session>> {
    return this.execute<Session>('login', { identifier, password, portal });
  }

  static async getDuplicateSummary(session: Session): Promise<ApiResponse<any>> {
    return this.execute('getDuplicateSummary', {}, session);
  }

  static async logout(session: Session): Promise<ApiResponse<void>> {
    return this.execute<void>('logout', {}, session);
  }

  static async getDashboard(session: Session): Promise<ApiResponse<DashboardStats>> {
    return this.execute<DashboardStats>('getDashboard', {}, session);
  }

  static async getAdmins(session: Session): Promise<ApiResponse<Admin[]>> {
    return this.execute<Admin[]>('getAdmins', {}, session);
  }

  static async createAdmin(session: Session, data: Partial<Admin> & { password?: string }): Promise<ApiResponse<Admin>> {
    return this.execute<Admin>('createAdmin', data, session);
  }

  static async updateAdmin(session: Session, adminId: string, data: Partial<Admin> & { password?: string }): Promise<ApiResponse<void>> {
    return this.execute<void>('updateAdmin', { adminId, ...data }, session);
  }

  static async deactivateAdmin(session: Session, adminId: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse<void>> {
    return this.execute<void>('deactivateAdmin', { adminId, status }, session);
  }

  static async getUsers(session: Session): Promise<ApiResponse<User[]>> {
    return this.execute<User[]>('getUsers', {}, session);
  }

  static async createUser(session: Session, data: Partial<User> & { password?: string }): Promise<ApiResponse<User>> {
    return this.execute<User>('createUser', data, session);
  }

  static async updateUser(session: Session, userId: string, data: Partial<User> & { password?: string }): Promise<ApiResponse<void>> {
    return this.execute<void>('updateUser', { userId, ...data }, session);
  }

  static async deactivateUser(session: Session, userId: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse<void>> {
    return this.execute<void>('deactivateUser', { userId, status }, session);
  }

  static async getVendors(session: Session): Promise<ApiResponse<Vendor[]>> {
    return this.execute<Vendor[]>('getVendors', {}, session);
  }

  static async createVendor(session: Session, data: Partial<Vendor>): Promise<ApiResponse<Vendor>> {
    return this.execute<Vendor>('createVendor', data, session);
  }

  static async updateVendor(session: Session, vendorId: string, data: Partial<Vendor>): Promise<ApiResponse<void>> {
    return this.execute<void>('updateVendor', { vendorId, ...data }, session);
  }

  static async assignVendor(session: Session, vendorId: string, assignedUserId: string): Promise<ApiResponse<void>> {
    return this.execute<void>('assignVendor', { vendorId, assignedUserId }, session);
  }

  static async deactivateVendor(session: Session, vendorId: string): Promise<ApiResponse<void>> {
    return this.execute<void>('deactivateVendor', { vendorId }, session);
  }

  static async reactivateVendor(session: Session, vendorId: string): Promise<ApiResponse<void>> {
    return this.execute<void>('reactivateVendor', { vendorId }, session);
  }

  static async getCampaigns(session: Session, filters?: any): Promise<ApiResponse<Campaign[]>> {
    return this.execute<Campaign[]>('getCampaigns', { filters }, session);
  }

  static async createCampaign(session: Session, data: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    return this.execute<Campaign>('createCampaign', data, session);
  }

  static async updateCampaign(session: Session, campaignId: string, data: Partial<Campaign>): Promise<ApiResponse<void>> {
    return this.execute<void>('updateCampaign', { campaignId, ...data }, session);
  }

  static async updateCampaignStatus(session: Session, campaignId: string, status: string): Promise<ApiResponse<void>> {
    return this.execute<void>('updateCampaignStatus', { campaignId, status }, session);
  }

  static async getActivityLogs(session: Session, limit: number = 50): Promise<ApiResponse<ActivityLog[]>> {
    return this.execute<ActivityLog[]>('getActivityLogs', { limit }, session);
  }
}
