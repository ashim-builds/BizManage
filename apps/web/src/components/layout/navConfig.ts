import {
  Home,
  Users,
  ShoppingBag,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Landmark,
  FileBarChart,
  RotateCcw,
  Wrench,
  Settings,
  Crown,
  Building2,
  Printer,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Store,
  Wallet,
  Megaphone,
  ArrowLeftRight,
  History,
  RefreshCw,
  Clock,
  Upload,
} from 'lucide-react';

export interface NavGroupItem {
  name: string;
  href: string;
  icon?: any;
  requiredFeature?: string;
}

export interface NavSection {
  name: string;
  icon: any;
  href?: string;
  hasPlusButton?: boolean;
  plusHref?: string;
  children?: NavGroupItem[];
  requiredFeature?: string;
}

export const sidebarSections: NavSection[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Parties', href: '/parties', icon: Users, hasPlusButton: true, plusHref: '/parties/new' },
  { name: 'Items', href: '/inventory', icon: ShoppingBag, hasPlusButton: true, plusHref: '/inventory?action=new' },
  {
    name: 'Sale',
    href: '/transactions/sales',
    icon: Receipt,
    children: [
      { name: 'Sale Invoices', href: '/transactions/sales', icon: Receipt },
      { name: 'POS Quick Billing', href: '/transactions/pos', icon: Zap },
      { name: 'Payment In', href: '/transactions/payment-in', icon: ArrowDownLeft },
      { name: 'Sale Return', href: '/transactions/sales-return', icon: RotateCcw },
    ],
  },
  {
    name: 'Purchase & Expense',
    href: '/transactions/purchases',
    icon: ShoppingCart,
    children: [
      { name: 'Purchase Bills', href: '/transactions/purchases', icon: ShoppingBag },
      { name: 'Payment Out', href: '/transactions/payment-out', icon: ArrowUpRight },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Purchase Return', href: '/transactions/purchase-return', icon: RotateCcw },
    ],
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    children: [
      { name: 'All Transactions', href: '/transactions', icon: ArrowLeftRight },
      { name: 'Cashflow Ledger', href: '/cashflow', icon: TrendingUp },
      { name: 'Profit & Loss', href: '/profit-loss', icon: FileBarChart },
    ],
  },
  { name: 'Cash & Bank', href: '/accounts', icon: Landmark },
  {
    name: 'Grow Your Business',
    href: '/marketing',
    icon: TrendingUp,
    children: [
      { name: 'Marketing & WhatsApp', href: '/marketing', icon: Megaphone },
      { name: 'Online Store', href: '/storefront', icon: Store },
      { name: 'Explore Stores', href: '/explore-stores', icon: Store },
    ],
  },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  {
    name: 'Sync, Share & Backup',
    href: '/sync-backup',
    icon: RotateCcw,
    children: [
      { name: 'Cloud Sync & Share', href: '/sync-backup?tab=sync-share', icon: RefreshCw },
      { name: 'Auto Backup', href: '/sync-backup?tab=auto-backup', icon: Clock },
      { name: 'Restore Backup', href: '/sync-backup?tab=restore-backup', icon: Upload },
    ],
  },
  {
    name: 'Utilities',
    href: '/inventory/godowns',
    icon: Wrench,
    children: [
      { name: 'Godowns & Transfer', href: '/inventory/godowns', icon: Building2 },
      { name: 'Print Barcode Labels', href: '/inventory/labels', icon: Printer },
      { name: 'Manufacturing (BOM)', href: '/manufacturing', icon: Boxes },
      { name: 'Staff & Attendance', href: '/staff', icon: Users },
      { name: 'Activity & Audit Log', href: '/activity-log', icon: History },
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Plans & Pricing', href: '/subscription', icon: Crown },
];
