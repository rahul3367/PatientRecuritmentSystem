/**
 * AegisTrial Formatter Utilities
 */

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateString);
  }
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${Number(value).toFixed(decimals)}%`;
}

export function getVerdictClass(verdict) {
  switch (verdict) {
    case 'APPROVED':
      return 'badge-approved';
    case 'NEEDS_REVIEW':
      return 'badge-needs-review';
    case 'REJECTED':
      return 'badge-rejected';
    default:
      return '';
  }
}

export function getEnrollmentClass(status) {
  switch (status) {
    case 'INVITED':
      return 'badge-invited';
    case 'ACCEPTED':
      return 'badge-accepted';
    case 'ENROLLED':
      return 'badge-enrolled';
    case 'DROPPED':
      return 'badge-dropped';
    case 'DECLINED':
      return 'badge-declined';
    default:
      return '';
  }
}
