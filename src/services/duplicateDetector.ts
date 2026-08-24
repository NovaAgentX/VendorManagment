import { Vendor, DuplicateFieldComparison, DuplicatePair, VendorDuplicateGroup, DuplicateSummary, Role } from '../types';

/**
 * Normalizes bank account string to isolate IBAN, Account numbers, and tokens
 */
export function extractBankIdentifiers(bankStr?: string): {
  raw: string;
  normalized: string;
  iban?: string;
  accountNumbers: string[];
  swift?: string;
} {
  if (!bankStr) {
    return { raw: '', normalized: '', accountNumbers: [] };
  }

  const raw = bankStr.trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Extract IBAN (e.g., AE followed by digits, or general IBAN regex [A-Z]{2}[0-9]{2}[A-Z0-9]{4,30})
  const ibanMatch = raw.match(/\b([A-Z]{2}\s*\d{2}[\sA-Z0-9]{10,30})\b/i);
  const iban = ibanMatch ? ibanMatch[1].replace(/\s+/g, '').toUpperCase() : undefined;

  // Extract SWIFT/BIC (8 or 11 uppercase chars usually preceded by Swift/BIC or standalone)
  const swiftMatch = raw.match(/swift[:\s]*([A-Z0-9]{8,11})/i);
  const swift = swiftMatch ? swiftMatch[1].toUpperCase() : undefined;

  // Extract standalone long digit sequences (account numbers of 6+ digits)
  const numberMatches = raw.match(/\b\d{6,24}\b/g) || [];

  return {
    raw,
    normalized,
    iban,
    accountNumbers: Array.from(new Set(numberMatches)),
    swift
  };
}

/**
 * Normalizes vendor name to detect brand similarity
 */
export function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove (Vendor A) or parentheticals
    .replace(/\b(llc|fze|fzc|ltd|limited|inc|corp|agency|media|network|solutions|hub|group|digital|marketing|consulting|official|publishing|uae|dubai|mena|gcc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Normalizes phone string to digits only
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // strip leading 00 or + if any
  return digits.replace(/^0+/, '');
}

/**
 * Normalizes email address
 */
export function normalizeEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes social media link / handle
 */
export function normalizeSocialLink(link?: string): string {
  if (!link) return '';
  let clean = link.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '');
  clean = clean.replace(/\/$/, ''); // remove trailing slash
  return clean;
}

/**
 * Compares two vendors in depth across all fields
 */
