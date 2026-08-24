import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { Campaign, Vendor, CampaignStatus, CampaignPlatform } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Search,
  Edit2,
  Calendar,
  Building2,
  TrendingUp,
  DollarSign,
  FileText,
  ExternalLink,
  Landmark,
  Globe,
  Share2,
  CreditCard,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

const PLATFORMS: CampaignPlatform[] = [
  'Instagram',
  'Telegram',
  'WhatsApp',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Google Ads',
  'Twitter/X',
  'Email',
  'Other'
];

const CAMPAIGN_TYPES = [
  'Sponsored Post',
  'Influencer Collab',
  'Telegram Broadcast',
  'WhatsApp Broadcast',
  'Banner Ad',
  'Search PPC',
  'Newsletter Feature',
  'Product Review',
  'Brand Awareness',
  'Lead Generation',
  'Promotion'
];

interface CampaignsViewProps {
  initialOpenAdd?: boolean;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ initialOpenAdd = false }) => {
  const { session, role } = useAuth();
  const { success, error, warning, info } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenAdd);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorBankAccount, setVendorBankAccount] = useState('');
  const [socialMediaLink, setSocialMediaLink] = useState('');
  const [campaignType, setCampaignType] = useState('Sponsored Post');
  const [platform, setPlatform] = useState<CampaignPlatform>('Instagram');
  const [campaignDate, setCampaignDate] = useState(new Date().toISOString().split('T')[0]);
  const [reachCount, setReachCount] = useState<number>(0);
  const [engagementCount, setEngagementCount] = useState<number>(0);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('In Progress');
  const [cost, setCost] = useState<number>(0);
  const [campaignDetails, setCampaignDetails] = useState('');
  const [campaignResult, setCampaignResult] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [campRes, vendRes] = await Promise.all([
        ApiClient.getCampaigns(session),
        ApiClient.getVendors(session)
      ]);

      if (campRes.success && campRes.data) {
        setCampaigns(campRes.data);
      }
      if (vendRes.success && vendRes.data) {
        // Active vendors for creating campaigns
        const activeVendors = vendRes.data.filter((v) => v.Vendor_Status === 'ACTIVE');
        setVendors(activeVendors);
        if (activeVendors.length > 0 && !vendorId) {
          selectVendorAndAutofill(activeVendors[0].Vendor_ID, activeVendors);
        }
      }
    } catch (e: any) {
      error('Failed to load campaigns', e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectVendorAndAutofill = (selectedId: string, vendorList = vendors) => {
    setVendorId(selectedId);
    const targetVendor = vendorList.find((v) => v.Vendor_ID === selectedId);
    if (targetVendor) {
      setVendorName(targetVendor.Vendor_Name);
      if (targetVendor.Vendor_Bank_Account) {
        setVendorBankAccount(targetVendor.Vendor_Bank_Account);
      }
      if (targetVendor.Social_Media_Link) {
        setSocialMediaLink(targetVendor.Social_Media_Link);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || role === 'ADMIN') {
      warning('Forbidden', 'Admins can view campaigns but cannot create them.');
      return;
    }
    if (!session || !vendorId) {
      warning('Selection Required', 'Please select an assigned vendor for this campaign.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createCampaign(session, {
        Vendor_ID: vendorId,
        Vendor_Name: vendorName.trim(),
        Vendor_Bank_Account: vendorBankAccount.trim(),
        Social_Media_Link: socialMediaLink.trim(),
        Campaign_Type: campaignType,
        Platform: platform,
        Campaign_Date: campaignDate,
        Reach_Count: Number(reachCount) || 0,
        Engagement_Count: Number(engagementCount) || 0,
        Campaign_Status: campaignStatus,
        Cost: Number(cost) || 0,
        Campaign_Details: campaignDetails.trim(),
        Campaign_Result: campaignResult.trim(),
        Notes: notes.trim()
      });

      if (res.success) {
        success('Campaign Launched', `New campaign registered with vendor details & bank account.`);
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
    if (!session || !selectedCampaign) return;
    if (role === 'ADMIN') {
      warning('Forbidden', 'Admins can view campaigns but cannot edit campaign details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.updateCampaign(session, selectedCampaign.Campaign_ID, {
        Vendor_Name: vendorName.trim(),
        Vendor_Bank_Account: vendorBankAccount.trim(),
        Social_Media_Link: socialMediaLink.trim(),
        Campaign_Type: campaignType,
        Platform: platform,
        Campaign_Date: campaignDate,
        Reach_Count: Number(reachCount) || 0,
        Engagement_Count: Number(engagementCount) || 0,
        Campaign_Status: campaignStatus,
        Cost: Number(cost) || 0,
        Campaign_Details: campaignDetails.trim(),
        Campaign_Result: campaignResult.trim(),
        Notes: notes.trim()
      });

      if (res.success) {
        success('Campaign Updated', `Campaign ${selectedCampaign.Campaign_ID} updated successfully.`);
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

  const openEditModal = (camp: Campaign) => {
    if (role === 'ADMIN') {
      warning('Read-Only', 'Admins can view campaigns but cannot edit them.');
      return;
    }
    setSelectedCampaign(camp);
    setVendorId(camp.Vendor_ID);
    setVendorName(camp.Vendor_Name || '');
    setVendorBankAccount(camp.Vendor_Bank_Account || '');
    setSocialMediaLink(camp.Social_Media_Link || '');
    setCampaignType(camp.Campaign_Type);
    setPlatform(camp.Platform as any);
    setCampaignDate(camp.Campaign_Date);
    setReachCount(camp.Reach_Count);
    setEngagementCount(camp.Engagement_Count);
    setCampaignStatus(camp.Campaign_Status);
    setCost(camp.Cost);
    setCampaignDetails(camp.Campaign_Details || '');
    setCampaignResult(camp.Campaign_Result || '');
    setNotes(camp.Notes || '');
    setIsEditModalOpen(true);
  };

  const openDetailsModal = (camp: Campaign) => {
    setSelectedCampaign(camp);
    setIsDetailsModalOpen(true);
  };

  const resetForm = () => {
    if (vendors.length > 0) {
      selectVendorAndAutofill(vendors[0].Vendor_ID, vendors);
    } else {
      setVendorId('');
      setVendorName('');
      setVendorBankAccount('');
      setSocialMediaLink('');
    }
    setCampaignType('Sponsored Post');
    setPlatform('Instagram');
    setCampaignDate(new Date().toISOString().split('T')[0]);
    setReachCount(0);
    setEngagementCount(0);
    setCampaignStatus('In Progress');
    setCost(0);
    setCampaignDetails('');
    setCampaignResult('');
    setNotes('');
    setSelectedCampaign(null);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    info('Copied to Clipboard', text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchSearch =
      c.Campaign_ID.toLowerCase().includes(search.toLowerCase()) ||
      (c.Vendor_Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.Vendor_Bank_Account || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.Social_Media_Link || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.User_Name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.Campaign_Type.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || c.Campaign_Status === statusFilter;
    const matchPlatform = platformFilter === 'ALL' || c.Platform === platformFilter;
    const matchVendor = vendorFilter === 'ALL' || c.Vendor_ID === vendorFilter;

    return matchSearch && matchStatus && matchPlatform && matchVendor;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {role === 'USER' ? 'My Assigned Campaigns' : 'Campaign Management'}
            </h1>
            <Badge variant="role" value={role!} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {role === 'USER'
              ? 'Add and update marketing campaigns for your assigned vendors. Includes vendor bank account, social media links, and metrics.'
              : role === 'ADMIN'
              ? 'Review and monitor all vendor campaign activities, banking details, and marketing performance launched by your team. Campaign creation and editing is restricted to Super Admin and Operators.'
              : 'Global marketing oversight across all vendor accounts, banking records, social links, and campaigns.'}
          </p>
        </div>

        {role !== 'ADMIN' && (
        <button
          id="add-campaign-btn"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-campaigns-input"
            type="text"
            placeholder="Search vendor, bank account, link, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Status Filter */}
          <select
            id="filter-campaign-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Platform Filter */}
          <select
            id="filter-campaign-platform-select"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="text-xs text-slate-500 font-medium ml-auto sm:ml-2">
            Showing: <span className="font-bold text-slate-900 dark:text-white">{filteredCampaigns.length}</span> Campaigns
          </div>
        </div>
      </div>

      {/* Campaigns Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Campaign ID</th>
                <th className="py-3.5 px-4">Vendor & Bank Details</th>
                <th className="py-3.5 px-4">Type & Platform / Social Link</th>
                {role !== 'USER' && <th className="py-3.5 px-4">Assigned Operator</th>}
                <th className="py-3.5 px-4">Target Date</th>
                <th className="py-3.5 px-4">Reach & Clicks</th>
                <th className="py-3.5 px-4">Cost (INR)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions (Edit / View)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((camp) => (
                  <tr key={camp.Campaign_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {camp.Campaign_ID}
                    </td>

                    {/* Vendor Name & Bank Details */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{camp.Vendor_Name}</span>
                        </div>
                        {camp.Vendor_Bank_Account ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md max-w-fit">
                            <Landmark className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[180px] font-mono" title={camp.Vendor_Bank_Account}>
                              {camp.Vendor_Bank_Account}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(camp.Vendor_Bank_Account!, `bank-${camp.Campaign_ID}`)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                              title="Copy Bank Account"
                            >
                              {copiedField === `bank-${camp.Campaign_ID}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No bank info added</span>
                        )}
                      </div>
                    </td>

                    {/* Platform, Campaign Type & Social Link */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{camp.Campaign_Type}</span>
                          <Badge variant="platform" value={camp.Platform} className="text-[10px] py-0 px-1.5" />
                        </div>
                        {camp.Social_Media_Link ? (
                          <a
                            href={camp.Social_Media_Link.startsWith('http') ? camp.Social_Media_Link : `https://${camp.Social_Media_Link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline max-w-[200px] truncate"
                            title={camp.Social_Media_Link}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{camp.Social_Media_Link}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No social link</span>
                        )}
                      </div>
                    </td>

                    {/* Operator (Admin / SuperAdmin view) */}
                    {role !== 'USER' && (
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">{camp.User_Name || camp.User_ID}</div>
                        <div className="text-[10px] font-mono text-slate-400">{camp.User_ID}</div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {camp.Campaign_Date}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-slate-800 dark:text-slate-200">
                          <strong>Reach:</strong> {camp.Reach_Count.toLocaleString()}
                        </p>
                        <p className="text-slate-500">
                          <strong>Eng:</strong> {camp.Engagement_Count.toLocaleString()}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      INR {camp.Cost.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="campaignStatus" value={camp.Campaign_Status} className="text-[10px]" />
                    </td>

                    {/* Action buttons: Edit & View Only (NO DELETE OPTION) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`view-campaign-${camp.Campaign_ID}`}
                          onClick={() => openDetailsModal(camp)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {role !== 'ADMIN' && (
                        <button
                          id={`edit-campaign-${camp.Campaign_ID}`}
                          onClick={() => openEditModal(camp)}
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          title="Edit Campaign Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No campaigns found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Campaign Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Launch New Marketing Campaign"
        subtitle="Specify vendor partner, vendor bank account, social media link, and campaign metrics."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Vendor Partner <span className="text-rose-500">*</span>
            </label>
            <select
              id="new-campaign-vendor-select"
              required
              value={vendorId}
              onChange={(e) => selectVendorAndAutofill(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v.Vendor_ID} value={v.Vendor_ID}>
                  {v.Vendor_Name} ({v.Vendor_ID})
                </option>
              ))}
            </select>
            {vendors.length === 0 && (
              <p className="text-[11px] text-rose-500 mt-1">
                No active vendors currently assigned to you. Contact your Admin to assign a vendor.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Vendor / Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="new-campaign-vendor-name"
                type="text"
                required
                placeholder="Vendor Name / Brand"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Vendor Bank Account Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Vendor Bank Account Details</span>
              <span className="text-[10px] text-slate-400 font-normal">Bank Name, IBAN, Account No.</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="new-campaign-bank-account"
                type="text"
                placeholder="e.g. Emirates NBD • IBAN: AE070331000000012345678 • Swift: EBILAEAD"
                value={vendorBankAccount}
                onChange={(e) => setVendorBankAccount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Social Media Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Social Media / Post Link</span>
              <span className="text-[10px] text-slate-400 font-normal">Instagram / Telegram / Post URL</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="new-campaign-social-link"
                type="text"
                placeholder="e.g. https://instagram.com/p/C-928xLMnpq/ or https://t.me/channel/123"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Campaign Type
              </label>
              <select
                id="new-campaign-type-select"
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Platform / Channel
              </label>
              <select
                id="new-campaign-platform-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Campaign Date
              </label>
              <input
                id="new-campaign-date-input"
                type="date"
                required
                value={campaignDate}
                onChange={(e) => setCampaignDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                id="new-campaign-status-select"
                value={campaignStatus}
                onChange={(e) => setCampaignStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Reach (Impressions)
              </label>
              <input
                id="new-campaign-reach-input"
                type="number"
                min="0"
                value={reachCount}
                onChange={(e) => setReachCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Engagement (Clicks)
              </label>
              <input
                id="new-campaign-engagement-input"
                type="number"
                min="0"
                value={engagementCount}
                onChange={(e) => setEngagementCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Budget / Cost (INR)
              </label>
              <input
                id="new-campaign-cost-input"
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Campaign Scope / Deliverables
            </label>
            <input
              id="new-campaign-details-input"
              type="text"
              placeholder="e.g. Broadcasted Q3 voucher across 12 finance discussion channels"
              value={campaignDetails}
              onChange={(e) => setCampaignDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Campaign Notes & Conversion Results
            </label>
            <textarea
              id="new-campaign-notes-input"
              rows={2}
              placeholder="Performance highlights, feedback, follow-up booking notes..."
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
              id="submit-create-campaign-btn"
              type="submit"
              disabled={isSubmitting || vendors.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Launching...' : 'Register Campaign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Campaign: ${selectedCampaign?.Campaign_ID}`}
        subtitle={`Vendor: ${selectedCampaign?.Vendor_Name} • Edit campaign parameters (No delete option)`}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Vendor / Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-campaign-vendor-name"
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Vendor Bank Account */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Vendor Bank Account Details</span>
              <span className="text-[10px] text-slate-400 font-normal">IBAN, Bank Name, Account No.</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-campaign-bank-account"
                type="text"
                placeholder="e.g. Abu Dhabi Commercial Bank • IBAN: AE880332000099887766554"
                value={vendorBankAccount}
                onChange={(e) => setVendorBankAccount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Social Media Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Social Media / Post Link</span>
              <span className="text-[10px] text-slate-400 font-normal">Live Campaign URL</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="edit-campaign-social-link"
                type="text"
                placeholder="e.g. https://instagram.com/p/C-928xLMnpq/ or https://t.me/channel/123"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Campaign Type
              </label>
              <select
                id="edit-campaign-type"
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Platform / Channel
              </label>
              <select
                id="edit-campaign-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Campaign Date
              </label>
              <input
                id="edit-campaign-date"
                type="date"
                required
                value={campaignDate}
                onChange={(e) => setCampaignDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                id="edit-campaign-status"
                value={campaignStatus}
                onChange={(e) => setCampaignStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Reach (Impressions)
              </label>
              <input
                id="edit-campaign-reach"
                type="number"
                min="0"
                value={reachCount}
                onChange={(e) => setReachCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Engagement (Clicks)
              </label>
              <input
                id="edit-campaign-engagement"
                type="number"
                min="0"
                value={engagementCount}
                onChange={(e) => setEngagementCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Budget / Cost (INR)
              </label>
              <input
                id="edit-campaign-cost"
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Campaign Scope / Deliverables
            </label>
            <input
              id="edit-campaign-details-input"
              type="text"
              placeholder="e.g. Broadcasted Q3 voucher across 12 finance channels"
              value={campaignDetails}
              onChange={(e) => setCampaignDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Campaign Results & Outcome
            </label>
            <input
              id="edit-campaign-result-input"
              type="text"
              placeholder="e.g. Generated 4,820 clicks, 310 new signups (6.4% conversion)"
              value={campaignResult}
              onChange={(e) => setCampaignResult(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Internal Campaign Notes
            </label>
            <textarea
              id="edit-campaign-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Protected Record • Deletion strictly restricted</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-edit-campaign-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Campaign Details View Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedCampaign?.Campaign_Type || 'Campaign Details'}
        subtitle={`ID: ${selectedCampaign?.Campaign_ID} • Partner: ${selectedCampaign?.Vendor_Name}`}
      >
        {selectedCampaign && (
          <div className="space-y-4 text-xs">
            {/* Top Status & Platform Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                <div className="mt-1">
                  <Badge variant="campaignStatus" value={selectedCampaign.Campaign_Status} />
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform</span>
                <div className="mt-1">
                  <Badge variant="platform" value={selectedCampaign.Platform} />
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Budget Cost</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1 text-sm font-mono">
                  INR {selectedCampaign.Cost.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Date</span>
                <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">{selectedCampaign.Campaign_Date}</p>
              </div>
            </div>

            {/* Vendor Bank Account Card */}
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  Vendor Bank Account Details
                </span>
                {selectedCampaign.Vendor_Bank_Account && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedCampaign.Vendor_Bank_Account!, 'modal-bank')}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/60 rounded-md border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    {copiedField === 'modal-bank' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Account</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {selectedCampaign.Vendor_Bank_Account ? (
                <p className="font-mono text-xs font-medium text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                  {selectedCampaign.Vendor_Bank_Account}
                </p>
              ) : (
                <p className="text-slate-500 italic text-[11px]">No bank account recorded for this campaign.</p>
              )}
            </div>

            {/* Social Media Link Card */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Social Media & Campaign Link
                </span>
                {selectedCampaign.Social_Media_Link && (
                  <a
                    href={selectedCampaign.Social_Media_Link.startsWith('http') ? selectedCampaign.Social_Media_Link : `https://${selectedCampaign.Social_Media_Link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {selectedCampaign.Social_Media_Link ? (
                <p className="font-mono text-xs text-indigo-900 dark:text-indigo-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 break-all">
                  {selectedCampaign.Social_Media_Link}
                </p>
              ) : (
                <p className="text-slate-500 italic text-[11px]">No social media link provided.</p>
              )}
            </div>

            {/* Reach & Engagement Metrics */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Reach (Impressions)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedCampaign.Reach_Count.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Engagement (Clicks/Actions)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedCampaign.Engagement_Count.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Scope / Deliverables */}
            {selectedCampaign.Campaign_Details && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Campaign Scope & Deliverables</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedCampaign.Campaign_Details}
                </p>
              </div>
            )}

            {/* Results / Outcome */}
            {selectedCampaign.Campaign_Result && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recorded Results & Outcome</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedCampaign.Campaign_Result}
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedCampaign.Notes && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes & Comments</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedCampaign.Notes}
                </p>
              </div>
            )}

            {/* Audit Info */}
            <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p>Operator: {selectedCampaign.User_Name} ({selectedCampaign.User_ID})</p>
              <p>Admin Division: {selectedCampaign.Admin_ID}</p>
              <p>Created: {selectedCampaign.Created_Date} (GST)</p>
              <p>Last Updated: {selectedCampaign.Updated_Date} (GST)</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {role !== 'ADMIN' ? (
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openEditModal(selectedCampaign);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Campaign</span>
              </button>
              ) : <div />}

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
    </div>
  );
};
