/**
 * AegisTrial — Unified API Client Service
 * 
 * Connects directly to the FastAPI backend routes using VITE_API_BASE_URL.
 * Supports JWT authentication headers and graceful fallback to mock data & client-side matching engine.
 */

import { runMatchingEngine, computeGaps } from './matchingEngine';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Authenticated fetch helper that injects Bearer JWT token if present.
 */
export async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('aegis_auth_token');
  const headers = {
    ...options.headers
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return fetch(url, { ...options, headers });
}

export const authApi = {
  sendOtp: async (email) => {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send verification code.' }));
      throw new Error(err.detail || 'Failed to send verification code.');
    }
    return await res.json();
  },

  verifyOtp: async (email, otp) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed.' }));
      throw new Error(err.detail || 'Invalid verification code.');
    }
    return await res.json();
  },

  login: async ({ email, password }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Invalid email or password');
    }
    return await res.json();
  },

  register: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  },

  getMe: async (customToken = null) => {
    const token = customToken || localStorage.getItem('aegis_auth_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
      if (res.status === 401 || res.status === 403) {
        return { unauthorized: true, status: res.status };
      }
      return null;
    } catch (e) {
      console.warn('authApi.getMe network error:', e);
      return null;
    }
  },

  getMyResearcherProfile: async () => {
    const res = await authFetch('/researchers/me');
    if (res.ok) return await res.json();
    return null;
  },

  getMyPatientProfile: async () => {
    const res = await authFetch('/patients/me');
    if (res.ok) return await res.json();
    return null;
  },

  getMyTrials: async () => {
    const res = await authFetch('/trials/my');
    if (res.ok) return await res.json();
    return [];
  },

  getMyRecommendedTrials: async () => {
    const res = await authFetch('/matching/my/trials');
    if (res.ok) return await res.json();
    return [];
  },

  getMyNotifications: async () => {
    const res = await authFetch('/notifications/my');
    if (res.ok) return await res.json();
    return [];
  },

  getMyEnrollments: async () => {
    const res = await authFetch('/trials/enrollments/my');
    if (res.ok) return await res.json();
    return [];
  }
};

