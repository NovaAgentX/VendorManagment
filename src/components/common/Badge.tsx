import React from 'react';
import { Role, VendorStatus, CampaignStatus, CampaignType, Platform } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'role' | 'vendorStatus' | 'campaignStatus' | 'campaignType' | 'platform' | 'custom';
  value?: Role | VendorStatus | CampaignStatus | CampaignType | Platform | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'custom', value, children, className = '' }) => {
  const text = children || value;

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (variant === 'role') {
    switch (value) {
      case 'SUPERADMIN':
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
        break;
      case 'ADMIN':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
        break;
      case 'USER':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
    }
  } else if (variant === 'vendorStatus') {
    switch (value) {
      case 'ACTIVE':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'INACTIVE':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
        break;
    }
  } else if (variant === 'campaignStatus') {
    switch (value) {
      case 'Completed':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'In Progress':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
        break;
      case 'Pending':
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
        break;
      case 'Cancelled':
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
    }
  } else if (variant === 'platform') {
    switch (value) {
      case 'Telegram':
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
        break;
      case 'WhatsApp':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'Instagram':
        colorClasses = 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800';
        break;
      case 'Facebook':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
        break;
      case 'Website':
        colorClasses = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
        break;
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border whitespace-nowrap ${colorClasses} ${className}`}
    >
      {text}
    </span>
  );
};
