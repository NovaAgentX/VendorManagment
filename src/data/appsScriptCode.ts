export interface ScriptFile {
  name: string;
  description: string;
  code: string;
}

export const APPS_SCRIPT_FILES: ScriptFile[] = [
  {
    name: 'Code.gs',
    description: 'Main Web App Router, CORS handling, and Request Dispatcher',
    code: `/**
 * Vendor & Campaign Tracker Backend
 * Google Apps Script Web App API
 * Timezone: Asia/Dubai
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var output = {};
  try {
    var contents = {};
    if (e && e.postData && e.postData.contents) {
      try {
        contents = JSON.parse(e.postData.contents);
      } catch (err) {
        contents = e.parameter || {};
      }
    } else if (e && e.parameter) {
      contents = e.parameter;
    }

    var action = contents.action || (e && e.parameter ? e.parameter.action : '');
    var sessionToken = contents.sessionToken || (e && e.parameter ? e.parameter.sessionToken : '');
    var payload = contents.payload || contents;
    payload = normalizePayload(payload);

    if (!action) {
      output = { success: false, message: 'Missing action parameter' };
      return createJsonResponse(output, e);
    }

    // Public Actions
    if (action === 'login') {
      output = handleLogin(payload.identifier || payload.email || payload.userId, payload.password);
      return createJsonResponse(output, e);
    }
    
    if (action === 'ping' || action === 'health') {
      output = { 
        success: true, 
        message: 'Google Apps Script Vendor Tracker API is active', 
        timezone: CONFIG.TIMEZONE,
        serverTime: formatDubaiDate(new Date()) 
      };
      return createJsonResponse(output, e);
    }

    // Validate Session for protected routes
    var session = validateSession(sessionToken);
    if (!session.valid) {
      output = { success: false, message: 'Unauthorized: ' + (session.error || 'Invalid or expired session') };
      return createJsonResponse(output, e);
    }

    var userSession = session.data;

    // Protected Route Dispatcher
    switch (action) {
      case 'validateSession':
        output = { success: true, message: 'Session is valid', data: userSession };
        break;

      case 'logout':
        output = handleLogout(sessionToken, userSession);
        break;

      case 'getDashboard':
        output = getDashboardData(userSession);
        break;

      // Admin Management (SuperAdmin only)
      case 'getAdmins':
        output = getAdmins(userSession);
        break;
      case 'createAdmin':
        output = createAdmin(userSession, payload);
        break;
      case 'updateAdmin':
        output = updateAdmin(userSession, payload);
        break;
      case 'deactivateAdmin':
        output = deactivateAdmin(userSession, payload.adminId, payload.status);
        break;

      // User Management (SuperAdmin & Admin)
      case 'getUsers':
        output = getUsers(userSession);
        break;
      case 'createUser':
        output = createUser(userSession, payload);
        break;
      case 'updateUser':
        output = updateUser(userSession, payload);
        break;
      case 'deactivateUser':
        output = deactivateUser(userSession, payload.userId, payload.status);
        break;

      // Vendor Management
      case 'getVendors':
        output = getVendors(userSession);
        break;
      case 'createVendor':
        output = createVendor(userSession, payload);
        break;
      case 'updateVendor':
        output = updateVendor(userSession, payload);
        break;
      case 'assignVendor':
        output = assignVendor(userSession, payload.vendorId, payload.assignedUserId);
        break;
      case 'deactivateVendor':
        output = deactivateVendor(userSession, payload.vendorId);
        break;
      case 'reactivateVendor':
        output = reactivateVendor(userSession, payload.vendorId);
        break;

      // Campaign Management
      case 'getCampaigns':
        output = getCampaigns(userSession, payload.filters || {});
        break;
      case 'createCampaign':
        output = createCampaign(userSession, payload);
        break;
      case 'updateCampaign':
        output = updateCampaign(userSession, payload);
        break;
      case 'updateCampaignStatus':
        output = updateCampaignStatus(userSession, payload.campaignId, payload.status);
        break;

      // Activity Logs
      case 'getActivityLogs':
        output = getActivityLogs(userSession, payload.limit);
        break;

      // System Settings (SuperAdmin)
      case 'getSettings':
        output = getSettings(userSession);
        break;

      default:
        output = { success: false, message: 'Unknown action: ' + action };
    }

  } catch (err) {
    output = { success: false, message: 'Server error: ' + err.toString() };
  }

  return createJsonResponse(output, e);
}

// The frontend sends spreadsheet-style keys (Admin_Name, Email, Vendor_Name, ...)
// while the functions below read lowercase/camelCase keys (name, email, vendorName, ...).
// This normalizes an incoming payload so either naming convention works, without
// having to touch every create/update function individually.
function normalizePayload(data) {
  if (!data || typeof data !== 'object') return data;

  function fill(target, key, aliases) {
    if (target[key] !== undefined && target[key] !== null && target[key] !== '') return;
    for (var i = 0; i < aliases.length; i++) {
      var v = target[aliases[i]];
      if (v !== undefined && v !== null && v !== '') {
        target[key] = v;
        return;
      }
    }
  }

  // Admin
  fill(data, 'name', ['Admin_Name', 'User_Name', 'Name']);
  fill(data, 'email', ['Email']);
  fill(data, 'status', ['Status', 'Vendor_Status', 'Campaign_Status']);

  // User
  fill(data, 'adminId', ['Admin_ID']);

  // Vendor
  fill(data, 'vendorId', ['Vendor_ID']);
  fill(data, 'vendorName', ['Vendor_Name']);
  fill(data, 'assignedUserId', ['Assigned_User_ID']);
  fill(data, 'contactName', ['Contact_Name']);
  fill(data, 'contactEmail', ['Contact_Email']);
  fill(data, 'contactPhone', ['Contact_Phone']);
  fill(data, 'bankAccount', ['Vendor_Bank_Account']);
  fill(data, 'socialLink', ['Social_Media_Link']);
  fill(data, 'notes', ['Notes']);

  // Campaign
  fill(data, 'campaignId', ['Campaign_ID']);
  fill(data, 'campaignType', ['Campaign_Type']);
  fill(data, 'platform', ['Platform']);
  fill(data, 'campaignDate', ['Campaign_Date']);
  fill(data, 'campaignStatus', ['Campaign_Status']);
  fill(data, 'cost', ['Cost']);
  fill(data, 'campaignDetails', ['Campaign_Details']);
  fill(data, 'campaignResult', ['Campaign_Result']);

  return data;
}

function createJsonResponse(data, e) {
  var callback = e && e.parameter ? e.parameter.callback : null;
  var jsonString = JSON.stringify(data);

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}`
  },
  {
    name: 'Config.gs',
    description: 'System Constants, Timezone (Asia/Dubai), and Sheet Names Configuration',
    code: `/**
 * Global Configuration Settings
 */
var CONFIG = {
  TIMEZONE: 'Asia/Dubai',
  ORG_NAME: 'Vendor Tracker Enterprise',
  SESSION_TTL_MINUTES: 720, // 12 hours
  LOCK_TIMEOUT_MS: 15000,
  
  SHEETS: {
    ADMINS: 'Admins',
    USERS: 'Users',
    VENDORS: 'Vendors',
    CAMPAIGNS: 'Campaigns',
    ACTIVITY_LOG: 'Activity_Log',
    SETTINGS: 'Settings',
    SESSIONS: '_Sessions'
  },

  ROLES: {
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
    USER: 'USER'
  },

  VENDOR_STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  },

  CAMPAIGN_STATUS: {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  }
};

function getSpreadsheet() {
  // If running inside bound script, ActiveSpreadsheet works.
  // Or specify your explicit Sheet ID below:
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    var sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId);
    }
    throw new Error('Spreadsheet ID not configured. Bind script to a Google Sheet or set SPREADSHEET_ID script property.');
  }
}`
  },
  {
    name: 'Auth.gs',
    description: 'Authentication, SHA-256 Password Hash, and Session Token Lifecycle',
    code: `/**
 * Authentication and Session Management
 */

function handleLogin(identifier, password) {
  if (!identifier || !password) {
    return { success: false, message: 'Email/User ID and password are required' };
  }

  var cleanIdentifier = String(identifier).trim().toLowerCase();
  var passwordHash = hashPassword(password);
  var ss = getSpreadsheet();

  // 1. Check SuperAdmin in Script Properties or Settings
  var superAdminEmail = PropertiesService.getScriptProperties().getProperty('SUPERADMIN_EMAIL');
  var superAdminHash = PropertiesService.getScriptProperties().getProperty('SUPERADMIN_HASH');
  var superAdminName = PropertiesService.getScriptProperties().getProperty('SUPERADMIN_NAME') || 'Super Admin';

  if (superAdminEmail && superAdminEmail.toLowerCase() === cleanIdentifier) {
    if (superAdminHash === passwordHash) {
      var session = createSessionRecord('SA-0001', CONFIG.ROLES.SUPERADMIN, '', superAdminName, superAdminEmail);
      logActivity('SA-0001', superAdminName, CONFIG.ROLES.SUPERADMIN, 'LOGIN', 'AUTH', 'SA-0001', 'Super Admin logged in');
      return {
        success: true,
        message: 'Super Admin login successful',
        data: session
      };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  }

  // 2. Check Admins Sheet
  var adminSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
  var adminData = getSheetObjects(adminSheet);
  var matchedAdmin = adminData.find(function(a) {
    return (a.Email && a.Email.toLowerCase() === cleanIdentifier) || (a.Admin_ID && a.Admin_ID.toLowerCase() === cleanIdentifier);
  });

  if (matchedAdmin) {
    if (matchedAdmin.Status !== 'ACTIVE') {
      return { success: false, message: 'This Admin account has been deactivated' };
    }
    if (matchedAdmin.Password_Hash === passwordHash) {
      var adminSession = createSessionRecord(matchedAdmin.Admin_ID, CONFIG.ROLES.ADMIN, matchedAdmin.Admin_ID, matchedAdmin.Admin_Name, matchedAdmin.Email);
      logActivity(matchedAdmin.Admin_ID, matchedAdmin.Admin_Name, CONFIG.ROLES.ADMIN, 'LOGIN', 'AUTH', matchedAdmin.Admin_ID, 'Admin logged in');
      return {
        success: true,
        message: 'Admin login successful',
        data: adminSession
      };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  }

  // 3. Check Users Sheet
  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var userData = getSheetObjects(userSheet);
  var matchedUser = userData.find(function(u) {
    return (u.Email && u.Email.toLowerCase() === cleanIdentifier) || (u.User_ID && u.User_ID.toLowerCase() === cleanIdentifier);
  });

  if (matchedUser) {
    if (matchedUser.Status !== 'ACTIVE') {
      return { success: false, message: 'This User account has been deactivated' };
    }
    if (matchedUser.Password_Hash === passwordHash) {
      var userSession = createSessionRecord(matchedUser.User_ID, CONFIG.ROLES.USER, matchedUser.Admin_ID, matchedUser.User_Name, matchedUser.Email);
      logActivity(matchedUser.User_ID, matchedUser.User_Name, CONFIG.ROLES.USER, 'LOGIN', 'AUTH', matchedUser.User_ID, 'User logged in');
      return {
        success: true,
        message: 'User login successful',
        data: userSession
      };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  }

  return { success: false, message: 'Invalid email/ID or password' };
}

function handleLogout(sessionToken, userSession) {
  if (sessionToken) {
    deleteSessionRecord(sessionToken);
  }
  if (userSession) {
    logActivity(userSession.User_ID, userSession.Name, userSession.Role, 'LOGOUT', 'AUTH', userSession.User_ID, userSession.Role + ' logged out');
  }
  return { success: true, message: 'Logged out successfully' };
}

function createSessionRecord(userId, role, adminId, name, email) {
  var sessionId = 'SESS_' + Utilities.getUuid();
  var now = new Date().getTime();
  var expiry = now + (CONFIG.SESSION_TTL_MINUTES * 60 * 1000);

  var sessionData = {
    Session_ID: sessionId,
    User_ID: userId,
    Role: role,
    Admin_ID: adminId || '',
    Name: name,
    Email: email,
    Expiry: expiry
  };

  // Store in CacheService or Sessions sheet
  var cache = CacheService.getScriptCache();
  cache.put(sessionId, JSON.stringify(sessionData), 21600); // 6 hours

  // Backup in Properties
  var userProps = PropertiesService.getUserProperties();
  userProps.setProperty(sessionId, JSON.stringify(sessionData));

  return sessionData;
}

function validateSession(sessionId) {
  if (!sessionId) {
    return { valid: false, error: 'No session token provided' };
  }

  var cache = CacheService.getScriptCache();
  var cached = cache.get(sessionId);
  var session = null;

  if (cached) {
    session = JSON.parse(cached);
  } else {
    var userProps = PropertiesService.getUserProperties();
    var stored = userProps.getProperty(sessionId);
    if (stored) {
      session = JSON.parse(stored);
      cache.put(sessionId, stored, 21600);
    }
  }

  if (!session) {
    return { valid: false, error: 'Session expired or not found' };
  }

  var now = new Date().getTime();
  if (now > session.Expiry) {
    deleteSessionRecord(sessionId);
    return { valid: false, error: 'Session has expired' };
  }

  return { valid: true, data: session };
}

function deleteSessionRecord(sessionId) {
  CacheService.getScriptCache().remove(sessionId);
  PropertiesService.getUserProperties().deleteProperty(sessionId);
}

function hashPassword(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var txtHash = '';
  for (var i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    var byteString = hashVal.toString(16);
    if (byteString.length == 1) byteString = '0' + byteString;
    txtHash += byteString;
  }
  return txtHash;
}`
  },
  {
    name: 'Admins.gs',
    description: 'Admin Management (SuperAdmin Exclusive)',
    code: `/**
 * Admin Management Logic (SUPERADMIN Only)
 */

function getAdmins(session) {
  if (session.Role !== CONFIG.ROLES.SUPERADMIN) {
    return { success: false, message: 'Unauthorized: Super Admin access required' };
  }

  var ss = getSpreadsheet();
  var adminSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
  var admins = getSheetObjects(adminSheet);

  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var users = getSheetObjects(userSheet);

  var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
  var vendors = getSheetObjects(vendorSheet);

  var result = admins.map(function(admin) {
    var userCount = users.filter(function(u) { return u.Admin_ID === admin.Admin_ID && u.Status === 'ACTIVE'; }).length;
    var vendorCount = vendors.filter(function(v) { return v.Admin_ID === admin.Admin_ID && v.Vendor_Status === 'ACTIVE'; }).length;
    
    // Omit Password_Hash from response
    var safeAdmin = Object.assign({}, admin);
    delete safeAdmin.Password_Hash;
    safeAdmin.userCount = userCount;
    safeAdmin.vendorCount = vendorCount;
    return safeAdmin;
  });

  return { success: true, data: result };
}

function createAdmin(session, data) {
  if (session.Role !== CONFIG.ROLES.SUPERADMIN) {
    return { success: false, message: 'Unauthorized: Super Admin access required' };
  }

  if (!data.name || !data.email || !data.password) {
    return { success: false, message: 'Name, email, and password are required' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
    var admins = getSheetObjects(sheet);

    var emailExists = admins.some(function(a) { return a.Email && a.Email.toLowerCase() === data.email.toLowerCase(); });
    if (emailExists) {
      return { success: false, message: 'An admin with this email already exists' };
    }

    var adminId = generateId('ADM', admins.map(function(a) { return a.Admin_ID; }));
    var now = formatDubaiDate(new Date());

    var newRow = [
      adminId,
      data.name.trim(),
      data.email.trim().toLowerCase(),
      hashPassword(data.password),
      'ACTIVE',
      now,
      now,
      session.Name
    ];

    sheet.appendRow(newRow);

    logActivity(session.User_ID, session.Name, session.Role, 'CREATE_ADMIN', 'ADMINS', adminId, 'Created Admin: ' + data.name + ' (' + adminId + ')');

    return { 
      success: true, 
      message: 'Admin created successfully', 
      data: { Admin_ID: adminId, Admin_Name: data.name, Email: data.email, Status: 'ACTIVE' } 
    };

  } finally {
    lock.releaseLock();
  }
}

function updateAdmin(session, data) {
  if (session.Role !== CONFIG.ROLES.SUPERADMIN) {
    return { success: false, message: 'Unauthorized: Super Admin access required' };
  }

  if (!data.adminId) {
    return { success: false, message: 'Admin ID is required' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];

    var idCol = headers.indexOf('Admin_ID');
    var nameCol = headers.indexOf('Admin_Name');
    var emailCol = headers.indexOf('Email');
    var passCol = headers.indexOf('Password_Hash');
    var statusCol = headers.indexOf('Status');
    var updatedCol = headers.indexOf('Updated_Date');

    var targetRowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idCol] === data.adminId) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Admin not found' };
    }

    var now = formatDubaiDate(new Date());
    if (data.name) sheet.getRange(targetRowIndex, nameCol + 1).setValue(data.name.trim());
    if (data.email) sheet.getRange(targetRowIndex, emailCol + 1).setValue(data.email.trim().toLowerCase());
    if (data.password) sheet.getRange(targetRowIndex, passCol + 1).setValue(hashPassword(data.password));
    if (data.status) sheet.getRange(targetRowIndex, statusCol + 1).setValue(data.status);
    sheet.getRange(targetRowIndex, updatedCol + 1).setValue(now);

    logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_ADMIN', 'ADMINS', data.adminId, 'Updated Admin details: ' + data.adminId);

    return { success: true, message: 'Admin updated successfully' };

  } finally {
    lock.releaseLock();
  }
}

function deactivateAdmin(session, adminId, status) {
  if (session.Role !== CONFIG.ROLES.SUPERADMIN) {
    return { success: false, message: 'Unauthorized: Super Admin access required' };
  }

  var newStatus = status || 'INACTIVE';
  return updateAdmin(session, { adminId: adminId, status: newStatus });
}`
  },
  {
    name: 'Users.gs',
    description: 'User Management & Team Assignment (SuperAdmin & Admin Scoped)',
    code: `/**
 * User Management Logic
 */

function getUsers(session) {
  var ss = getSpreadsheet();
  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var users = getSheetObjects(userSheet);

  var adminSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
  var admins = getSheetObjects(adminSheet);
  var adminMap = {};
  admins.forEach(function(a) { adminMap[a.Admin_ID] = a.Admin_Name; });

  var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
  var vendors = getSheetObjects(vendorSheet);

  var campaignSheet = getOrCreateSheet(ss, CONFIG.SHEETS.CAMPAIGNS);
  var campaigns = getSheetObjects(campaignSheet);

  // Filter based on role
  var filteredUsers = [];
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    filteredUsers = users;
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    filteredUsers = users.filter(function(u) { return u.Admin_ID === session.Admin_ID; });
  } else {
    // User can only see themselves
    filteredUsers = users.filter(function(u) { return u.User_ID === session.User_ID; });
  }

  var result = filteredUsers.map(function(u) {
    var safeUser = Object.assign({}, u);
    delete safeUser.Password_Hash;
    safeUser.Admin_Name = adminMap[u.Admin_ID] || (u.Admin_ID === 'SA-0001' ? 'Super Admin' : u.Admin_ID);
    safeUser.vendorCount = vendors.filter(function(v) { return v.Assigned_User_ID === u.User_ID && v.Vendor_Status === 'ACTIVE'; }).length;
    safeUser.campaignCount = campaigns.filter(function(c) { return c.User_ID === u.User_ID; }).length;
    return safeUser;
  });

  return { success: true, data: result };
}

function createUser(session, data) {
  // Only SuperAdmin or Admin can create users
  if (session.Role === CONFIG.ROLES.USER) {
    return { success: false, message: 'Unauthorized: Users cannot create accounts' };
  }

  if (!data.name || !data.email || !data.password) {
    return { success: false, message: 'Name, email, and password are required' };
  }

  // Admin ID derivation
  var targetAdminId = '';
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    targetAdminId = data.adminId || 'SA-0001';
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    targetAdminId = session.Admin_ID; // Enforce Admin's own team
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
    var users = getSheetObjects(sheet);

    var emailExists = users.some(function(u) { return u.Email && u.Email.toLowerCase() === data.email.toLowerCase(); });
    if (emailExists) {
      return { success: false, message: 'A user with this email already exists' };
    }

    var userId = generateId('USR', users.map(function(u) { return u.User_ID; }));
    var now = formatDubaiDate(new Date());

    var newRow = [
      userId,
      data.name.trim(),
      data.email.trim().toLowerCase(),
      hashPassword(data.password),
      CONFIG.ROLES.USER,
      targetAdminId,
      'ACTIVE',
      now,
      now,
      session.Name
    ];

    sheet.appendRow(newRow);

    logActivity(session.User_ID, session.Name, session.Role, 'CREATE_USER', 'USERS', userId, 'Created User: ' + data.name + ' assigned to ' + targetAdminId);

    return { 
      success: true, 
      message: 'User created successfully', 
      data: { User_ID: userId, User_Name: data.name, Email: data.email, Admin_ID: targetAdminId, Status: 'ACTIVE' } 
    };

  } finally {
    lock.releaseLock();
  }
}

function updateUser(session, data) {
  if (session.Role === CONFIG.ROLES.USER && session.User_ID !== data.userId) {
    return { success: false, message: 'Unauthorized: Cannot edit another user' };
  }

  if (!data.userId) {
    return { success: false, message: 'User ID is required' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];

    var idCol = headers.indexOf('User_ID');
    var nameCol = headers.indexOf('User_Name');
    var emailCol = headers.indexOf('Email');
    var passCol = headers.indexOf('Password_Hash');
    var adminCol = headers.indexOf('Admin_ID');
    var statusCol = headers.indexOf('Status');
    var updatedCol = headers.indexOf('Updated_Date');

    var targetRowIndex = -1;
    var existingRow = null;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idCol] === data.userId) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'User not found' };
    }

    // Verify Admin ownership
    if (session.Role === CONFIG.ROLES.ADMIN && existingRow[adminCol] !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit users in your team' };
    }

    var now = formatDubaiDate(new Date());
    if (data.name) sheet.getRange(targetRowIndex, nameCol + 1).setValue(data.name.trim());
    if (data.email) sheet.getRange(targetRowIndex, emailCol + 1).setValue(data.email.trim().toLowerCase());
    if (data.password) sheet.getRange(targetRowIndex, passCol + 1).setValue(hashPassword(data.password));
    
    // Only SuperAdmin can reassign Admin_ID
    if (data.adminId && session.Role === CONFIG.ROLES.SUPERADMIN) {
      sheet.getRange(targetRowIndex, adminCol + 1).setValue(data.adminId);
    }
    
    // Only Admin or SuperAdmin can change status
    if (data.status && (session.Role === CONFIG.ROLES.SUPERADMIN || session.Role === CONFIG.ROLES.ADMIN)) {
      sheet.getRange(targetRowIndex, statusCol + 1).setValue(data.status);
    }

    sheet.getRange(targetRowIndex, updatedCol + 1).setValue(now);

    logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_USER', 'USERS', data.userId, 'Updated user: ' + data.userId);

    return { success: true, message: 'User updated successfully' };

  } finally {
    lock.releaseLock();
  }
}

function deactivateUser(session, userId, status) {
  if (session.Role === CONFIG.ROLES.USER) {
    return { success: false, message: 'Unauthorized: Users cannot deactivate accounts' };
  }
  return updateUser(session, { userId: userId, status: status || 'INACTIVE' });
}`
  },
  {
    name: 'Vendors.gs',
    description: 'Vendor Management & Strict Role-Based Access Control',
    code: `/**
 * Vendor Management Logic
 * STRICT RULE: Users CANNOT create, edit, deactivate, or delete vendors!
 */

function getVendors(session) {
  var ss = getSpreadsheet();
  var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
  var vendors = getSheetObjects(vendorSheet);

  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var users = getSheetObjects(userSheet);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u.User_Name; });

  var adminSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
  var admins = getSheetObjects(adminSheet);
  var adminMap = {};
  admins.forEach(function(a) { adminMap[a.Admin_ID] = a.Admin_Name; });

  // STRICT SERVER-SIDE SEGREGATION
  var filtered = [];
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    filtered = vendors;
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    filtered = vendors.filter(function(v) { return v.Admin_ID === session.Admin_ID; });
  } else {
    // USER: Only their assigned vendors
    filtered = vendors.filter(function(v) { 
      return v.Assigned_User_ID === session.User_ID && v.Vendor_Status === CONFIG.VENDOR_STATUS.ACTIVE; 
    });
  }

  var result = filtered.map(function(v) {
    var item = Object.assign({}, v);
    item.Assigned_User_Name = userMap[v.Assigned_User_ID] || v.Assigned_User_ID;
    item.Admin_Name = adminMap[v.Admin_ID] || (v.Admin_ID === 'SA-0001' ? 'Super Admin' : v.Admin_ID);
    return item;
  });

  return { success: true, data: result };
}

function createVendor(session, data) {
  // CRITICAL RULE: Only SUPERADMIN can create vendors. Admins and Users are view-only for vendor creation.
  if (session.Role !== CONFIG.ROLES.SUPERADMIN) {
    return { success: false, message: 'Unauthorized: Only Super Admin can create vendors' };
  }

  if (!data.vendorName || !data.assignedUserId) {
    return { success: false, message: 'Vendor name and assigned user are required' };
  }

  var ss = getSpreadsheet();
  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var users = getSheetObjects(userSheet);
  var assignedUser = users.find(function(u) { return u.User_ID === data.assignedUserId; });

  if (!assignedUser) {
    return { success: false, message: 'Assigned user does not exist' };
  }

  // Admin cannot assign outside their team
  if (session.Role === CONFIG.ROLES.ADMIN && assignedUser.Admin_ID !== session.Admin_ID) {
    return { success: false, message: 'Unauthorized: You can only assign vendors to users in your team' };
  }

  var targetAdminId = session.Role === CONFIG.ROLES.SUPERADMIN 
    ? (data.adminId || assignedUser.Admin_ID || 'SA-0001')
    : session.Admin_ID;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
    var vendors = getSheetObjects(vendorSheet);

    var vendorId = generateId('VND', vendors.map(function(v) { return v.Vendor_ID; }));
    var now = formatDubaiDate(new Date());

    var newRow = [
      vendorId,
      data.vendorName.trim(),
      data.assignedUserId,
      targetAdminId,
      (data.contactName || '').trim(),
      (data.contactEmail || '').trim(),
      (data.contactPhone || '').trim(),
      (data.bankAccount || '').trim(),
      (data.socialLink || '').trim(),
      CONFIG.VENDOR_STATUS.ACTIVE,
      (data.notes || '').trim(),
      now,
      now,
      session.Name,
      session.Name
    ];

    vendorSheet.appendRow(newRow);

    logActivity(session.User_ID, session.Name, session.Role, 'CREATE_VENDOR', 'VENDORS', vendorId, 'Created vendor ' + data.vendorName + ' assigned to ' + assignedUser.User_Name);

    return { 
      success: true, 
      message: 'Vendor created successfully', 
      data: { Vendor_ID: vendorId, Vendor_Name: data.vendorName } 
    };

  } finally {
    lock.releaseLock();
  }
}

function updateVendor(session, data) {
  // CRITICAL RULE: USER CANNOT EDIT VENDORS
  if (session.Role === CONFIG.ROLES.USER) {
    return { success: false, message: 'Unauthorized: Regular users are not permitted to edit vendor master data' };
  }

  // CRITICAL RULE: Admins can view vendors and change status (deactivate/reactivate),
  // but cannot edit vendor details. Only SuperAdmin can edit vendor details.
  if (session.Role === CONFIG.ROLES.ADMIN) {
    var isStatusOnlyChange = Object.keys(data).every(function(key) {
      return key === 'vendorId' || key === 'status';
    });
    if (!isStatusOnlyChange) {
      return { success: false, message: 'Unauthorized: Admins can view vendors but cannot edit vendor details. Only Super Admin can edit.' };
    }
  }

  if (!data.vendorId) {
    return { success: false, message: 'Vendor ID is required' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];

    var idCol = headers.indexOf('Vendor_ID');
    var nameCol = headers.indexOf('Vendor_Name');
    var userCol = headers.indexOf('Assigned_User_ID');
    var adminCol = headers.indexOf('Admin_ID');
    var cNameCol = headers.indexOf('Contact_Name');
    var cEmailCol = headers.indexOf('Contact_Email');
    var cPhoneCol = headers.indexOf('Contact_Phone');
    var bankCol = headers.indexOf('Vendor_Bank_Account');
    var socialCol = headers.indexOf('Social_Media_Link');
    var statusCol = headers.indexOf('Vendor_Status');
    var notesCol = headers.indexOf('Notes');
    var updatedCol = headers.indexOf('Updated_Date');
    var updatedByCol = headers.indexOf('Updated_By');

    var targetRowIndex = -1;
    var existingRow = null;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idCol] === data.vendorId) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Vendor not found' };
    }

    // Verify Admin Ownership
    if (session.Role === CONFIG.ROLES.ADMIN && existingRow[adminCol] !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit vendors belonging to your team' };
    }

    var now = formatDubaiDate(new Date());

    if (data.vendorName) sheet.getRange(targetRowIndex, nameCol + 1).setValue(data.vendorName.trim());
    if (data.assignedUserId) {
      sheet.getRange(targetRowIndex, userCol + 1).setValue(data.assignedUserId);
    }
    if (data.adminId && session.Role === CONFIG.ROLES.SUPERADMIN) {
      sheet.getRange(targetRowIndex, adminCol + 1).setValue(data.adminId);
    }
    if (data.contactName !== undefined) sheet.getRange(targetRowIndex, cNameCol + 1).setValue(data.contactName.trim());
    if (data.contactEmail !== undefined) sheet.getRange(targetRowIndex, cEmailCol + 1).setValue(data.contactEmail.trim());
    if (data.contactPhone !== undefined) sheet.getRange(targetRowIndex, cPhoneCol + 1).setValue(data.contactPhone.trim());
    if (data.bankAccount !== undefined) sheet.getRange(targetRowIndex, bankCol + 1).setValue(data.bankAccount.trim());
    if (data.socialLink !== undefined) sheet.getRange(targetRowIndex, socialCol + 1).setValue(data.socialLink.trim());
    if (data.status) sheet.getRange(targetRowIndex, statusCol + 1).setValue(data.status);
    if (data.notes !== undefined) sheet.getRange(targetRowIndex, notesCol + 1).setValue(data.notes.trim());

    sheet.getRange(targetRowIndex, updatedCol + 1).setValue(now);
    sheet.getRange(targetRowIndex, updatedByCol + 1).setValue(session.Name);

    logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_VENDOR', 'VENDORS', data.vendorId, 'Updated vendor: ' + data.vendorId);

    return { success: true, message: 'Vendor updated successfully' };

  } finally {
    lock.releaseLock();
  }
}

function assignVendor(session, vendorId, assignedUserId) {
  return updateVendor(session, { vendorId: vendorId, assignedUserId: assignedUserId });
}

/**
 * CRITICAL VENDOR DEACTIVATION RULE:
 * Users: ❌ CANNOT DEACTIVATE/DELETE VENDOR
 * Admin: ✅ ONLY team vendors (soft deactivate)
 * SuperAdmin: ✅ ANY vendor (soft deactivate)
 */
function deactivateVendor(session, vendorId) {
  if (session.Role === CONFIG.ROLES.USER) {
    return { success: false, message: 'CRITICAL: Regular Users are strictly forbidden from deactivating or deleting vendors' };
  }

  var res = updateVendor(session, { vendorId: vendorId, status: CONFIG.VENDOR_STATUS.INACTIVE });
  if (res.success) {
    logActivity(session.User_ID, session.Name, session.Role, 'DEACTIVATE_VENDOR', 'VENDORS', vendorId, 'Soft-deactivated vendor ' + vendorId + ' (status set to INACTIVE)');
  }
  return res;
}

function reactivateVendor(session, vendorId) {
  if (session.Role === CONFIG.ROLES.USER) {
    return { success: false, message: 'Unauthorized: Regular Users cannot reactivate vendors' };
  }

  var res = updateVendor(session, { vendorId: vendorId, status: CONFIG.VENDOR_STATUS.ACTIVE });
  if (res.success) {
    logActivity(session.User_ID, session.Name, session.Role, 'REACTIVATE_VENDOR', 'VENDORS', vendorId, 'Reactivated vendor ' + vendorId);
  }
  return res;
}`
  },
  {
    name: 'Campaigns.gs',
    description: 'Campaign Operations with Automatic User/Admin ID Derivation and Scoping',
    code: `/**
 * Campaign Management Logic
 */

function getCampaigns(session, filters) {
  filters = filters || {};
  var ss = getSpreadsheet();
  var campaignSheet = getOrCreateSheet(ss, CONFIG.SHEETS.CAMPAIGNS);
  var campaigns = getSheetObjects(campaignSheet);

  var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
  var vendors = getSheetObjects(vendorSheet);
  var vendorMap = {};
  vendors.forEach(function(v) { vendorMap[v.Vendor_ID] = v.Vendor_Name; });

  var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
  var users = getSheetObjects(userSheet);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u.User_Name; });

  var adminSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ADMINS);
  var admins = getSheetObjects(adminSheet);
  var adminMap = {};
  admins.forEach(function(a) { adminMap[a.Admin_ID] = a.Admin_Name; });

  // STRICT SERVER-SIDE SEGREGATION
  var filtered = [];
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    filtered = campaigns;
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    filtered = campaigns.filter(function(c) { return c.Admin_ID === session.Admin_ID; });
  } else {
    // User ONLY sees their own campaigns
    filtered = campaigns.filter(function(c) { return c.User_ID === session.User_ID; });
  }

  // Apply optional search/filters
  if (filters.vendorId) {
    filtered = filtered.filter(function(c) { return c.Vendor_ID === filters.vendorId; });
  }
  if (filters.platform) {
    filtered = filtered.filter(function(c) { return c.Platform === filters.platform; });
  }
  if (filters.campaignType) {
    filtered = filtered.filter(function(c) { return c.Campaign_Type === filters.campaignType; });
  }
  if (filters.status) {
    filtered = filtered.filter(function(c) { return c.Campaign_Status === filters.status; });
  }
  if (filters.userId && session.Role !== CONFIG.ROLES.USER) {
    filtered = filtered.filter(function(c) { return c.User_ID === filters.userId; });
  }

  var result = filtered.map(function(c) {
    var item = Object.assign({}, c);
    item.Vendor_Name = vendorMap[c.Vendor_ID] || c.Vendor_ID;
    item.User_Name = userMap[c.User_ID] || c.User_ID;
    item.Admin_Name = adminMap[c.Admin_ID] || (c.Admin_ID === 'SA-0001' ? 'Super Admin' : c.Admin_ID);
    return item;
  });

  return { success: true, data: result };
}

function createCampaign(session, data) {
  // CRITICAL RULE: Admins can view campaigns but cannot create them.
  if (session.Role === CONFIG.ROLES.ADMIN) {
    return { success: false, message: 'Unauthorized: Admins can view campaigns but cannot create them. Only Super Admin and Users can create campaigns.' };
  }

  if (!data.vendorId || !data.campaignType || !data.platform) {
    return { success: false, message: 'Vendor, Campaign Type, and Platform are required' };
  }

  var ss = getSpreadsheet();
  var vendorSheet = getOrCreateSheet(ss, CONFIG.SHEETS.VENDORS);
  var vendors = getSheetObjects(vendorSheet);
  var vendor = vendors.find(function(v) { return v.Vendor_ID === data.vendorId; });

  if (!vendor) {
    return { success: false, message: 'Vendor not found' };
  }

  if (vendor.Vendor_Status !== CONFIG.VENDOR_STATUS.ACTIVE) {
    return { success: false, message: 'Cannot create campaign for inactive vendor' };
  }

  // Authorize Vendor Ownership
  if (session.Role === CONFIG.ROLES.USER) {
    if (vendor.Assigned_User_ID !== session.User_ID) {
      return { success: false, message: 'Unauthorized: You can only create campaigns for vendors assigned to you' };
    }
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    if (vendor.Admin_ID !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only create campaigns for vendors in your team' };
    }
  }

  // AUTOMATIC SERVER-SIDE DERIVATION: Do NOT trust frontend User_ID or Admin_ID
  var targetUserId = session.Role === CONFIG.ROLES.USER ? session.User_ID : (data.userId || vendor.Assigned_User_ID);
  var targetAdminId = vendor.Admin_ID;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var campaignSheet = getOrCreateSheet(ss, CONFIG.SHEETS.CAMPAIGNS);
    var campaigns = getSheetObjects(campaignSheet);

    var campaignId = generateId('CMP', campaigns.map(function(c) { return c.Campaign_ID; }));
    var now = formatDubaiDate(new Date());
    var campaignDate = data.campaignDate || now.split(' ')[0];

    var newRow = [
      campaignId,
      data.vendorId,
      targetUserId,
      targetAdminId,
      data.campaignType,
      data.platform,
      campaignDate,
      data.campaignStatus || CONFIG.CAMPAIGN_STATUS.PENDING,
      Number(data.cost) || 0,
      (data.campaignDetails || '').trim(),
      (data.campaignResult || '').trim(),
      (data.notes || '').trim(),
      now,
      now,
      session.Name,
      session.Name
    ];

    campaignSheet.appendRow(newRow);

    logActivity(session.User_ID, session.Name, session.Role, 'CREATE_CAMPAIGN', 'CAMPAIGNS', campaignId, 'Created ' + data.campaignType + ' campaign for vendor ' + vendor.Vendor_Name);

    return { 
      success: true, 
      message: 'Campaign created successfully', 
      data: { Campaign_ID: campaignId } 
    };

  } finally {
    lock.releaseLock();
  }
}

function updateCampaign(session, data) {
  // CRITICAL RULE: Admins can view campaigns and change status only; they cannot edit campaign details.
  if (session.Role === CONFIG.ROLES.ADMIN) {
    var isStatusOnlyChange = Object.keys(data).every(function(key) {
      return key === 'campaignId' || key === 'campaignStatus' || key === 'status';
    });
    if (!isStatusOnlyChange) {
      return { success: false, message: 'Unauthorized: Admins can view campaigns but cannot edit campaign details. Only Super Admin and Users can edit.' };
    }
  }

  if (!data.campaignId) {
    return { success: false, message: 'Campaign ID is required' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.CAMPAIGNS);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];

    var idCol = headers.indexOf('Campaign_ID');
    var vendorCol = headers.indexOf('Vendor_ID');
    var userCol = headers.indexOf('User_ID');
    var adminCol = headers.indexOf('Admin_ID');
    var typeCol = headers.indexOf('Campaign_Type');
    var platformCol = headers.indexOf('Platform');
    var dateCol = headers.indexOf('Campaign_Date');
    var statusCol = headers.indexOf('Campaign_Status');
    var costCol = headers.indexOf('Cost');
    var detailsCol = headers.indexOf('Campaign_Details');
    var resultCol = headers.indexOf('Campaign_Result');
    var notesCol = headers.indexOf('Notes');
    var updatedCol = headers.indexOf('Updated_Date');
    var updatedByCol = headers.indexOf('Updated_By');

    var targetRowIndex = -1;
    var existingRow = null;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][idCol] === data.campaignId) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Campaign not found' };
    }

    // STRICT OWNERSHIP VALIDATION
    if (session.Role === CONFIG.ROLES.USER && existingRow[userCol] !== session.User_ID) {
      return { success: false, message: 'Unauthorized: You can only edit your own campaigns' };
    }
    if (session.Role === CONFIG.ROLES.ADMIN && existingRow[adminCol] !== session.Admin_ID) {
      return { success: false, message: 'Unauthorized: You can only edit campaigns belonging to your team' };
    }

    var now = formatDubaiDate(new Date());

    if (data.campaignType) sheet.getRange(targetRowIndex, typeCol + 1).setValue(data.campaignType);
    if (data.platform) sheet.getRange(targetRowIndex, platformCol + 1).setValue(data.platform);
    if (data.campaignDate) sheet.getRange(targetRowIndex, dateCol + 1).setValue(data.campaignDate);
    if (data.campaignStatus) sheet.getRange(targetRowIndex, statusCol + 1).setValue(data.campaignStatus);
    if (data.cost !== undefined && data.cost !== null && data.cost !== '') sheet.getRange(targetRowIndex, costCol + 1).setValue(Number(data.cost) || 0);
    if (data.campaignDetails !== undefined) sheet.getRange(targetRowIndex, detailsCol + 1).setValue(data.campaignDetails.trim());
    if (data.campaignResult !== undefined) sheet.getRange(targetRowIndex, resultCol + 1).setValue(data.campaignResult.trim());
    if (data.notes !== undefined) sheet.getRange(targetRowIndex, notesCol + 1).setValue(data.notes.trim());

    sheet.getRange(targetRowIndex, updatedCol + 1).setValue(now);
    sheet.getRange(targetRowIndex, updatedByCol + 1).setValue(session.Name);

    logActivity(session.User_ID, session.Name, session.Role, 'UPDATE_CAMPAIGN', 'CAMPAIGNS', data.campaignId, 'Updated campaign: ' + data.campaignId);

    return { success: true, message: 'Campaign updated successfully' };

  } finally {
    lock.releaseLock();
  }
}

function updateCampaignStatus(session, campaignId, status) {
  return updateCampaign(session, { campaignId: campaignId, campaignStatus: status });
}`
  },
  {
    name: 'Dashboard.gs',
    description: 'Aggregated Role-Specific Dashboard Metrics and Charts',
    code: `/**
 * Dashboard Metrics and Chart Aggregator
 */

function getDashboardData(session) {
  var ss = getSpreadsheet();
  var vendorRes = getVendors(session);
  var campaignRes = getCampaigns(session, {});
  var userRes = getUsers(session);

  var vendors = vendorRes.data || [];
  var campaigns = campaignRes.data || [];
  var users = userRes.data || [];

  var activeVendors = vendors.filter(function(v) { return v.Vendor_Status === 'ACTIVE'; }).length;
  var inactiveVendors = vendors.filter(function(v) { return v.Vendor_Status === 'INACTIVE'; }).length;

  var pending = campaigns.filter(function(c) { return c.Campaign_Status === 'Pending'; }).length;
  var inProgress = campaigns.filter(function(c) { return c.Campaign_Status === 'In Progress'; }).length;
  var completed = campaigns.filter(function(c) { return c.Campaign_Status === 'Completed'; }).length;
  var cancelled = campaigns.filter(function(c) { return c.Campaign_Status === 'Cancelled'; }).length;

  // Aggregate platforms
  var platformCounts = {};
  var typeCounts = {};
  var statusCounts = { 'Pending': pending, 'In Progress': inProgress, 'Completed': completed, 'Cancelled': cancelled };

  campaigns.forEach(function(c) {
    platformCounts[c.Platform] = (platformCounts[c.Platform] || 0) + 1;
    typeCounts[c.Campaign_Type] = (typeCounts[c.Campaign_Type] || 0) + 1;
  });

  var campaignsByPlatform = Object.keys(platformCounts).map(function(k) { return { name: k, value: platformCounts[k] }; });
  var campaignsByType = Object.keys(typeCounts).map(function(k) { return { name: k, value: typeCounts[k] }; });
  var campaignsByStatus = Object.keys(statusCounts).map(function(k) { return { name: k, value: statusCounts[k] }; });

  var stats = {
    totalUsers: users.length,
    totalVendors: vendors.length,
    activeVendors: activeVendors,
    inactiveVendors: inactiveVendors,
    totalCampaigns: campaigns.length,
    pendingCampaigns: pending,
    inProgressCampaigns: inProgress,
    completedCampaigns: completed,
    cancelledCampaigns: cancelled,
    campaignsByStatus: campaignsByStatus,
    campaignsByPlatform: campaignsByPlatform,
    campaignsByType: campaignsByType,
    recentCampaigns: campaigns.slice(-8).reverse(),
    recentActivity: (getActivityLogs(session, 10).data) || []
  };

  // Additional SuperAdmin breakdown
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    var adminRes = getAdmins(session);
    stats.totalAdmins = (adminRes.data || []).length;

    var adminCampaignCounts = {};
    campaigns.forEach(function(c) {
      var aName = c.Admin_Name || c.Admin_ID;
      adminCampaignCounts[aName] = (adminCampaignCounts[aName] || 0) + 1;
    });
    stats.campaignsByAdmin = Object.keys(adminCampaignCounts).map(function(k) { return { name: k, value: adminCampaignCounts[k] }; });
  }

  // Admin and SuperAdmin user breakdown
  if (session.Role !== CONFIG.ROLES.USER) {
    var userCampaignCounts = {};
    campaigns.forEach(function(c) {
      var uName = c.User_Name || c.User_ID;
      userCampaignCounts[uName] = (userCampaignCounts[uName] || 0) + 1;
    });
    stats.campaignsByUser = Object.keys(userCampaignCounts).map(function(k) { return { name: k, value: userCampaignCounts[k] }; });
  }

  return { success: true, data: stats };
}`
  },
  {
    name: 'ActivityLog.gs',
    description: 'Audit Trail and Activity Logging Engine',
    code: `/**
 * Audit Trail and Activity Logging
 */

function logActivity(userId, userName, role, action, module, recordId, description) {
  try {
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.ACTIVITY_LOG);
    var logs = getSheetObjects(sheet);
    var logId = generateId('LOG', logs.map(function(l) { return l.Log_ID; }));
    var timestamp = formatDubaiDate(new Date());

    sheet.appendRow([
      logId,
      userId,
      userName,
      role,
      action,
      module,
      recordId || '',
      description || '',
      timestamp
    ]);
  } catch (e) {
    Logger.log('Logging failed: ' + e.toString());
  }
}

function getActivityLogs(session, limit) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, CONFIG.SHEETS.ACTIVITY_LOG);
  var logs = getSheetObjects(sheet);

  var filtered = [];
  if (session.Role === CONFIG.ROLES.SUPERADMIN) {
    filtered = logs;
  } else if (session.Role === CONFIG.ROLES.ADMIN) {
    // Admin sees activity from their own team's users
    var userSheet = getOrCreateSheet(ss, CONFIG.SHEETS.USERS);
    var teamUserIds = getSheetObjects(userSheet)
      .filter(function(u) { return u.Admin_ID === session.Admin_ID; })
      .map(function(u) { return u.User_ID; });
    teamUserIds.push(session.User_ID);

    filtered = logs.filter(function(l) { return teamUserIds.indexOf(l.User_ID) !== -1; });
  } else {
    filtered = logs.filter(function(l) { return l.User_ID === session.User_ID; });
  }

  filtered.reverse();
  if (limit && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return { success: true, data: filtered };
}`
  },
  {
    name: 'Utils.gs',
    description: 'Sheet Utilities, Timezone Formatters, Sequential ID Generator, Database Initializer',
    code: `/**
 * Core Utilities, Database Initialization, and Setup Scripts
 */

function formatDubaiDate(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function generateId(prefix, existingIds) {
  var cleanIds = (existingIds || []).map(function(id) { return String(id).trim(); });
  var existingSet = {};
  cleanIds.forEach(function(id) { existingSet[id] = true; });

  // Avoid regex backslash-escaping entirely (source-transform pitfalls with \\d
  // across nested string layers) by parsing the numeric suffix manually.
  var maxNum = 0;
  var searchPrefix = prefix + '-';
  cleanIds.forEach(function(id) {
    if (id.indexOf(searchPrefix) !== 0) return;
    var suffix = id.slice(searchPrefix.length);
    if (suffix.length === 0) return;
    var isNumeric = true;
    for (var i = 0; i < suffix.length; i++) {
      var ch = suffix.charAt(i);
      if (ch < '0' || ch > '9') { isNumeric = false; break; }
    }
    if (isNumeric) {
      var num = parseInt(suffix, 10);
      if (num > maxNum) maxNum = num;
    }
  });

  // Safety net: even after computing max+1, verify the candidate isn't
  // already taken (handles malformed/duplicate rows already in the sheet)
  // and keep incrementing until a truly free ID is found.
  var nextNum = maxNum + 1;
  var candidate;
  do {
    var padded = ('0000' + nextNum).slice(-4);
    candidate = prefix + '-' + padded;
    nextNum++;
  } while (existingSet[candidate]);

  return candidate;
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function getSheetObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var key = String(headers[j]).trim();
      var val = row[j];
      if (val instanceof Date) {
        val = formatDubaiDate(val);
      }
      obj[key] = val;
      if (val !== '') hasContent = true;
    }
    if (hasContent && obj[headers[0]]) {
      result.push(obj);
    }
  }
  return result;
}

/**
 * 1-CLICK DATABASE INITIALIZATION
 * Run this function in Apps Script Editor to create all sheets with exact headers!
 */
function setupDatabase() {
  var ss = getSpreadsheet();

  var schemas = [
    {
      name: CONFIG.SHEETS.ADMINS,
      headers: ['Admin_ID', 'Admin_Name', 'Email', 'Password_Hash', 'Status', 'Created_Date', 'Updated_Date', 'Created_By']
    },
    {
      name: CONFIG.SHEETS.USERS,
      headers: ['User_ID', 'User_Name', 'Email', 'Password_Hash', 'Role', 'Admin_ID', 'Status', 'Created_Date', 'Updated_Date', 'Created_By']
    },
    {
      name: CONFIG.SHEETS.VENDORS,
      headers: ['Vendor_ID', 'Vendor_Name', 'Assigned_User_ID', 'Admin_ID', 'Contact_Name', 'Contact_Email', 'Contact_Phone', 'Vendor_Bank_Account', 'Social_Media_Link', 'Vendor_Status', 'Notes', 'Created_Date', 'Updated_Date', 'Created_By', 'Updated_By']
    },
    {
      name: CONFIG.SHEETS.CAMPAIGNS,
      headers: ['Campaign_ID', 'Vendor_ID', 'User_ID', 'Admin_ID', 'Campaign_Type', 'Platform', 'Campaign_Date', 'Campaign_Status', 'Cost', 'Campaign_Details', 'Campaign_Result', 'Notes', 'Created_Date', 'Updated_Date', 'Created_By', 'Updated_By']
    },
    {
      name: CONFIG.SHEETS.ACTIVITY_LOG,
      headers: ['Log_ID', 'User_ID', 'User_Name', 'Role', 'Action', 'Module', 'Record_ID', 'Description', 'Timestamp']
    },
    {
      name: CONFIG.SHEETS.SETTINGS,
      headers: ['SETTING', 'VALUE']
    }
  ];

  schemas.forEach(function(schema) {
    var sheet = getOrCreateSheet(ss, schema.name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema.headers);
      sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });

  // Populate default settings
  var settingsSheet = getOrCreateSheet(ss, CONFIG.SHEETS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.appendRow(['TIMEZONE', 'Asia/Dubai']);
    settingsSheet.appendRow(['ORG_NAME', 'Vendor & Campaign Tracker']);
    settingsSheet.appendRow(['SESSION_TTL', '720']);
  }

  Logger.log('✅ Google Sheets Database initialized successfully with all tables and columns!');
}

/**
 * ONE-TIME MIGRATION: Adds any missing columns to already-existing sheets
 * (safe to run multiple times — skips columns that already exist).
 * Run this once from the Apps Script Editor (select this function, click Run)
 * if you already have data and don't want to add columns manually.
 */
function migrateAddMissingColumns() {
  var ss = getSpreadsheet();

  var schemas = [
    {
      name: CONFIG.SHEETS.VENDORS,
      headers: ['Vendor_ID', 'Vendor_Name', 'Assigned_User_ID', 'Admin_ID', 'Contact_Name', 'Contact_Email', 'Contact_Phone', 'Vendor_Bank_Account', 'Social_Media_Link', 'Vendor_Status', 'Notes', 'Created_Date', 'Updated_Date', 'Created_By', 'Updated_By']
    },
    {
      name: CONFIG.SHEETS.CAMPAIGNS,
      headers: ['Campaign_ID', 'Vendor_ID', 'User_ID', 'Admin_ID', 'Campaign_Type', 'Platform', 'Campaign_Date', 'Campaign_Status', 'Cost', 'Campaign_Details', 'Campaign_Result', 'Notes', 'Created_Date', 'Updated_Date', 'Created_By', 'Updated_By']
    }
  ];

  var report = [];

  schemas.forEach(function(schema) {
    var sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      report.push(schema.name + ': sheet not found, skipped (run setupDatabase() first if this is a fresh project)');
      return;
    }

    var lastCol = sheet.getLastColumn();
    var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); }) : [];

    var added = [];
    schema.headers.forEach(function(header) {
      if (existingHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header)
          .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
        added.push(header);
      }
    });

    report.push(schema.name + ': ' + (added.length ? 'added ' + added.join(', ') : 'already up to date'));
  });

  Logger.log(report.join(String.fromCharCode(10)));
  return report;
}

/**
 * Super Admin First-Time Setup
 * Call this function from the Apps Script editor to initialize the Super Admin credentials.
 */
function setupInitialSuperAdmin(email, password, name) {
  var adminEmail = email || 'superadmin@company.com';
  var adminPass = password || 'Admin@12345';
  var adminName = name || 'Super Administrator';

  var hash = hashPassword(adminPass);
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SUPERADMIN_EMAIL', adminEmail);
  props.setProperty('SUPERADMIN_HASH', hash);
  props.setProperty('SUPERADMIN_NAME', adminName);

  Logger.log('✅ Super Admin created successfully!');
  Logger.log('Email: ' + adminEmail);
  Logger.log('Password: ' + adminPass);
}`
  },
  {
    name: 'appsscript.json',
    description: 'Google Apps Script Manifest with Web App and Timezone Configuration',
    code: `{
  "timeZone": "Asia/Dubai",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}`
  }
];