export const trialsApi = {
  getTrials: async (filters = {}) => {
    try {
      const query = new URLSearchParams();
      if (filters.status) query.append('status', filters.status);
      if (filters.search) query.append('search', filters.search);
      if (filters.year) query.append('year', filters.year);
      if (filters.month) query.append('month', filters.month);

      const qs = query.toString();
      const res = await authFetch(`/trials/${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('Backend /trials/ error:', e);
    }
    return [];
  },
  getMyTrials: async () => {
    try {
      const res = await authFetch('/trials/my');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('Backend /trials/my error:', e);
    }
    return [];
  },
  getTrial: async (trialId) => {
    try {
      const res = await authFetch(`/trials/${trialId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`Backend /trials/${trialId} error:`, e);
    }
    return null;
  },
  getTrialCriteria: async (trialId) => {
    try {
      const res = await authFetch(`/trials/${trialId}/criteria`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`Backend /trials/${trialId}/criteria error:`, e);
    }
    return [];
  },
  createManualTrial: async (trialData, criteria) => {
    const res = await authFetch('/trials/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_data: trialData, criteria })
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to create trial' }));
    throw new Error(err.detail || 'Failed to create trial');
  },
  createDraft: async ({ text, file }) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (text) formData.append('text', text);

    const res = await authFetch('/trials/draft', {
      method: 'POST',
      body: formData
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to extract draft criteria' }));
    throw new Error(err.detail || 'Failed to extract draft criteria');
  },
  extractPdfText: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await authFetch('/trials/extract-pdf', {
      method: 'POST',
      body: formData
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to extract text from PDF protocol' }));
    throw new Error(err.detail || 'Failed to extract text from PDF protocol');
  }
};

export const patientsApi = {
  getPatients: async (limit = 500) => {
    try {
      const res = await authFetch(`/patients/?skip=0&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('Backend /patients/ error:', e);
    }
    return [];
  },
  getMyPatientProfile: async () => {
    try {
      const res = await authFetch('/patients/me');
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Backend /patients/me error:', e);
    }
    return null;
  },
  updateMyProfile: async (profileData) => {
    const res = await authFetch('/patients/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  },
  getPatient: async (patientId) => {
    try {
      const res = await authFetch(`/patients/${patientId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`Backend /patients/${patientId} error:`, e);
    }
    return null;
  },
  registerPatient: async (patientData) => {
    const res = await authFetch('/patients/?force=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to register patient' }));
    throw new Error(err.detail || 'Failed to register patient');
  },
  batchUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch('/patients/batch-upload', {
      method: 'POST',
      body: formData
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to batch upload patients' }));
    throw new Error(err.detail || 'Failed to batch upload patients');
  }
};

export const matchingApi = {
  checkTrialEligibility: async (trialId, formInputs = {}) => {
    try {
      const res = await authFetch(`/matching/trial/${trialId}/check-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_inputs: formInputs })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
      const err = await res.json().catch(() => ({ detail: 'Eligibility check failed' }));
      throw new Error(err.detail || 'Eligibility check failed');
    } catch (e) {
      console.warn('Backend check-eligibility error:', e);
      throw e;
    }
  },
  matchPatientToTrial: async (patientId, trialId, patients, trials) => {
    try {
      const res = await authFetch(`/matching/patient/${patientId}/trial/${trialId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (e) {
      console.warn('Backend match preview unavailable, using client engine:', e);
    }
    const patient = patients.find(p => p.patient_id === patientId);
    const trial = trials.find(t => t.trial_id === trialId);
    if (!patient || !trial) throw new Error('Patient or Trial not found');
    return runMatchingEngine(patient, trial);
  },
  screenPatient: async (patientId, trialId, patients, trials) => {
    try {
      const res = await authFetch('/matching/screen/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, trial_id: trialId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (e) {
      console.warn('Backend screening API unavailable, using client engine:', e);
    }
    const patient = patients.find(p => p.patient_id === patientId);
    const trial = trials.find(t => t.trial_id === trialId);
    if (!patient || !trial) throw new Error('Patient or Trial not found');
    const result = runMatchingEngine(patient, trial);
    return {
      ...result,
      screening_id: Date.now(),
      screened_at: new Date().toISOString()
    };
  },
  getPatientsForTrial: async (trialId) => {
    try {
      const res = await authFetch(`/matching/trial/${trialId}/patients`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn(`Backend /matching/trial/${trialId}/patients error:`, e);
    }
    return [];
  },
  getAllScreenings: async (trialId = null) => {
    try {
      const qs = trialId ? `?trial_id=${encodeURIComponent(trialId)}` : '';
      const res = await authFetch(`/matching/screenings${qs}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Backend /matching/screenings error:', e);
    }
    return [];
  },
  getMyRecommendedTrials: async () => {
    try {
      const res = await authFetch('/matching/my/trials');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend /matching/my/trials unavailable:', e);
    }
    return [];
  }
};

export const enrollmentsApi = {
  getMyEnrollments: async () => {
    try {
      const res = await authFetch('/trials/enrollments/my');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend /trials/enrollments/my unavailable:', e);
    }
    return [];
  },
  getAllEnrollments: async () => {
    try {
      const res = await authFetch('/trials/enrollments/all');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend /trials/enrollments/all unavailable:', e);
    }
    return [];
  },
  applyToTrial: async (trialId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({ detail: 'Application failed' }));
      throw new Error(err.detail || 'Application failed');
    } catch (e) {
      console.warn('Backend applyToTrial error:', e);
      throw e;
    }
  },
  invitePatient: async (trialId, patientId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/invite/${patientId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend invite failed:', e);
    }
    return null;
  },
  acceptInvite: async (trialId, patientId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/accept/${patientId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend accept failed:', e);
    }
    return null;
  },
  declineInvite: async (trialId, patientId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/decline/${patientId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend decline failed:', e);
    }
    return null;
  },
  enrollPatient: async (trialId, patientId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/enroll/${patientId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend enroll failed:', e);
    }
    return null;
  },
  dropPatient: async (trialId, patientId, reason = null) => {
    try {
      const res = await authFetch(`/trials/${trialId}/drop/${patientId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend drop failed:', e);
    }
    return null;
  },
  getWaitlists: async () => {
    try {
      const res = await authFetch('/trials/waitlists/all');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend getWaitlists error:', e);
    }
    return [];
  },
  getWaitlist: async (trialId) => {
    try {
      const res = await authFetch(`/trials/${trialId}/waitlist`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend getWaitlist error:', e);
    }
    return [];
  },
  addToWaitlist: async (trialId, patientId, matchPercentage = 0) => {
    try {
      const res = await authFetch(`/trials/${trialId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, match_percentage: matchPercentage })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend addToWaitlist error:', e);
    }
    return null;
  }
};

export const notificationsApi = {
  getMyNotifications: async () => {
    try {
      const res = await authFetch('/notifications/my');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend /notifications/my unavailable:', e);
    }
    return [];
  },
  sendNotification: async ({ patient_id, trial_id, patientId, trialId, message, channel = 'IN_APP' }) => {
    const finalPatientId = patient_id || patientId;
    const finalTrialId = trial_id || trialId;
    try {
      const res = await authFetch('/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: finalPatientId, trial_id: finalTrialId, message, channel })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend notification send failed:', e);
    }
    return null;
  },
  respondNotification: async (notificationId, response) => {
    try {
      const res = await authFetch(`/notifications/${notificationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend respond notification failed:', e);
    }
    return null;
  }
};

export const verificationsApi = {
  getVerifications: async (trialId = null) => {
    try {
      const qs = trialId ? `?trial_id=${encodeURIComponent(trialId)}` : '';
      const res = await authFetch(`/verification/${qs}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Backend /verification/ error:', e);
    }
    return [];
  },
  verifyScreening: async (screeningId, remarks = '') => {
    try {
      const res = await authFetch(`/verification/${screeningId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend verifyScreening error:', e);
    }
    return null;
  },
  overrideVerdict: async (screeningId, overrideVerdict, remarks = '') => {
    try {
      const res = await authFetch(`/verification/${screeningId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override_verdict: overrideVerdict, remarks })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend overrideVerdict error:', e);
    }
    return null;
  }
};

export const dashboardApi = {
  getPublicStats: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/public-stats`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend /dashboard/public-stats error:', e);
    }
    return null;
  },
  getAuditLogs: async () => {
    try {
      const res = await authFetch('/dashboard/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Backend /dashboard/audit-logs error:', e);
    }
    return [];
  }
};

export const exportApi = {
  exportCandidatesCsv: (candidates, trialId) => {
    const downloadUrl = `${API_BASE_URL}/export/trials/${trialId}/candidates.csv`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `candidates_${trialId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  exportDashboardPdfUrl: (trialId) => `${API_BASE_URL}/export/trials/${trialId}/report.pdf`,
  exportDashboardPdf: async (trialId) => {
    const res = await authFetch(`/export/trials/${trialId}/report.pdf`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate PDF export.' }));
      throw new Error(err.detail || 'Failed to generate PDF export.');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `report_${trialId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  }
};
