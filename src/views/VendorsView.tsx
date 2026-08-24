import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { Vendor, User, Admin, VendorStatus, VendorDuplicateGroup, DuplicateSummary } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DuplicateComparisonModal } from '../components/vendors/DuplicateComparisonModal';
import { detectAllVendorDuplicates, compareVendors } from '../services/duplicateDetector';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Power,
  UserCheck,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  Lock,
  User as UserIcon,
  Filter,
  Landmark,
  Globe,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ArrowRightLeft,
  ShieldAlert
} from 'lucide-react';

interface VendorsViewProps {
  onAddCampaignForVendor?: (vendorId: string) => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({ onAddCampaignForVendor }) => {
  const { session, role } = useAuth();
  const { success, error, warning, info } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [vendorName, setVendorName] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [vendorBankAccount, setVendorBankAccount] = useState('');
  const [socialMediaLink, setSocialMediaLink] = useState('');
  const [vendorStatus, setVendorStatus] = useState<VendorStatus>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Soft-Delete / Deactivation Dialog
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  // Duplicate Inspection Modal (Admin & SuperAdmin only)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroupToCompare, setDuplicateGroupToCompare] = useState<VendorDuplicateGroup | null>(null);
  const [duplicateVendorsToCompare, setDuplicateVendorsToCompare] = useState<Vendor[]>([]);

  useEffect(() => {
    loadData();
  }, [session]);

  // Duplicate Intelligence computation for SuperAdmin & Admin
  const duplicateSummary: DuplicateSummary | null = useMemo(() => {
    if (role === 'USER' || vendors.length === 0) return null;
    return detectAllVendorDuplicates(vendors);
  }, [role, vendors]);

  const vendorDuplicateInfoMap = useMemo(() => {
    const map = new Map<string, {
      group: VendorDuplicateGroup;
      otherVendors: Vendor[];
      isCrossUser: boolean;
      hasBankMatch: boolean;
      reasons: string[];
    }>();

    if (!duplicateSummary) return map;

    duplicateSummary.groups.forEach((group) => {
      const hasBankMatch = group.matchedFieldNames.some(
        (name) => name.toLowerCase().includes('bank') || name.toLowerCase().includes('iban')
      );
      group.allVendors.forEach((v) => {
        const id = v.Vendor_ID;
        const otherVendors = group.allVendors.filter((ov) => ov.Vendor_ID !== id);
        map.set(id, {
          group,
          otherVendors,
          isCrossUser: group.isCrossUser,
          hasBankMatch,
          reasons: group.matchedFieldNames
        });
      });
    });

    return map;
  }, [duplicateSummary]);

  // Real-time live duplicate check during creation or editing
  const liveFormDuplicates = useMemo(() => {
    if (role === 'USER') return null;
    if (!vendorBankAccount.trim() && !vendorName.trim() && !contactPhone.trim() && !socialMediaLink.trim()) {
      return null;
    }
    const currentId = selectedVendor?.Vendor_ID;
    const matches: { vendor: Vendor; matchedFields: string[]; isBankMatch: boolean }[] = [];

    vendors.forEach((v) => {
      if (v.Vendor_ID === currentId) return;
      const res = compareVendors(
        {
          Vendor_ID: 'TEMP',
          Vendor_Name: vendorName,
          Vendor_Bank_Account: vendorBankAccount,
          Contact_Phone: contactPhone,
          Contact_Email: contactEmail,
          Social_Media_Link: socialMediaLink
        } as Vendor,
        v
      );
      if (res) {
        matches.push({
          vendor: v,
          matchedFields: res.matchedFields.map((f) => f.label),
          isBankMatch: res.matchedFields.some((f) => f.field === 'BANK_ACCOUNT' || f.field === 'IBAN')
        });
      }
    });

    return matches.length > 0 ? matches : null;
  }, [role, vendorName, vendorBankAccount, contactPhone, contactEmail, socialMediaLink, vendors, selectedVendor]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const vendorRes = await ApiClient.getVendors(session);
      if (vendorRes.success && vendorRes.data) {
        setVendors(vendorRes.data);
      }

      if (role !== 'USER') {
        const userRes = await ApiClient.getUsers(session);
        if (userRes.success && userRes.data) {
          setUsers(userRes.data.filter((u) => u.Status === 'ACTIVE'));
        }

        if (role === 'SUPERADMIN') {
          const adminRes = await ApiClient.getAdmins(session);
          if (adminRes.success && adminRes.data) {
            setAdmins(adminRes.data);
          }
        }
      }
    } catch (e: any) {
      error('Failed to load vendors', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || role !== 'SUPERADMIN') {
      warning('Forbidden', 'Only Super Admin can create vendors.');
      return;
    }
    if (!vendorName || !assignedUserId) return;

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createVendor(session, {
        Vendor_Name: vendorName,
        Assigned_User_ID: assignedUserId,
        Contact_Name: contactName,
        Contact_Email: contactEmail,
        Contact_Phone: contactPhone,
        Vendor_Bank_Account: vendorBankAccount,
        Social_Media_Link: socialMediaLink,
        Notes: notes
      });

      if (res.success) {
        success('Vendor Created', `Vendor ${vendorName} created and assigned.`);
        setIsAddModalOpen(false);
        resetForm();
        loadData();
      } else {
        error('Creation Failed', res.message);
      }
    } catch (e: any) {
      error('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedVendor || role !== 'SUPERADMIN') {
      warning('Forbidden', 'Only Super Admin can edit vendor records.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.updateVendor(session, selectedVendor.Vendor_ID, {
        Vendor_Name: vendorName,
        Assigned_User_ID: assignedUserId,
        Contact_Name: contactName,
        Contact_Email: contactEmail,
        Contact_Phone: contactPhone,
        Vendor_Bank_Account: vendorBankAccount,
        Social_Media_Link: socialMediaLink,
        Vendor_Status: vendorStatus,
        Notes: notes
      });

      if (res.success) {
        success('Vendor Updated', `Vendor ${selectedVendor.Vendor_ID} updated.`);
        setIsEditModalOpen(false);
        resetForm();
        loadData();
      } else {
        error('Update Failed', res.message);
      }
    } catch (e: any) {
      error('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDeactivate = async () => {
    if (!session || !selectedVendor) return;
    if (role === 'USER') {
      warning('Security Rule Enforced', 'Users cannot deactivate or delete vendors.');
      setIsDeactivateDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        selectedVendor.Vendor_Status === 'ACTIVE'
          ? await ApiClient.deactivateVendor(session, selectedVendor.Vendor_ID)
          : await ApiClient.reactivateVendor(session, selectedVendor.Vendor_ID);

      if (res.success) {
        success(
          selectedVendor.Vendor_Status === 'ACTIVE' ? 'Vendor Deactivated' : 'Vendor Reactivated',
          `Vendor ${selectedVendor.Vendor_Name} status updated to ${
            selectedVendor.Vendor_Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
          }. Historical campaigns remain safely intact.`
        );
        setIsDeactivateDialogOpen(false);
        loadData();
      } else {
        error('Action Failed', res.message);
      }
    } catch (e: any) {
      error('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (vendor: Vendor) => {
    if (role === 'USER' || role === 'ADMIN') {
      warning('Read-Only', 'You do not have permission to edit vendor master records. Only Super Admin can edit.');
      return;
    }
    setSelectedVendor(vendor);
    setVendorName(vendor.Vendor_Name);
    setAssignedUserId(vendor.Assigned_User_ID);
    setContactName(vendor.Contact_Name);
    setContactEmail(vendor.Contact_Email);
    setContactPhone(vendor.Contact_Phone);
    setVendorBankAccount(vendor.Vendor_Bank_Account || '');
    setSocialMediaLink(vendor.Social_Media_Link || '');
    setVendorStatus(vendor.Vendor_Status);
    setNotes(vendor.Notes);
    setIsEditModalOpen(true);
  };

  const openDetailsModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsModalOpen(true);
  };

  const openDeactivateDialog = (vendor: Vendor) => {
    if (role === 'USER') {
      warning('Security Rule Enforced', 'Users are not allowed to deactivate vendors.');
      return;
    }
    setSelectedVendor(vendor);
    setIsDeactivateDialogOpen(true);
  };

  const resetForm = () => {
    setVendorName('');
    setAssignedUserId(users[0]?.User_ID || '');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setVendorBankAccount('');
    setSocialMediaLink('');
    setVendorStatus('ACTIVE');
    setNotes('');
    setSelectedVendor(null);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    info('Copied to Clipboard', text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      v.Vendor_Name.toLowerCase().includes(search.toLowerCase()) ||
      v.Vendor_ID.toLowerCase().includes(search.toLowerCase()) ||
      (v.Vendor_Bank_Account || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.Social_Media_Link || '').toLowerCase().includes(search.toLowerCase()) ||
      v.Contact_Name.toLowerCase().includes(search.toLowerCase()) ||
      v.Contact_Email.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'DUPLICATES'
        ? vendorDuplicateInfoMap.has(v.Vendor_ID)
        : v.Vendor_Status === statusFilter;

    const matchUser = userFilter === 'ALL' || v.Assigned_User_ID === userFilter;

    return matchSearch && matchStatus && matchUser;
  });

  const openGroupComparison = (group: VendorDuplicateGroup) => {
    setDuplicateGroupToCompare(group);
    setDuplicateVendorsToCompare([]);
    setIsDuplicateModalOpen(true);
  };

  const openVendorComparison = (vendor: Vendor) => {
    const dupInfo = vendorDuplicateInfoMap.get(vendor.Vendor_ID);
    if (dupInfo) {
      setDuplicateGroupToCompare(dupInfo.group);
      setDuplicateVendorsToCompare([]);
    } else {
      setDuplicateGroupToCompare(null);
      setDuplicateVendorsToCompare([vendor]);
    }
    setIsDuplicateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {role === 'USER' ? 'My Assigned Vendors' : 'Vendor Management'}
            </h1>
            <Badge variant="role" value={role!} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {role === 'USER'
              ? 'View-only access: View vendor details, bank accounts, social links, and launch campaigns for your assigned accounts.'
              : role === 'ADMIN'
              ? 'Admin control: View, assign, and monitor vendors, banking details, and operator allocations within your team division. Vendor creation and editing is restricted to Super Admin.'
              : 'Super Admin control: Full authority across all vendor partnerships, banking records, and operator assignments.'}
          </p>
        </div>

        {role !== 'USER' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {duplicateSummary && duplicateSummary.totalDuplicateGroups > 0 && (
              <button
                id="open-all-duplicates-btn"
                onClick={() => {
                  if (duplicateSummary.groups.length > 0) {
                    openGroupComparison(duplicateSummary.groups[0]);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
                title="Review Duplicate Vendors & Cross-User Overlaps"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Audit Duplicates ({duplicateSummary.totalDuplicateGroups})</span>
              </button>
            )}

            {role === 'SUPERADMIN' && (
            <button
              id="add-vendor-btn"
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Vendor</span>
            </button>
            )}
          </div>
        )}
      </div>

      {/* Security Info Card for Users */}
      {role === 'USER' && (
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>
              <strong>Read-Only Mode:</strong> Master vendor profiles and deactivations are strictly controlled by your Admin. You can launch and edit your campaigns.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            {session?.User_ID}
          </span>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-vendors-input"
            type="text"
            placeholder="Search vendor, bank, link, ID, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Status & Duplicate Filter */}
          {role !== 'USER' && (
            <select
              id="filter-vendor-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE (Soft-Deleted)</option>
              {duplicateSummary && duplicateSummary.totalDuplicateVendors > 0 && (
                <option value="DUPLICATES">
                  ⚠️ Duplicates Only ({duplicateSummary.totalDuplicateVendors})
                </option>
              )}
            </select>
          )}

          {/* User Filter (SuperAdmin & Admin only) */}
          {role !== 'USER' && users.length > 0 && (
            <select
              id="filter-vendor-user-select"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Assigned Operators</option>
              {users.map((u) => (
                <option key={u.User_ID} value={u.User_ID}>
                  {u.User_Name} ({u.User_ID})
                </option>
              ))}
            </select>
          )}

          <div className="text-xs text-slate-500 font-medium ml-auto sm:ml-2">
            Showing: <span className="font-bold text-slate-900 dark:text-white">{filteredVendors.length}</span> Vendors
          </div>
        </div>
      </div>

      {/* Vendors Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Vendor ID</th>
                <th className="py-3.5 px-4">Vendor & Bank Account</th>
                <th className="py-3.5 px-4">Assigned Operator</th>
                {role === 'SUPERADMIN' && <th className="py-3.5 px-4">Admin Division</th>}
                <th className="py-3.5 px-4">Contact & Social Link</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Updated (GST)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading vendor records...
                  </td>
                </tr>
              ) : filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.Vendor_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {vendor.Vendor_ID}
                    </td>

                    {/* Vendor Name & Bank Details */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{vendor.Vendor_Name}</span>
                        </p>
                        {vendor.Vendor_Bank_Account ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <Landmark className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[170px] font-mono" title={vendor.Vendor_Bank_Account}>
                              {vendor.Vendor_Bank_Account}
                            </span>
                          </div>
                        ) : (
                          vendor.Notes && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {vendor.Notes}
                            </p>
                          )
                        )}

                        {/* Duplicate Alert Pill for SuperAdmin & Admin only (Never for User) */}
                        {role !== 'USER' && vendorDuplicateInfoMap.has(vendor.Vendor_ID) && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => openVendorComparison(vendor)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                              title="Click to view side-by-side comparison"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>
                                {vendorDuplicateInfoMap.get(vendor.Vendor_ID)?.hasBankMatch
                                  ? 'Same Bank / IBAN Match'
                                  : 'Duplicate Identity'}
                              </span>
                              <ArrowRightLeft className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vendor.Assigned_User_Name || vendor.Assigned_User_ID}</span>
                      </div>
                    </td>

                    {/* Admin Division */}
                    {role === 'SUPERADMIN' && (
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                          {vendor.Admin_Name || vendor.Admin_ID}
                        </span>
                      </td>
                    )}

                    {/* Contact Info & Social Link */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 min-w-[180px]">
                      <div className="space-y-0.5 text-[11px]">
                        {vendor.Contact_Name && <p className="font-medium text-slate-800 dark:text-slate-200">{vendor.Contact_Name}</p>}
                        {vendor.Social_Media_Link && (
                          <a
                            href={vendor.Social_Media_Link.startsWith('http') ? vendor.Social_Media_Link : `https://${vendor.Social_Media_Link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline max-w-[160px] truncate"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{vendor.Social_Media_Link}</span>
                          </a>
                        )}
                        {vendor.Contact_Email && (
                          <p className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{vendor.Contact_Email}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="vendorStatus" value={vendor.Vendor_Status} className="text-[10px]" />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {vendor.Updated_Date}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Compare Duplicates button (SuperAdmin & Admin only) */}
                        {role !== 'USER' && vendorDuplicateInfoMap.has(vendor.Vendor_ID) && (
                          <button
                            id={`compare-duplicates-${vendor.Vendor_ID}`}
                            onClick={() => openVendorComparison(vendor)}
                            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            title="Compare Overlapping Banking & Identity"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Details button (all roles) */}
                        <button
                          id={`view-vendor-details-${vendor.Vendor_ID}`}
                          onClick={() => openDetailsModal(vendor)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Vendor Details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit button (SuperAdmin only) */}
                        {role === 'SUPERADMIN' && (
                          <button
                            id={`edit-vendor-${vendor.Vendor_ID}`}
                            onClick={() => openEditModal(vendor)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Vendor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Soft-Deactivate / Reactivate button (Admin & SuperAdmin only) */}
                        {role !== 'USER' && (
                          <button
                            id={`toggle-vendor-status-${vendor.Vendor_ID}`}
                            onClick={() => openDeactivateDialog(vendor)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              vendor.Vendor_Status === 'ACTIVE'
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                            title={vendor.Vendor_Status === 'ACTIVE' ? 'Soft-Deactivate Vendor' : 'Reactivate Vendor'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No vendors found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal (SuperAdmin only) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Vendor"
        subtitle="Register vendor profile, bank account, social link, and assign to an active operator."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Live Duplicate Warning Box */}
          {liveFormDuplicates && liveFormDuplicates.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Live Duplicate Warning ({liveFormDuplicates.length} matching {liveFormDuplicates.length === 1 ? 'record' : 'records'})</span>
              </div>
              <div className="space-y-1.5 pl-6">
                {liveFormDuplicates.map((match, mIdx) => (
                  <div key={mIdx} className="text-[11px] flex items-center justify-between gap-2 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {match.vendor.Vendor_Name} ({match.vendor.Vendor_ID}) — Assigned: {match.vendor.Assigned_User_Name || match.vendor.Assigned_User_ID}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold text-[10px] shrink-0">
                      {match.matchedFields.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Vendor / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-vendor-name"
              type="text"
              required
              placeholder="e.g. Apex Media & Publishing"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Assign to Operator (User) <span className="text-rose-500">*</span>
            </label>
            <select
              id="new-vendor-assigned-user"
              required
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Operator</option>
              {users.map((u) => (
                <option key={u.User_ID} value={u.User_ID}>
                  {u.User_Name} ({u.User_ID})
                </option>
              ))}
            </select>
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Vendor Bank Account Details</span>
              <span className="text-[10px] text-slate-400 font-normal">IBAN, Bank Name, Swift</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="new-vendor-bank-account"
                type="text"
                placeholder="e.g. Emirates NBD • IBAN: AE070331000000012345678"
                value={vendorBankAccount}
                onChange={(e) => setVendorBankAccount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Social Media Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Social Media / Channel Link</span>
              <span className="text-[10px] text-slate-400 font-normal">Website / Profile URL</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="new-vendor-social-link"
                type="text"
                placeholder="e.g. https://instagram.com/apexmedia_ae or https://t.me/apexmedia"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <input
                id="new-vendor-contact-name"
                type="text"
                placeholder="e.g. John Davis"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Email
              </label>
              <input
                id="new-vendor-contact-email"
                type="email"
                placeholder="e.g. davis@apexmedia.ae"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Contact Phone
            </label>
            <input
              id="new-vendor-contact-phone"
              type="text"
              placeholder="e.g. +971 4 390 1122"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Notes & Capabilities
            </label>
            <textarea
              id="new-vendor-notes"
              rows={3}
              placeholder="Outreach strengths, target audience, channel specialty..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-create-vendor-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Vendor Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Vendor: ${selectedVendor?.Vendor_ID}`}
        subtitle="Update master information, bank details, social link, reassign operator, or change status."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Live Duplicate Warning Box in Edit */}
          {liveFormDuplicates && liveFormDuplicates.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Duplicate Warning ({liveFormDuplicates.length} matching {liveFormDuplicates.length === 1 ? 'record' : 'records'})</span>
              </div>
              <div className="space-y-1.5 pl-6">
                {liveFormDuplicates.map((match, mIdx) => (
                  <div key={mIdx} className="text-[11px] flex items-center justify-between gap-2 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {match.vendor.Vendor_Name} ({match.vendor.Vendor_ID}) — Assigned: {match.vendor.Assigned_User_Name || match.vendor.Assigned_User_ID}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold text-[10px] shrink-0">
                      {match.matchedFields.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Vendor / Company Name
            </label>
            <input
              id="edit-vendor-name"
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Reassign Operator (User)
            </label>
            <select
              id="edit-vendor-assigned-user"
              required
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {users.map((u) => (
                <option key={u.User_ID} value={u.User_ID}>
                  {u.User_Name} ({u.User_ID})
                </option>
              ))}
            </select>
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Vendor Bank Account Details</span>
              <span className="text-[10px] text-slate-400 font-normal">IBAN, Bank Name, Swift</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-vendor-bank-account"
                type="text"
                placeholder="e.g. Emirates NBD • IBAN: AE070331000000012345678"
                value={vendorBankAccount}
                onChange={(e) => setVendorBankAccount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Social Media Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Social Media / Channel Link</span>
              <span className="text-[10px] text-slate-400 font-normal">Profile URL</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-vendor-social-link"
                type="text"
                placeholder="e.g. https://instagram.com/apexmedia_ae"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <input
                id="edit-vendor-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Email
              </label>
              <input
                id="edit-vendor-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Phone
              </label>
              <input
                id="edit-vendor-contact-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Vendor Status
              </label>
              <select
                id="edit-vendor-status-select"
                value={vendorStatus}
                onChange={(e) => setVendorStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE (Soft-Deleted)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Notes
            </label>
            <textarea
              id="edit-vendor-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-edit-vendor-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details View Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedVendor?.Vendor_Name || 'Vendor Details'}
        subtitle={`ID: ${selectedVendor?.Vendor_ID} • Registered in Asia/Dubai Timezone`}
      >
        {selectedVendor && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <div className="mt-1">
                  <Badge variant="vendorStatus" value={selectedVendor.Vendor_Status} />
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Operator
                </span>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">
                  {selectedVendor.Assigned_User_Name || selectedVendor.Assigned_User_ID}
                </p>
              </div>
            </div>

            {/* Bank Account Details in Vendor Modal */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  Vendor Bank Account
                </span>
                {selectedVendor.Vendor_Bank_Account && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedVendor.Vendor_Bank_Account!, 'vendor-modal-bank')}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/60 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {copiedField === 'vendor-modal-bank' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {selectedVendor.Vendor_Bank_Account ? (
                <p className="font-mono text-xs font-medium text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  {selectedVendor.Vendor_Bank_Account}
                </p>
              ) : (
                <p className="text-slate-400 italic text-[11px]">No bank account recorded for this vendor.</p>
              )}
            </div>

            {/* Social Media Link */}
            {selectedVendor.Social_Media_Link && (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Official Social Channel / Link
                </span>
                <a
                  href={selectedVendor.Social_Media_Link.startsWith('http') ? selectedVendor.Social_Media_Link : `https://${selectedVendor.Social_Media_Link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                >
                  <span>{selectedVendor.Social_Media_Link}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}

            {/* Duplicate Overlap Intelligence for SuperAdmin & Admin only */}
            {role !== 'USER' && selectedVendor && vendorDuplicateInfoMap.has(selectedVendor.Vendor_ID) && (
              <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Duplicate Overlap Intelligence
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      openVendorComparison(selectedVendor);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Compare Side-by-Side</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                  This vendor shares identical banking credentials or normalized identities with other registered records:
                </p>
                <div className="space-y-1.5">
                  {vendorDuplicateInfoMap.get(selectedVendor.Vendor_ID)?.otherVendors.map((other) => (
                    <div key={other.Vendor_ID} className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-100 dark:border-rose-900/40 text-[11px] flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {other.Vendor_Name} ({other.Vendor_ID})
                        </span>
                        {other.Vendor_Bank_Account && (
                          <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                            Bank: {other.Vendor_Bank_Account}
                          </p>
                        )}
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium text-[10px] shrink-0 text-right">
                        Assigned: {other.Assigned_User_Name || other.Assigned_User_ID}
                        <br />
                        <span className="text-slate-400">({other.Admin_Name || other.Admin_ID})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-500">
                Contact Master
              </h4>
              <p className="text-slate-800 dark:text-slate-200">
                <strong>Name:</strong> {selectedVendor.Contact_Name || 'Not provided'}
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                <strong>Email:</strong> {selectedVendor.Contact_Email || 'Not provided'}
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                <strong>Phone:</strong> {selectedVendor.Contact_Phone || 'Not provided'}
              </p>
            </div>

            {selectedVendor.Notes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </span>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedVendor.Notes}
                </p>
              </div>
            )}

            <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-2">
              <p>Created: {selectedVendor.Created_Date} by {selectedVendor.Created_By}</p>
              <p>Updated: {selectedVendor.Updated_Date} by {selectedVendor.Updated_By}</p>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Soft Deactivate / Reactivate Dialog */}
      <ConfirmDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onConfirm={handleSoftDeactivate}
        title={selectedVendor?.Vendor_Status === 'ACTIVE' ? 'Soft-Deactivate Vendor' : 'Reactivate Vendor'}
        message={
          selectedVendor?.Vendor_Status === 'ACTIVE'
            ? `Are you sure you want to deactivate ${selectedVendor?.Vendor_Name} (${selectedVendor?.Vendor_ID})? In accordance with system data integrity rules, the row will NOT be deleted; Vendor_Status will be set to INACTIVE and all past campaign metrics remain accessible for audit.`
            : `Are you sure you want to reactivate ${selectedVendor?.Vendor_Name} (${selectedVendor?.Vendor_ID})? Operators will be able to create new campaigns for this vendor again.`
        }
        confirmText={selectedVendor?.Vendor_Status === 'ACTIVE' ? 'Deactivate Vendor (Soft-Delete)' : 'Reactivate Vendor'}
        variant={selectedVendor?.Vendor_Status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={isSubmitting}
      />

      {/* Duplicate Vendor Comparison Modal (SuperAdmin & Admin only) */}
      {isDuplicateModalOpen && (
        <DuplicateComparisonModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          group={duplicateGroupToCompare}
          customVendors={duplicateVendorsToCompare.length > 0 ? duplicateVendorsToCompare : undefined}
        />
      )}
    </div>
  );
};