export function compareVendors(v1: Vendor, v2: Vendor): DuplicatePair | null {
  if (v1.Vendor_ID === v2.Vendor_ID) return null;

  const matchedFields: DuplicateFieldComparison[] = [];
  let totalScore = 0;

  // 1. BANK ACCOUNT COMPARISON (Highest Weight: 50 pts)
  const bank1 = extractBankIdentifiers(v1.Vendor_Bank_Account);
  const bank2 = extractBankIdentifiers(v2.Vendor_Bank_Account);

  let bankMatched = false;
  if (bank1.normalized && bank2.normalized) {
    if (bank1.iban && bank2.iban && bank1.iban === bank2.iban) {
      bankMatched = true;
      totalScore += 50;
      matchedFields.push({
        field: 'IBAN',
        label: 'Matching IBAN',
        isMatch: true,
        matchType: 'EXACT',
        valueA: v1.Vendor_Bank_Account || '—',
        valueB: v2.Vendor_Bank_Account || '—'
      });
    } else if (bank1.normalized === bank2.normalized) {
      bankMatched = true;
      totalScore += 50;
      matchedFields.push({
        field: 'BANK_ACCOUNT',
        label: 'Matching Bank Account Details',
        isMatch: true,
        matchType: 'EXACT',
        valueA: v1.Vendor_Bank_Account || '—',
        valueB: v2.Vendor_Bank_Account || '—'
      });
    } else if (
      bank1.accountNumbers.some(acc1 => bank2.accountNumbers.includes(acc1)) &&
      bank1.accountNumbers.length > 0
    ) {
      bankMatched = true;
      totalScore += 45;
      matchedFields.push({
        field: 'BANK_ACCOUNT',
        label: 'Matching Account Number',
        isMatch: true,
        matchType: 'PARTIAL',
        valueA: v1.Vendor_Bank_Account || '—',
        valueB: v2.Vendor_Bank_Account || '—'
      });
    }
  }

  // 2. VENDOR NAME COMPARISON (Weight: 35 pts)
  const rawName1 = v1.Vendor_Name.trim().toLowerCase();
  const rawName2 = v2.Vendor_Name.trim().toLowerCase();
  const normName1 = normalizeVendorName(v1.Vendor_Name);
  const normName2 = normalizeVendorName(v2.Vendor_Name);

  if (rawName1 === rawName2) {
    totalScore += 35;
    matchedFields.push({
      field: 'VENDOR_NAME',
      label: 'Identical Vendor Name',
      isMatch: true,
      matchType: 'EXACT',
      valueA: v1.Vendor_Name,
      valueB: v2.Vendor_Name
    });
  } else if (normName1 && normName2 && (normName1 === normName2 || normName1.includes(normName2) || normName2.includes(normName1))) {
    if (normName1.length >= 3 && normName2.length >= 3) {
      totalScore += 25;
      matchedFields.push({
        field: 'VENDOR_NAME',
        label: 'Similar Brand/Vendor Name',
        isMatch: true,
        matchType: 'NORMALIZED',
        valueA: v1.Vendor_Name,
        valueB: v2.Vendor_Name
      });
    }
  }

  // 3. CONTACT EMAIL (Weight: 30 pts)
  const email1 = normalizeEmail(v1.Contact_Email);
  const email2 = normalizeEmail(v2.Contact_Email);
  if (email1 && email2 && email1 === email2) {
    totalScore += 30;
    matchedFields.push({
      field: 'CONTACT_EMAIL',
      label: 'Matching Contact Email',
      isMatch: true,
      matchType: 'EXACT',
      valueA: v1.Contact_Email,
      valueB: v2.Contact_Email
    });
  }

  // 4. CONTACT PHONE (Weight: 25 pts)
  const phone1 = normalizePhone(v1.Contact_Phone);
  const phone2 = normalizePhone(v2.Contact_Phone);
  if (phone1 && phone2 && phone1.length >= 7 && (phone1 === phone2 || phone1.endsWith(phone2) || phone2.endsWith(phone1))) {
    totalScore += 25;
    matchedFields.push({
      field: 'CONTACT_PHONE',
      label: 'Matching Contact Phone',
      isMatch: true,
      matchType: 'EXACT',
      valueA: v1.Contact_Phone,
      valueB: v2.Contact_Phone
    });
  }

  // 5. SOCIAL MEDIA LINK (Weight: 25 pts)
  const social1 = normalizeSocialLink(v1.Social_Media_Link);
  const social2 = normalizeSocialLink(v2.Social_Media_Link);
  if (social1 && social2 && social1 === social2) {
    totalScore += 25;
    matchedFields.push({
      field: 'SOCIAL_LINK',
      label: 'Matching Social Media / Channel Link',
      isMatch: true,
      matchType: 'EXACT',
      valueA: v1.Social_Media_Link || '—',
      valueB: v2.Social_Media_Link || '—'
    });
  }

  // 6. CONTACT PERSON NAME (Weight: 15 pts)
  const contact1 = (v1.Contact_Name || '').trim().toLowerCase();
  const contact2 = (v2.Contact_Name || '').trim().toLowerCase();
  if (contact1 && contact2 && contact1 === contact2 && contact1.length > 2) {
    totalScore += 15;
    matchedFields.push({
      field: 'CONTACT_NAME',
      label: 'Matching Contact Representative',
      isMatch: true,
      matchType: 'EXACT',
      valueA: v1.Contact_Name,
      valueB: v2.Contact_Name
    });
  }

  // Minimum threshold to qualify as duplicate:
  // If bank matched, or total score >= 25 with at least 1 strong field
  if (matchedFields.length === 0 || (!bankMatched && totalScore < 25)) {
    return null;
  }

  const isCrossUser = v1.Assigned_User_ID !== v2.Assigned_User_ID;
  const isCrossAdmin = v1.Admin_ID !== v2.Admin_ID;

  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
  if (bankMatched || totalScore >= 60) {
    severity = 'CRITICAL';
  } else if (totalScore >= 35) {
    severity = 'HIGH';
  }

  const reasons = matchedFields.map(m => m.label).join(', ');
  const crossUserText = isCrossUser
    ? `Used across different operators (${v1.Assigned_User_Name || v1.Assigned_User_ID} & ${v2.Assigned_User_Name || v2.Assigned_User_ID})`
    : 'Assigned to same operator';

  return {
    vendorA: v1,
    vendorB: v2,
    score: Math.min(100, totalScore),
    severity,
    matchedFields,
    isCrossUser,
    isCrossAdmin,
    description: `${reasons}. ${crossUserText}.`
  };
}

