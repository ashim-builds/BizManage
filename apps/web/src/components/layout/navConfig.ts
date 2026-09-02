import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  TrendingDown,
  TrendingUp,
  Wallet,
  FileBarChart,
  Settings,
  Crown,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  RotateCcw,
  Scale,
  BookOpen,
  ShieldCheck,
  Zap,
  Globe,
  Store,
  Building2,
  Printer,
  Boxes,
  Megaphone,
} from 'lucide-react';

export interface NavGroupItem {
  name: string;
  href: string;
  icon: any;
  requiredFeature?: string;
}

export interface NavSection {
  name: string;
  icon: any;
  href?: string;
  children?: NavGroupItem[];
  requiredFeature?: string;
}

export const sidebarSections: NavSection[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Parties', href: '/parties', icon: Users, requiredFeature: 'AUTO_LEDGER' },
  {
    name: 'Items & Inventory',
    icon: Package,
    children: [
      { name: 'Stock & Items', href: '/inventory', icon: Package },
      { name: 'Godowns & Transfer', href: '/inventory/godowns', icon: Building2, requiredFeature: 'GODOWN_MANAGEMENT' },
      { name: 'Print Barcode Labels', href: '/inventory/labels', icon: Printer, requiredFeature: 'BARCODE_PRINTING' },
    ],
  },
  {
    name: 'Sales',
    icon: Receipt,
    children: [
      { name: 'Sale Invoices', href: '/transactions/sales', icon: Receipt },
      { name: 'POS Quick Billing', href: '/transactions/pos', icon: Zap, requiredFeature: 'POS_BILLING' },
      { name: 'Payment In', href: '/transactions/payment-in', icon: ArrowDownLeft },
      { name: 'Sale Return', href: '/transactions/sales-return', icon: RotateCcw },
    ],
  },
  {
    name: 'Purchases',
    icon: ShoppingBag,
    children: [
      { name: 'Purchase Bills', href: '/transactions/purchases', icon: ShoppingBag },
      { name: 'Payment Out', href: '/transactions/payment-out', icon: ArrowUpRight },
      { name: 'Purchase Return', href: '/transactions/purchase-return', icon: RotateCcw },
    ],
  },
  { name: 'Manufacturing', href: '/manufacturing', icon: Boxes, requiredFeature: 'MANUFACTURING' },
  { name: 'Cash & Bank', href: '/accounts', icon: Wallet, requiredFeature: 'WALLET_SYNC' },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown, requiredFeature: 'WALLET_SYNC' },
  { name: 'Marketing & WhatsApp', href: '/marketing', icon: Megaphone, requiredFeature: 'WHATSAPP_MARKETING' },
  { name: 'Online Store', href: '/storefront', icon: Store },
  { name: 'Reports', href: '/reports', icon: FileBarChart, requiredFeature: 'ADVANCED_REPORTS' },
  { name: 'Profit & Loss', href: '/profit-loss', icon: Scale, requiredFeature: 'ADVANCED_REPORTS' },
  { name: 'Staff & Payroll', href: '/staff', icon: ShieldCheck, requiredFeature: 'STAFF_PAYROLL' },
  { name: 'Subscription', href: '/subscription', icon: Crown },
  { name: 'Settings', href: '/settings', icon: Settings },
];
