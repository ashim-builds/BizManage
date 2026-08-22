'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, X, Sparkles, ArrowRight, Check } from 'lucide-react';

interface GuideNoticeModalProps {
  onOpenGuide?: (lang: 'np' | 'en') => void;
}

export function GuideNoticeModal({ onOpenGuide }: GuideNoticeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('bizmanage_guide_notice_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_guide_notice_dismissed', 'true');
    }
  };

  const handleSelectLang = (lang: 'np' | 'en') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_guide_lang', lang);
    }
    if (onOpenGuide) {
      onOpenGuide(lang);
    } else {
      router.push('/guide');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 shadow-xl relative animate-in fade-in slide-in-from-top-3 duration-300 font-sans">
      {/* Close cross button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-8 md:pr-10">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                नयाँ हुनुहुन्छ? BizManage उपयोग निर्देशिका (User Guide)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                🇳🇵 नेपाली & 🇬🇧 English
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              बिल काट्ने, भ्याट/PAN मिलाउने, पार्टी चढाउने, स्टक राख्ने र नाफा-नोक्सान हेर्ने सम्पूर्ण तरिका सिक्न तलको भाषा छानेर गाइड खोल्नुहोस्।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => handleSelectLang('np')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            <span>🇳🇵</span> नेपालीमा खोल्नुहोस्
          </button>
          <button
            onClick={() => handleSelectLang('en')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
          >
            <span>🇬🇧</span> Read in English
          </button>
        </div>
      </div>
    </div>
  );
}
