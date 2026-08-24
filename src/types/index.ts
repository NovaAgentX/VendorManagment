export type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';

export type VendorStatus = 'ACTIVE' | 'INACTIVE';

export type CampaignStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export type CampaignType = string;

export type CampaignPlatform = string;

export type Platform = CampaignPlatform;

export interface Admin {
  Admin_ID: string;
  Admin_Name: string;
  Email: string;
  Password_Hash?: string;
  Status: 'ACTIVE' | 'INACTIVE';
  Created_Date: string;
  Updated_Date: string;
  Created_By: string;
  userCount?: number;
  vendorCount?: number;
}

export interface User {
  User_ID: string;
  User_Name: string;
  Email: string;
  Password_Hash?: string;
  Role: 'USER';
  Admin_ID: string;
  Admin_Name?: string;
  Status: 'ACTIVE' | 'INACTIVE';
  Created_Date: string;
  Updated_Date: string;
  Created_By: string;
  vendorCount?: number;
  campaignCount?: number;
}

export interface Vendor {
  Vendor_ID: string;
  Vendor_Name: string;
  Assigned_User_ID: string;
  Assigned_User_Name?: string;
  Admin_ID: string;
  Admin_Name?: string;
  Contact_Name: string;
  Contact_Email: string;
  Contact_Phone: string;
  Vendor_Bank_Account?: string;
  Social_Media_Link?: string;
  Vendor_Status: VendorStatus;
  Notes: string;
  Created_Date: string;
  Updated_Date: string;
  Created_By: string;
  Updated_By: string;
}

export interface Campaign {
  Campaign_ID: string;
  Vendor_ID: string;
  Vendor_Name?: string;
  Vendor_Bank_Account?: string;
  Social_Media_Link?: string;
  User_ID: string;
  User_Name?: string;
  Admin_ID: string;
  Admin_Name?: string;
  Campaign_Type: string;
  Platform: string;
  Campaign_Date: string;
  Campaign_Status: CampaignStatus;
  Campaign_Details?: string;
  Campaign_Result?: string;
  Reach_Count: number;
  Engagement_Count: number;
  Cost: number;
  Notes: string;
  Created_Date: string;
  Updated_Date: string;
  Created_By: string;
  Updated_By: string;
}

export interface ActivityLog {
  Log_ID: string;
  User_ID: string;
  User_Name: string;
  Role: Role;
  Action: string;
  Module: 'AUTH' | 'ADMINS' | 'USERS' | 'VENDORS' | 'CAMPAIGNS' | 'SETTINGS' | string;
  Record_ID?: string;
  Target_ID?: string;
  Description: string;
  Timestamp: string;
}

export interface Session {
  Session_ID: string;
  User_ID: string;
  Role: Role;
  Admin_ID?: string;
  Name: string;
  Email: string;
  Expiry: number; // timestamp in ms
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type DuplicateFieldType = 'BANK_ACCOUNT' | 'IBAN' | 'VENDOR_NAME' | 'CONTACT_EMAIL' | 'CONTACT_PHONE' | 'SOCIAL_LINK' | 'CONTACT_NAME';

export interface DuplicateFieldComparison {
  field: DuplicateFieldType;
  label: string;
  isMatch: boolean;
  matchType?: 'EXACT' | 'NORMALIZED' | 'PARTIAL';
  valueA: string;
  valueB: string;
  highlightDifference?: boolean;
}

export interface DuplicatePair {
  vendorA: Vendor;
  vendorB: Vendor;
  score: number; // 0 to 100
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  matchedFields: DuplicateFieldComparison[];
  isCrossUser: boolean;
  isCrossAdmin: boolean;
  description: string;
}

export interface VendorDuplicateGroup {
  groupId: string;
  primaryVendor: Vendor;
  duplicateVendors: Vendor[];
  allVendors: Vendor[];
  matchedFieldNames: string[];
  highestSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  isCrossUser: boolean;
  isCrossAdmin: boolean;
  involvedUsers: { userId: string; userName: string; adminId?: string; adminName?: string }[];
  involvedAdmins: { adminId: string; adminName: string }[];
  pairs: DuplicatePair[];
}

export interface DuplicateSummary {
  totalDuplicateVendors: number;
  totalDuplicateGroups: number;
  crossUserDuplicatesCount: number;
  bankAccountDuplicatesCount: number;
  nameDuplicatesCount: number;
  groups: VendorDuplicateGroup[];
  pairs: DuplicatePair[];
}

export interface DashboardStats {
  totalAdmins?: number;
  totalUsers: number;
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  totalCampaigns: number;
  pendingCampaigns: number;
  inProgressCampaigns: number;
  completedCampaigns: number;
  cancelledCampaigns: number;
  campaignsByStatus: { name: string; value: number }[];
  campaignsByPlatform: { name: string; value: number }[];
  campaignsByType: { name: string; value: number }[];
  campaignsByUser?: { name: string; value: number }[];
  campaignsByAdmin?: { name: string; value: number }[];
  campaignsByVendor?: { name: string; value: number }[];
  recentCampaigns: Campaign[];
  recentActivity: ActivityLog[];
  todayCampaignsCount?: number;
  duplicateSummary?: DuplicateSummary;
}
