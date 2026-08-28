import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building,
  Briefcase,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export function LoginPage({ defaultMode, onBrowseRoles }) {
  const { login, register, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState(() => defaultMode || (window.location.pathname === '/register' ? 'register' : 'login'));
  const [role, setRole] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam && roleParam.toUpperCase() === 'PATIENT') return 'PATIENT';
    if (roleParam && roleParam.toUpperCase() === 'RESEARCHER') return 'RESEARCHER';
    if (defaultMode === 'register' || window.location.pathname === '/register') return 'PATIENT';
    return 'RESEARCHER';
  });

  // Basic Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // OTP Verification State
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpNotice, setOtpNotice] = useState(null);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address to receive your verification OTP code.');
      return;
    }
    setLocalError(null);
    setIsSendingOtp(true);
    try {
      await authApi.sendOtp(email.trim());
      setOtpSent(true);
      setOtpCountdown(30);
      setIsEmailVerified(false);
      setOtpNotice(`Verification code sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err) {
      setLocalError(err.message || 'Failed to send verification code. Please check your email address.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email address first.');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setLocalError(null);
    setIsVerifyingOtp(true);
    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      setIsEmailVerified(true);
      setOtpNotice('Email verified successfully! You may now complete your registration.');
    } catch (err) {
      setLocalError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setLocalError(null);
    setAuthError(null);
    setOtpNotice(null);
    if (newMode === 'register') {
      window.history.replaceState(null, '', '/register');
    } else {
      window.history.replaceState(null, '', '/login');
    }
  };

  const handleBackToHome = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setLocalError(res.error);
        }
      } else {
        if (!name.trim()) {
          setLocalError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setLocalError('Passwords do not match. Please re-enter your password.');
          setIsSubmitting(false);
          return;
        }

        if (!isEmailVerified) {
          if (otpSent && otp.trim().length === 6) {
            try {
              await authApi.verifyOtp(email.trim(), otp.trim());
              setIsEmailVerified(true);
            } catch (err) {
              setLocalError(err.message || 'Invalid verification code. Please check the code sent to your email.');
              setIsSubmitting(false);
              return;
            }
          } else {
            setLocalError('Please request and enter your 6-digit email verification code before creating an account.');
            setIsSubmitting(false);
            return;
          }
        }

        let payload = {
          email: email.trim(),
          password,
          role,
          name: name.trim(),
          consent: true
        };

        if (role === 'RESEARCHER') {
          payload.organization = organization.trim() || null;
          payload.designation = designation.trim() || null;
        }

        const res = await register(payload);
        if (!res.success) {
          setLocalError(res.error);
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentError = localError || authError;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 50%, #e0f2fe 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        color: '#0f172a',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* Subtle Background Ambient Accents */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '45vw',
          height: '45vw',
          maxWidth: 550,
          maxHeight: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(186, 230, 253, 0.45) 0%, rgba(240, 249, 255, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '45vw',
          height: '45vw',
          maxWidth: 550,
          maxHeight: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 242, 254, 0.5) 0%, rgba(240, 249, 255, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      {/* Back to Home Button */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 20 }}>
        <button
          type="button"
          onClick={handleBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.5rem 0.9rem',
            color: '#0369a1',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0284c7';
            e.currentTarget.style.background = '#f0f9ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Main Centered Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: mode === 'register' && role === 'RESEARCHER' ? 520 : 470,
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <div
            onClick={handleBackToHome}
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Activity size={26} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              {mode === 'login' ? 'Sign In to AegisTrial' : 'Create an AegisTrial Account'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              {mode === 'login'
                ? 'Access your clinical research workspace'
                : 'Join as a verified Researcher or Study Participant'}
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '2.25rem',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Segmented Mode Switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '0.25rem',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                padding: '0.55rem',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'login' ? '#ffffff' : 'transparent',
                color: mode === 'login' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: mode === 'login' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              style={{
                padding: '0.55rem',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'register' ? '#ffffff' : 'transparent',
                color: mode === 'register' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: mode === 'register' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none'
              }}
            >
              Register
            </button>
          </div>

          {/* Role selector in Register mode */}
          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '0.45rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Select Account Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('RESEARCHER')}
                  style={{
                    padding: '0.7rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${role === 'RESEARCHER' ? '#0284c7' : '#e2e8f0'}`,
                    background: role === 'RESEARCHER' ? '#f0f9ff' : '#ffffff',
                    color: role === 'RESEARCHER' ? '#0369a1' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ShieldCheck size={18} color={role === 'RESEARCHER' ? '#0284c7' : '#94a3b8'} />
                  <span>Researcher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('PATIENT')}
                  style={{
                    padding: '0.7rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${role === 'PATIENT' ? '#059669' : '#e2e8f0'}`,
                    background: role === 'PATIENT' ? '#ecfdf5' : '#ffffff',
                    color: role === 'PATIENT' ? '#047857' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={18} color={role === 'PATIENT' ? '#059669' : '#94a3b8'} />
                  <span>Patient / Participant</span>
                </button>
              </div>
            </div>
          )}

          {/* OTP Notification Banner */}
          {otpNotice && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#15803d',
                fontSize: '0.84rem',
                lineHeight: 1.4
              }}
            >
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <div>{otpNotice}</div>
            </div>
          )}

          {/* Error Message Box */}
          {currentError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '0.8rem 0.9rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                color: '#dc2626',
                fontSize: '0.84rem',
                lineHeight: 1.4
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{currentError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {mode === 'register' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.35rem'
                  }}
                >
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={role === 'RESEARCHER' ? 'Dr. Rachel Miller' : 'Alice Johnson'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem 0.72rem 2.4rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0284c7';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'register' && role === 'RESEARCHER' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.35rem'
                    }}
                  >
                    Organization
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Building size={15} />
                    </div>
                    <input
                      type="text"
                      placeholder="Johns Hopkins"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.72rem 0.75rem 0.72rem 2.2rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0284c7';
                        e.target.style.background = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.background = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.35rem'
                    }}
                  >
                    Designation
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Briefcase size={15} />
                    </div>
                    <input
                      type="text"
                      placeholder="Lead PI"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.72rem 0.75rem 0.72rem 2.2rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0284c7';
                        e.target.style.background = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.background = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.35rem'
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.85rem 0.72rem 2.4rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284c7';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field with Show/Hide toggle */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.35rem'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.72rem 2.5rem 0.72rem 2.4rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284c7';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register mode) */}
            {mode === 'register' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.35rem'
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem 0.72rem 2.4rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0284c7';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* OTP Verification Section for Registration */}
            {mode === 'register' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>Email Verification Code</span>
                    {isEmailVerified && (
                      <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpCountdown > 0 || isSendingOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: otpCountdown > 0 ? '#94a3b8' : '#0284c7',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: otpCountdown > 0 || isSendingOtp ? 'default' : 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <RefreshCw size={12} className={otpCountdown > 0 || isSendingOtp ? 'spin' : ''} />
                    <span>{otpCountdown > 0 ? `Resend in ${otpCountdown}s` : (isSendingOtp ? 'Sending...' : (otpSent ? 'Resend Code' : 'Send Code'))}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      disabled={isEmailVerified}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ''));
                        setIsEmailVerified(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.72rem 0.85rem 0.72rem 2.4rem',
                        background: isEmailVerified ? '#f0fdf4' : '#f8fafc',
                        border: isEmailVerified ? '1px solid #86efac' : '1px solid #cbd5e1',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        letterSpacing: '0.15em',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        if (!isEmailVerified) {
                          e.target.style.borderColor = '#0284c7';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                        }
                      }}
                      onBlur={(e) => {
                        if (!isEmailVerified) {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.background = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    />
                  </div>
                  {otpSent && !isEmailVerified && (
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otp.trim().length !== 6}
                      style={{
                        padding: '0.72rem 1rem',
                        background: otp.trim().length === 6 ? '#0284c7' : '#94a3b8',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: otp.trim().length === 6 ? 'pointer' : 'default',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {isEmailVerified
                    ? '✓ Email address verified successfully.'
                    : 'Click "Send Code" to receive your 6-digit verification code via email.'}
                </div>
              </div>
            )}

            {/* Terms & Privacy Note */}
            {mode === 'register' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="agree-terms"
                  required
                  defaultChecked
                  style={{ marginTop: '0.2rem' }}
                />
                <label htmlFor="agree-terms" style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.35, cursor: 'pointer' }}>
                  I agree to the <span style={{ color: '#0284c7', fontWeight: 600 }}>Terms of Service</span> and acknowledge the Institutional Data Privacy Charter.
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '0.4rem',
                width: '100%',
                padding: '0.8rem 1rem',
                background: '#0284c7',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.15s ease',
                opacity: isSubmitting ? 0.75 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#0369a1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#0284c7';
                }
              }}
            >
              <span>
                {isSubmitting
                  ? 'Authenticating...'
                  : mode === 'login'
                    ? 'Sign In to Workspace'
                    : role === 'PATIENT'
                      ? 'Create Patient Account'
                      : 'Create Researcher Account'}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

          {/* Compliance Guarantee Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '0.65rem'
            }}
          >
            <Lock size={12} color="#94a3b8" />
            <span>Protected by 256-bit JWT Encryption & HIPAA Compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
