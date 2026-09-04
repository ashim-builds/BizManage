'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useItems } from '@/services/itemService';
import { useItemCategories } from '@/services/categoryService';
import { useCurrentBusiness } from '@/services/businessService';
import { saveOfflineSale } from '@/services/offlineSyncService';
import { useCreateSale } from '@/services/saleService';
import { useParties } from '@/services/partyService';
import { ModalPortal } from '@/components/common/ModalPortal';
import { CameraScannerModal } from '@/components/common/CameraScannerModal';
import { toast } from 'react-hot-toast';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  QrCode,
  Receipt,
  Camera,
  CheckCircle2,
  Printer,
  X,
  Clock,
  ArrowLeft,
  Tag,
  Banknote,
  Landmark,
  Maximize2,
  Minimize2,
  Loader2,
  Crown,
  FileText,
  Barcode,
  Sparkles,
  Monitor,
} from 'lucide-react';

export default function POSPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: currentBiz } = useCurrentBusiness();
  const { data: itemsData, isLoading: itemsLoading } = useItems({ limit: 1000 });
  const { data: categories = [] } = useItemCategories();
  const { data: partiesData } = useParties({ type: 'CUSTOMER' });
  const createSale = useCreateSale();

  const rawFeatures = currentBiz?.subscriptionPackage?.features || user?.memberships?.[0]?.business?.subscriptionPackage?.features || [];
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);

  const createdAt = currentBiz?.createdAt ? new Date(currentBiz.createdAt) : new Date();
  const trialDays = 14;
  const trialEndDate = currentBiz?.trialEndsAt 
    ? new Date(currentBiz.trialEndsAt) 
    : new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const isTrialActive = new Date() < trialEndDate;

  // Unlocked during 14-day free trial or if package includes POS_BILLING / Premium
  const isUnlocked = isTrialActive || userFeatures.includes('POS_BILLING') || currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('premium');

  const itemsList: any[] = useMemo(() => {
    return Array.isArray(itemsData) ? itemsData : (itemsData?.data || itemsData?.items || []);
  }, [itemsData]);

  const partiesList: any[] = useMemo(() => {
    return Array.isArray(partiesData) ? partiesData : (partiesData?.data || partiesData?.parties || []);
  }, [partiesData]);

  const [cart, setCart] = useState<
    { id: string; name: string; price: number; unit: string; qty: number; code?: string }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'BANK' | 'CHEQUE'>('CASH');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // Mobile / Tablet Tab State ('scan' vs 'cart')
  const [mobileTab, setMobileTab] = useState<'scan' | 'cart'>('scan');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile viewport detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto focus search input on mount
  useEffect(() => {
    if (isUnlocked) {
      searchInputRef.current?.focus();
    }
  }, [isUnlocked]);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const handleExitPOS = () => {
    if (cart.length > 0) {
      setIsExitModalOpen(true);
    } else {
      router.push('/transactions/sales');
    }
  };

  // Cart operations
  const addToCart = (item: any) => {
    if (!item) return;
    const isService = item.type === 'SERVICE';
    const totalStock = Number(item.currentStock ?? 0);

    if (!isService && totalStock <= 0) {
      toast.error(`"${item.name}" is Out of Stock (0 ${item.unit || 'Pcs'}). Cannot add to bill.`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        const curQty = prev[idx].qty;
        if (!isService && curQty + 1 > totalStock) {
          toast.error(`Cannot select more than available stock (${totalStock} ${item.unit || 'Pcs'})`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], qty: curQty + 1 };
        return next;
      }

      if (!isService && 1 > totalStock) {
        toast.error(`Cannot select more than available stock (${totalStock} ${item.unit || 'Pcs'})`);
        return prev;
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.salePrice || 0),
          unit: item.unit || 'Pcs',
          qty: 1,
          code: item.code,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    if (delta > 0) {
      const item = itemsList.find((i: any) => i.id === id);
      if (item && item.type !== 'SERVICE') {
        const totalStock = Number(item.currentStock ?? 0);
        const curInCart = cart.find((c) => c.id === id);
        if (curInCart && curInCart.qty + delta > totalStock) {
          toast.error(`Cannot select more than available stock (${totalStock} ${item.unit || 'Pcs'})`);
          return;
        }
      }
    }

    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === id) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as any
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCameraScan = (scannedText: string) => {
    const term = scannedText.trim().toLowerCase();
    const matched = itemsList.find((i: any) => {
      if (!i) return false;
      const code = (i.code || '').toLowerCase();
      const name = (i.name || '').toLowerCase();
      return code === term || code.includes(term) || name === term;
    });

    if (matched) {
      const isService = matched.type === 'SERVICE';
      const stock = Number(matched.currentStock ?? 0);
      if (!isService && stock <= 0) {
        toast.error(`Scanned "${matched.name}" is Out of Stock (0 ${matched.unit || 'Pcs'})`);
        return;
      }
      addToCart(matched);
      toast.success(`Added ${matched.name}`, { duration: 1500 });
      setSearchTerm('');
    } else {
      setSearchTerm(scannedText);
      toast.error(`Scanned: "${scannedText}". Matching products shown.`, { duration: 2500 });
    }
  };

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<{
    id?: string;
    voucherNo?: string;
    date: string;
    customerName: string;
    paymentMode: string;
    items: { name: string; qty: number; price: number; total: number }[];
    totalAmount: number;
    paidAmount: number;
    changeDue: number;
  } | null>(null);

  // Global Key shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus search on F2 or Alt+S
      if (e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        setMobileTab('scan');
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Escape to close modals or exit POS
      if (e.key === 'Escape') {
        if (isExitModalOpen) {
          setIsExitModalOpen(false);
          return;
        }
        if (isCameraOpen) {
          setIsCameraOpen(false);
          return;
        }
        if (completedSale) {
          setCompletedSale(null);
          return;
        }
        handleExitPOS();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, isCameraOpen, completedSale, isExitModalOpen]);

  // Filtered Products (Search term or Category)
  const isSearching = searchTerm.trim().length > 0;
  const isCategorySelected = selectedCategoryId !== 'ALL';
  const shouldShowResults = isSearching || isCategorySelected;

  const filteredItems = useMemo(() => {
    if (!shouldShowResults) return [];

    return itemsList.filter((i: any) => {
      // Category filter match
      if (isCategorySelected && i.categoryId !== selectedCategoryId) {
        return false;
      }

      const rawTerm = searchTerm.replace(/[\r\n\t]/g, '').trim().toLowerCase();
      if (!rawTerm) return true;

      const cleanSkuTerm = rawTerm.replace(/^(sku|code)[-:\s]*/i, '').trim();
      const cleanAlphaQuery = rawTerm.replace(/[^a-z0-9]/g, '');
      const code = (i.code || '').toLowerCase();
      const cleanCode = code.replace(/[^a-z0-9]/g, '');
      const cleanName = (i.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fallbackSku = `sku-${cleanName.substring(0, 8)}`;

      // Direct barcode SKU or clean code match
      if (
        code &&
        (code === rawTerm ||
          code === cleanSkuTerm ||
          code.includes(rawTerm) ||
          code.includes(cleanSkuTerm) ||
          (cleanAlphaQuery && cleanCode.includes(cleanAlphaQuery)) ||
          (cleanAlphaQuery && cleanAlphaQuery.includes(cleanCode)))
      ) {
        return true;
      }

      // Direct name match
      if (
        cleanAlphaQuery &&
        (i.name?.toLowerCase().includes(rawTerm) ||
          cleanName.includes(cleanAlphaQuery) ||
          cleanAlphaQuery.includes(cleanName))
      ) {
        return true;
      }

      if (fallbackSku.includes(rawTerm) || fallbackSku.includes(cleanSkuTerm) || (cleanAlphaQuery && fallbackSku.includes(cleanAlphaQuery))) {
        return true;
      }

      const queryTokens = rawTerm.split(/\s+/).filter(Boolean);
      const targetText = `${i.name || ''} ${i.code || ''} ${fallbackSku} ${i.category?.name || ''}`.toLowerCase();
      const normalizedTarget = targetText.replace(/[^a-z0-9]/g, ' ');
      const cleanTarget = targetText.replace(/[^a-z0-9]/g, '');

      return queryTokens.every((token) => {
        const cleanToken = token.replace(/[^a-z0-9]/g, '');
        return (
          targetText.includes(token) ||
          normalizedTarget.includes(token) ||
          (cleanToken.length > 0 && cleanTarget.includes(cleanToken))
        );
      });
    });
  }, [itemsList, searchTerm, selectedCategoryId, shouldShowResults, isCategorySelected]);

  // Handle Hardware Barcode Scanning / Enter keypress
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();

      const term = searchTerm.trim().toLowerCase();

      // 1. Exact SKU/Code match
      const exactCodeMatch = itemsList.find((i: any) => i.code && i.code.toLowerCase() === term);

      // 2. Exact Name match
      const exactNameMatch = itemsList.find((i: any) => i.name && i.name.toLowerCase() === term);

      // 3. Single filtered item match
      const singleMatch = filteredItems.length === 1 ? filteredItems[0] : null;

      const targetItem = exactCodeMatch || exactNameMatch || singleMatch;

      if (targetItem) {
        const isService = targetItem.type === 'SERVICE';
        const totalStock = Number(targetItem.currentStock ?? 0);
        if (!isService && totalStock <= 0) {
          toast.error(`"${targetItem.name}" is Out of Stock (0 ${targetItem.unit || 'Pcs'})`);
          return;
        }
        addToCart(targetItem);
        setSearchTerm('');
        toast.success(`Scanned: ${targetItem.name}`, { duration: 1500 });
      } else if (filteredItems.length > 0) {
        const firstAvailable = filteredItems.find(
          (fi: any) => fi.type === 'SERVICE' || Number(fi.currentStock ?? 0) > 0
        );
        if (!firstAvailable) {
          toast.error('Matching products are all Out of Stock');
          return;
        }
        addToCart(firstAvailable);
        setSearchTerm('');
        toast.success(`Added: ${firstAvailable.name}`, { duration: 1500 });
      } else {
        toast.error(`No product found matching "${searchTerm}"`);
      }
    }
  };

  // Financial calculations
  const rawSubTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const numDiscount = typeof discountAmount === 'number' ? discountAmount : 0;
  const subTotal = Math.max(0, rawSubTotal - numDiscount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Quick Tender Helper
  const setQuickTender = (val: number) => {
    setAmountReceived(val);
  };

  const calculatedReceived = typeof amountReceived === 'number' ? amountReceived : subTotal;
  const changeDue = Math.max(0, calculatedReceived - subTotal);

  // Complete Sale and generate Thermal Receipt
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add products first.');
      return;
    }

    try {
      const party = partiesList.find((p: any) => p.id === selectedPartyId);
      const partyName = party ? party.name : customerName || 'Walk-in Customer';
      const paidVal = typeof amountReceived === 'number' ? amountReceived : subTotal;

      const salePayload: any = {
        partyName,
        date: new Date().toISOString(),
        isVatBill: false,
        partyId: selectedPartyId || undefined,
        items: cart.map((c) => ({
          itemId: c.id,
          quantity: c.qty,
          unitPrice: c.price,
          discountPercent: 0,
          discount: 0,
          taxAmount: 0,
        })),
        paidAmount: paidVal,
        paymentMode,
      };

      if (typeof window !== 'undefined' && !navigator.onLine) {
        const offlineRecord = saveOfflineSale(salePayload);
        setCompletedSale({
          id: offlineRecord.id,
          voucherNo: offlineRecord.voucherNo,
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(),
          customerName: partyName + ' (Offline Bill)',
          paymentMode,
          items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price, total: c.price * c.qty })),
          totalAmount: subTotal,
          paidAmount: paidVal,
          changeDue,
        });

        toast.success('POS Bill Saved Offline. Will auto-sync when online.', { duration: 4000 });
        setCart([]);
        setSearchTerm('');
        setAmountReceived('');
        setDiscountAmount('');
        searchInputRef.current?.focus();
        return;
      }

      const res = await createSale.mutateAsync(salePayload);
      const saleRecord = res?.data || res;

      // Set completed sale state for Thermal Bill Receipt Modal
      setCompletedSale({
        id: saleRecord?.id,
        voucherNo: saleRecord?.voucherNo || `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString(),
        customerName: partyName,
        paymentMode,
        items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price, total: c.price * c.qty })),
        totalAmount: subTotal,
        paidAmount: paidVal,
        changeDue,
      });

      toast.success('POS Sale Completed Successfully!');
      setCart([]);
      setSearchTerm('');
      setAmountReceived('');
      setDiscountAmount('');
      searchInputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Checkout failed');
    }
  };

  // Mobile blocker screen (POS is desktop only)
  if (isMobileScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none text-zinc-100 animate-in fade-in duration-200">
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={() => router.push('/transactions/sales')}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" /> Exit POS
          </button>
        </div>

        <div className="max-w-md w-full text-center space-y-5 bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mx-auto shadow-sm">
            <Monitor className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-semibold uppercase tracking-wider">
              Desktop Only
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-white pt-1">
              Please Switch to Desktop
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              POS Quick Billing is designed for <strong>Desktop Computers &amp; Counter Screens</strong> with physical barcode scanners and thermal printers.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-left text-xs space-y-2 text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span>USB / Bluetooth Hardware Barcode Scanning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span>80mm &amp; 58mm Thermal Bill Direct Printing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span>High-speed Dual-Screen Counter Checkout</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/transactions/sales')}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs transition-all shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Sales Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lock screen if not in trial and no package
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans select-none text-zinc-100">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <button
            type="button"
            onClick={() => router.push('/transactions/sales')}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" /> Exit to Sales
          </button>
        </div>

        <div className="max-w-md w-full text-center space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mx-auto">
            <Crown className="w-7 h-7" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold uppercase tracking-wider">
              Premium Feature
            </span>
            <h1 className="text-xl font-bold text-white mt-3">
              POS Quick Billing &amp; Counter
            </h1>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Speed up checkout at your retail counter with barcode scanning, quick item search, and instant 80mm/58mm thermal receipt generation.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/subscription"
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Crown className="w-4 h-4" /> Upgrade to Premium Plan
            </Link>
            <button
              type="button"
              onClick={() => router.push('/transactions/sales')}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white font-semibold text-xs transition-all cursor-pointer"
            >
              Return to Sales Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col font-sans overflow-hidden select-none text-zinc-100">
      {/* Top Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Close & Business info */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={handleExitPOS}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Close POS (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close POS</span>
            <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1 hidden md:inline font-mono">ESC</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-[280px]">
                {currentBiz?.name || 'POS Terminal'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-medium">
                Terminal #01
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on screens < lg) */}
        <div className="flex lg:hidden items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('scan')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mobileTab === 'scan' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mobileTab === 'cart' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bill</span>
            {totalItemCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-zinc-950 text-[10px] font-bold">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions: Clock, Camera, Fullscreen */}
        <div className="flex items-center gap-2">
          {timeString && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{timeString}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            title="Scan with Camera"
          >
            <Camera className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden">
        
        {/* Left Section: Search & Products / Scanner */}
        <div
          className={`flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 overflow-hidden min-h-0 ${
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search & Barcode Bar */}
          <div className="space-y-2.5 shrink-0">
            <div className="relative">
              <div className="absolute left-3.5 top-3 flex items-center pointer-events-none text-zinc-400">
                <Barcode className="w-5 h-5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan barcode or search product name / SKU (Enter to add)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-11 pr-24 py-2.5 sm:py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-zinc-400 shadow-inner placeholder:text-zinc-500 transition-colors"
              />
              <div className="absolute right-2.5 top-2 sm:top-2.5 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                  ↵ Enter
                </span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                All ({itemsList.length})
              </button>

              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? 'ALL' : cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Tag className="w-3 h-3 text-zinc-500" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body: Products Grid or Minimal Idle HUD */}
          <div className="flex-1 overflow-y-auto mt-3 min-h-0 pr-1">
            {itemsLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                <p className="text-xs">Loading items...</p>
              </div>
            ) : shouldShowResults ? (
              filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2.5 border border-dashed border-zinc-800 rounded-xl">
                  <QrCode className="w-10 h-10 text-zinc-600 mx-auto" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-300">No Product Found</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      No item matching &quot;<span className="text-zinc-300 font-mono">{searchTerm}</span>&quot;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategoryId('ALL');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                    <span>
                      Found <strong className="text-white font-mono">{filteredItems.length}</strong> items
                    </span>
                    <span className="text-[11px] text-zinc-500">Click card to add to bill</span>
                  </div>                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
                    {filteredItems.map((item: any) => {
                      const inCartItem = cart.find((c) => c.id === item.id);
                      const inCartQty = inCartItem ? inCartItem.qty : 0;
                      const totalStock = Number(item.currentStock ?? 0);
                      const isService = item.type === 'SERVICE';
                      const remainingStock = Math.max(0, totalStock - inCartQty);
                      const isOutOfStock = !isService && totalStock <= 0;
                      const isStockMaxed = !isService && inCartQty >= totalStock;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => {
                            if (isOutOfStock) {
                              toast.error(`"${item.name}" is Out of Stock (0 ${item.unit || 'Pcs'}). Cannot add to bill.`);
                              return;
                            }
                            if (isStockMaxed) {
                              toast.error(`Cannot add more than available stock (${totalStock} ${item.unit || 'Pcs'})`);
                              return;
                            }
                            addToCart(item);
                          }}
                          className={`p-3 rounded-xl bg-zinc-950 border text-left transition-all flex flex-col justify-between group min-h-[110px] relative ${
                            isOutOfStock
                              ? 'border-zinc-800 opacity-45 cursor-not-allowed'
                              : inCartQty > 0
                              ? 'border-zinc-400 bg-zinc-900/90 active:scale-[0.98] cursor-pointer'
                              : 'border-zinc-800/90 hover:border-zinc-600 hover:bg-zinc-900 active:scale-[0.98] cursor-pointer'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <p
                                title={item.name}
                                className={`text-xs font-semibold break-words line-clamp-2 leading-snug ${
                                  isOutOfStock ? 'text-zinc-500 line-through' : 'text-white group-hover:text-zinc-200'
                                }`}
                              >
                                {item.name}
                              </p>
                              {inCartQty > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-950 font-mono font-bold text-[10px] shrink-0">
                                  +{inCartQty}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-zinc-400 gap-1 flex-wrap">
                              {item.code ? (
                                <span className="font-mono text-zinc-400 truncate max-w-[90px]">
                                  {item.code}
                                </span>
                              ) : (
                                <span className="text-zinc-600 font-mono">-</span>
                              )}

                              {!isService ? (
                                <span
                                  className={`font-medium font-mono ${
                                    isOutOfStock
                                      ? 'text-rose-400 font-bold'
                                      : remainingStock <= (item.minStockAlert || 5)
                                      ? 'text-amber-400'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  {isOutOfStock ? 'Out of Stock' : `${remainingStock} ${item.unit || 'Pcs'}`}
                                </span>
                              ) : (
                                <span className="text-zinc-400">Service</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-mono font-bold text-white">
                              Rs. {Number(item.salePrice || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">/{item.unit || 'Pcs'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              /* Minimal Idle Terminal Graphic */
              <div className="h-full flex flex-col justify-between py-6 px-4 text-center">
                <div className="my-auto space-y-3 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mx-auto shadow-sm">
                    <Barcode className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">Ready to Scan</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Scan product barcode with hardware scanner, or type above to search and bill products.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800 max-w-md mx-auto w-full text-left">
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold block">↵ Enter</span>
                    <span className="text-[10px] text-zinc-500">Add Item</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold block">F2</span>
                    <span className="text-[10px] text-zinc-500">Search</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold block">ESC</span>
                    <span className="text-[10px] text-zinc-500">Exit POS</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Mobile Cart Bar (When on search tab on mobile and cart has items) */}
          {cart.length > 0 && (
            <div className="lg:hidden mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block">{totalItemCount} items in bill</span>
                <span className="text-sm font-bold font-mono text-white">Rs. {subTotal.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <span>View Bill &amp; Checkout</span>
                <ShoppingBag className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Bill Ticket & Instant Checkout */}
        <div
          className={`w-full lg:w-96 xl:w-[420px] bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shrink-0 overflow-hidden min-h-0 ${
            mobileTab === 'scan' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header & Customer Picker */}
          <div className="space-y-2.5 shrink-0">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Active Bill ({totalItemCount} items)
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-zinc-400 hover:text-rose-400 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="space-y-1">
              <label className="block text-[10px] font-medium text-zinc-400">Customer</label>
              <select
                value={selectedPartyId}
                onChange={(e) => {
                  setSelectedPartyId(e.target.value);
                  const p = partiesList.find((x: any) => x.id === e.target.value);
                  if (p) setCustomerName(p.name);
                }}
                className="w-full px-2.5 py-1.5 sm:py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-medium focus:outline-none focus:border-zinc-600 shadow-inner cursor-pointer"
              >
                <option value="">Walk-in Cash Customer</option>
                {partiesList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto my-2.5 pr-1 space-y-1.5 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl gap-2">
                <Receipt className="w-6 h-6 text-zinc-600" />
                <span>Ticket is empty. Scan barcode or search items to add.</span>
              </div>
            ) : (
              cart.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p title={c.name} className="font-semibold text-white break-words leading-tight truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Rs. {c.price.toLocaleString()} x {c.qty} ={' '}
                      <span className="text-zinc-200 font-bold">Rs. {(c.price * c.qty).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(c.id, -1)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-white text-xs">{c.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.id, 1)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(c.id)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Checkout Footer */}
          <div className="border-t border-zinc-800 pt-2.5 space-y-2.5 shrink-0">
            {/* Payment Mode Selector */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium text-zinc-400">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === 'CASH' ? 'bg-zinc-800 text-white font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('ONLINE')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === 'ONLINE' ? 'bg-zinc-800 text-white font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> QR / Online
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('BANK')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === 'BANK' ? 'bg-zinc-800 text-white font-semibold shadow-sm' : 'hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" /> Bank
              </button>
            </div>

            {/* Quick Tender Shortcuts */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5">
              <span className="text-zinc-500 text-[10px]">Tender:</span>
              <button
                type="button"
                onClick={() => setQuickTender(subTotal)}
                className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono font-medium cursor-pointer"
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => setQuickTender(500)}
                className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono font-medium cursor-pointer"
              >
                500
              </button>
              <button
                type="button"
                onClick={() => setQuickTender(1000)}
                className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono font-medium cursor-pointer"
              >
                1,000
              </button>
              <button
                type="button"
                onClick={() => setQuickTender(2000)}
                className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono font-medium cursor-pointer"
              >
                2,000
              </button>
            </div>

            {/* Cash Received & Change Due Calculation */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Cash Received</label>
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={onNumericKeyDown}
                  onFocus={onNumericFocus}
                  onBlur={onNumericBlur}
                  placeholder={`Rs. ${subTotal}`}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono font-semibold text-xs focus:outline-none focus:border-zinc-600 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Change Return</label>
                <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono font-bold text-zinc-200 text-xs truncate shadow-inner">
                  Rs. {changeDue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Total and Checkout Action */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-zinc-400 font-medium">Net Total</span>
                <span className="text-xl font-bold font-mono text-white">
                  Rs. {subTotal.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || createSale.isPending}
                className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {createSale.isPending ? 'Processing...' : `Print & Complete (Rs. ${subTotal.toLocaleString()})`}
              </button>

              {/* Back to Scan Button on Mobile */}
              <button
                type="button"
                onClick={() => setMobileTab('scan')}
                className="lg:hidden w-full py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                ‹ Add More Items
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit POS Confirmation Modal */}
      {isExitModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-center select-none text-zinc-100">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mx-auto">
                <ShoppingBag className="w-6 h-6 text-zinc-300" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Exit POS Mode?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You have <strong className="text-white font-mono">{totalItemCount} item{totalItemCount !== 1 ? 's' : ''}</strong> (Rs. {subTotal.toLocaleString()}) in your active cart. Exiting will discard this bill.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Keep Billing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExitModalOpen(false);
                    router.push('/transactions/sales');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Discard &amp; Exit
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* POS Thermal Receipt Modal */}
      {completedSale && (
        <POSThermalReceiptModal
          isOpen={!!completedSale}
          onClose={() => setCompletedSale(null)}
          sale={completedSale}
          business={currentBiz}
        />
      )}

      {/* Camera QR & Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleCameraScan}
        title="Scan Barcode with Device Camera"
      />
    </div>
  );
}

function POSThermalReceiptModal({
  isOpen,
  onClose,
  sale,
  business,
}: {
  isOpen: boolean;
  onClose: () => void;
  sale: {
    id?: string;
    voucherNo?: string;
    date: string;
    customerName: string;
    paymentMode: string;
    items: { name: string; qty: number; price: number; total: number }[];
    totalAmount: number;
    paidAmount: number;
    changeDue: number;
  };
  business?: any;
}) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen) return null;

  const handlePrintThermal = () => {
    window.print();
  };

  const totalLineItems = sale.items.length;
  const totalUnits = sale.items.reduce((sum, item) => sum + item.qty, 0);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    sale.voucherNo || 'POS-INV'
  )}`;

  return (
    <ModalPortal>
      <style>{`
        @page {
          size: ${paperWidth === '80mm' ? '80mm auto' : '58mm auto'};
          margin: 0mm;
        }
        @media print {
          html, body {
            width: ${paperWidth === '80mm' ? '80mm' : '58mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-printable-area, #thermal-printable-area * {
            visibility: visible !important;
          }
          #thermal-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '78mm' : '56mm'} !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 my-6 text-zinc-900">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900">
                  Receipt #{sale.voucherNo}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">{sale.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Paper Roll Width Selector */}
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-[10px] font-semibold text-zinc-700">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    paperWidth === '80mm' ? 'bg-zinc-900 text-white font-bold' : 'hover:bg-zinc-200'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    paperWidth === '58mm' ? 'bg-zinc-900 text-white font-bold' : 'hover:bg-zinc-200'
                  }`}
                >
                  58mm
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thermal Paper Roll Preview */}
          <div className="bg-zinc-100 p-3 sm:p-4 rounded-xl border border-zinc-200 flex justify-center items-start max-h-[460px] min-h-[260px] overflow-y-auto shadow-inner">
            <div
              id="thermal-printable-area"
              className={`bg-white text-zinc-950 font-mono text-[11px] p-3.5 sm:p-4 shadow-sm border border-zinc-300 space-y-2.5 transition-all w-full shrink-0 select-text ${
                paperWidth === '80mm' ? 'max-w-[300px]' : 'max-w-[240px]'
              }`}
            >
              {/* Receipt Store Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-zinc-900">{business?.name || 'Store POS'}</h2>
                {business?.address && <p className="text-[10px] text-zinc-600 leading-tight">{business.address}</p>}
                {(() => {
                  const showTax = business?.settings?.showTaxOnBills !== false;
                  const taxNumber = (business?.taxNumber || business?.panNo)?.trim();
                  const taxType = (business?.settings?.taxRegistrationType || 'PAN').toUpperCase();
                  if (!showTax || !taxNumber) return null;
                  return <p className="text-[10px] text-zinc-900 font-bold">{taxType}: {taxNumber}</p>;
                })()}
                {business?.phone && <p className="text-[10px] text-zinc-600">Tel: {business.phone}</p>}
                <p className="text-[9px] text-zinc-500 pt-0.5 font-bold uppercase">RETAIL TAX INVOICE</p>
              </div>

              {/* Bill Details */}
              <div className="text-[10px] border-b border-dashed border-zinc-400 pb-2 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Bill: #{sale.voucherNo}</span>
                  <span className="px-1 bg-zinc-100 rounded border border-zinc-200 text-[9px]">{sale.paymentMode}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span className="truncate pr-1">Client: {sale.customerName}</span>
                  <span className="shrink-0">{sale.date}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-zinc-400 text-zinc-700">
                    <th className="py-1 font-bold">Item</th>
                    <th className="py-1 text-center font-bold">Qty</th>
                    <th className="py-1 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 pr-1">
                        <div className="font-semibold text-zinc-900 leading-tight">{item.name}</div>
                        <div className="text-[9px] text-zinc-500">@ Rs. {item.price.toLocaleString()}</div>
                      </td>
                      <td className="py-1 text-center font-bold align-top">{item.qty}</td>
                      <td className="py-1 text-right font-mono font-bold align-top">Rs. {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Item Summary Line */}
              <div className="border-t border-b border-zinc-300 py-1 text-[9px] font-medium text-zinc-600 flex justify-between">
                <span>Items: {totalLineItems}</span>
                <span>Total Qty: {totalUnits}</span>
              </div>

              {/* Financial Breakdown */}
              <div className="pt-0.5 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-xs pt-0.5 border-b border-zinc-300 pb-1">
                  <span>NET TOTAL:</span>
                  <span>Rs. {sale.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-600 text-[10px]">
                  <span>Paid ({sale.paymentMode}):</span>
                  <span>Rs. {sale.paidAmount.toLocaleString()}</span>
                </div>
                {sale.changeDue > 0 && (
                  <div className="flex justify-between font-bold text-zinc-900 text-[10px]">
                    <span>Change Returned:</span>
                    <span>Rs. {sale.changeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Footer QR & Barcode */}
              <div className="text-center pt-2 border-t border-dashed border-zinc-400 space-y-1.5 text-[9px] text-zinc-600">
                <img src={qrCodeUrl} alt="Invoice QR" className="w-16 h-16 mx-auto object-contain p-1 bg-white border border-zinc-200 rounded" />
                <p className="font-bold text-zinc-900 uppercase">THANK YOU FOR SHOPPING</p>
                <p className="text-[8px] text-zinc-400 font-mono">Powered by BizManage POS</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrintThermal}
              className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print ({paperWidth})
            </button>

            {sale.id && (
              <Link
                href={`/transactions/sales/${sale.id}`}
                onClick={onClose}
                className="px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-all text-center flex items-center justify-center gap-1.5 border border-zinc-300"
              >
                <FileText className="w-4 h-4 text-zinc-600" /> A4 Invoice
              </Link>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Next Sale
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
