import React, { useState } from 'react';
import { DuplicateSummary, VendorDuplicateGroup, DuplicatePair, Vendor } from '../../types';
import { DuplicateComparisonModal } from '../vendors/DuplicateComparisonModal';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  Landmark,
  Building2,
  Users,
  ArrowRightLeft,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';

interface DuplicateVendorsWidgetProps {
  summary?: DuplicateSummary;
  onNavigateToVendors?: () => void;
}

export const DuplicateVendorsWidget: React.FC<DuplicateVendorsWidgetProps> = ({
  summary,
  onNavigateToVendors
}) => {
  const [selectedGroup, setSelectedGroup] = useState<VendorDuplicateGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'CROSS_USER'>('ALL');

  if (!summary) return null;

  const handleOpenComparison = (group: VendorDuplicateGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const groups = summary.groups || [];
  const filteredGroups = groups.filter(g => {
    if (severityFilter === 'CRITICAL') return g.highestSeverity === 'CRITICAL';
    if (severityFilter === 'CROSS_USER') return g.isCrossUser;
    return true;
  });

  const hasDuplicates = summary.totalDuplicateGroups > 0;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            hasDuplicates
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            {hasDuplicates ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Duplicate Vendor & Cross-User Overlap Detection
              </h3>
              {hasDuplicates && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {summary.totalDuplicateGroups} {summary.totalDuplicateGroups === 1 ? 'Group' : 'Groups'} Detected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated comparison of bank IBANs, vendor names, contact info, and channel links across operators
            </p>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        {hasDuplicates && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setSeverityFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                severityFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({groups.length})
            </button>
            <button
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                severityFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bank Matches ({groups.filter(g => g.highestSeverity === 'CRITICAL').length})
            </button>
            <button
              onClick={() => setSeverityFilter('CROSS_USER')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                severityFilter === 'CROSS_USER'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cross-User ({groups.filter(g => g.isCrossUser).length})
            </button>
          </div>
        )}
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Overlaps</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {summary.totalDuplicateVendors} <span className="text-xs font-normal text-slate-400">vendors</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Same Bank / IBAN</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {summary.bankAccountDuplicatesCount} <span className="text-xs font-normal text-slate-400">pairs</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Cross-Operator Overlaps</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {summary.crossUserDuplicatesCount} <span className="text-xs font-normal text-slate-400">shared</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Name / Brand Matches</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {summary.nameDuplicatesCount} <span className="text-xs font-normal text-slate-400">entities</span>
          </p>
        </div>
      </div>

      {/* Duplicate Groups List */}
      {hasDuplicates ? (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <div
              key={group.groupId}
              className={`p-4 rounded-2xl border transition-all ${
                group.highestSeverity === 'CRITICAL'
                  ? 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/60'
                  : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Group Info & Matching Attributes */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      {group.groupId}
                    </span>
                    {group.highestSeverity === 'CRITICAL' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                        <Landmark className="w-3 h-3" />
                        <span>Exact Bank / IBAN Match</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Identity / Contact Match</span>
                      </span>
                    )}

                    {group.isCrossUser && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
                        <Users className="w-3 h-3" />
                        <span>Different Operators Involved</span>
                      </span>
                    )}
                  </div>

                  {/* Matched Attributes Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">Matched:</span>
                    {group.matchedFieldNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  {/* Vendors Preview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {group.allVendors.map((vendor, vIdx) => (
                      <div
                        key={vendor.Vendor_ID}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="truncate">
                            <span className="text-[10px] font-mono text-slate-400">Vendor #{vIdx + 1}</span>
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {vendor.Vendor_Name}
                            </p>
                          </div>
                          <Badge variant="status" value={vendor.Vendor_Status} className="text-[9px] py-0" />
                        </div>

                        {/* Assigned user & Bank account preview */}
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Users className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate">
                              Assigned to: <strong className="text-slate-900 dark:text-white">{vendor.Assigned_User_Name || vendor.Assigned_User_ID}</strong> ({vendor.Admin_Name || vendor.Admin_ID})
                            </span>
                          </div>

                          {vendor.Vendor_Bank_Account && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-rose-600 dark:text-rose-400 truncate">
                              <Landmark className="w-3 h-3 shrink-0" />
                              <span className="truncate">{vendor.Vendor_Bank_Account}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Compare Details Button */}
                <div className="flex items-center lg:flex-col justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenComparison(group)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all w-full sm:w-auto justify-center"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Compare Bank & Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            No Duplicate Vendors Detected
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            All registered vendor profiles, bank accounts, and contact identities across operators are unique and fully segregated.
          </p>
        </div>
      )}

      {/* Comparison Modal */}
      {selectedGroup && (
        <DuplicateComparisonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          group={selectedGroup}
        />
      )}
    </div>
  );
};
