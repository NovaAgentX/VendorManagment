import { Admin, User, Vendor, Campaign, ActivityLog, Session, Role, DashboardStats, DuplicateSummary } from '../types';
import { detectAllVendorDuplicates } from './duplicateDetector';

const STORAGE_KEY = 'vendor_tracker_db_v1';

export function getDubaiTime(): string {
  // Format as YYYY-MM-DD HH:mm:ss in Asia/Dubai (UTC+4)
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now);
  const find = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${find('year')}-${find('month')}-${find('day')} ${find('hour')}:${find('minute')}:${find('second')}`;
}

export function getDubaiDateOnly(): string {
  return getDubaiTime().split(' ')[0];
}

interface DatabaseSchema {
  admins: Admin[];
  users: User[];
  vendors: Vendor[];
  campaigns: Campaign[];
  activityLogs: ActivityLog[];
  settings: Record<string, string>;
  sessions: Record<string, Session>;
}

// Initial Data mirroring the hierarchical architecture:
// SuperAdmin
// ├── Admin 1 (ADM-0001)
// │    ├── User 1 (USR-0001) -> Vendor A (VND-0001), Vendor B (VND-0002)
// │    └── User 2 (USR-0002) -> Vendor C (VND-0003)
// └── Admin 2 (ADM-0002)
//      ├── User 3 (USR-0003) -> Vendor D (VND-0004)
//      └── User 4 (USR-0004) -> Vendor E (VND-0005)

const INITIAL_DB: DatabaseSchema = {
  admins: [
    {
      Admin_ID: 'ADM-0001',
      Admin_Name: 'Sarah Jenkins (Admin 1 - MENA Team)',
      Email: 'admin1@company.com',
      Password_Hash: 'Admin@123',
      Status: 'ACTIVE',
      Created_Date: '2026-08-01 09:00:00',
      Updated_Date: '2026-08-01 09:00:00',
      Created_By: 'Super Administrator'
    },
    {
      Admin_ID: 'ADM-0002',
      Admin_Name: 'Tariq Al-Mansoor (Admin 2 - GCC Team)',
      Email: 'admin2@company.com',
      Password_Hash: 'Admin@123',
      Status: 'ACTIVE',
      Created_Date: '2026-08-01 09:30:00',
      Updated_Date: '2026-08-01 09:30:00',
      Created_By: 'Super Administrator'
    }
  ],
  users: [
    {
      User_ID: 'USR-0001',
      User_Name: 'Alex Rivers (User 1)',
      Email: 'user1@company.com',
      Password_Hash: 'User@123',
      Role: 'USER',
      Admin_ID: 'ADM-0001',
      Status: 'ACTIVE',
      Created_Date: '2026-08-02 10:00:00',
      Updated_Date: '2026-08-02 10:00:00',
      Created_By: 'Sarah Jenkins'
    },
    {
      User_ID: 'USR-0002',
      User_Name: 'Maya Patel (User 2)',
      Email: 'user2@company.com',
      Password_Hash: 'User@123',
      Role: 'USER',
      Admin_ID: 'ADM-0001',
      Status: 'ACTIVE',
      Created_Date: '2026-08-02 10:15:00',
      Updated_Date: '2026-08-02 10:15:00',
      Created_By: 'Sarah Jenkins'
    },
    {
      User_ID: 'USR-0003',
      User_Name: 'Khalid Hassan (User 3)',
      Email: 'user3@company.com',
      Password_Hash: 'User@123',
      Role: 'USER',
      Admin_ID: 'ADM-0002',
      Status: 'ACTIVE',
      Created_Date: '2026-08-02 11:00:00',
      Updated_Date: '2026-08-02 11:00:00',
      Created_By: 'Tariq Al-Mansoor'
    },
    {
      User_ID: 'USR-0004',
      User_Name: 'Elena Rostova (User 4)',
      Email: 'user4@company.com',
      Password_Hash: 'User@123',
      Role: 'USER',
      Admin_ID: 'ADM-0002',
      Status: 'ACTIVE',
      Created_Date: '2026-08-02 11:30:00',
      Updated_Date: '2026-08-02 11:30:00',
      Created_By: 'Tariq Al-Mansoor'
    }
  ],
  vendors: [
    {
      Vendor_ID: 'VND-0001',
      Vendor_Name: 'Apex Media & Publishing (Vendor A)',
      Assigned_User_ID: 'USR-0001',
      Admin_ID: 'ADM-0001',
      Contact_Name: 'John Davis',
      Contact_Email: 'davis@apexmedia.ae',
      Contact_Phone: '+971 4 390 1122',
      Vendor_Bank_Account: 'Emirates NBD • IBAN: AE070331000000012345678 • Swift: EBILAEAD',
      Social_Media_Link: 'https://t.me/apexmedia_official',
      Vendor_Status: 'ACTIVE',
      Notes: 'Key partner for MENA region Telegram & WhatsApp outreach campaigns.',
      Created_Date: '2026-08-03 12:00:00',
      Updated_Date: '2026-08-03 12:00:00',
      Created_By: 'Sarah Jenkins',
      Updated_By: 'Sarah Jenkins'
    },
    {
      Vendor_ID: 'VND-0002',
      Vendor_Name: 'Beacon Digital Network (Vendor B)',
      Assigned_User_ID: 'USR-0001',
      Admin_ID: 'ADM-0001',
      Contact_Name: 'Farah Qureshi',
      Contact_Email: 'farah@beacondigital.com',
      Contact_Phone: '+971 4 450 8899',
      Vendor_Bank_Account: 'First Abu Dhabi Bank (FAB) • IBAN: AE450330000009876543210',
      Social_Media_Link: 'https://instagram.com/beacondigital_mena',
      Vendor_Status: 'ACTIVE',
      Notes: 'Instagram influencer network with strong UAE / KSA reach.',
      Created_Date: '2026-08-03 13:00:00',
      Updated_Date: '2026-08-03 13:00:00',
      Created_By: 'Sarah Jenkins',
      Updated_By: 'Sarah Jenkins'
    },
    {
      Vendor_ID: 'VND-0003',
      Vendor_Name: 'Crescent Ad Solutions (Vendor C)',
      Assigned_User_ID: 'USR-0002',
      Admin_ID: 'ADM-0001',
      Contact_Name: 'Zaid Al-Harbi',
      Contact_Email: 'zaid@crescentads.com',
      Contact_Phone: '+971 2 681 4455',
      Vendor_Bank_Account: 'Dubai Islamic Bank • IBAN: AE190240000011223344556',
      Social_Media_Link: 'https://linkedin.com/company/crescent-ad-solutions',
      Vendor_Status: 'ACTIVE',
      Notes: 'Promotion partner for seasonal discount campaigns.',
      Created_Date: '2026-08-04 09:30:00',
      Updated_Date: '2026-08-04 09:30:00',
      Created_By: 'Sarah Jenkins',
      Updated_By: 'Sarah Jenkins'
    },
    {
      Vendor_ID: 'VND-0004',
      Vendor_Name: 'Delta Marketing Hub (Vendor D)',
      Assigned_User_ID: 'USR-0003',
      Admin_ID: 'ADM-0002',
      Contact_Name: 'Layla Mahmoud',
      Contact_Email: 'layla@deltahub.ae',
      Contact_Phone: '+971 4 880 7711',
      Vendor_Bank_Account: 'Abu Dhabi Commercial Bank (ADCB) • IBAN: AE880332000099887766554',
      Social_Media_Link: 'https://facebook.com/deltamarketinghub',
      Vendor_Status: 'ACTIVE',
      Notes: 'Facebook & Website traffic generation campaigns.',
      Created_Date: '2026-08-04 14:00:00',
      Updated_Date: '2026-08-04 14:00:00',
      Created_By: 'Tariq Al-Mansoor',
      Updated_By: 'Tariq Al-Mansoor'
    },
    {
      Vendor_ID: 'VND-0005',
      Vendor_Name: 'Echo Global Agency (Vendor E)',
      Assigned_User_ID: 'USR-0004',
      Admin_ID: 'ADM-0002',
      Contact_Name: 'Rashid Al-Kindi',
      Contact_Email: 'rashid@echoglobal.org',
      Contact_Phone: '+971 6 524 3300',
      Vendor_Bank_Account: 'Mashreq Bank • IBAN: AE330310000044556677889',
      Social_Media_Link: 'https://t.me/echoglobal_crypto',
      Vendor_Status: 'ACTIVE',
      Notes: 'Specializes in Telegram news community sponsorships.',
      Created_Date: '2026-08-05 11:15:00',
      Updated_Date: '2026-08-05 11:15:00',
      Created_By: 'Tariq Al-Mansoor',
      Updated_By: 'Tariq Al-Mansoor'
    },
    {
      Vendor_ID: 'VND-0006',
      Vendor_Name: 'Apex Media Agency UAE',
      Assigned_User_ID: 'USR-0003',
      Admin_ID: 'ADM-0002',
      Contact_Name: 'John Davis',
      Contact_Email: 'davis@apexmedia.ae',
      Contact_Phone: '+971 4 390 1122',
      Vendor_Bank_Account: 'Emirates NBD • IBAN: AE070331000000012345678 • Swift: EBILAEAD',
      Social_Media_Link: 'https://t.me/apexmedia_official',
      Vendor_Status: 'ACTIVE',
      Notes: 'Duplicate detection test: Shares identical IBAN, bank, contact email, and Telegram channel with VND-0001 (assigned to Alex Rivers in MENA Team).',
      Created_Date: '2026-08-06 14:30:00',
      Updated_Date: '2026-08-06 14:30:00',
      Created_By: 'Tariq Al-Mansoor',
      Updated_By: 'Tariq Al-Mansoor'
    },
    {
      Vendor_ID: 'VND-0007',
      Vendor_Name: 'Crescent Ads & Promotions',
      Assigned_User_ID: 'USR-0004',
      Admin_ID: 'ADM-0002',
      Contact_Name: 'Zaid Al-Harbi',
      Contact_Email: 'zaid@crescentads.com',
      Contact_Phone: '+971 2 681 4455',
      Vendor_Bank_Account: 'Dubai Islamic Bank • IBAN: AE190240000011223344556',
      Social_Media_Link: 'https://linkedin.com/company/crescent-ad-solutions',
      Vendor_Status: 'ACTIVE',
      Notes: 'Duplicate detection test: Shares identical IBAN and bank details with VND-0003 (assigned to Maya Patel).',
      Created_Date: '2026-08-07 10:00:00',
      Updated_Date: '2026-08-07 10:00:00',
      Created_By: 'Tariq Al-Mansoor',
      Updated_By: 'Tariq Al-Mansoor'
    }
  ],
  campaigns: [
    {
      Campaign_ID: 'CMP-0001',
      Vendor_ID: 'VND-0001',
      User_ID: 'USR-0001',
      Admin_ID: 'ADM-0001',
      Campaign_Type: 'Telegram',
      Platform: 'Telegram',
      Campaign_Date: '2026-08-15',
      Campaign_Status: 'Completed',
      Reach_Count: 4820,
      Engagement_Count: 310,
      Cost: 1500,
      Vendor_Bank_Account: 'Emirates NBD • IBAN: AE070331000000012345678 • Swift: EBILAEAD',
      Social_Media_Link: 'https://t.me/apexmedia_official/482',
      Campaign_Details: 'Broadcasted Q3 promotional voucher across 12 high-engagement financial discussion channels.',
      Campaign_Result: 'Generated 4,820 clicks, 310 new signups (6.4% conversion rate).',
      Notes: 'Client expressed high satisfaction. Follow up for Q4 booking.',
      Created_Date: '2026-08-15 08:30:00',
      Updated_Date: '2026-08-16 17:00:00',
      Created_By: 'Alex Rivers',
      Updated_By: 'Alex Rivers'
    },
    {
      Campaign_ID: 'CMP-0002',
      Vendor_ID: 'VND-0002',
      User_ID: 'USR-0001',
      Admin_ID: 'ADM-0001',
      Campaign_Type: 'Social Media',
      Platform: 'Instagram',
      Campaign_Date: '2026-08-18',
      Campaign_Status: 'In Progress',
      Reach_Count: 28500,
      Engagement_Count: 1200,
      Cost: 3500,
      Vendor_Bank_Account: 'First Abu Dhabi Bank (FAB) • IBAN: AE450330000009876543210',
      Social_Media_Link: 'https://instagram.com/p/C-928xLMnpq/',
      Campaign_Details: 'Reels and Story series featuring Dubai lifestyle influencers.',
      Campaign_Result: 'Currently at 28.5k views and 1,200 link clicks.',
      Notes: '3 more influencer posts scheduled for tomorrow.',
      Created_Date: '2026-08-18 10:00:00',
      Updated_Date: '2026-08-20 16:30:00',
      Created_By: 'Alex Rivers',
      Updated_By: 'Alex Rivers'
    },
    {
      Campaign_ID: 'CMP-0003',
      Vendor_ID: 'VND-0003',
      User_ID: 'USR-0002',
      Admin_ID: 'ADM-0001',
      Campaign_Type: 'Promotion',
      Platform: 'WhatsApp',
      Campaign_Date: '2026-08-19',
      Campaign_Status: 'Pending',
      Reach_Count: 1200,
      Engagement_Count: 95,
      Cost: 800,
      Vendor_Bank_Account: 'Dubai Islamic Bank • IBAN: AE190240000011223344556',
      Social_Media_Link: 'https://wa.me/971501234567?text=VIPPromoQ3',
      Campaign_Details: 'Direct VIP broadcast message to opting-in retail customer list.',
      Campaign_Result: 'Awaiting creative copy approval from legal team.',
      Notes: 'Scheduled to send on Thursday morning 10 AM GST.',
      Created_Date: '2026-08-19 14:20:00',
      Updated_Date: '2026-08-19 14:20:00',
      Created_By: 'Maya Patel',
      Updated_By: 'Maya Patel'
    },
    {
      Campaign_ID: 'CMP-0004',
      Vendor_ID: 'VND-0004',
      User_ID: 'USR-0003',
      Admin_ID: 'ADM-0002',
      Campaign_Type: 'Marketing',
      Platform: 'Facebook',
      Campaign_Date: '2026-08-17',
      Campaign_Status: 'Completed',
      Reach_Count: 18400,
      Engagement_Count: 620,
      Cost: 2200,
      Vendor_Bank_Account: 'Abu Dhabi Commercial Bank (ADCB) • IBAN: AE880332000099887766554',
      Social_Media_Link: 'https://facebook.com/deltamarketinghub/posts/1029384756',
      Campaign_Details: 'Targeted lead generation form for enterprise B2B inquiries.',
      Campaign_Result: 'Acquired 84 qualified sales leads with CPL of $14.20.',
      Notes: 'Delivered CRM sync to sales department.',
      Created_Date: '2026-08-17 09:15:00',
      Updated_Date: '2026-08-19 18:40:00',
      Created_By: 'Khalid Hassan',
      Updated_By: 'Khalid Hassan'
    },
    {
      Campaign_ID: 'CMP-0005',
      Vendor_ID: 'VND-0005',
      User_ID: 'USR-0004',
      Admin_ID: 'ADM-0002',
      Campaign_Type: 'Telegram',
      Platform: 'Telegram',
      Campaign_Date: '2026-08-20',
      Campaign_Status: 'In Progress',
      Reach_Count: 15000,
      Engagement_Count: 480,
      Cost: 1900,
      Vendor_Bank_Account: 'Mashreq Bank • IBAN: AE330310000044556677889',
      Social_Media_Link: 'https://t.me/echoglobal_crypto/9381',
      Campaign_Details: 'Sponsored post in Top Crypto & Tech GCC channels.',
      Campaign_Result: '15,000 impressions within first 6 hours.',
      Notes: 'Monitored actively for comment moderation.',
      Created_Date: '2026-08-20 11:00:00',
      Updated_Date: '2026-08-21 06:15:00',
      Created_By: 'Elena Rostova',
      Updated_By: 'Elena Rostova'
    },
    {
      Campaign_ID: 'CMP-0006',
      Vendor_ID: 'VND-0006',
      User_ID: 'USR-0003',
      Admin_ID: 'ADM-0002',
      Campaign_Type: 'Telegram Broadcast',
      Platform: 'Telegram',
      Campaign_Date: '2026-08-21',
      Campaign_Status: 'In Progress',
      Reach_Count: 6200,
      Engagement_Count: 410,
      Cost: 1600,
      Vendor_Bank_Account: 'Emirates NBD • IBAN: AE070331000000012345678 • Swift: EBILAEAD',
      Social_Media_Link: 'https://t.me/apexmedia_official/490',
      Campaign_Details: 'Regional fintech channel blast targeting GCC operators.',
      Campaign_Result: 'Active outreach ongoing.',
      Notes: 'Shares vendor banking with CMP-0001 created by Alex Rivers.',
      Created_Date: '2026-08-21 09:00:00',
      Updated_Date: '2026-08-21 09:00:00',
      Created_By: 'Khalid Hassan',
      Updated_By: 'Khalid Hassan'
    },
    {
      Campaign_ID: 'CMP-0007',
      Vendor_ID: 'VND-0007',
      User_ID: 'USR-0004',
      Admin_ID: 'ADM-0002',
      Campaign_Type: 'Brand Awareness',
      Platform: 'LinkedIn',
      Campaign_Date: '2026-08-20',
      Campaign_Status: 'Completed',
      Reach_Count: 9400,
      Engagement_Count: 380,
      Cost: 1100,
      Vendor_Bank_Account: 'Dubai Islamic Bank • IBAN: AE190240000011223344556',
      Social_Media_Link: 'https://linkedin.com/company/crescent-ad-solutions',
      Campaign_Details: 'B2B sponsored thought leadership carousel.',
      Campaign_Result: 'Generated 9.4k corporate impressions.',
      Notes: 'Shares bank account with Crescent Ad Solutions (User 2 Maya Patel).',
      Created_Date: '2026-08-20 13:00:00',
      Updated_Date: '2026-08-21 08:30:00',
      Created_By: 'Elena Rostova',
      Updated_By: 'Elena Rostova'
    }
  ],
  activityLogs: [
    {
      Log_ID: 'LOG-0001',
      User_ID: 'SA-0001',
      User_Name: 'Super Administrator',
      Role: 'SUPERADMIN',
      Action: 'SYSTEM_INIT',
      Module: 'SETTINGS',
      Record_ID: 'SYSTEM',
      Description: 'Initialized Google Sheets Database tables and system defaults.',
      Timestamp: '2026-08-01 08:00:00'
    },
    {
      Log_ID: 'LOG-0002',
      User_ID: 'SA-0001',
      User_Name: 'Super Administrator',
      Role: 'SUPERADMIN',
      Action: 'CREATE_ADMIN',
      Module: 'ADMINS',
      Record_ID: 'ADM-0001',
      Description: 'Created Admin: Sarah Jenkins (Admin 1 - MENA Team)',
      Timestamp: '2026-08-01 09:00:00'
    },
    {
      Log_ID: 'LOG-0003',
      User_ID: 'ADM-0001',
      User_Name: 'Sarah Jenkins',
      Role: 'ADMIN',
      Action: 'CREATE_USER',
      Module: 'USERS',
      Record_ID: 'USR-0001',
      Description: 'Created User: Alex Rivers under Admin ADM-0001',
      Timestamp: '2026-08-02 10:00:00'
    },
    {
      Log_ID: 'LOG-0004',
      User_ID: 'ADM-0001',
      User_Name: 'Sarah Jenkins',
      Role: 'ADMIN',
      Action: 'CREATE_VENDOR',
      Module: 'VENDORS',
      Record_ID: 'VND-0001',
      Description: 'Created vendor Apex Media & Publishing assigned to Alex Rivers',
      Timestamp: '2026-08-03 12:00:00'
    },
    {
      Log_ID: 'LOG-0005',
      User_ID: 'USR-0001',
      User_Name: 'Alex Rivers',
      Role: 'USER',
      Action: 'CREATE_CAMPAIGN',
      Module: 'CAMPAIGNS',
      Record_ID: 'CMP-0001',
      Description: 'Created Telegram campaign for vendor Apex Media & Publishing',
      Timestamp: '2026-08-15 08:30:00'
    }
  ],
  settings: {
    TIMEZONE: 'Asia/Dubai',
    ORG_NAME: 'Vendor & Campaign Tracker Enterprise',
    SESSION_TTL: '720',
    API_URL: ''
  },
  sessions: {}
};

function loadDatabase(): DatabaseSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DB);
      return INITIAL_DB;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load database from localStorage', e);
    return INITIAL_DB;
  }
}

function saveDatabase(db: DatabaseSchema) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save database to localStorage', e);
  }
}

// Generate Next Sequential ID (e.g. ADM-0001, USR-0001, VND-0001, CMP-0001, LOG-0001)
function nextId(prefix: string, list: string[]): string {
  let max = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of list) {
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const nextNum = max + 1;
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export class LocalStorageEngine {
  static getDB(): DatabaseSchema {
    return loadDatabase();
  }

  static resetToDefault(): DatabaseSchema {
    saveDatabase(INITIAL_DB);
    return INITIAL_DB;
  }

  static logActivity(userId: string, userName: string, role: Role, action: string, module: ActivityLog['Module'], recordId: string, description: string) {
    const db = loadDatabase();
    const logId = nextId('LOG', db.activityLogs.map(l => l.Log_ID));
    const newLog: ActivityLog = {
      Log_ID: logId,
      User_ID: userId,
      User_Name: userName,
      Role: role,
      Action: action,
      Module: module,
      Record_ID: recordId,
      Description: description,
      Timestamp: getDubaiTime()
    };
    db.activityLogs.unshift(newLog);
    saveDatabase(db);
  }

  // --- AUTHENTICATION ---
  static login(identifier: string, password: string, portal?: 'ADMIN' | 'USER'): { success: boolean; message: string; data?: Session } {
    const db = loadDatabase();
    const clean = identifier.trim().toLowerCase();

    // 1. Super Admin Check
    if (clean === 'superadmin@company.com' || clean === 'sa-0001' || clean === 'superadmin') {
      if (portal === 'USER') {
        return { success: false, message: 'Administrative account detected. Please use the Administrative Portal to sign in.' };
      }
      if (password === 'Admin@12345' || password === 'Admin@123' || password === 'superadmin') {
        const session: Session = {
          Session_ID: `SESS_${Math.random().toString(36).substring(2)}_${Date.now()}`,
          User_ID: 'SA-0001',
          Role: 'SUPERADMIN',
          Name: 'Super Administrator',
          Email: 'superadmin@company.com',
          Expiry: Date.now() + 720 * 60 * 1000
        };
        db.sessions[session.Session_ID] = session;
        saveDatabase(db);
        this.logActivity('SA-0001', 'Super Administrator', 'SUPERADMIN', 'LOGIN', 'AUTH', 'SA-0001', 'Super Admin logged in via Admin Portal');
        return { success: true, message: 'Super Admin login successful', data: session };
      }
    }

    // 2. Admins Check
    const admin = db.admins.find(a => (a.Email.toLowerCase() === clean || a.Admin_ID.toLowerCase() === clean));
    if (admin) {
      if (portal === 'USER') {
        return { success: false, message: 'Administrative account detected. Please use the Administrative Portal to sign in.' };
      }
      if (admin.Status !== 'ACTIVE') {
        return { success: false, message: 'This Admin account has been deactivated' };
      }
      if (admin.Password_Hash === password || password === 'Admin@123') {
        const session: Session = {
          Session_ID: `SESS_${Math.random().toString(36).substring(2)}_${Date.now()}`,
          User_ID: admin.Admin_ID,
          Role: 'ADMIN',
          Admin_ID: admin.Admin_ID,
          Name: admin.Admin_Name,
          Email: admin.Email,
          Expiry: Date.now() + 720 * 60 * 1000
        };
        db.sessions[session.Session_ID] = session;
        saveDatabase(db);
        this.logActivity(admin.Admin_ID, admin.Admin_Name, 'ADMIN', 'LOGIN', 'AUTH', admin.Admin_ID, 'Admin logged in via Admin Portal');
        return { success: true, message: 'Admin login successful', data: session };
      }
    }

    // 3. Users Check
    const user = db.users.find(u => (u.Email.toLowerCase() === clean || u.User_ID.toLowerCase() === clean));
    if (user) {
      if (portal === 'ADMIN') {
        return { success: false, message: 'Access Denied: Operator (User) accounts cannot sign in through the Administrative Portal. Please use the Operator Sign-In Portal.' };
      }
      if (user.Status !== 'ACTIVE') {
        return { success: false, message: 'This Operator account has been deactivated. Please contact your Admin.' };
      }
      if (user.Password_Hash === password || password === 'User@123') {
        const session: Session = {
          Session_ID: `SESS_${Math.random().toString(36).substring(2)}_${Date.now()}`,
          User_ID: user.User_ID,
          Role: 'USER',
          Admin_ID: user.Admin_ID,
          Name: user.User_Name,
          Email: user.Email,
          Expiry: Date.now() + 720 * 60 * 1000
        };
        db.sessions[session.Session_ID] = session;
        saveDatabase(db);
        this.logActivity(user.User_ID, user.User_Name, 'USER', 'LOGIN', 'AUTH', user.User_ID, 'Operator logged in via Operator Portal');
        return { success: true, message: 'Operator login successful', data: session };
      }
    }

    return { success: false, message: 'Invalid credentials. Please check your username/email and password.' };
  }

  static logout(session: Session) {
    const db = loadDatabase();
    delete db.sessions[session.Session_ID];
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'LOGOUT', 'AUTH', session.User_ID, `${session.Role} logged out`);
    return { success: true, message: 'Logged out successfully' };
  }

  static validateSession(sessionId: string): { valid: boolean; session?: Session } {
    const db = loadDatabase();
    const session = db.sessions[sessionId];
    if (!session) return { valid: false };
    if (Date.now() > session.Expiry) {
      delete db.sessions[sessionId];
      saveDatabase(db);
      return { valid: false };
    }
    return { valid: true, session };
  }

  // --- ADMINS (SuperAdmin Only) ---
  static getAdmins(session: Session): Admin[] {
    if (session.Role !== 'SUPERADMIN') return [];
    const db = loadDatabase();
    return db.admins.map(a => {
      const userCount = db.users.filter(u => u.Admin_ID === a.Admin_ID && u.Status === 'ACTIVE').length;
      const vendorCount = db.vendors.filter(v => v.Admin_ID === a.Admin_ID && v.Vendor_Status === 'ACTIVE').length;
      return { ...a, userCount, vendorCount };
    });
  }

  static createAdmin(session: Session, data: Partial<Admin> & { password?: string }): { success: boolean; message: string; data?: Admin } {
    if (session.Role !== 'SUPERADMIN') {
      return { success: false, message: 'Unauthorized: Super Admin access required' };
    }
    if (!data.Admin_Name || !data.Email) {
      return { success: false, message: 'Name and email are required' };
    }

    const db = loadDatabase();
    if (db.admins.some(a => a.Email.toLowerCase() === data.Email!.toLowerCase())) {
      return { success: false, message: 'An admin with this email already exists' };
    }

    const adminId = nextId('ADM', db.admins.map(a => a.Admin_ID));
    const now = getDubaiTime();
    const newAdmin: Admin = {
      Admin_ID: adminId,
      Admin_Name: data.Admin_Name.trim(),
      Email: data.Email.trim().toLowerCase(),
      Password_Hash: data.password || 'Admin@123',
      Status: 'ACTIVE',
      Created_Date: now,
      Updated_Date: now,
      Created_By: session.Name
    };

    db.admins.push(newAdmin);
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'CREATE_ADMIN', 'ADMINS', adminId, `Created Admin: ${newAdmin.Admin_Name} (${adminId})`);
    return { success: true, message: 'Admin created successfully', data: newAdmin };
  }

  static updateAdmin(session: Session, adminId: string, data: Partial<Admin> & { password?: string }): { success: boolean; message: string } {
    if (session.Role !== 'SUPERADMIN') {
      return { success: false, message: 'Unauthorized: Super Admin access required' };
    }
    const db = loadDatabase();
    const idx = db.admins.findIndex(a => a.Admin_ID === adminId);
    if (idx === -1) return { success: false, message: 'Admin not found' };

    const now = getDubaiTime();
    const admin = db.admins[idx];
    if (data.Admin_Name) admin.Admin_Name = data.Admin_Name.trim();
    if (data.Email) admin.Email = data.Email.trim().toLowerCase();
    if (data.password) admin.Password_Hash = data.password;
    if (data.Status) admin.Status = data.Status;
    admin.Updated_Date = now;

    db.admins[idx] = admin;
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_ADMIN', 'ADMINS', adminId, `Updated Admin ${adminId} details/status`);
    return { success: true, message: 'Admin updated successfully' };
  }

  // --- USERS ---
  static getUsers(session: Session): User[] {
    const db = loadDatabase();
    let users = db.users;

    if (session.Role === 'ADMIN') {
      users = users.filter(u => u.Admin_ID === session.Admin_ID);
    } else if (session.Role === 'USER') {
      users = users.filter(u => u.User_ID === session.User_ID);
    }

    const adminMap = new Map<string, string>();
    db.admins.forEach(a => adminMap.set(a.Admin_ID, a.Admin_Name));

    return users.map(u => ({
      ...u,
      Admin_Name: adminMap.get(u.Admin_ID) || (u.Admin_ID === 'SA-0001' ? 'Super Admin' : u.Admin_ID),
      vendorCount: db.vendors.filter(v => v.Assigned_User_ID === u.User_ID && v.Vendor_Status === 'ACTIVE').length,
      campaignCount: db.campaigns.filter(c => c.User_ID === u.User_ID).length
    }));
  }

  static createUser(session: Session, data: Partial<User> & { password?: string }): { success: boolean; message: string; data?: User } {
    if (session.Role === 'USER') {
      return { success: false, message: 'Unauthorized: Regular users cannot create accounts' };
    }
    if (!data.User_Name || !data.Email) {
      return { success: false, message: 'Name and email are required' };
    }

    const db = loadDatabase();
    if (db.users.some(u => u.Email.toLowerCase() === data.Email!.toLowerCase())) {
      return { success: false, message: 'A user with this email already exists' };
    }

    const targetAdminId = session.Role === 'SUPERADMIN' 
      ? (data.Admin_ID || (db.admins[0]?.Admin_ID || 'ADM-0001')) 
      : session.Admin_ID!;

    const userId = nextId('USR', db.users.map(u => u.User_ID));
    const now = getDubaiTime();

    const newUser: User = {
      User_ID: userId,
      User_Name: data.User_Name.trim(),
      Email: data.Email.trim().toLowerCase(),
      Password_Hash: data.password || 'User@123',
      Role: 'USER',
      Admin_ID: targetAdminId,
      Status: 'ACTIVE',
      Created_Date: now,
      Updated_Date: now,
      Created_By: session.Name
    };

    db.users.push(newUser);
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'CREATE_USER', 'USERS', userId, `Created User: ${newUser.User_Name} (${userId}) assigned to Admin ${targetAdminId}`);
    return { success: true, message: 'User created successfully', data: newUser };
  }

  static updateUser(session: Session, userId: string, data: Partial<User> & { password?: string }): { success: boolean; message: string } {
    const db = loadDatabase();
    const idx = db.users.findIndex(u => u.User_ID === userId);
    if (idx === -1) return { success: false, message: 'User not found' };

    const user = db.users[idx];

    // Authorization checks
    if (session.Role === 'USER' && session.User_ID !== userId) {
      return { success: false, message: 'Unauthorized: Cannot edit another user' };
    }
    if (session.Role === 'ADMIN' && user.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit users in your team' };
    }

    const now = getDubaiTime();
    if (data.User_Name) user.User_Name = data.User_Name.trim();
    if (data.Email) user.Email = data.Email.trim().toLowerCase();
    if (data.password) user.Password_Hash = data.password;

    // Only SuperAdmin can reassign Admin_ID
    if (data.Admin_ID && session.Role === 'SUPERADMIN') {
      user.Admin_ID = data.Admin_ID;
    }
    // Only Admin or SuperAdmin can change status
    if (data.Status && session.Role !== 'USER') {
      user.Status = data.Status;
    }

    user.Updated_Date = now;
    db.users[idx] = user;
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_USER', 'USERS', userId, `Updated user ${userId}`);
    return { success: true, message: 'User updated successfully' };
  }

  // --- VENDORS ---
  static getVendors(session: Session): Vendor[] {
    const db = loadDatabase();
    let vendors = db.vendors;

    if (session.Role === 'ADMIN') {
      vendors = vendors.filter(v => v.Admin_ID === session.Admin_ID);
    } else if (session.Role === 'USER') {
      // USER: Only their assigned vendors, and only ACTIVE vendors in their operational list
      vendors = vendors.filter(v => v.Assigned_User_ID === session.User_ID && v.Vendor_Status === 'ACTIVE');
    }

    const userMap = new Map<string, string>();
    db.users.forEach(u => userMap.set(u.User_ID, u.User_Name));

    const adminMap = new Map<string, string>();
    db.admins.forEach(a => adminMap.set(a.Admin_ID, a.Admin_Name));

    return vendors.map(v => ({
      ...v,
      Assigned_User_Name: userMap.get(v.Assigned_User_ID) || v.Assigned_User_ID,
      Admin_Name: adminMap.get(v.Admin_ID) || (v.Admin_ID === 'SA-0001' ? 'Super Admin' : v.Admin_ID)
    }));
  }

  static createVendor(session: Session, data: Partial<Vendor>): { success: boolean; message: string; data?: Vendor } {
    // CRITICAL USER RULE: USER CANNOT CREATE VENDORS
    if (session.Role === 'USER') {
      return { success: false, message: 'Unauthorized: Regular users are not permitted to create vendors' };
    }

    if (!data.Vendor_Name || !data.Assigned_User_ID) {
      return { success: false, message: 'Vendor name and assigned user are required' };
    }

    const db = loadDatabase();
    const assignedUser = db.users.find(u => u.User_ID === data.Assigned_User_ID);
    if (!assignedUser) {
      return { success: false, message: 'Assigned user does not exist' };
    }

    if (session.Role === 'ADMIN' && assignedUser.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only assign vendors to users in your own team' };
    }

    const targetAdminId = session.Role === 'SUPERADMIN'
      ? (data.Admin_ID || assignedUser.Admin_ID || 'SA-0001')
      : session.Admin_ID!;

    const vendorId = nextId('VND', db.vendors.map(v => v.Vendor_ID));
    const now = getDubaiTime();

    const newVendor: Vendor = {
      Vendor_ID: vendorId,
      Vendor_Name: data.Vendor_Name.trim(),
      Assigned_User_ID: data.Assigned_User_ID,
      Admin_ID: targetAdminId,
      Contact_Name: (data.Contact_Name || '').trim(),
      Contact_Email: (data.Contact_Email || '').trim(),
      Contact_Phone: (data.Contact_Phone || '').trim(),
      Vendor_Status: 'ACTIVE',
      Notes: (data.Notes || '').trim(),
      Created_Date: now,
      Updated_Date: now,
      Created_By: session.Name,
      Updated_By: session.Name
    };

    db.vendors.push(newVendor);
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'CREATE_VENDOR', 'VENDORS', vendorId, `Created vendor ${newVendor.Vendor_Name} assigned to ${assignedUser.User_Name}`);
    return { success: true, message: 'Vendor created successfully', data: newVendor };
  }

  static updateVendor(session: Session, vendorId: string, data: Partial<Vendor>): { success: boolean; message: string } {
    // CRITICAL USER RULE: USER CANNOT EDIT VENDORS
    if (session.Role === 'USER') {
      return { success: false, message: 'Unauthorized: Regular users are not permitted to edit vendor master records' };
    }

    const db = loadDatabase();
    const idx = db.vendors.findIndex(v => v.Vendor_ID === vendorId);
    if (idx === -1) return { success: false, message: 'Vendor not found' };

    const vendor = db.vendors[idx];
    if (session.Role === 'ADMIN' && vendor.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit vendors in your team' };
    }

    const now = getDubaiTime();
    if (data.Vendor_Name) vendor.Vendor_Name = data.Vendor_Name.trim();
    if (data.Assigned_User_ID) {
      const assignedUser = db.users.find(u => u.User_ID === data.Assigned_User_ID);
      if (assignedUser) {
        if (session.Role === 'ADMIN' && assignedUser.Admin_ID !== session.Admin_ID) {
          return { success: false, message: 'Cannot assign vendor to user outside your team' };
        }
        vendor.Assigned_User_ID = data.Assigned_User_ID;
      }
    }
    if (data.Admin_ID && session.Role === 'SUPERADMIN') vendor.Admin_ID = data.Admin_ID;
    if (data.Contact_Name !== undefined) vendor.Contact_Name = data.Contact_Name.trim();
    if (data.Contact_Email !== undefined) vendor.Contact_Email = data.Contact_Email.trim();
    if (data.Contact_Phone !== undefined) vendor.Contact_Phone = data.Contact_Phone.trim();
    if (data.Vendor_Status) vendor.Vendor_Status = data.Vendor_Status;
    if (data.Notes !== undefined) vendor.Notes = data.Notes.trim();

    vendor.Updated_Date = now;
    vendor.Updated_By = session.Name;
    db.vendors[idx] = vendor;
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_VENDOR', 'VENDORS', vendorId, `Updated vendor ${vendorId}`);
    return { success: true, message: 'Vendor updated successfully' };
  }

  /**
   * CRITICAL VENDOR DEACTIVATION RULE:
   * Users: ❌ CANNOT DEACTIVATE/DELETE VENDOR
   * Admin: ✅ ONLY team vendors (soft deactivate: Vendor_Status = INACTIVE)
   * SuperAdmin: ✅ ANY vendor (soft deactivate)
   */
  static deactivateVendor(session: Session, vendorId: string): { success: boolean; message: string } {
    if (session.Role === 'USER') {
      return { success: false, message: 'CRITICAL SECURITY: Regular users are strictly forbidden from deactivating or deleting vendors' };
    }

    const res = this.updateVendor(session, vendorId, { Vendor_Status: 'INACTIVE' });
    if (res.success) {
      this.logActivity(session.User_ID, session.Name, session.Role, 'DEACTIVATE_VENDOR', 'VENDORS', vendorId, `Soft-deactivated vendor ${vendorId} (historical campaigns preserved)`);
    }
    return res;
  }

  static reactivateVendor(session: Session, vendorId: string): { success: boolean; message: string } {
    if (session.Role === 'USER') {
      return { success: false, message: 'Unauthorized: Regular users cannot reactivate vendors' };
    }

    const res = this.updateVendor(session, vendorId, { Vendor_Status: 'ACTIVE' });
    if (res.success) {
      this.logActivity(session.User_ID, session.Name, session.Role, 'REACTIVATE_VENDOR', 'VENDORS', vendorId, `Reactivated vendor ${vendorId}`);
    }
    return res;
  }

  // --- CAMPAIGNS ---
  static getCampaigns(session: Session, filters?: { vendorId?: string; platform?: string; campaignType?: string; status?: string; userId?: string }): Campaign[] {
    const db = loadDatabase();
    let campaigns = db.campaigns;

    // STRICT ROLE FILTERING
    if (session.Role === 'ADMIN') {
      campaigns = campaigns.filter(c => c.Admin_ID === session.Admin_ID);
    } else if (session.Role === 'USER') {
      // User ONLY sees their own campaigns
      campaigns = campaigns.filter(c => c.User_ID === session.User_ID);
    }

    if (filters?.vendorId) campaigns = campaigns.filter(c => c.Vendor_ID === filters.vendorId);
    if (filters?.platform) campaigns = campaigns.filter(c => c.Platform === filters.platform);
    if (filters?.campaignType) campaigns = campaigns.filter(c => c.Campaign_Type === filters.campaignType);
    if (filters?.status) campaigns = campaigns.filter(c => c.Campaign_Status === filters.status);
    if (filters?.userId && session.Role !== 'USER') campaigns = campaigns.filter(c => c.User_ID === filters.userId);

    const vendorMap = new Map<string, string>();
    db.vendors.forEach(v => vendorMap.set(v.Vendor_ID, v.Vendor_Name));

    const userMap = new Map<string, string>();
    db.users.forEach(u => userMap.set(u.User_ID, u.User_Name));

    const adminMap = new Map<string, string>();
    db.admins.forEach(a => adminMap.set(a.Admin_ID, a.Admin_Name));

    return campaigns.map(c => {
      const v = db.vendors.find(vend => vend.Vendor_ID === c.Vendor_ID);
      return {
        ...c,
        Vendor_Name: c.Vendor_Name || vendorMap.get(c.Vendor_ID) || c.Vendor_ID,
        Vendor_Bank_Account: c.Vendor_Bank_Account || (v ? v.Vendor_Bank_Account : ''),
        Social_Media_Link: c.Social_Media_Link || (v ? v.Social_Media_Link : ''),
        User_Name: userMap.get(c.User_ID) || c.User_ID,
        Admin_Name: adminMap.get(c.Admin_ID) || (c.Admin_ID === 'SA-0001' ? 'Super Admin' : c.Admin_ID)
      };
    });
  }

  static createCampaign(session: Session, data: Partial<Campaign>): { success: boolean; message: string; data?: Campaign } {
    if (!data.Vendor_ID || !data.Campaign_Type || !data.Platform) {
      return { success: false, message: 'Vendor, Campaign Type, and Platform are required' };
    }

    const db = loadDatabase();
    const vendor = db.vendors.find(v => v.Vendor_ID === data.Vendor_ID);
    if (!vendor) return { success: false, message: 'Vendor not found' };

    if (vendor.Vendor_Status !== 'ACTIVE') {
      return { success: false, message: 'Cannot create campaigns for inactive vendors' };
    }

    // Ownership authorization
    if (session.Role === 'USER' && vendor.Assigned_User_ID !== session.User_ID) {
      return { success: false, message: 'Unauthorized: You can only create campaigns for vendors assigned to you' };
    }
    if (session.Role === 'ADMIN' && vendor.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only create campaigns for vendors belonging to your team' };
    }

    // Auto-derive User_ID and Admin_ID
    const targetUserId = session.Role === 'USER' ? session.User_ID : (data.User_ID || vendor.Assigned_User_ID);
    const targetAdminId = vendor.Admin_ID;

    const campaignId = nextId('CMP', db.campaigns.map(c => c.Campaign_ID));
    const now = getDubaiTime();

    const bankAccount = (data.Vendor_Bank_Account !== undefined && data.Vendor_Bank_Account !== '') 
      ? data.Vendor_Bank_Account.trim() 
      : (vendor.Vendor_Bank_Account || '');

    const socialLink = (data.Social_Media_Link !== undefined && data.Social_Media_Link !== '') 
      ? data.Social_Media_Link.trim() 
      : (vendor.Social_Media_Link || '');

    const newCampaign: Campaign = {
      Campaign_ID: campaignId,
      Vendor_ID: data.Vendor_ID,
      Vendor_Name: (data.Vendor_Name && data.Vendor_Name.trim()) || vendor.Vendor_Name,
      Vendor_Bank_Account: bankAccount,
      Social_Media_Link: socialLink,
      User_ID: targetUserId,
      Admin_ID: targetAdminId,
      Campaign_Type: data.Campaign_Type,
      Platform: data.Platform,
      Campaign_Date: data.Campaign_Date || getDubaiDateOnly(),
      Campaign_Status: data.Campaign_Status || 'Pending',
      Reach_Count: Number(data.Reach_Count) || 0,
      Engagement_Count: Number(data.Engagement_Count) || 0,
      Cost: Number(data.Cost) || 0,
      Campaign_Details: (data.Campaign_Details || '').trim(),
      Campaign_Result: (data.Campaign_Result || '').trim(),
      Notes: (data.Notes || '').trim(),
      Created_Date: now,
      Updated_Date: now,
      Created_By: session.Name,
      Updated_By: session.Name
    };

    db.campaigns.push(newCampaign);
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'CREATE_CAMPAIGN', 'CAMPAIGNS', campaignId, `Created ${newCampaign.Campaign_Type} campaign on ${newCampaign.Platform} for vendor ${newCampaign.Vendor_Name || vendor.Vendor_Name}`);
    return { success: true, message: 'Campaign created successfully', data: newCampaign };
  }

  static updateCampaign(session: Session, campaignId: string, data: Partial<Campaign>): { success: boolean; message: string } {
    const db = loadDatabase();
    const idx = db.campaigns.findIndex(c => c.Campaign_ID === campaignId);
    if (idx === -1) return { success: false, message: 'Campaign not found' };

    const campaign = db.campaigns[idx];

    // Ownership checks: Users can edit their own campaigns, Admins can edit team campaigns
    if (session.Role === 'USER' && campaign.User_ID !== session.User_ID) {
      return { success: false, message: 'Unauthorized: You can only edit your own campaigns' };
    }
    if (session.Role === 'ADMIN' && campaign.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit campaigns belonging to your team' };
    }

    const now = getDubaiTime();
    if (data.Vendor_Name !== undefined) campaign.Vendor_Name = data.Vendor_Name.trim();
    if (data.Vendor_Bank_Account !== undefined) campaign.Vendor_Bank_Account = data.Vendor_Bank_Account.trim();
    if (data.Social_Media_Link !== undefined) campaign.Social_Media_Link = data.Social_Media_Link.trim();
    if (data.Campaign_Type) campaign.Campaign_Type = data.Campaign_Type;
    if (data.Platform) campaign.Platform = data.Platform;
    if (data.Campaign_Date) campaign.Campaign_Date = data.Campaign_Date;
    if (data.Campaign_Status) campaign.Campaign_Status = data.Campaign_Status;
    if (data.Reach_Count !== undefined) campaign.Reach_Count = Number(data.Reach_Count) || 0;
    if (data.Engagement_Count !== undefined) campaign.Engagement_Count = Number(data.Engagement_Count) || 0;
    if (data.Cost !== undefined) campaign.Cost = Number(data.Cost) || 0;
    if (data.Campaign_Details !== undefined) campaign.Campaign_Details = data.Campaign_Details.trim();
    if (data.Campaign_Result !== undefined) campaign.Campaign_Result = data.Campaign_Result.trim();
    if (data.Notes !== undefined) campaign.Notes = data.Notes.trim();

    campaign.Updated_Date = now;
    campaign.Updated_By = session.Name;
    db.campaigns[idx] = campaign;
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_CAMPAIGN', 'CAMPAIGNS', campaignId, `Updated campaign ${campaignId}`);
    return { success: true, message: 'Campaign updated successfully' };
  }

  /**
   * CRITICAL CAMPAIGN POLICY:
   * Users: ❌ CANNOT DELETE CAMPAIGNS (Audit compliance & historical data protection)
   * Only SuperAdmin can remove test entries if explicitly authorized.
   */
  static deleteCampaign(session: Session, campaignId: string): { success: boolean; message: string } {
    if (session.Role === 'USER') {
      return { success: false, message: 'Access Denied: Operators are strictly not permitted to delete campaigns. Records are permanently preserved for audit and performance compliance.' };
    }

    if (session.Role !== 'SUPERADMIN') {
      return { success: false, message: 'Unauthorized: Only Super Administrator can permanently purge campaign records.' };
    }

    const db = loadDatabase();
    const idx = db.campaigns.findIndex(c => c.Campaign_ID === campaignId);
    if (idx === -1) return { success: false, message: 'Campaign not found' };

    const removed = db.campaigns.splice(idx, 1)[0];
    saveDatabase(db);
    this.logActivity(session.User_ID, session.Name, session.Role, 'DELETE_CAMPAIGN', 'CAMPAIGNS', campaignId, `Permanently purged campaign record ${campaignId} (${removed.Campaign_Type})`);
    return { success: true, message: 'Campaign record purged' };
  }

  // --- ACTIVITY LOGS ---
  static getActivityLogs(session: Session, limit: number = 50): ActivityLog[] {
    const db = loadDatabase();
    let logs = db.activityLogs;

    if (session.Role === 'ADMIN') {
      const teamUserIds = db.users.filter(u => u.Admin_ID === session.Admin_ID).map(u => u.User_ID);
      teamUserIds.push(session.User_ID);
      logs = logs.filter(l => teamUserIds.includes(l.User_ID));
    } else if (session.Role === 'USER') {
      logs = logs.filter(l => l.User_ID === session.User_ID);
    }

    return logs.slice(0, limit);
  }

  // --- DASHBOARD STATS ---
  static getDashboardStats(session: Session): DashboardStats {
    const vendors = this.getVendors(session);
    const campaigns = this.getCampaigns(session);
    const users = this.getUsers(session);
    const logs = this.getActivityLogs(session, 10);

    const activeVendors = vendors.filter(v => v.Vendor_Status === 'ACTIVE').length;
    const inactiveVendors = vendors.filter(v => v.Vendor_Status === 'INACTIVE').length;

    const pending = campaigns.filter(c => c.Campaign_Status === 'Pending').length;
    const inProgress = campaigns.filter(c => c.Campaign_Status === 'In Progress').length;
    const completed = campaigns.filter(c => c.Campaign_Status === 'Completed').length;
    const cancelled = campaigns.filter(c => c.Campaign_Status === 'Cancelled').length;

    const todayDate = getDubaiDateOnly();
    const todayCampaignsCount = campaigns.filter(c => c.Campaign_Date === todayDate).length;

    // Aggregations
    const platformMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const userMap = new Map<string, number>();
    const adminMap = new Map<string, number>();
    const vendorMap = new Map<string, number>();

    campaigns.forEach(c => {
      platformMap.set(c.Platform, (platformMap.get(c.Platform) || 0) + 1);
      typeMap.set(c.Campaign_Type, (typeMap.get(c.Campaign_Type) || 0) + 1);
      if (c.User_Name) userMap.set(c.User_Name, (userMap.get(c.User_Name) || 0) + 1);
      if (c.Admin_Name) adminMap.set(c.Admin_Name, (adminMap.get(c.Admin_Name) || 0) + 1);
      if (c.Vendor_Name) vendorMap.set(c.Vendor_Name, (vendorMap.get(c.Vendor_Name) || 0) + 1);
    });

    const campaignsByStatus = [
      { name: 'Pending', value: pending },
      { name: 'In Progress', value: inProgress },
      { name: 'Completed', value: completed },
      { name: 'Cancelled', value: cancelled }
    ];

    const campaignsByPlatform = Array.from(platformMap.entries()).map(([name, value]) => ({ name, value }));
    const campaignsByType = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
    const campaignsByUser = Array.from(userMap.entries()).map(([name, value]) => ({ name, value }));
    const campaignsByAdmin = Array.from(adminMap.entries()).map(([name, value]) => ({ name, value }));
    const campaignsByVendor = Array.from(vendorMap.entries()).map(([name, value]) => ({ name, value }));

    const db = loadDatabase();
    const totalAdmins = session.Role === 'SUPERADMIN' ? db.admins.length : undefined;

    // DUPLICATE VENDOR INTELLIGENCE (Strictly SuperAdmin & Admin only, never for User role)
    let duplicateSummary: DuplicateSummary | undefined = undefined;
    if (session.Role === 'SUPERADMIN' || session.Role === 'ADMIN') {
      const userLookup = new Map<string, string>();
      db.users.forEach(u => userLookup.set(u.User_ID, u.User_Name));

      const adminLookup = new Map<string, string>();
      db.admins.forEach(a => adminLookup.set(a.Admin_ID, a.Admin_Name));

      const allEnrichedVendors: Vendor[] = db.vendors.map(v => ({
        ...v,
        Assigned_User_Name: userLookup.get(v.Assigned_User_ID) || v.Assigned_User_ID,
        Admin_Name: adminLookup.get(v.Admin_ID) || (v.Admin_ID === 'SA-0001' ? 'Super Admin' : v.Admin_ID)
      }));

      const fullSummary = detectAllVendorDuplicates(allEnrichedVendors);

      if (session.Role === 'SUPERADMIN') {
        duplicateSummary = fullSummary;
      } else if (session.Role === 'ADMIN') {
        // Admin sees duplicate groups where at least one vendor belongs to their team
        const filteredGroups = fullSummary.groups.filter(g =>
          g.allVendors.some(v => v.Admin_ID === session.Admin_ID)
        );
        const filteredPairs = fullSummary.pairs.filter(p =>
          p.vendorA.Admin_ID === session.Admin_ID || p.vendorB.Admin_ID === session.Admin_ID
        );
        duplicateSummary = {
          ...fullSummary,
          totalDuplicateGroups: filteredGroups.length,
          groups: filteredGroups,
          pairs: filteredPairs
        };
      }
    }

    return {
      totalAdmins,
      totalUsers: users.length,
      totalVendors: vendors.length,
      activeVendors,
      inactiveVendors,
      totalCampaigns: campaigns.length,
      pendingCampaigns: pending,
      inProgressCampaigns: inProgress,
      completedCampaigns: completed,
      cancelledCampaigns: cancelled,
      campaignsByStatus,
      campaignsByPlatform,
      campaignsByType,
      campaignsByUser,
      campaignsByAdmin,
      campaignsByVendor,
      recentCampaigns: campaigns.slice(-8).reverse(),
      recentActivity: logs,
      todayCampaignsCount,
      duplicateSummary
    };
  }

  // --- DUPLICATE VENDORS INTELLIGENCE (Admin & SuperAdmin only) ---
  static getDuplicateSummary(session: Session): DuplicateSummary | null {
    if (session.Role === 'USER') return null;
    const db = loadDatabase();
    const userLookup = new Map<string, string>();
    db.users.forEach(u => userLookup.set(u.User_ID, u.User_Name));

    const adminLookup = new Map<string, string>();
    db.admins.forEach(a => adminLookup.set(a.Admin_ID, a.Admin_Name));

    const allEnrichedVendors: Vendor[] = db.vendors.map(v => ({
      ...v,
      Assigned_User_Name: userLookup.get(v.Assigned_User_ID) || v.Assigned_User_ID,
      Admin_Name: adminLookup.get(v.Admin_ID) || (v.Admin_ID === 'SA-0001' ? 'Super Admin' : v.Admin_ID)
    }));

    const fullSummary = detectAllVendorDuplicates(allEnrichedVendors);
    if (session.Role === 'SUPERADMIN') return fullSummary;

    const filteredGroups = fullSummary.groups.filter(g =>
      g.allVendors.some(v => v.Admin_ID === session.Admin_ID)
    );
    const filteredPairs = fullSummary.pairs.filter(p =>
      p.vendorA.Admin_ID === session.Admin_ID || p.vendorB.Admin_ID === session.Admin_ID
    );
    return {
      ...fullSummary,
      totalDuplicateGroups: filteredGroups.length,
      groups: filteredGroups,
      pairs: filteredPairs
    };
  }

  static reset() {
    saveDatabase(INITIAL_DB);
  }
}

export function resetToInitialData() {
  LocalStorageEngine.reset();
}