export const SETUP_INSTRUCTIONS = [
  {
    step: 1,
    title: 'Create Google Sheet',
    desc: 'Go to Google Sheets (sheets.new) and create a new blank spreadsheet. Name it "Vendor & Campaign Database".'
  },
  {
    step: 2,
    title: 'Open Apps Script Editor',
    desc: 'In the menu bar of your Google Sheet, click Extensions > Apps Script.'
  },
  {
    step: 3,
    title: 'Create the 10 Script Files',
    desc: 'In the Apps Script editor, create the files (Code.gs, Config.gs, Auth.gs, Admins.gs, Users.gs, Vendors.gs, Campaigns.gs, Dashboard.gs, ActivityLog.gs, Utils.gs) and paste the code from each tab above.'
  },
  {
    step: 4,
    title: 'Run setupDatabase()',
    desc: 'In the top toolbar dropdown, select the function "setupDatabase" and click Run. Grant the required permissions. All 6 database sheets with exact column headers and styles will be created automatically.'
  },
  {
    step: 5,
    title: 'Initialize Super Admin',
    desc: 'Select "setupInitialSuperAdmin" and click Run to create the default credentials (Email: superadmin@company.com, Password: Admin@12345).'
  },
  {
    step: 6,
    title: 'Deploy as Web App',
    desc: 'Click Deploy > New deployment. Select type: "Web App". Set Execute as: "Me" and Who has access: "Anyone". Click Deploy and authorize.'
  },
  {
    step: 7,
    title: 'Connect to Frontend',
    desc: 'Copy the generated Web App URL and paste it into the API_URL configuration box in this app or in js/config.js for GitHub Pages deployment.'
  }
];
