import { api } from '@/lib/api';

export interface StorefrontSettings {
  enableStorefront: boolean;
  storeSlug: string;
  showStorePrices: boolean;
  storeTitle: string;
  storeDescription: string;
  storeBannerUrl: string;
  whatsappNumber: string;
  enableOnlineOrders: boolean;
  businessName?: string;
  businessLogo?: string;
}

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  const res = await api.get('/storefront/settings');
  return res.data.data;
}

export async function updateStorefrontSettings(data: Partial<StorefrontSettings>): Promise<StorefrontSettings> {
  const res = await api.put('/storefront/settings', data);
  return res.data.data;
}

export async function getStorefrontOrders() {
  const res = await api.get('/storefront/orders');
  return res.data.data;
}

export async function getStorefrontCustomers() {
  const res = await api.get('/storefront/customers');
  return res.data.data;
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await api.patch(`/storefront/orders/${id}/status`, { status });
  return res.data.data;
}

export async function getPublicStores() {
  const res = await api.get('/storefront/public-stores');
  return res.data.data;
}

export async function getPublicStorefront(storeSlug: string) {
  const res = await api.get(`/storefront/public/${storeSlug}`);
  return res.data.data;
}

export async function submitOnlineOrder(storeSlug: string, orderData: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  notes?: string;
  items: Array<{ itemId: string; quantity: number }>;
}) {
  const res = await api.post(`/storefront/public/${storeSlug}/orders`, orderData);
  return res.data.data;
}
