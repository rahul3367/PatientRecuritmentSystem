import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, Send, UserCheck, UserMinus, ShieldAlert, Sparkles } from 'lucide-react';

export function StatusBadge({ status, type = 'auto', size = 'md' }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  let badgeClass = 'badge ';
  let icon = null;
  let label = status;

  // Verdict Badges
  if (normalized === 'APPROVED') {
    badgeClass += 'badge-approved';
    icon = <CheckCircle2 size={size === 'sm' ? 12 : 14} />;
    label = 'Approved';
  } else if (normalized === 'NEEDS_REVIEW') {
    badgeClass += 'badge-needs-review';
    icon = <AlertCircle size={size === 'sm' ? 12 : 14} />;
    label = 'Needs Review';
  } else if (normalized === 'REJECTED') {
    badgeClass += 'badge-rejected';
    icon = <XCircle size={size === 'sm' ? 12 : 14} />;
    label = 'Rejected';
  }
  // Enrollment Badges
  else if (normalized === 'INVITED') {
    badgeClass += 'badge-invited';
    icon = <Send size={size === 'sm' ? 12 : 14} />;
    label = 'Invited';
  } else if (normalized === 'ACCEPTED') {
    badgeClass += 'badge-accepted';
    icon = <CheckCircle2 size={size === 'sm' ? 12 : 14} />;
    label = 'Accepted';
  } else if (normalized === 'ENROLLED') {
    badgeClass += 'badge-enrolled';
    icon = <UserCheck size={size === 'sm' ? 12 : 14} />;
    label = 'Enrolled';
  } else if (normalized === 'DROPPED') {
    badgeClass += 'badge-dropped';
    icon = <UserMinus size={size === 'sm' ? 12 : 14} />;
    label = 'Dropped';
  } else if (normalized === 'DECLINED') {
    badgeClass += 'badge-declined';
    icon = <XCircle size={size === 'sm' ? 12 : 14} />;
    label = 'Declined';
  }
  // Waitlist Badges
  else if (normalized === 'WAITING') {
    badgeClass += 'badge-waiting';
    icon = <Clock size={size === 'sm' ? 12 : 14} />;
    label = 'Waiting';
  } else if (normalized === 'PROMOTED') {
    badgeClass += 'badge-promoted';
    icon = <Sparkles size={size === 'sm' ? 12 : 14} />;
    label = 'Promoted';
  } else if (normalized === 'REMOVED') {
    badgeClass += 'badge-declined';
    icon = <XCircle size={size === 'sm' ? 12 : 14} />;
    label = 'Removed';
  }
  // Classification
  else if (normalized === 'HARD') {
    badgeClass += 'badge-hard';
    icon = <ShieldAlert size={size === 'sm' ? 12 : 14} />;
    label = 'HARD GATE';
  } else if (normalized === 'SOFT') {
    badgeClass += 'badge-soft';
    icon = <Sparkles size={size === 'sm' ? 12 : 14} />;
    label = 'SOFT PREFERENCE';
  }
  // Trial Status
  else if (normalized === 'OPEN') {
    badgeClass += 'badge-approved';
    label = 'Recruiting (Open)';
  } else if (normalized === 'CLOSED' || normalized === 'COMPLETED') {
    badgeClass += 'badge-declined';
    label = normalized;
  } else {
    badgeClass += 'badge-declined';
    label = status;
  }

  const paddingStyle = size === 'sm' ? { padding: '0.15rem 0.5rem', fontSize: '0.7rem' } : {};

  return (
    <span className={badgeClass} style={paddingStyle}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
