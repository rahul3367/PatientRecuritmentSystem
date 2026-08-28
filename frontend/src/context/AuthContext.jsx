import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'aegis_auth_token';
const ROLE_KEY = 'aegis_auth_role';
const USER_KEY = 'aegis_auth_user';
const PROFILE_KEY = 'aegis_auth_profile';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY) || null);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [authError, setAuthError] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setToken(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  // Restore & validate authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const meData = await authApi.getMe(storedToken);
        if (isMounted && meData && meData.user_id) {
          const freshUser = {
            id: meData.user_id,
            email: meData.email,
            role: meData.role,
            is_active: meData.is_active,
            name: (meData.role === 'RESEARCHER' ? meData.researcher?.name : meData.patient?.name) || meData.email.split('@')[0]
          };
          const freshProfile = meData.role === 'RESEARCHER' ? meData.researcher : meData.patient;

          setUser(freshUser);
          setRole(meData.role);
          setProfile(freshProfile);
          setToken(storedToken);

          localStorage.setItem(TOKEN_KEY, storedToken);
          localStorage.setItem(ROLE_KEY, meData.role);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          if (freshProfile) {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(freshProfile));
          }
        } else if (meData && meData.unauthorized) {
          // Token is genuinely expired or invalid (401/403)
          if (isMounted) logout();
        } else {
          // Non-fatal response (e.g. backend offline / network error): retain state from localStorage
          const savedUser = localStorage.getItem(USER_KEY);
          const savedRole = localStorage.getItem(ROLE_KEY);
          const savedProfile = localStorage.getItem(PROFILE_KEY);
          if (savedUser && isMounted) {
            try {
              setUser(JSON.parse(savedUser));
              if (savedRole) setRole(savedRole);
              if (savedProfile) setProfile(JSON.parse(savedProfile));
              setToken(storedToken);
            } catch {
              logout();
            }
          }
        }
      } catch (err) {
        console.warn('Session restoration note:', err);
        const savedUser = localStorage.getItem(USER_KEY);
        const savedRole = localStorage.getItem(ROLE_KEY);
        const savedProfile = localStorage.getItem(PROFILE_KEY);
        if (savedUser && isMounted) {
          try {
            setUser(JSON.parse(savedUser));
            if (savedRole) setRole(savedRole);
            if (savedProfile) setProfile(JSON.parse(savedProfile));
            setToken(storedToken);
          } catch {
            logout();
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();
    return () => { isMounted = false; };
  }, [logout]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await authApi.login({ email, password });
      if (!data || !data.access_token) {
        throw new Error('Authentication failed: Invalid credentials');
      }

      const userData = {
        id: data.user_id,
        email: data.email,
        role: data.role,
        name: data.name
      };
      const profileData = data.role === 'RESEARCHER' ? data.researcher : data.patient;

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(ROLE_KEY, data.role);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      if (profileData) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
      }

      setToken(data.access_token);
      setUser(userData);
      setRole(data.role);
      setProfile(profileData);

      return { success: true, role: data.role, data };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your email and password.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (registerData) => {
    setAuthError(null);
    try {
      const data = await authApi.register(registerData);
      if (!data || !data.access_token) {
        throw new Error('Registration failed. Please try again.');
      }

      const userData = {
        id: data.user_id,
        email: data.email,
        role: data.role,
        name: data.name
      };
      const profileData = data.role === 'RESEARCHER' ? data.researcher : data.patient;

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(ROLE_KEY, data.role);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      if (profileData) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
      }

      setToken(data.access_token);
      setUser(userData);
      setRole(data.role);
      setProfile(profileData);

      return { success: true, role: data.role, data };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please verify your details.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const value = {
    token,
    user,
    role,
    profile,
    isAuthenticated: !!token && !!user,
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
