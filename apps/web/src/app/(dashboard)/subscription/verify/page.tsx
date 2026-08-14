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
    if (!searchParams) {
      setStatus('pending');
      setTitle('Payment Pending');
      setMessage('We could not read the payment response. Please check your subscription page later.');
      return;
    }
    const data = searchParams.get('data');
    const statusParam = searchParams.get('status');
    
    const transactionUuid = searchParams.get('transaction_uuid');

    const showGatewayStatus = async () => {
      if (!transactionUuid) {
        setStatus(statusParam === 'canceled' ? 'error' : 'pending');
        setTitle(statusParam === 'canceled' ? 'Payment Cancelled' : 'Payment Pending');
        setMessage('We could not identify this payment attempt. Please check your subscription page later.');
        return;
      }
      try {
        const response = await api.get(`/esewa/status/${encodeURIComponent(transactionUuid)}`);
        const gatewayStatus = response.data.status;
        if (gatewayStatus === 'COMPLETE' || gatewayStatus === 'SUCCESS') {
          await refreshUser(); setStatus('success'); setTitle('Payment Successful!'); setMessage(response.data.message);
        } else if (gatewayStatus === 'PENDING') {
          setStatus('pending'); setTitle('Payment Pending'); setMessage(response.data.message);
        } else {
          setStatus('error'); setTitle(gatewayStatus === 'CANCELED' ? 'Payment Cancelled' : gatewayStatus === 'NOT_FOUND' || gatewayStatus === 'EXPIRED' ? 'Payment Expired' : 'Payment Failed'); setMessage(response.data.message);
        }
      } catch (error: any) {
        setStatus('pending'); setTitle('Payment Pending'); setMessage(error.response?.data?.message || 'We could not verify the payment yet. Please try again shortly.');
      }
    };

    if (statusParam === 'failure' || statusParam === 'canceled') {
      showGatewayStatus();
      return;
    }

    if (!data) {
      const allParams = searchParams.toString();
      setStatus('error');
      setMessage(`Invalid payment response. Missing data. Params: ${allParams || 'none'}`);
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await api.post('/esewa/verify', { data });
        if (response.data.success) {
          await refreshUser();
          setStatus('success'); setTitle('Payment Successful!');
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
        setStatus('pending'); setTitle('Payment Pending');
        setMessage(error.response?.data?.message || 'We could not verify the payment yet. Please try again shortly.');
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
