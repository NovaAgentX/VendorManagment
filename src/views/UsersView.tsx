import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { User, Admin } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit2,
  Power,
  Building2,
  Megaphone,
  ShieldCheck,
  Key,
  ExternalLink,
  Copy,
  CheckCircle2,
  Lock,
  UserCheck
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { session, role, quickSwitch } = useAuth();
  const { success, error, info } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetAdminId, setTargetAdminId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate dialog
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const userRes = await ApiClient.getUsers(session);
      if (userRes.success && userRes.data) {
        setUsers(userRes.data);
      }

      if (role === 'SUPERADMIN') {
        const adminRes = await ApiClient.getAdmins(session);
        if (adminRes.success && adminRes.data) {
          setAdmins(adminRes.data);
        }
      }
    } catch (e: any) {
      error('Failed to load users', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !name || !email || !password) return;

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createUser(session, {
        User_Name: name,
        Email: email,
        password,
        Admin_ID: role === 'SUPERADMIN' ? targetAdminId || (admins[0]?.Admin_ID || 'ADM-0001') : session.Admin_ID
      });

      if (res.success) {
        success('User Created', `User ${name} created successfully.`);
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
    if (!session || !selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await ApiClient.updateUser(session, selectedUser.User_ID, {
        User_Name: name,
        Email: email,
        password: password || undefined,
        Admin_ID: role === 'SUPERADMIN' ? targetAdminId : undefined,
        Status: status
      });

      if (res.success) {
        success('User Updated', `User ${selectedUser.User_ID} updated.`);
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

  const handleToggleStatus = async () => {
    if (!session || !selectedUser) return;

    const newStatus = selectedUser.Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    try {
      const res = await ApiClient.deactivateUser(session, selectedUser.User_ID, newStatus);
      if (res.success) {
        success('Status Updated', `User ${selectedUser.User_Name} is now ${newStatus}.`);
        setIsToggleStatusDialogOpen(false);
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

  const handleImpersonateUser = async (user: User) => {
    if (user.Status !== 'ACTIVE') {
      error('Cannot Impersonate', 'This operator account is currently INACTIVE.');
      return;
    }
    info('Previewing Operator Experience', `Switching to ${user.User_Name}'s workspace (${user.User_ID})...`);
    await quickSwitch('USER', user.User_ID);
  };

  const copyOperatorPortalLink = () => {
    const portalUrl = `${window.location.origin}${window.location.pathname}?portal=user`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    success('Link Copied', 'Operator Staff Portal URL copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setName(user.User_Name);
    setEmail(user.Email);
    setTargetAdminId(user.Admin_ID);
    setStatus(user.Status);
    setPassword('');
    setIsEditModalOpen(true);
  };

  const openToggleStatusDialog = (user: User) => {
    setSelectedUser(user);
    setIsToggleStatusDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setTargetAdminId(admins[0]?.Admin_ID || '');
    setStatus('ACTIVE');
    setSelectedUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.User_Name.toLowerCase().includes(search.toLowerCase()) ||
      u.Email.toLowerCase().includes(search.toLowerCase()) ||
      u.User_ID.toLowerCase().includes(search.toLowerCase());

    const matchAdmin = adminFilter === 'ALL' || u.Admin_ID === adminFilter;
    const matchStatus = statusFilter === 'ALL' || u.Status === statusFilter;

    return matchSearch && matchAdmin && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {role === 'SUPERADMIN' ? 'All System Operators (Users)' : 'Team Campaign Operators'}
            </h1>
            <Badge variant="role" value={role!} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {role === 'SUPERADMIN'
              ? 'Super Admin oversight: Manage operators, inspect credentials, and assign across all admin divisions.'
              : 'Admin control: Manage operators assigned under your leadership, review logins, and assign vendor accounts.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="copy-operator-portal-url-btn"
            type="button"
            onClick={copyOperatorPortalLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
          >
            {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
            <span>{copiedLink ? 'Portal Link Copied' : 'Copy Operator Portal Link'}</span>
          </button>

          {role !== 'USER' && (
            <button
              id="add-user-btn"
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Access & Operator Login Information Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Operator Sign-In & Isolation Gate</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Operators log in exclusively through the dedicated <strong>Operator Staff Portal</strong> using their User ID/Email. They cannot see or access the Admin portal, nor can they edit/delete vendor master records. As an Admin, you can test and preview their exact view below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono">
              Default Password: User@123
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-users-input"
            type="text"
            placeholder="Search name, email, or USR-ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Admin filter (SuperAdmin only) */}
          {role === 'SUPERADMIN' && admins.length > 0 && (
            <select
              id="filter-admin-select"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Admin Teams</option>
              {admins.map((a) => (
                <option key={a.Admin_ID} value={a.Admin_ID}>
                  {a.Admin_Name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            id="filter-user-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <div className="text-xs text-slate-500 font-medium ml-auto sm:ml-2">
            Total: <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> Operators
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">User ID</th>
                <th className="py-3.5 px-4">Operator Name</th>
                <th className="py-3.5 px-4">Operator Email</th>
                <th className="py-3.5 px-4">Assigned Admin</th>
                <th className="py-3.5 px-4">Assigned Vendors</th>
                <th className="py-3.5 px-4">Campaigns</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading operator records...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.User_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {user.User_ID}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {user.User_Name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {user.Email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        {user.Admin_Name || user.Admin_ID}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        <Building2 className="w-3 h-3" />
                        {user.vendorCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                        <Megaphone className="w-3 h-3" />
                        {user.campaignCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="vendorStatus" value={user.Status} className="text-[10px]" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Impersonate / Test User View Button */}
                        <button
                          id={`test-view-user-${user.User_ID}`}
                          onClick={() => handleImpersonateUser(user)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors inline-flex items-center gap-1"
                          title="Preview operator workspace and data isolation"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test View</span>
                        </button>

                        <button
                          id={`edit-user-${user.User_ID}`}
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`toggle-user-status-${user.User_ID}`}
                          onClick={() => openToggleStatusDialog(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.Status === 'ACTIVE'
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                          title={user.Status === 'ACTIVE' ? 'Deactivate User' : 'Reactivate User'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No operators found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Operator (User)"
        subtitle="Provision an operator account for vendor outreach & campaign execution."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              placeholder="e.g. Alex Rivers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              placeholder="e.g. alex.rivers@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Password
            </label>
            <input
              id="new-user-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* SuperAdmin can select Admin */}
          {role === 'SUPERADMIN' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Admin Division
              </label>
              <select
                id="new-user-admin-select"
                value={targetAdminId}
                onChange={(e) => setTargetAdminId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {admins.map((a) => (
                  <option key={a.Admin_ID} value={a.Admin_ID}>
                    {a.Admin_Name} ({a.Admin_ID})
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === 'ADMIN' && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
              This user will automatically be assigned to your team ({session?.Name}).
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-user-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.User_ID}`}
        subtitle="Update user details, credentials, or assignment."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="edit-user-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="edit-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              New Password (Optional)
            </label>
            <input
              id="edit-user-password"
              type="password"
              placeholder="Leave blank to keep existing password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* SuperAdmin can change Admin assignment */}
          {role === 'SUPERADMIN' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Admin Division
              </label>
              <select
                id="edit-user-admin-select"
                value={targetAdminId}
                onChange={(e) => setTargetAdminId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {admins.map((a) => (
                  <option key={a.Admin_ID} value={a.Admin_ID}>
                    {a.Admin_Name} ({a.Admin_ID})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Account Status
            </label>
            <select
              id="edit-user-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-edit-user-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate User Dialog */}
      <ConfirmDialog
        isOpen={isToggleStatusDialogOpen}
        onClose={() => setIsToggleStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={selectedUser?.Status === 'ACTIVE' ? 'Deactivate Operator' : 'Reactivate Operator'}
        message={
          selectedUser?.Status === 'ACTIVE'
            ? `Are you sure you want to deactivate ${selectedUser?.User_Name} (${selectedUser?.User_ID})? This user will not be able to log in or create campaigns.`
            : `Are you sure you want to reactivate ${selectedUser?.User_Name} (${selectedUser?.User_ID})?`
        }
        confirmText={selectedUser?.Status === 'ACTIVE' ? 'Deactivate User' : 'Reactivate User'}
        variant={selectedUser?.Status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={isSubmitting}
      />
    </div>
  );
};
