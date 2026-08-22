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
} from 'lucide-react';

export interface NavGroupItem {
  name: string;
  href: string;
  icon: any;
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
  {
    name: 'Transactions',
    icon: Receipt,
    children: [
      { name: 'Payment In', href: '/transactions/payment-in', icon: ArrowDownLeft },
      { name: 'Sales Invoices', href: '/transactions/sales', icon: Receipt },
      { name: 'Sales Return', href: '/transactions/sales-return', icon: RotateCcw },
      { name: 'Payment Out', href: '/transactions/payment-out', icon: ArrowUpRight },
      { name: 'Purchase Bills', href: '/transactions/purchases', icon: ShoppingBag },
      { name: 'Purchase Return', href: '/transactions/purchase-return', icon: RotateCcw },
    ],
  },
  { name: 'Parties', href: '/parties', icon: Users, requiredFeature: 'AUTO_LEDGER' },
  { name: 'Inventory', href: '/inventory', icon: Package, requiredFeature: 'INVENTORY_TRACKING' },
  { name: 'Cash & Bank', href: '/accounts', icon: Wallet, requiredFeature: 'WALLET_SYNC' },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown, requiredFeature: 'WALLET_SYNC' },
  { name: 'Other Income', href: '/income', icon: TrendingUp, requiredFeature: 'WALLET_SYNC' },
  { name: 'Profit & Loss', href: '/profit-loss', icon: Scale, requiredFeature: 'ADVANCED_REPORTS' },
  { name: 'Cashflow', href: '/cashflow', icon: Wallet, requiredFeature: 'ADVANCED_REPORTS' },
  { name: 'Reports', href: '/reports', icon: FileBarChart, requiredFeature: 'ADVANCED_REPORTS' },
  { name: 'Subscription', href: '/subscription', icon: Crown },
  { name: 'Settings', href: '/settings', icon: Settings },
];
