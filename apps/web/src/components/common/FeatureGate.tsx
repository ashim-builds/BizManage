'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: 'members' | 'locations' | 'staff';
  currentUsage: number;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ children }: FeatureGateProps) {
  // Limits are no longer part of the packages, so this gate always passes.
  return <>{children}</>;
}
