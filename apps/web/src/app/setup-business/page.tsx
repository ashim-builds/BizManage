'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setApiBusinessId } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';

import Link from 'next/link';

const CURRENCIES = ['NPR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

export default function SetupBusinessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    currency: 'NPR',
    taxNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Business name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/businesses', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        currency: form.currency,
        taxNumber: form.taxNumber.trim() || undefined,
      });
      if (res.data.success) {
        const businessId = res.data.data.id;
        // Update active business in API preferences
        await api.patch('/auth/me/preferences', { activeBusinessId: businessId }).catch(() => {});
        setApiBusinessId(businessId);
        // Refresh user so memberships update
        await refreshUser();
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '40px',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Building2 size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>
            Set Up Your Business
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>
            Create your business profile to get started with BizManage
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Business Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
              Business Name *
            </label>
            <input
              type="text"
              placeholder="e.g. My Shop Pvt. Ltd."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Currency */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
              Currency
            </label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
              Phone <span style={{ color: 'rgba(255,255,255,0.4)' }}>(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+977 98XXXXXXXX"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Address */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
              Address <span style={{ color: 'rgba(255,255,255,0.4)' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Kathmandu, Nepal"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* PAN/VAT */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 500 }}>
              PAN / VAT Number <span style={{ color: 'rgba(255,255,255,0.4)' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="123456789"
              value={form.taxNumber}
              onChange={e => setForm(f => ({ ...f, taxNumber: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', margin: 0, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating Business...</>
            ) : (
              <>Create Business <ArrowRight size={18} /></>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Shopping as an online store customer?{' '}
            <Link href="/explore-stores" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'underline' }}>
              Browse Online Stores
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