/**
 * Detects all duplicate vendor clusters across the system
 */
export function detectAllVendorDuplicates(vendors: Vendor[]): DuplicateSummary {
  const pairs: DuplicatePair[] = [];
  const processedPairKeys = new Set<string>();

  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const v1 = vendors[i];
      const v2 = vendors[j];
      const pairKey = [v1.Vendor_ID, v2.Vendor_ID].sort().join('___');

      if (processedPairKeys.has(pairKey)) continue;
      processedPairKeys.add(pairKey);

      const comparison = compareVendors(v1, v2);
      if (comparison) {
        pairs.push(comparison);
      }
    }
  }

  // Sort pairs by score & severity descending
  pairs.sort((a, b) => b.score - a.score);

  // Group pairs into connected component clusters
  const groupMap = new Map<string, Set<string>>();
  const vendorLookup = new Map<string, Vendor>();
  vendors.forEach(v => vendorLookup.set(v.Vendor_ID, v));

  pairs.forEach(pair => {
    const idA = pair.vendorA.Vendor_ID;
    const idB = pair.vendorB.Vendor_ID;

    let targetSet: Set<string> | null = null;
    for (const set of groupMap.values()) {
      if (set.has(idA) || set.has(idB)) {
        targetSet = set;
        break;
      }
    }

    if (!targetSet) {
      targetSet = new Set<string>();
      groupMap.set(`GRP-${groupMap.size + 1}`, targetSet);
    }

    targetSet.add(idA);
    targetSet.add(idB);
  });

  const groups: VendorDuplicateGroup[] = [];
  let groupIndex = 1;

  groupMap.forEach((vendorIds) => {
    const groupVendors = Array.from(vendorIds)
      .map(id => vendorLookup.get(id)!)
      .filter(Boolean);

    if (groupVendors.length < 2) return;

    const groupPairs = pairs.filter(p =>
      vendorIds.has(p.vendorA.Vendor_ID) && vendorIds.has(p.vendorB.Vendor_ID)
    );

    const highestSeverity = groupPairs.some(p => p.severity === 'CRITICAL')
      ? 'CRITICAL'
      : groupPairs.some(p => p.severity === 'HIGH')
      ? 'HIGH'
      : 'MEDIUM';

    const matchedFieldNames = Array.from(
      new Set(groupPairs.flatMap(p => p.matchedFields.map(f => f.label)))
    );

    const userMap = new Map<string, { userId: string; userName: string; adminId?: string; adminName?: string }>();
    const adminMap = new Map<string, { adminId: string; adminName: string }>();

    groupVendors.forEach(v => {
      userMap.set(v.Assigned_User_ID, {
        userId: v.Assigned_User_ID,
        userName: v.Assigned_User_Name || v.Assigned_User_ID,
        adminId: v.Admin_ID,
        adminName: v.Admin_Name
      });
      if (v.Admin_ID) {
        adminMap.set(v.Admin_ID, {
          adminId: v.Admin_ID,
          adminName: v.Admin_Name || v.Admin_ID
        });
      }
    });

    const isCrossUser = userMap.size > 1;
    const isCrossAdmin = adminMap.size > 1;

    groups.push({
      groupId: `GRP-DUP-${String(groupIndex++).padStart(3, '0')}`,
      primaryVendor: groupVendors[0],
      duplicateVendors: groupVendors.slice(1),
      allVendors: groupVendors,
      matchedFieldNames,
      highestSeverity,
      isCrossUser,
      isCrossAdmin,
      involvedUsers: Array.from(userMap.values()),
      involvedAdmins: Array.from(adminMap.values()),
      pairs: groupPairs
    });
  });

  const totalDuplicateVendors = new Set(pairs.flatMap(p => [p.vendorA.Vendor_ID, p.vendorB.Vendor_ID])).size;
  const crossUserDuplicatesCount = pairs.filter(p => p.isCrossUser).length;
  const bankAccountDuplicatesCount = pairs.filter(p => p.matchedFields.some(f => f.field === 'BANK_ACCOUNT' || f.field === 'IBAN')).length;
  const nameDuplicatesCount = pairs.filter(p => p.matchedFields.some(f => f.field === 'VENDOR_NAME')).length;

  return {
    totalDuplicateVendors,
    totalDuplicateGroups: groups.length,
    crossUserDuplicatesCount,
    bankAccountDuplicatesCount,
    nameDuplicatesCount,
    groups,
    pairs
  };
}

