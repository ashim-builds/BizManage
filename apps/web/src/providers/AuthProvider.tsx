'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, setApiBusinessId, setAccessToken } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isSystemAdmin?: boolean;
  readNotifications: string[];
  activeBusinessId: string | null;
  memberships: Array<{
    role: string;
    business: {
      id: string;
      name: string;
      currency: string;
      phone?: string;
      email?: string;
      address?: string;
      taxNumber?: string;
      logoUrl?: string;
      profileCompleted: boolean;
      setupCompleted: boolean;
      isActive: boolean;
      subscriptionStatus: string;
      currentPeriodEnd?: string | null;
      planOverrides: any | null;
      subscriptionPackage: any | null;
      createdAt?: string | null;
      trialEndsAt?: string | null;
    };
  }>;
}

export interface BusinessLimits {
  // Add any future limits here
}

interface AuthContextType {
  user: UserProfile | null;
  activeBusinessId: string | null;
  activeBusinessLimits: BusinessLimits | null;
  loading: boolean;
  e2eePrivateKey: string | null;
  e2eePublicKey: string | null;
  setActiveBusinessId: (id: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [activeBusinessLimits, setActiveBusinessLimits] = useState<BusinessLimits | null>(null);
  
  const [e2eePrivateKey, setE2eePrivateKey] = useState<string | null>(null);
  const [e2eePublicKey, setE2eePublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Load keys from sessionStorage on mount
    setE2eePrivateKey(sessionStorage.getItem('e2ee_private_key'));
    setE2eePublicKey(sessionStorage.getItem('e2ee_public_key'));
  }, []);

  const computeLimits = (userData: UserProfile, bizId: string | null) => {
    if (!bizId) {
      setActiveBusinessLimits(null);
      return;
    }
    const membership = userData.memberships.find(m => m.business.id === bizId);
    if (!membership) {
      setActiveBusinessLimits(null);
      return;
    }

    setActiveBusinessLimits({});
  };

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data) {
        let userData: UserProfile = res.data.data;
        userData.memberships = (userData.memberships || []).map((m: any) => {
          if (m.business?.subscriptionPackage) {
            const pkg = m.business.subscriptionPackage;
            pkg.features = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []);
          }
          return m;
        });
        setUser(userData);

        let bizId = userData.activeBusinessId;
        if (!bizId && userData.memberships.length > 0) {
          bizId = userData.memberships[0]!.business.id;
          // Optimistically update the backend
          api.patch('/auth/me/preferences', { activeBusinessId: bizId }).catch(() => {});
        }
        setActiveBusinessIdState(bizId || null);
        setApiBusinessId(bizId || null);
        computeLimits(userData, bizId || null);
      } else {
        setUser(null);
        setActiveBusinessIdState(null);
        setActiveBusinessLimits(null);
        setApiBusinessId(null);
      }
    } catch (err) {
      setUser(null);
      setActiveBusinessIdState(null);
      setActiveBusinessLimits(null);
      setApiBusinessId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id);
    setApiBusinessId(id);
    if (user) {
      computeLimits(user, id);
    }
    api.patch('/auth/me/preferences', { activeBusinessId: id }).catch(() => {});
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setActiveBusinessIdState(null);
      setActiveBusinessLimits(null);
      setApiBusinessId(null);
      setAccessToken(null); // Clear token from localStorage on mobile
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBusinessId,
        activeBusinessLimits,
        loading,
        e2eePrivateKey,
        e2eePublicKey,
        setActiveBusinessId,
        logout,
        refreshUser: fetchUser,
      }}
    >
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
