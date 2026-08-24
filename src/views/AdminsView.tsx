import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { Admin } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  Power,
  Users,
  Building2,
  Mail,
  Lock,
  UserCheck
} from 'lucide-react';

export const AdminsView: React.FC = () => {
  const { session, role } = useAuth();
  const { success, error } = useToast();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate dialog
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, [session]);

  const loadAdmins = async () => {
    if (!session || role !== 'SUPERADMIN') return;
    setLoading(true);
    try {
      const res = await ApiClient.getAdmins(session);
      if (res.success && res.data) {
        setAdmins(res.data);
      }
    } catch (e: any) {
      error('Failed to load admins', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !name || !email || !password) return;

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createAdmin(session, {
        Admin_Name: name,
        Email: email,
        password
      });

      if (res.success) {
        success('Admin Created', `Admin ${name} was successfully created.`);
        setIsAddModalOpen(false);
        resetForm();
        loadAdmins();
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
    if (!session || !selectedAdmin) return;

    setIsSubmitting(true);
    try {
      const res = await ApiClient.updateAdmin(session, selectedAdmin.Admin_ID, {
        Admin_Name: name,
        Email: email,
        password: password || undefined,
        Status: status
      });

      if (res.success) {
        success('Admin Updated', `Admin ${selectedAdmin.Admin_ID} was updated.`);
        setIsEditModalOpen(false);
        resetForm();
        loadAdmins();
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
    if (!session || !selectedAdmin) return;

    const newStatus = selectedAdmin.Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    try {
      const res = await ApiClient.deactivateAdmin(session, selectedAdmin.Admin_ID, newStatus);
      if (res.success) {
        success('Status Updated', `Admin ${selectedAdmin.Admin_Name} is now ${newStatus}.`);
        setIsToggleStatusDialogOpen(false);
        loadAdmins();
      } else {
        error('Action Failed', res.message);
      }
    } catch (e: any) {
      error('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setName(admin.Admin_Name);
    setEmail(admin.Email);
    setStatus(admin.Status);
    setPassword('');
    setIsEditModalOpen(true);
  };

  const openToggleStatusDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsToggleStatusDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setStatus('ACTIVE');
    setSelectedAdmin(null);
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.Admin_Name.toLowerCase().includes(search.toLowerCase()) ||
      a.Email.toLowerCase().includes(search.toLowerCase()) ||
      a.Admin_ID.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'SUPERADMIN') {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
          Access Restricted
        </h3>
        <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
          Only Super Administrators have permission to view and manage Admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Administrator Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Super Admin control: Create admins, monitor team sizes, and manage status.
          </p>
        </div>

        <button
          id="add-admin-btn"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Admin</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-admins-input"
            type="text"
            placeholder="Search by admin name, email, or ADM-ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-900 dark:text-white">{filteredAdmins.length}</span> Admins
        </div>
      </div>

      {/* Admins Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Admin ID</th>
                <th className="py-3.5 px-4">Admin Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Team Scope</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date (GST)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading admin records...
                  </td>
                </tr>
              ) : filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => (
                  <tr key={admin.Admin_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {admin.Admin_ID}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {admin.Admin_Name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {admin.Email}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          <Users className="w-3 h-3" />
                          {admin.userCount || 0} Users
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                          <Building2 className="w-3 h-3" />
                          {admin.vendorCount || 0} Vendors
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="vendorStatus" value={admin.Status} className="text-[10px]" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {admin.Created_Date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`edit-admin-${admin.Admin_ID}`}
                          onClick={() => openEditModal(admin)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Admin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`toggle-admin-status-${admin.Admin_ID}`}
                          onClick={() => openToggleStatusDialog(admin)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            admin.Status === 'ACTIVE'
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                          title={admin.Status === 'ACTIVE' ? 'Deactivate Admin' : 'Reactivate Admin'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No administrators found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Administrator"
        subtitle="Provision an admin account to manage a division of users & vendors."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Full Name
            </label>
            <input
              id="new-admin-name"
              type="text"
              required
              placeholder="e.g. Sarah Jenkins (MENA Team)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Email
            </label>
            <input
              id="new-admin-email"
              type="email"
              required
              placeholder="e.g. admin.mena@company.com"
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
              id="new-admin-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-admin-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Admin: ${selectedAdmin?.Admin_ID}`}
        subtitle="Update name, email, credentials or active state."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Full Name
            </label>
            <input
              id="edit-admin-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Email
            </label>
            <input
              id="edit-admin-email"
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
              id="edit-admin-password"
              type="password"
              placeholder="Leave blank to keep existing password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Account Status
            </label>
            <select
              id="edit-admin-status"
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
              id="submit-edit-admin-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate/Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isToggleStatusDialogOpen}
        onClose={() => setIsToggleStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={selectedAdmin?.Status === 'ACTIVE' ? 'Deactivate Administrator' : 'Reactivate Administrator'}
        message={
          selectedAdmin?.Status === 'ACTIVE'
            ? `Are you sure you want to deactivate ${selectedAdmin?.Admin_Name} (${selectedAdmin?.Admin_ID})? This admin will not be able to log in until reactivated.`
            : `Are you sure you want to reactivate ${selectedAdmin?.Admin_Name} (${selectedAdmin?.Admin_ID})?`
        }
        confirmText={selectedAdmin?.Status === 'ACTIVE' ? 'Deactivate Admin' : 'Reactivate Admin'}
        variant={selectedAdmin?.Status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={isSubmitting}
      />
    </div>
  );
};
