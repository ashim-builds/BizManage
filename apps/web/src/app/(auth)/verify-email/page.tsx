'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    
    if (otpValue.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/verify-email', { email, otp: otpValue });
      if (res.data.success) {
        // Store token for mobile browsers that block cross-origin cookies
        // The API returns accessToken in the body after successful verification
        if (res.data.data?.accessToken) {
          setAccessToken(res.data.data.accessToken);
        }
        await refreshUser();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || resending) return;
    
    setError('');
    setResendMessage('');
    setResending(true);
    
    try {
      const res = await api.post('/auth/resend-otp', { email });
      if (res.data.success) {
        setResendMessage('A new verification code has been sent to your email.');
        setTimeLeft(60); // Reset timer
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-slate-400 text-sm">
            We sent a 6-digit verification code to<br/>
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm mb-6 text-center">
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 bg-slate-950/50 border border-slate-800 rounded-xl text-center text-2xl font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                placeholder="-"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Verify Email
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-slate-400 mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={timeLeft > 0 || resending}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {resending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend code'}
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-white transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
}
