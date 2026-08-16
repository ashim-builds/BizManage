'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Check, XCircle, Loader2, Clock3 } from 'lucide-react';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [title, setTitle] = useState('Processing...');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    // Extract parameters with robust fallbacks
    let data = searchParams?.get('data') || null;
    let statusParam = searchParams?.get('status') || null;
    let transactionUuid = searchParams?.get('transaction_uuid') || null;

    if (typeof window !== 'undefined') {
      const href = window.location.href;
      if (!data) {
        const dataMatch = href.match(/[?&]data=([^&#]+)/);
        if (dataMatch) data = decodeURIComponent(dataMatch[1]);
      }
      if (!transactionUuid) {
        const uuidMatch = href.match(/[?&]transaction_uuid=([^&#]+)/);
        if (uuidMatch) transactionUuid = decodeURIComponent(uuidMatch[1]);
      }
      if (!statusParam) {
        const statusMatch = href.match(/[?&]status=([^&#]+)/);
        if (statusMatch) statusParam = decodeURIComponent(statusMatch[1]);
      }
    }

    const showGatewayStatus = async () => {
      if (!transactionUuid) {
        setStatus(statusParam === 'failure' || statusParam === 'canceled' ? 'error' : 'pending');
        setTitle(statusParam === 'canceled' ? 'Payment Cancelled' : 'Payment Failed');
        setMessage('We could not identify this payment attempt. Please check your subscription page.');
        return;
      }
      try {
        const response = await api.get(`/esewa/status/${encodeURIComponent(transactionUuid)}`);
        const gatewayStatus = response.data.status;
        if (gatewayStatus === 'COMPLETE' || gatewayStatus === 'SUCCESS') {
          await refreshUser();
          setStatus('success');
          setTitle('Payment Successful!');
          setMessage(response.data.message || 'Payment verified successfully! Your subscription is now active.');
          setTimeout(() => router.push('/subscription'), 3000);
        } else if (gatewayStatus === 'PENDING') {
          setStatus('pending');
          setTitle('Payment Pending');
          setMessage(response.data.message || 'Your payment is being processed.');
        } else {
          setStatus('error');
          setTitle(
            gatewayStatus === 'CANCELED'
              ? 'Payment Cancelled'
              : gatewayStatus === 'NOT_FOUND' || gatewayStatus === 'EXPIRED'
              ? 'Payment Expired'
              : 'Payment Failed'
          );
          setMessage(response.data.message || 'Payment could not be completed.');
        }
      } catch (error: any) {
        setStatus('error');
        setTitle('Payment Failed');
        setMessage(error.response?.data?.message || 'Payment verification failed. Please try again.');
      }
    };

    if (statusParam === 'failure' || statusParam === 'canceled') {
      showGatewayStatus();
      return;
    }

    if (!data) {
      if (transactionUuid) {
        showGatewayStatus();
        return;
      }
      setStatus('error');
      setMessage('Invalid payment response. Missing data from payment gateway.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await api.post('/esewa/verify', { data });
        if (response.data.success) {
          await refreshUser();
          setStatus('success');
          setTitle('Payment Successful!');
          setMessage('Payment verified successfully! Your subscription is now active.');
          setTimeout(() => {
            router.push('/subscription');
          }, 3000);
        } else {
          setStatus(response.data.status === 'PENDING' ? 'pending' : 'error');
          setTitle(response.data.status === 'PENDING' ? 'Payment Pending' : 'Payment Failed');
          setMessage(response.data.message || 'Payment verification failed.');
        }
      } catch (error: any) {
        // If verify endpoint throws, fallback to check status via transaction UUID if available
        try {
          const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
          if (decoded?.transaction_uuid) {
            const statusRes = await api.get(`/esewa/status/${encodeURIComponent(decoded.transaction_uuid)}`);
            if (statusRes.data.status === 'COMPLETE' || statusRes.data.status === 'SUCCESS') {
              await refreshUser();
              setStatus('success');
              setTitle('Payment Successful!');
              setMessage('Payment verified successfully!');
              setTimeout(() => router.push('/subscription'), 3000);
              return;
            }
          }
        } catch {
          // ignore fallback decode error
        }

        setStatus('error');
        setTitle('Payment Verification Failed');
        setMessage(error.response?.data?.message || error.message || 'We could not verify the payment.');
      }
    };

    verifyPayment();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400">{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <p className="text-sm text-slate-500">Redirecting you back to the subscription page...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <button 
              onClick={() => router.push('/subscription')}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
            >
              Back to Subscriptions
            </button>
          </div>
        )}
        {status === 'pending' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-6">
              <Clock3 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <button onClick={() => router.push('/subscription')} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium">Back to Subscriptions</button>
          </div>
        )}
      </div>
    </div>
  );
}