/**
 * Build full side-by-side matrix for a group or pair of vendors
 */
export interface VendorComparisonRow {
  key: string;
  label: string;
  category: 'IDENTITY' | 'BANKING' | 'CONTACT' | 'OPERATIONS';
  isIdentical: boolean;
  isHighRiskMatch: boolean;
  values: {
    vendorId: string;
    vendorName: string;
    value: string;
  }[];
}

export function buildComparisonMatrix(vendors: Vendor[]): VendorComparisonRow[] {
  if (vendors.length === 0) return [];

  const rows: {
    key: string;
    label: string;
    category: 'IDENTITY' | 'BANKING' | 'CONTACT' | 'OPERATIONS';
    getValue: (v: Vendor) => string;
    isHighRisk?: boolean;
  }[] = [
    {
      key: 'Vendor_Name',
      label: 'Vendor Name',
      category: 'IDENTITY',
      getValue: v => v.Vendor_Name
    },
    {
      key: 'Assigned_User',
      label: 'Assigned Operator (User)',
      category: 'OPERATIONS',
      getValue: v => `${v.Assigned_User_Name || v.Assigned_User_ID} (${v.Assigned_User_ID})`
    },
    {
      key: 'Admin_Team',
      label: 'Admin Division',
      category: 'OPERATIONS',
      getValue: v => `${v.Admin_Name || v.Admin_ID} (${v.Admin_ID})`
    },
    {
      key: 'Vendor_Bank_Account',
      label: 'Bank Account & IBAN',
      category: 'BANKING',
      isHighRisk: true,
      getValue: v => v.Vendor_Bank_Account || 'Not Specified'
    },
    {
      key: 'Extracted_IBAN',
      label: 'Extracted IBAN Number',
      category: 'BANKING',
      isHighRisk: true,
      getValue: v => extractBankIdentifiers(v.Vendor_Bank_Account).iban || 'No standard IBAN detected'
    },
    {
      key: 'Contact_Name',
      label: 'Contact Person',
      category: 'CONTACT',
      getValue: v => v.Contact_Name || '—'
    },
    {
      key: 'Contact_Email',
      label: 'Contact Email',
      category: 'CONTACT',
      getValue: v => v.Contact_Email || '—'
    },
    {
      key: 'Contact_Phone',
      label: 'Contact Phone',
      category: 'CONTACT',
      getValue: v => v.Contact_Phone || '—'
    },
    {
      key: 'Social_Media_Link',
      label: 'Social Media / Channel Link',
      category: 'CONTACT',
      getValue: v => v.Social_Media_Link || '—'
    },
    {
      key: 'Vendor_Status',
      label: 'Operational Status',
      category: 'OPERATIONS',
      getValue: v => v.Vendor_Status
    },
    {
      key: 'Created_Date',
      label: 'Registered Date (GST)',
      category: 'OPERATIONS',
      getValue: v => v.Created_Date
    },
    {
      key: 'Notes',
      label: 'Profile Notes',
      category: 'OPERATIONS',
      getValue: v => v.Notes || 'None'
    }
  ];

  return rows.map(r => {
    const rawValues = vendors.map(v => ({
      vendorId: v.Vendor_ID,
      vendorName: v.Vendor_Name,
      value: r.getValue(v)
    }));

    // Check if values across vendors are identical or matched
    const uniqueValues = new Set(
      rawValues
        .map(rv => rv.value.trim().toLowerCase())
        .filter(val => val !== '—' && val !== 'none' && val !== 'not specified' && val !== '')
    );

    const isIdentical = uniqueValues.size === 1 && rawValues.length > 1;
    const isHighRiskMatch = Boolean(r.isHighRisk && isIdentical);

    return {
      key: r.key,
      label: r.label,
      category: r.category,
      isIdentical,
      isHighRiskMatch,
      values: rawValues
    };
  });
}
