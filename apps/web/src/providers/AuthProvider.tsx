'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  memberships: Array<{
    role: string;
    business: {
      id: string;
      name: string;
      currency: string;
      taxNumber?: string;
    };
  }>;
}

interface AuthContextType {
  user: UserProfile | null;
  activeBusinessId: string | null;
  loading: boolean;
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
  const pathname = usePathname();

  const fetchUser = async () => {
    const token = localStorage.getItem('bizmanage_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userData: UserProfile = res.data.data;
        setUser(userData);

        let savedBizId = localStorage.getItem('bizmanage_active_business_id');
        if (!savedBizId && userData.memberships.length > 0) {
          savedBizId = userData.memberships[0]!.business.id;
          localStorage.setItem('bizmanage_active_business_id', savedBizId);
        }
        setActiveBusinessIdState(savedBizId);
      }
    } catch (err) {
      localStorage.removeItem('bizmanage_token');
      localStorage.removeItem('bizmanage_active_business_id');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const setActiveBusinessId = (id: string) => {
    localStorage.setItem('bizmanage_active_business_id', id);
    setActiveBusinessIdState(id);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('bizmanage_token');
      localStorage.removeItem('bizmanage_active_business_id');
      setUser(null);
      setActiveBusinessIdState(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBusinessId,
        loading,
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
