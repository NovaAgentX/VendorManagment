import React, { useState } from 'react';
import { Vendor, VendorDuplicateGroup, DuplicatePair } from '../../types';
import { buildComparisonMatrix, extractBankIdentifiers } from '../../services/duplicateDetector';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  Landmark,
  Building2,
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface DuplicateComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: VendorDuplicateGroup | null;
  pair?: DuplicatePair | null;
  customVendors?: Vendor[];
  title?: string;
}

export const DuplicateComparisonModal: React.FC<DuplicateComparisonModalProps> = ({
  isOpen,
  onClose,
  group,
  pair,
  customVendors,
  title = 'Vendor Identity & Bank Duplicate Comparison'
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'MATCHES_ONLY' | 'BANKING'>('ALL');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const vendorsToCompare: Vendor[] = React.useMemo(() => {
    if (customVendors && customVendors.length > 0) return customVendors;
    if (group) return group.allVendors;
    if (pair) return [pair.vendorA, pair.vendorB];
    return [];
  }, [customVendors, group, pair]);

  const matrix = React.useMemo(() => {
    return buildComparisonMatrix(vendorsToCompare);
  }, [vendorsToCompare]);

  const filteredRows = React.useMemo(() => {
    if (filterMode === 'MATCHES_ONLY') {
      return matrix.filter(r => r.isIdentical || r.isHighRiskMatch);
    }
    if (filterMode === 'BANKING') {
      return matrix.filter(r => r.category === 'BANKING');
    }
    return matrix;
  }, [matrix, filterMode]);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isOpen || vendorsToCompare.length === 0) return null;

  const isCrossUser = new Set(vendorsToCompare.map(v => v.Assigned_User_ID)).size > 1;
  const isCrossAdmin = new Set(vendorsToCompare.map(v => v.Admin_ID)).size > 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Super Admin & Admin cross-user duplicate intelligence audit"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Severity Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
                  Overlap Detected Across {vendorsToCompare.length} Vendor Records
                </span>
                {isCrossUser && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                    Cross-Operator Conflict
                  </span>
                )}
                {isCrossAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                    Cross-Admin Overlap
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                {group?.matchedFieldNames?.length
                  ? `Identical attributes: ${group.matchedFieldNames.join(', ')}.`
                  : 'Multiple operators or divisions share identical banking, contact, or brand credentials.'}
                {' '}Inspect the comparison matrix below to prevent double payouts, duplicate vendor records, or misassigned operator accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              id="filter-compare-all"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Fields ({matrix.length})
            </button>
            <button
              id="filter-compare-matches"
              onClick={() => setFilterMode('MATCHES_ONLY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'MATCHES_ONLY'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Matching Highlights ({matrix.filter(r => r.isIdentical).length})</span>
            </button>
            <button
              id="filter-compare-banking"
              onClick={() => setFilterMode('BANKING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                filterMode === 'BANKING'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Bank & IBAN Only</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Comparing {vendorsToCompare.length} records side-by-side
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4 w-48 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                  Attribute / Field
                </th>
                {vendorsToCompare.map((v, i) => (
                  <th key={v.Vendor_ID} className="py-3.5 px-4 min-w-[240px] max-w-[320px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-slate-400 font-mono text-[10px]">Vendor #{i + 1}</span>
                        <p className="text-slate-900 dark:text-white font-bold truncate">{v.Vendor_ID}</p>
                      </div>
                      <Badge variant="status" value={v.Vendor_Status} className="text-[10px]" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const isBank = row.category === 'BANKING';
                return (
                  <tr
                    key={row.key}
                    className={`transition-colors ${
                      row.isHighRiskMatch
                        ? 'bg-rose-50/80 dark:bg-rose-950/20'
                        : row.isIdentical
                        ? 'bg-amber-50/60 dark:bg-amber-950/15'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Field Name column */}
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-10">
                      <div className="flex items-center gap-1.5">
                        {isBank && <Landmark className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        <span>{row.label}</span>
                      </div>
                      {row.isHighRiskMatch && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
                          Exact Match Alert
                        </span>
                      )}
                      {!row.isHighRiskMatch && row.isIdentical && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">
                          Identical
                        </span>
                      )}
                    </td>

                    {/* Vendor Values columns */}
                    {row.values.map((vVal, i) => (
                      <td
                        key={`${row.key}-${vVal.vendorId}-${i}`}
                        className={`py-3 px-4 align-top text-slate-800 dark:text-slate-200 ${
                          row.isHighRiskMatch ? 'font-mono text-rose-700 dark:text-rose-300 font-semibold' : ''
                        }`}
                      >
                        {row.key === 'Social_Media_Link' && vVal.value !== '—' && vVal.value !== 'None' ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={vVal.value.startsWith('http') ? vVal.value : `https://${vVal.value}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all"
                            >
                              <span>{vVal.value}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        ) : row.key === 'Vendor_Bank_Account' || row.key === 'Extracted_IBAN' ? (
                          <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                            <span className="font-mono text-[11px] break-all leading-snug">
                              {vVal.value}
                            </span>
                            {vVal.value && vVal.value !== '—' && vVal.value !== 'No standard IBAN detected' && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(vVal.value, `${row.key}-${i}`)}
                                title="Copy bank details"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                              >
                                {copiedText === `${row.key}-${i}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="leading-snug break-words">
                            {vVal.value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <span>Only SuperAdmin & Admin have access to cross-operator duplicate audits.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </Modal>
  );
};
