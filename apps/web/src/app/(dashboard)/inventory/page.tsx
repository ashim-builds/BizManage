'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  itemSchema,
  stockAdjustmentSchema,
  ItemInput,
  UpdateItemInput,
  StockAdjustmentInput,
} from '@bizmanage/validation';
import { ItemType } from '@bizmanage/types';
import {
  useItems,
  useItem,
  useItemsSummary,
  useCreateItem,
  useUpdateItem,
  useAdjustStock,
  useDeleteItem,
} from '@/services/itemService';
import { useItemCategories, useCreateItemCategory } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { ImportInventoryModal } from '@/components/inventory/ImportInventoryModal';
import { ExportConfirmModal } from '@/components/common/ExportConfirmModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { downloadCsv, downloadJson } from '@/lib/exportUtils';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Receipt,
  SlidersHorizontal,
  Sliders,
  MoreVertical,
  X,
  Tag,
  Package,
  Wrench,
  Boxes,
  Scale,
  ArrowUpDown,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ExternalLink,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  CheckSquare,
  Square,
  FolderInput,
  Check,
} from 'lucide-react';

const DEFAULT_UNITS = [
  { fullname: 'BAGS', shortname: 'Bag' },
  { fullname: 'BOTTLES', shortname: 'Btl' },
  { fullname: 'BOX', shortname: 'Box' },
  { fullname: 'BUNDLES', shortname: 'Bdl' },
  { fullname: 'CANS', shortname: 'Can' },
  { fullname: 'CARTONS', shortname: 'Ctn' },
  { fullname: 'CUBIC METER', shortname: 'Mtq' },
  { fullname: 'DAY', shortname: 'Day' },
  { fullname: 'DOZENS', shortname: 'Dzn' },
  { fullname: 'GRAMMES', shortname: 'Gm' },
  { fullname: 'HOUR', shortname: 'Hur' },
  { fullname: 'KILOGRAMS', shortname: 'Kg' },
  { fullname: 'KILOMETER', shortname: 'Kmt' },
  { fullname: 'LITRE', shortname: 'Ltr' },
  { fullname: 'METERS', shortname: 'Mtr' },
  { fullname: 'PACKS', shortname: 'Pac' },
  { fullname: 'PIECES', shortname: 'Pcs' },
  { fullname: 'ROLLS', shortname: 'Rol' },
  { fullname: 'SETS', shortname: 'Set' },
  { fullname: 'SQUARE FEET', shortname: 'Sqf' },
  { fullname: 'SQUARE METERS', shortname: 'Sqm' },
  { fullname: 'TONNES', shortname: 'Ton' },
];

const SERVICE_DEFAULT_UNITS = [
  { fullname: 'HOURS', shortname: 'Hur' },
  { fullname: 'DAYS', shortname: 'Day' },
  { fullname: 'JOB', shortname: 'Job' },
  { fullname: 'VISIT', shortname: 'Vst' },
  { fullname: 'TRIP', shortname: 'Trp' },
  { fullname: 'SERVICE', shortname: 'Srv' },
  { fullname: 'MONTH', shortname: 'Mth' },
  { fullname: 'PIECES', shortname: 'Pcs' },
  { fullname: 'KILOMETER', shortname: 'Kmt' },
];

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading inventory..." />}>
      <InventoryPageContent />
    </Suspense>
  );
}

function InventoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active top tab (from Vyapar: PRODUCTS | SERVICES | CATEGORY | UNITS)
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'category' | 'units'>('products');

  // Search & Filtering
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'SELL' | 'BUY' | 'STOCK'>('ALL');

  // Selected entities for split view
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>('none'); // 'none' = Items not in any category
  const [selectedUnitName, setSelectedUnitName] = useState<string>('BAGS');

  // Cost visibility
  const [showCost, setShowCost] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ItemType>(ItemType.PRODUCT);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isEditSaveConfirmOpen, setIsEditSaveConfirmOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<UpdateItemInput | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddConversionOpen, setIsAddConversionOpen] = useState(false);
  const [deletingItemInfo, setDeletingItemInfo] = useState<{ id: string; name: string } | null>(null);

  // Move To Category modal state
  const [isMoveCategoryOpen, setIsMoveCategoryOpen] = useState(false);
  const [selectedItemIdsForMove, setSelectedItemIdsForMove] = useState<Set<string>>(new Set());
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  const [isMovingCategory, setIsMovingCategory] = useState(false);

  // Export Confirmation Modal state
  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    recordCount: number;
    onConfirm: (format: 'csv' | 'json') => void;
  } | null>(null);

  // Discard changes confirmation modal state
  const [discardModalConfig, setDiscardModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
  } | null>(null);

  const promptDiscardConfirmation = (onConfirm: () => void, title?: string, message?: string) => {
    setDiscardModalConfig({
      isOpen: true,
      title: title || 'Discard unsaved changes?',
      message: message || 'Are you sure you want to close? Any information you entered will not be saved.',
      onConfirm,
    });
  };

  // Custom units and conversions persisted in localStorage
  const [customUnits, setCustomUnits] = useState<{ fullname: string; shortname: string }[]>([]);
  const [unitConversions, setUnitConversions] = useState<{ baseUnit: string; secondaryUnit: string; rate: number }[]>([]);

  // Load custom units & conversions from localStorage
  useEffect(() => {
    try {
      const savedUnits = localStorage.getItem('bizmanage_custom_units');
      if (savedUnits) setCustomUnits(JSON.parse(savedUnits));

      const savedConv = localStorage.getItem('bizmanage_unit_conversions');
      if (savedConv) setUnitConversions(JSON.parse(savedConv));
    } catch (_) {}
  }, []);

  // Quick Action Listener
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setCreateType(ItemType.PRODUCT);
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleOpenCreateItem = () => {
      setCreateType(ItemType.PRODUCT);
      setIsCreateOpen(true);
    };
    window.addEventListener('open-create-item', handleOpenCreateItem);
    return () => window.removeEventListener('open-create-item', handleOpenCreateItem);
  }, []);

  // Queries
  const { data: summary } = useItemsSummary();
  const { data: categories = [], refetch: refetchCategories } = useItemCategories();
  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    isError,
    refetch: refetchItems,
  } = useItems({ limit: 1000 });

  const rawItems: any[] = itemsResponse?.data || [];

  // Split items into Products and Services
  const products = useMemo(() => {
    return rawItems.filter((i) => i.type !== ItemType.SERVICE);
  }, [rawItems]);

  const services = useMemo(() => {
    return rawItems.filter((i) => i.type === ItemType.SERVICE);
  }, [rawItems]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  // Auto-select first product when tab active
  useEffect(() => {
    if (filteredProducts.length > 0) {
      if (!selectedProductId || !filteredProducts.some((p) => p.id === selectedProductId)) {
        setSelectedProductId(filteredProducts[0].id);
      }
    }
  }, [filteredProducts, selectedProductId]);

  // Auto-select first service when tab active
  useEffect(() => {
    if (filteredServices.length > 0) {
      if (!selectedServiceId || !filteredServices.some((s) => s.id === selectedServiceId)) {
        setSelectedServiceId(filteredServices[0].id);
      }
    }
  }, [filteredServices, selectedServiceId]);

  // Selected item details (queries relations: saleItems, purchaseItems, stockMovements)
  const activeItemId = activeTab === 'products' ? selectedProductId : selectedServiceId;
  const { data: activeItemDetails } = useItem(activeItemId || '');

  // All combined units
  const allUnits = useMemo(() => {
    const map = new Map<string, { fullname: string; shortname: string }>();
    DEFAULT_UNITS.forEach((u) => map.set(u.fullname.toUpperCase(), u));
    customUnits.forEach((u) => map.set(u.fullname.toUpperCase(), u));
    return Array.from(map.values());
  }, [customUnits]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return allUnits;
    const q = unitSearch.toLowerCase();
    return allUnits.filter(
      (u) => u.fullname.toLowerCase().includes(q) || u.shortname.toLowerCase().includes(q)
    );
  }, [allUnits, unitSearch]);

  // Categories list with item counts
  const categoryDirectory = useMemo(() => {
    const uncategorizedCount = rawItems.filter((i) => !i.categoryId).length;
    const list: any[] = [
      { id: 'none', name: 'Items not in any Category', count: uncategorizedCount },
    ];
    categories.forEach((cat: any) => {
      const count = rawItems.filter((i) => i.categoryId === cat.id).length;
      list.push({ id: cat.id, name: cat.name, count });
    });
    return list;
  }, [rawItems, categories]);

  // Filtered category directory
  const filteredCategoryDirectory = useMemo(() => {
    if (!categorySearch.trim()) return categoryDirectory;
    const q = categorySearch.toLowerCase();
    return categoryDirectory.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoryDirectory, categorySearch]);

  // Items for selected category
  const selectedCategoryItems = useMemo(() => {
    if (selectedCategoryId === 'none') {
      return rawItems.filter((i) => !i.categoryId);
    }
    return rawItems.filter((i) => i.categoryId === selectedCategoryId);
  }, [rawItems, selectedCategoryId]);

  // Active item
  const activeItem =
    activeTab === 'products'
      ? products.find((p) => p.id === selectedProductId) || products[0]
      : services.find((s) => s.id === selectedServiceId) || services[0];

  // Active product/service transactions
  const transactions = useMemo(() => {
    if (!activeItem) return [];
    const list: any[] = [];

    // Sales (Sell)
    const saleItems = activeItemDetails?.saleItems || activeItem.saleItems || [];
    saleItems.forEach((si: any) => {
      const qty = Number(si.quantity || 0);
      const price = Number(si.unitPrice || 0);
      const total = Number(si.total || qty * price);
      const saleStatus = si.sale?.status === 'PAID' ? 'PAID' : (si.sale?.status === 'PARTIAL' ? 'PARTIAL' : (si.sale?.status === 'UNPAID' ? 'UNPAID' : 'PAID'));
      list.push({
        id: si.id,
        category: 'SELL',
        type: 'Sale (Sell)',
        actionLabel: 'Sell',
        flow: 'out',
        ref: si.sale?.invoiceNumber || '-',
        name: si.sale?.party?.name || 'Cash Sale',
        date: si.sale?.date || si.createdAt,
        quantity: qty,
        price,
        total,
        status: saleStatus,
      });
    });

    // Sale Returns (Customer returns goods back -> IN)
    const saleReturnItems = activeItemDetails?.saleReturnItems || [];
    saleReturnItems.forEach((sri: any) => {
      const qty = Number(sri.quantity || 0);
      const price = Number(sri.unitPrice || 0);
      const total = Number(sri.total || qty * price);
      list.push({
        id: sri.id,
        category: 'SELL',
        type: 'Sale Return',
        actionLabel: 'Return (In)',
        flow: 'in',
        ref: sri.saleReturn?.returnNumber || '-',
        name: sri.saleReturn?.party?.name || 'Customer Return',
        date: sri.saleReturn?.date || sri.createdAt,
        quantity: qty,
        price,
        total,
        status: 'Returned',
      });
    });

    // Purchases (Buy)
    const purchaseItems = activeItemDetails?.purchaseItems || activeItem.purchaseItems || [];
    purchaseItems.forEach((pi: any) => {
      const qty = Number(pi.quantity || 0);
      const price = Number(pi.unitPrice || 0);
      const total = Number(pi.total || qty * price);
      const purStatus = pi.purchase?.status === 'PAID' ? 'PAID' : (pi.purchase?.status === 'PARTIAL' ? 'PARTIAL' : (pi.purchase?.status === 'UNPAID' ? 'UNPAID' : 'PAID'));
      list.push({
        id: pi.id,
        category: 'BUY',
        type: 'Purchase (Buy)',
        actionLabel: 'Buy',
        flow: 'in',
        ref: pi.purchase?.billNumber || '-',
        name: pi.purchase?.party?.name || 'Cash Supplier',
        date: pi.purchase?.date || pi.createdAt,
        quantity: qty,
        price,
        total,
        status: purStatus,
      });
    });

    // Purchase Returns (Goods sent back to supplier -> OUT)
    const purchaseReturnItems = activeItemDetails?.purchaseReturnItems || [];
    purchaseReturnItems.forEach((pri: any) => {
      const qty = Number(pri.quantity || 0);
      const price = Number(pri.unitPrice || 0);
      const total = Number(pri.total || qty * price);
      list.push({
        id: pri.id,
        category: 'BUY',
        type: 'Purchase Return',
        actionLabel: 'Return (Out)',
        flow: 'out',
        ref: pri.purchaseReturn?.returnNumber || '-',
        name: pri.purchaseReturn?.party?.name || 'Supplier Return',
        date: pri.purchaseReturn?.date || pri.createdAt,
        quantity: qty,
        price,
        total,
        status: 'Returned',
      });
    });

    // Stock Movements (Adjustments, Initial Stock, In/Out)
    const stockMovements = activeItemDetails?.stockMovements || activeItem.stockMovements || [];
    stockMovements.forEach((sm: any) => {
      const isInitial = sm.type === 'INITIAL';
      const isAdjustment = sm.type === 'ADJUSTMENT';
      const qty = Math.abs(Number(sm.quantity || 0));
      const price = Number(activeItem.purchasePrice || activeItem.salePrice || 0);
      const isPositive = Number(sm.quantity || 0) >= 0;
      list.push({
        id: sm.id,
        category: 'STOCK',
        type: isInitial ? 'Opening Stock' : isAdjustment ? 'Stock Adjustment' : `Stock ${sm.type || 'Movement'}`,
        actionLabel: isInitial ? 'Opening' : isAdjustment ? 'Adjustment' : 'Movement',
        flow: isPositive ? 'in' : 'out',
        ref: isInitial ? 'INIT' : isAdjustment ? 'ADJ' : 'STK',
        name: sm.reference || (isInitial ? 'Initial Opening Stock' : 'Stock Adjustment'),
        date: sm.createdAt,
        quantity: qty,
        price,
        total: qty * price,
        status: 'Recorded',
      });
    });

    // Fallback: If no Opening Stock movement was logged, but item has openingStock or currentStock
    const hasOpeningStock = list.some((t) => t.type === 'Opening Stock');
    const initialQty = Number(activeItem.openingStock || 0) || (list.length === 0 ? Number(activeItem.currentStock || 0) : 0);
    if (!hasOpeningStock && initialQty > 0) {
      const price = Number(activeItem.purchasePrice || activeItem.salePrice || 0);
      list.push({
        id: 'initial-stock-' + (activeItem.id || 'default'),
        category: 'STOCK',
        type: 'Opening Stock',
        actionLabel: 'Opening',
        flow: 'in',
        ref: 'INIT',
        name: 'Initial Opening Stock',
        date: activeItem.createdAt || new Date().toISOString(),
        quantity: initialQty,
        price,
        total: initialQty * price,
        status: 'Recorded',
      });
    }

    // Sort chronologically (latest first)
    const sorted = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type tab (ALL, SELL, BUY, STOCK)
    let filtered = sorted;
    if (txTypeFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.category === txTypeFilter);
    }

    // Filter by search query
    if (!txSearch.trim()) return filtered;
    const q = txSearch.toLowerCase();
    return filtered.filter(
      (t) =>
        t.type.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    );
  }, [activeItem, activeItemDetails, txSearch, txTypeFilter]);

  // Mutations
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const adjustStock = useAdjustStock();
  const deleteItem = useDeleteItem();

  // Create Form
  const createForm = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: ItemType.PRODUCT,
      unit: 'Pcs',
      salePrice: 0,
      purchasePrice: 0,
      minStockAlert: 5,
      openingStock: 0,
    },
  });

  // Edit Form
  const editForm = useForm<UpdateItemInput>({
    resolver: zodResolver(itemSchema.partial()),
  });

  // Adjust Form
  const adjustForm = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustmentType: 'ADD',
      quantity: 1,
    },
  });

  // New Unit Form state
  const [newUnitFullName, setNewUnitFullName] = useState('');
  const [newUnitShortName, setNewUnitShortName] = useState('');

  // Conversion Form state
  const [convSecondaryUnit, setConvSecondaryUnit] = useState('Pcs');
  const [convRate, setConvRate] = useState<number>(1);

  // Submit Create Item
  const handleCreateSubmit = async (data: ItemInput) => {
    try {
      const isService = createType === ItemType.SERVICE;
      const payload: ItemInput = {
        ...data,
        type: createType,
        unit: data.unit || (isService ? 'Hur' : 'Pcs'),
        purchasePrice: isService ? 0 : Number(data.purchasePrice || 0),
        openingStock: isService ? 0 : Number(data.openingStock || 0),
        minStockAlert: isService ? 0 : Number(data.minStockAlert || 0),
      };
      const created = await createItem.mutateAsync(payload);
      toast.success(`${isService ? 'Service' : 'Product'} "${data.name}" added successfully!`);
      setIsCreateOpen(false);
      createForm.reset();
      refetchItems();
      if (createType === ItemType.PRODUCT) {
        setSelectedProductId(created.id);
        setActiveTab('products');
      } else {
        setSelectedServiceId(created.id);
        setActiveTab('services');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create item');
    }
  };

  // Submit Edit Item
  const handleEditSaveRequest = (data: UpdateItemInput) => {
    setPendingEditData(data);
    setIsEditSaveConfirmOpen(true);
  };

  const handleConfirmEditSave = () => {
    setIsEditSaveConfirmOpen(false);
    if (pendingEditData) {
      handleEditSubmit(pendingEditData);
    }
  };

  const handleEditSubmit = async (data: UpdateItemInput) => {
    if (!editingItem) return;
    try {
      const isService = editingItem.type === ItemType.SERVICE;
      const payload: UpdateItemInput = {
        ...data,
        salePrice: Number(data.salePrice || 0),
        wholesalePrice: Number(data.wholesalePrice || 0),
        purchasePrice: isService ? 0 : Number(data.purchasePrice || 0),
        minStockAlert: isService ? 0 : Number(data.minStockAlert || 0),
      };
      await updateItem.mutateAsync({ id: editingItem.id, data: payload });
      toast.success(`${isService ? 'Service' : 'Product'} updated successfully!`);
      setEditingItem(null);
      refetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update item');
    }
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (data: StockAdjustmentInput) => {
    if (!adjustingItem) return;
    try {
      await adjustStock.mutateAsync({ id: adjustingItem.id, data });
      toast.success(`Stock adjusted for "${adjustingItem.name}"`);
      setAdjustingItem(null);
      adjustForm.reset();
      refetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to adjust stock');
    }
  };

  // Submit Delete Item
  const handleDeleteConfirm = async () => {
    if (!deletingItemInfo) return;
    try {
      await deleteItem.mutateAsync(deletingItemInfo.id);
      toast.success(`Item "${deletingItemInfo.name}" deleted`);
      setDeletingItemInfo(null);
      refetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete item');
    }
  };

  // Open Edit Modal helper
  const openEditModal = (item: any) => {
    const isService = item.type === ItemType.SERVICE;
    setEditingItem(item);
    editForm.reset({
      name: item.name,
      code: item.code || '',
      type: item.type,
      categoryId: item.categoryId || '',
      unit: item.unit || (isService ? 'Hur' : 'Pcs'),
      salePrice: Number(item.salePrice || 0),
      wholesalePrice: Number(item.wholesalePrice || 0),
      purchasePrice: isService ? 0 : Number(item.purchasePrice || 0),
      minStockAlert: isService ? 0 : Number(item.minStockAlert || 5),
      storeDescription: item.storeDescription || '',
    });
  };

  // Open Adjust Modal helper
  const openAdjustModal = (item: any) => {
    setAdjustingItem(item);
    adjustForm.reset({
      adjustmentType: 'ADD',
      quantity: 1,
      notes: '',
    });
  };

  // Save new unit
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitFullName.trim() || !newUnitShortName.trim()) {
      toast.error('Please enter both full name and short name');
      return;
    }
    const newUnit = {
      fullname: newUnitFullName.trim().toUpperCase(),
      shortname: newUnitShortName.trim(),
    };
    const updated = [...customUnits, newUnit];
    setCustomUnits(updated);
    localStorage.setItem('bizmanage_custom_units', JSON.stringify(updated));
    setSelectedUnitName(newUnit.fullname);
    setNewUnitFullName('');
    setNewUnitShortName('');
    setIsAddUnitOpen(false);
    toast.success(`Unit ${newUnit.fullname} added successfully!`);
  };

  // Save unit conversion
  const handleAddConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convRate || convRate <= 0) {
      toast.error('Please enter a valid conversion rate');
      return;
    }
    const newConv = {
      baseUnit: selectedUnitName,
      secondaryUnit: convSecondaryUnit,
      rate: Number(convRate),
    };
    const updated = [...unitConversions.filter((c) => c.baseUnit !== selectedUnitName), newConv];
    setUnitConversions(updated);
    localStorage.setItem('bizmanage_unit_conversions', JSON.stringify(updated));
    setIsAddConversionOpen(false);
    toast.success(`Conversion set: 1 ${selectedUnitName} = ${convRate} ${convSecondaryUnit}`);
  };

  const selectedUnitConversions = unitConversions.filter(
    (c) => c.baseUnit.toUpperCase() === selectedUnitName.toUpperCase()
  );

  // Export All Inventory Products & Services
  const handleTriggerExportInventory = () => {
    if (rawItems.length === 0) {
      toast.error('No items to export.');
      return;
    }
    setExportModalConfig({
      isOpen: true,
      title: 'Inventory Products & Services',
      description: 'Export complete catalog of products, services, stock levels, and pricing.',
      recordCount: rawItems.length,
      onConfirm: (format) => {
        const dateStr = new Date().toISOString().split('T')[0];
        if (format === 'csv') {
          const headers = [
            'Item Name',
            'SKU / Code',
            'Type',
            'Category',
            'Unit',
            'Sale Price (Rs)',
            'Purchase Cost (Rs)',
            'Opening Stock',
            'Current Stock',
            'Min Stock Alert',
            'Description',
          ];
          const rows = rawItems.map((i) => [
            i.name,
            i.code || '',
            i.type,
            i.category?.name || 'Uncategorized',
            i.unit || 'Pcs',
            Number(i.salePrice || 0),
            Number(i.purchasePrice || 0),
            Number(i.openingStock || 0),
            Number(i.currentStock || 0),
            Number(i.minStockAlert || 0),
            i.storeDescription || '',
          ]);
          downloadCsv(`bizmanage_inventory_${dateStr}.csv`, headers, rows);
        } else {
          downloadJson(`bizmanage_inventory_${dateStr}.json`, rawItems);
        }
        toast.success(`Exported ${rawItems.length} items to ${format.toUpperCase()}!`);
      },
    });
  };

  // Export Active Item Transactions Ledger
  const handleTriggerExportTransactions = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export for this item.');
      return;
    }
    const itemName = activeItem?.name || 'Item';
    setExportModalConfig({
      isOpen: true,
      title: `Item Transactions - ${itemName}`,
      description: `Export complete ledger of buy, sell, and stock adjustment records for ${itemName}.`,
      recordCount: transactions.length,
      onConfirm: (format) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = itemName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        if (format === 'csv') {
          const headers = [
            'Type',
            'Invoice / Ref #',
            'Party / Contact',
            'Date',
            'Direction',
            'Quantity',
            'Rate (Rs)',
            'Total Amount (Rs)',
            'Status',
          ];
          const rows = transactions.map((t) => [
            t.type,
            t.ref,
            t.name,
            t.date ? new Date(t.date).toLocaleDateString() : '-',
            t.flow === 'in' ? 'IN (+)' : 'OUT (-)',
            t.quantity,
            t.price,
            t.total,
            t.status,
          ]);
          downloadCsv(`transactions_${safeName}_${dateStr}.csv`, headers, rows);
        } else {
          downloadJson(`transactions_${safeName}_${dateStr}.json`, {
            item: activeItem,
            transactions,
          });
        }
        toast.success(`Exported ${transactions.length} transactions to ${format.toUpperCase()}!`);
      },
    });
  };

  if (itemsLoading && !itemsResponse) {
    return <LoadingState message="Loading inventory catalog..." />;
  }

  if (isError && !itemsResponse) {
    return <ErrorState title="Failed to load inventory" onRetry={refetchItems} />;
  }

  return (
    <div className="space-y-2.5 font-sans pb-4">
      {/* 1. TOP TABS HEADER (Vyapar ERP: PRODUCTS | SERVICES | CATEGORY | UNITS) */}
      <div className="border-b border-slate-200 bg-white -mx-3 sm:-mx-6 -mt-3 sm:-mt-6 px-3 sm:px-6 pt-1 flex items-center justify-between shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 pt-2 px-2 text-xs sm:text-sm font-black tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 min-w-max ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>PRODUCTS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 pt-2 px-2 text-xs sm:text-sm font-black tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 min-w-max ${
              activeTab === 'services'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span>SERVICES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`pb-2.5 pt-2 px-2 text-xs sm:text-sm font-black tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 min-w-max ${
              activeTab === 'category'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>CATEGORY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('units')}
            className={`pb-2.5 pt-2 px-2 text-xs sm:text-sm font-black tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 min-w-max ${
              activeTab === 'units'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>UNITS</span>
          </button>
        </div>

        {/* Quick actions on right */}
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Import Products & Services (Excel, CSV, or JSON)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerExportInventory}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Export Products & Services (Excel, CSV, or JSON)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB CONTENT 1: PRODUCTS (Master-Detail Split View) */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <>
          {/* MOBILE VIEW (< md) - Clean Cards matching screenshot with single click navigation */}
          <div className="block md:hidden space-y-3 pb-24">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Items & SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
              />
            </div>

            {/* Products List Cards */}
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No items found.</p>
                <Link
                  href="/inventory/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add New Item
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((p) => {
                  const stock = Number(p.currentStock || 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/inventory/${p.id}`)}
                      className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md active:scale-[0.99] transition-all cursor-pointer space-y-2.5 select-none"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.name}</h3>
                        {p.code && (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            SKU: {p.code}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-left pt-1">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Sale Price</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                            Rs {Number(p.salePrice || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Purchase Price</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                            Rs {Number(p.purchasePrice || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Stock</span>
                          <span
                            className={`text-xs sm:text-sm font-bold font-mono ${
                              stock < 0
                                ? 'text-rose-500'
                                : stock === 0
                                ? 'text-slate-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {stock < 0 ? stock.toFixed(1) : stock.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Floating Red Add New Item Pill Button */}
            <Link
              href="/inventory/new"
              className="fixed bottom-20 left-1/2 -translate-x-1/2 md:hidden z-40 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#FF0033] hover:bg-[#E6002E] text-white font-bold text-xs sm:text-sm shadow-xl shadow-red-600/30 active:scale-95 transition-all whitespace-nowrap"
            >
              <Package className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Item</span>
            </Link>
          </div>

          {/* DESKTOP SPLIT VIEW (>= md) */}
          <div className="hidden md:flex bg-white rounded-2xl border border-slate-200/90 shadow-xs flex-col md:flex-row overflow-hidden h-[calc(100vh-130px)] max-h-[calc(100vh-130px)]">
            {/* Left Directory Pane: Products */}
            <div className="w-full md:w-80 lg:w-88 shrink-0 border-r border-slate-200 flex flex-col bg-white h-full overflow-hidden">
              {/* Action Bar: Search & Orange Add Item Button */}
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Vyapar Orange Add Item Button (Full Screen) */}
                <Link
                  href="/inventory/new"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Item</span>
                </Link>
              </div>

              {/* Table Header: Item & Quantity */}
              <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600 select-none">
                <div className="flex items-center gap-1.5">
                  <span>ITEM</span>
                  <Filter className="w-3 h-3 text-red-500 fill-red-500" />
                </div>
                <span>QUANTITY</span>
              </div>

              {/* Product Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-xs text-slate-400">No products found.</p>
                    <Link
                      href="/inventory/new"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Product
                    </Link>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = activeItem?.id === p.id;
                    const stock = Number(p.currentStock || 0);

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        onDoubleClick={() => router.push(`/inventory/${p.id}`)}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-sky-50 text-blue-900 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs truncate block font-bold text-slate-900 group-hover:text-blue-600">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.code && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                SKU: {p.code}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-bold md:hidden">
                              Rs. {Number(p.salePrice || 0).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-xs font-mono font-black ${
                                stock < 0
                                  ? 'text-rose-600'
                                  : stock > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {stock}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold md:hidden">
                              {p.unit || 'PCS'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(p);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          {/* Right Main Pane: Product Details & Transactions */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
            {activeItem ? (
              <>
                {/* Header: Item Name, Shortcut link & Blue Adjust Item Button */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                      {activeItem.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openEditModal(activeItem)}
                      className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItemInfo({ id: activeItem.id, name: activeItem.name })}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Vyapar Blue Adjust Item Button */}
                  <button
                    type="button"
                    onClick={() => openAdjustModal(activeItem)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>ADJUST ITEM</span>
                  </button>
                </div>

                {/* Pricing & Stock Valuation Bar (from Screenshot) */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">SALE PRICE:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        Rs. {Number(activeItem.salePrice || 0).toFixed(2)}
                      </span>
                    </div>
                    {Number(activeItem.wholesalePrice || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-600">WHOLESALE:</span>
                        <span className="font-mono font-bold text-purple-700">
                          Rs. {Number(activeItem.wholesalePrice || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">PURCHASE PRICE:</span>
                      {showCost ? (
                        <span className="font-mono font-bold text-slate-700">
                          Rs. {Number(activeItem.purchasePrice || 0).toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">••••••</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCost(!showCost)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showCost ? 'Hide purchase price' : 'Show purchase price'}
                      >
                        {showCost ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-slate-500">STOCK QUANTITY:</span>
                      <span
                        className={`font-mono font-bold ${
                          Number(activeItem.currentStock || 0) < 0
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {Number(activeItem.currentStock || 0)} {activeItem.unit || 'Pcs'}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-slate-500">STOCK VALUE:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        Rs.{' '}
                        {(
                          Number(activeItem.currentStock || 0) *
                          Number(activeItem.purchasePrice || activeItem.salePrice || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transactions Bar with Buy/Sell Filter Tabs, Search & Export */}
                <div className="px-6 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        TRANSACTIONS
                      </h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                        {transactions.length}
                      </span>
                    </div>

                    {/* Quick Filter Segment: All | Buy | Sell | Stock */}
                    <div className="flex p-0.5 bg-slate-100/90 rounded-xl text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setTxTypeFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          txTypeFilter === 'ALL'
                            ? 'bg-white text-slate-900 font-bold shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxTypeFilter('BUY')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          txTypeFilter === 'BUY'
                            ? 'bg-white text-blue-700 font-bold shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Buy (Purchases)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxTypeFilter('SELL')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          txTypeFilter === 'SELL'
                            ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Sell (Sales)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxTypeFilter('STOCK')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          txTypeFilter === 'STOCK'
                            ? 'bg-white text-slate-700 font-bold shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>Stock</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search invoice, party, type..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="pl-7 pr-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none w-44 sm:w-56"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerExportTransactions}
                      className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer border border-emerald-100"
                      title="Export Transactions (Excel / JSON)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="flex-1 overflow-auto flex flex-col bg-white">
                  {transactions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                        <Receipt className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No Transactions Found</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Buy (Purchases), Sell (Sales), and Stock entries for this item will appear here.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 select-none">
                        <tr>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[140px]">
                            <div className="flex items-center gap-1">
                              <span>TYPE</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[120px]">
                            <div className="flex items-center gap-1">
                              <span>INVOICE / REF</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 min-w-[170px]">
                            <div className="flex items-center gap-1">
                              <span>PARTY NAME</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[110px]">
                            <div className="flex items-center gap-1">
                              <span>DATE</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[100px] text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span>STATUS</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[110px] text-right">
                            QUANTITY
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[120px] text-right">
                            RATE
                          </th>
                          <th className="px-4 py-2.5 w-[140px] text-right">
                            TOTAL AMOUNT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {transactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Transaction Type Badge */}
                            <td className="px-4 py-2.5 border-r border-slate-200">
                              {tx.type === 'Sale (Sell)' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Sale (Sell)</span>
                                </span>
                              ) : tx.type === 'Purchase (Buy)' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <span>Purchase (Buy)</span>
                                </span>
                              ) : tx.type === 'Sale Return' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  <span>Sale Return</span>
                                </span>
                              ) : tx.type === 'Purchase Return' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Purchase Return</span>
                                </span>
                              ) : tx.type === 'Opening Stock' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  <span>Opening Stock</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>Adjustment</span>
                                </span>
                              )}
                            </td>

                            {/* Invoice / Reference Number */}
                            <td className="px-4 py-2.5 border-r border-slate-200 font-mono font-semibold text-slate-700 whitespace-nowrap">
                              {tx.ref}
                            </td>

                            {/* Party Name */}
                            <td className="px-4 py-2.5 border-r border-slate-200 font-medium text-slate-900">
                              {tx.name}
                            </td>

                            {/* Date */}
                            <td className="px-4 py-2.5 border-r border-slate-200 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : '-'}
                            </td>

                            {/* Status: Paid or Unpaid / Partial / Recorded */}
                            <td className="px-4 py-2.5 border-r border-slate-200 text-center whitespace-nowrap">
                              {tx.status === 'PAID' || tx.status === 'Paid' || tx.status === 'COMPLETED' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 inline-block">
                                  Paid
                                </span>
                              ) : tx.status === 'UNPAID' || tx.status === 'Unpaid' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 inline-block">
                                  Unpaid
                                </span>
                              ) : tx.status === 'PARTIAL' || tx.status === 'Partial' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 inline-block">
                                  Partial
                                </span>
                              ) : tx.status === 'Returned' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300 inline-block">
                                  Returned
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-block">
                                  {tx.status || 'Recorded'}
                                </span>
                              )}
                            </td>

                            {/* Quantity (with In / Out direction styling) */}
                            <td className="px-4 py-2.5 border-r border-slate-200 text-right font-mono font-bold whitespace-nowrap">
                              {tx.flow === 'in' ? (
                                <span className="text-emerald-600">+{tx.quantity} {activeItem.unit || ''}</span>
                              ) : (
                                <span className="text-rose-600">-{tx.quantity} {activeItem.unit || ''}</span>
                              )}
                            </td>

                            {/* Price / Rate */}
                            <td className="px-4 py-2.5 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                              Rs. {Number(tx.price || 0).toFixed(2)}
                            </td>

                            {/* Total Amount */}
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              Rs. {Number(tx.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Product Selected</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a product from the directory or create a new one.
                </p>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB CONTENT 2: SERVICES (Screenshot 2) */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <>
          {/* MOBILE VIEW (< md) for Services */}
          <div className="block md:hidden space-y-3 pb-24">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Services & SAC..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
              />
            </div>

            {filteredServices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No services found.</p>
                <Link
                  href="/inventory/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add New Service
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredServices.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/inventory/${s.id}`)}
                    className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md active:scale-[0.99] transition-all cursor-pointer space-y-2.5 select-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{s.name}</h3>
                      {s.code && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          SAC: {s.code}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left pt-1">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Charge / Rate</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                          Rs {Number(s.salePrice || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Unit</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">
                          {s.unit || 'Hrs'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Floating Red Add Service Button */}
            <Link
              href="/inventory/new"
              className="fixed bottom-20 left-1/2 -translate-x-1/2 md:hidden z-40 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#FF0033] hover:bg-[#E6002E] text-white font-bold text-xs sm:text-sm shadow-xl shadow-red-600/30 active:scale-95 transition-all whitespace-nowrap"
            >
              <Wrench className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Service</span>
            </Link>
          </div>

          {/* DESKTOP SPLIT VIEW (>= md) */}
          <div className="hidden md:flex bg-white rounded-2xl border border-slate-200/90 shadow-xs h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] flex-col overflow-hidden">
            {services.length === 0 ? (
              /* Screenshot 2 Exact Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
                <div className="w-24 h-24 rounded-3xl bg-blue-50/70 border border-blue-100 flex items-center justify-center mb-4 text-blue-500 shadow-xs">
                  <Wrench className="w-12 h-12 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 max-w-md">
                  Add services you provide to your customers and create Sale invoices for them faster.
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCreateType(ItemType.SERVICE);
                    createForm.setValue('type', ItemType.SERVICE);
                    setIsCreateOpen(true);
                  }}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Add Your First Service
                </button>
              </div>
            ) : (
              /* Services Split View */
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                <div className="w-full md:w-80 lg:w-88 shrink-0 border-r border-slate-200 flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search Services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs"
                    />
                    <Link
                      href="/inventory/new"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shrink-0 cursor-pointer transition-all shadow-xs"
                    >
                      + Add Service
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredServices.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedServiceId(s.id)}
                        onDoubleClick={() => router.push(`/inventory/${s.id}`)}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer group transition-colors ${
                          selectedServiceId === s.id
                            ? 'bg-sky-50 text-blue-900 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs truncate block font-medium group-hover:text-blue-600">
                            {s.name}
                          </span>
                          {s.code && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              SAC: {s.code}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            Rs. {Number(s.salePrice || 0).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(s);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {activeItem ? (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">{activeItem.name}</h2>
                          {activeItem.code && (
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                              SAC: {activeItem.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Billing Rate: <strong className="text-slate-900 font-mono">Rs. {Number(activeItem.salePrice || 0).toFixed(2)}</strong> per {activeItem.unit || 'Hrs'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(activeItem)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Service</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItemInfo({ id: activeItem.id, name: activeItem.name })}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Charge</span>
                        <span className="text-base font-mono font-bold text-emerald-600 mt-0.5 block">
                          Rs. {Number(activeItem.salePrice || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400">per {activeItem.unit || 'Hrs'}</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                        <span className="text-sm font-bold text-slate-800 mt-1 block truncate">
                          {activeItem.category?.name || 'Uncategorized'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">SAC / Code</span>
                        <span className="text-sm font-mono font-bold text-slate-800 mt-1 block">
                          {activeItem.code || '-'}
                        </span>
                      </div>
                    </div>

                    {activeItem.storeDescription && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Scope & Description</span>
                        <p className="text-slate-700 leading-relaxed">{activeItem.storeDescription}</p>
                      </div>
                    )}

                    {/* Service Sales History */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            SERVICE BILLING & SALES HISTORY
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                            {transactions.length}
                          </span>
                        </div>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                          <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">No Sales Recorded Yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Invoices that bill this service will appear here automatically.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
                          <div className="grid grid-cols-12 px-4 py-2 bg-slate-50/80 text-[11px] font-bold text-slate-500">
                            <span className="col-span-2">TYPE</span>
                            <span className="col-span-3">INVOICE #</span>
                            <span className="col-span-3">CUSTOMER</span>
                            <span className="col-span-2">DATE</span>
                            <span className="col-span-2 text-right">TOTAL</span>
                          </div>
                          {transactions.map((tx: any) => (
                            <div key={tx.id} className="grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-slate-50 transition-colors">
                              <span className="col-span-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Sale</span>
                                </span>
                              </span>
                              <span className="col-span-3 font-mono font-semibold text-slate-700 truncate pr-2">{tx.ref}</span>
                              <span className="col-span-3 truncate text-slate-800 font-medium pr-2">{tx.name}</span>
                              <span className="col-span-2 text-slate-500 font-mono text-[11px]">
                                {tx.date ? new Date(tx.date).toLocaleDateString() : '-'}
                              </span>
                              <span className="col-span-2 text-right font-mono font-bold text-slate-900">
                                Rs. {tx.total.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 3: CATEGORY (Screenshot 3) */}
      {/* ========================================================================= */}
      {activeTab === 'category' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row overflow-hidden h-[calc(100vh-130px)] max-h-[calc(100vh-130px)]">
          {/* Left Directory Pane: Categories */}
          <div className="w-full md:w-80 lg:w-88 shrink-0 border-r border-slate-200 flex flex-col bg-white h-full overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Category..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Table Header: Category | Item */}
            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>CATEGORY</span>
              <span>ITEM</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredCategoryDirectory.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="text-xs truncate">{cat.name}</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Pane: Category Items */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase">
                  {selectedCategoryId === 'none'
                    ? 'ITEMS NOT IN ANY CATEGORY'
                    : categories.find((c: any) => c.id === selectedCategoryId)?.name || 'CATEGORY'}
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedCategoryItems.length} item(s)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedItemIdsForMove(new Set());
                  setMoveSearchQuery('');
                  setIsMoveCategoryOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move To This Category</span>
              </button>
            </div>

            {/* Items Table in Category */}
            <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase">ITEMS</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 px-6 py-2 bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                <div className="col-span-2">NAME</div>
                <div className="text-right">QUANTITY</div>
                <div className="text-right">STOCK VALUE</div>
                <div className="text-right">ACTION</div>
              </div>

              {selectedCategoryItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No items in this category.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedCategoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-5 px-6 py-3 text-xs hover:bg-slate-50/60 items-center"
                    >
                      <div className="col-span-2 font-medium text-slate-800 truncate pr-2">
                        {item.name}
                        {item.code && <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {item.code}</span>}
                      </div>
                      <div
                        className={`text-right font-mono font-bold ${
                          Number(item.currentStock || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {item.currentStock}
                      </div>
                      <div className="text-right font-mono text-emerald-600 font-bold">
                        Rs.{' '}
                        {(
                          Number(item.currentStock || 0) *
                          Number(item.purchasePrice || item.salePrice || 0)
                        ).toFixed(2)}
                      </div>
                      <div className="text-right">
                        {item.categoryId && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.post('/items/bulk-move-category', {
                                  itemIds: [item.id],
                                  categoryId: null,
                                });
                                toast.success(`Removed "${item.name}" from category`);
                                refetchItems();
                                refetchCategories();
                              } catch (_) {
                                toast.error('Failed to remove from category');
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                            title="Remove from category"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT 4: UNITS (Screenshot 4) */}
      {/* ========================================================================= */}
      {activeTab === 'units' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row overflow-hidden h-[calc(100vh-130px)] max-h-[calc(100vh-130px)]">
          {/* Left Directory Pane: Units */}
          <div className="w-full md:w-80 lg:w-88 shrink-0 border-r border-slate-200 flex flex-col bg-white h-full overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Units..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Units</span>
              </button>
            </div>

            {/* Table Header: Fullname | Shortname */}
            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>FULLNAME</span>
              <span>SHORTNAME</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredUnits.map((u) => {
                const isSelected = selectedUnitName.toUpperCase() === u.fullname.toUpperCase();
                return (
                  <div
                    key={u.fullname}
                    onClick={() => setSelectedUnitName(u.fullname)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50 text-blue-900 font-bold border-l-4 border-blue-600' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="text-xs font-semibold">{u.fullname}</span>
                    <span className="text-xs font-mono text-slate-600">{u.shortname}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Pane: Unit Conversions */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  {selectedUnitName}
                </h2>
                <p className="text-xs text-slate-500">Unit of Measurement & Conversion rules</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddConversionOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Conversion
              </button>
            </div>

            <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase">CONVERSION RULES</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedUnitConversions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
                  <Scale className="w-12 h-12 text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No Rows To Show</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Add Conversion" to define e.g. 1 {selectedUnitName} = 12 PIECES.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 p-6">
                  {selectedUnitConversions.map((conv, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        1 {conv.baseUnit} = {conv.rate} {conv.secondaryUnit}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = unitConversions.filter((c) => c !== conv);
                          setUnitConversions(filtered);
                          localStorage.setItem('bizmanage_unit_conversions', JSON.stringify(filtered));
                          toast.success('Conversion rule removed');
                        }}
                        className="text-rose-600 text-xs hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODALS & POPUPS */}
      {/* ========================================================================= */}

      {/* Create Item / Service Modal (Full Screen Layout) */}
      {isCreateOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[120] flex items-center justify-center p-2 sm:p-4 font-sans"
            onClick={() => promptDiscardConfirmation(() => setIsCreateOpen(false))}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            >
              {/* Type Switch Segment */}
              <div className="flex p-1 bg-slate-100/90 rounded-2xl max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    setCreateType(ItemType.PRODUCT);
                    createForm.setValue('type', ItemType.PRODUCT);
                    createForm.setValue('unit', 'Pcs');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    createType === ItemType.PRODUCT
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Product (सामान)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateType(ItemType.SERVICE);
                    createForm.setValue('type', ItemType.SERVICE);
                    createForm.setValue('unit', 'Hur');
                    createForm.setValue('purchasePrice', 0);
                    createForm.setValue('openingStock', 0);
                    createForm.setValue('minStockAlert', 0);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    createType === ItemType.SERVICE
                      ? 'bg-white text-amber-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Service (सेवा)</span>
                </button>
              </div>

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      createType === ItemType.SERVICE
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}
                  >
                    {createType === ItemType.SERVICE ? (
                      <Wrench className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Add New {createType === ItemType.SERVICE ? 'Service (सेवा)' : 'Product (सामान)'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {createType === ItemType.SERVICE
                        ? 'Services have billing rates and no purchasing cost or physical inventory.'
                        : 'Physical goods with purchase cost, sale price, and real-time inventory tracking.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => promptDiscardConfirmation(() => setIsCreateOpen(false))}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                {/* ----------------- SERVICE FORM ----------------- */}
                {createType === ItemType.SERVICE ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        {...createForm.register('name')}
                        placeholder="e.g. AC Installation, Consulting, Plumbing Repair, Delivery"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-500 focus:outline-none"
                      />
                      {createForm.formState.errors.name && (
                        <p className="text-xs text-rose-600 mt-1">
                          {createForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SAC / Service Code
                        </label>
                        <input
                          type="text"
                          {...createForm.register('code')}
                          placeholder="e.g. SAC-9987"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Billing Unit
                        </label>
                        <select
                          {...createForm.register('unit')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                        >
                          <optgroup label="Standard Service Units">
                            {SERVICE_DEFAULT_UNITS.map((u) => (
                              <option key={u.shortname} value={u.shortname}>
                                {u.fullname} ({u.shortname})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="All Units">
                            {allUnits.map((u) => (
                              <option key={u.fullname} value={u.shortname}>
                                {u.fullname} ({u.shortname})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Service Charge / Rate ONLY (NO Purchase Price!) */}
                    <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Service Charge / Rate (Rs.) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2 text-xs font-bold text-slate-400 font-mono">
                          Rs.
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0.00"
                          {...createForm.register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:border-amber-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Customer billing rate per unit. (Services do not have purchasing cost).
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700">Category</label>
                        <button
                          type="button"
                          onClick={() => setIsAddCategoryOpen(true)}
                          className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                        >
                          + New Category
                        </button>
                      </div>
                      <select
                        {...createForm.register('categoryId')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                      >
                        <option value="">No Category</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Description / Scope (Optional)
                      </label>
                      <input
                        type="text"
                        {...createForm.register('storeDescription')}
                        placeholder="e.g. Standard labor and inspection fee"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  /* ----------------- PRODUCT FORM ----------------- */
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        {...createForm.register('name')}
                        placeholder="e.g. CPVC Pipe 1 inch, Cement 50kg"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                      {createForm.formState.errors.name && (
                        <p className="text-xs text-rose-600 mt-1">
                          {createForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SKU / Item Code
                        </label>
                        <input
                          type="text"
                          {...createForm.register('code')}
                          placeholder="e.g. SKU-1001"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                        <select
                          {...createForm.register('unit')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                        >
                          {allUnits.map((u) => (
                            <option key={u.fullname} value={u.shortname}>
                              {u.fullname} ({u.shortname})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Sale Price (Rs.) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0.00"
                          {...createForm.register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Purchase Price (Rs.)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0.00"
                          {...createForm.register('purchasePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Opening Stock
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0"
                          {...createForm.register('openingStock', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Min Stock Alert
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="5"
                          {...createForm.register('minStockAlert', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700">Category</label>
                        <button
                          type="button"
                          onClick={() => setIsAddCategoryOpen(true)}
                          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          + New Category
                        </button>
                      </div>
                      <select
                        {...createForm.register('categoryId')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                      >
                        <option value="">No Category</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => promptDiscardConfirmation(() => setIsCreateOpen(false))}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createItem.isPending}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all ${
                      createType === ItemType.SERVICE
                        ? 'bg-amber-500 hover:bg-amber-600 active:scale-95'
                        : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                    }`}
                  >
                    {createType === ItemType.SERVICE ? (
                      <Wrench className="w-3.5 h-3.5" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {createItem.isPending
                        ? 'Saving...'
                        : createType === ItemType.SERVICE
                        ? 'Save Service'
                        : 'Save Product'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Item / Service Modal */}
      {editingItem && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
            onClick={() => promptDiscardConfirmation(() => setEditingItem(null), 'Discard edits?', 'Are you sure you want to exit without saving changes?')}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      editingItem.type === ItemType.SERVICE
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {editingItem.type === ItemType.SERVICE ? (
                      <Wrench className="w-4 h-4" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingItem.type === ItemType.SERVICE
                        ? 'Edit Service Details'
                        : 'Edit Product Details'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editingItem.type === ItemType.SERVICE
                        ? 'Services have billing rates and no purchasing cost.'
                        : 'Physical goods with purchase cost and stock alert.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => promptDiscardConfirmation(() => setEditingItem(null), 'Discard edits?', 'Are you sure you want to exit without saving changes?')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={editForm.handleSubmit(handleEditSaveRequest)} className="p-6 space-y-4">
                {/* ----------------- SERVICE EDIT FORM ----------------- */}
                {editingItem.type === ItemType.SERVICE ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        {...editForm.register('name')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SAC / Service Code
                        </label>
                        <input
                          type="text"
                          {...editForm.register('code')}
                          placeholder="e.g. SAC-9987"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Billing Unit
                        </label>
                        <select
                          {...editForm.register('unit')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                        >
                          <optgroup label="Standard Service Units">
                            {SERVICE_DEFAULT_UNITS.map((u) => (
                              <option key={u.shortname} value={u.shortname}>
                                {u.fullname} ({u.shortname})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="All Units">
                            {allUnits.map((u) => (
                              <option key={u.fullname} value={u.shortname}>
                                {u.fullname} ({u.shortname})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Service Charge / Rate ONLY (NO Purchase Price!) */}
                    <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Service Charge / Rate (Rs.) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2 text-xs font-bold text-slate-400 font-mono">
                          Rs.
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0.00"
                          {...editForm.register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:border-amber-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Customer billing rate per unit. (Services do not have purchasing cost).
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700">Category</label>
                        <button
                          type="button"
                          onClick={() => setIsAddCategoryOpen(true)}
                          className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
                        >
                          + New Category
                        </button>
                      </div>
                      <select
                        {...editForm.register('categoryId')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                      >
                        <option value="">No Category</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Description / Scope (Optional)
                      </label>
                      <input
                        type="text"
                        {...editForm.register('storeDescription')}
                        placeholder="e.g. Standard labor and inspection fee"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  /* ----------------- PRODUCT EDIT FORM ----------------- */
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        {...editForm.register('name')}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SKU / Item Code
                        </label>
                        <input
                          type="text"
                          {...editForm.register('code')}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                        <select
                          {...editForm.register('unit')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                        >
                          {allUnits.map((u) => (
                            <option key={u.fullname} value={u.shortname}>
                              {u.fullname} ({u.shortname})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Sale Price (Rs.)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          {...editForm.register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Wholesale Price (Rs.)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          placeholder="0.00"
                          {...editForm.register('wholesalePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Purchase Price (Rs.)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          {...editForm.register('purchasePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                        <select
                          {...editForm.register('categoryId')}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="">No Category</option>
                          {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Min Stock Alert
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onKeyDown={onNumericKeyDown}
                          onFocus={onNumericFocus}
                          {...editForm.register('minStockAlert', { valueAsNumber: true, onBlur: onNumericBlur })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => promptDiscardConfirmation(() => setEditingItem(null), 'Discard edits?', 'Are you sure you want to exit without saving changes?')}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateItem.isPending}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all ${
                      editingItem.type === ItemType.SERVICE
                        ? 'bg-amber-500 hover:bg-amber-600 active:scale-95'
                        : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                    }`}
                  >
                    {editingItem.type === ItemType.SERVICE ? (
                      <Wrench className="w-3.5 h-3.5" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {updateItem.isPending
                        ? 'Saving...'
                        : editingItem.type === ItemType.SERVICE
                        ? 'Update Service'
                        : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Stock Adjustment Modal ([ADJUST ITEM]) */}
      {adjustingItem && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
            onClick={() => promptDiscardConfirmation(() => setAdjustingItem(null), 'Cancel stock adjustment?', 'Are you sure you want to exit without adjusting stock?')}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">Adjust Stock</h3>
                    <p className="text-xs text-slate-500">{adjustingItem.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => promptDiscardConfirmation(() => setAdjustingItem(null), 'Cancel stock adjustment?', 'Are you sure you want to exit without adjusting stock?')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between text-xs">
                <span className="text-slate-600 font-semibold">Current Physical Stock:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Number(adjustingItem.currentStock || 0)} {adjustingItem.unit || 'Pcs'}
                </span>
              </div>

              <form onSubmit={adjustForm.handleSubmit(handleAdjustSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                        adjustForm.watch('adjustmentType') === 'ADD'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        value="ADD"
                        {...adjustForm.register('adjustmentType')}
                        className="sr-only"
                      />
                      + Add Stock (In)
                    </label>
                    <label
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                        adjustForm.watch('adjustmentType') === 'REDUCE'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        value="REDUCE"
                        {...adjustForm.register('adjustmentType')}
                        className="sr-only"
                      />
                      - Reduce (Loss/Damage)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    min="0.001"
                    {...adjustForm.register('quantity', { valueAsNumber: true, onBlur: onNumericBlur })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                  <input
                    type="text"
                    {...adjustForm.register('notes')}
                    placeholder="e.g. Physical inventory count correction"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => promptDiscardConfirmation(() => setAdjustingItem(null), 'Cancel stock adjustment?', 'Are you sure you want to exit without adjusting stock?')}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustStock.isPending}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {adjustStock.isPending ? 'Saving...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Unit Modal */}
      {isAddUnitOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
            onClick={() => setIsAddUnitOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Add Unit of Measurement</h3>
                <button
                  type="button"
                  onClick={() => setIsAddUnitOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUnit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name (e.g. PACKETS)</label>
                  <input
                    type="text"
                    value={newUnitFullName}
                    onChange={(e) => setNewUnitFullName(e.target.value)}
                    placeholder="e.g. PACKETS"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Short Name (e.g. Pkt)</label>
                  <input
                    type="text"
                    value={newUnitShortName}
                    onChange={(e) => setNewUnitShortName(e.target.value)}
                    placeholder="e.g. Pkt"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddUnitOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs"
                  >
                    Add Unit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Unit Conversion Modal */}
      {isAddConversionOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
            onClick={() => setIsAddConversionOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Add Unit Conversion</h3>
                <button
                  type="button"
                  onClick={() => setIsAddConversionOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddConversion} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <p className="font-semibold text-slate-600">Base Unit:</p>
                  <p className="font-black text-slate-900 text-sm">{selectedUnitName}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Conversion Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 shrink-0">1 {selectedUnitName} =</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                                            onFocus={onNumericFocus}
                                            onBlur={onNumericBlur}
                                            min="0.001"
                      value={convRate}
                      onChange={(e) => setConvRate(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                    />
                    <select
                      value={convSecondaryUnit}
                      onChange={(e) => setConvSecondaryUnit(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                    >
                      {allUnits
                        .filter((u) => u.fullname.toUpperCase() !== selectedUnitName.toUpperCase())
                        .map((u) => (
                          <option key={u.fullname} value={u.shortname}>
                            {u.fullname} ({u.shortname})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddConversionOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
                  >
                    Save Conversion
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Move Items To Category Modal */}
      {isMoveCategoryOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
            onClick={() => setIsMoveCategoryOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FolderInput className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Move Items to Category
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target:{' '}
                      <span className="font-bold text-blue-600">
                        {selectedCategoryId === 'none'
                          ? 'Items not in any Category'
                          : categories.find((c: any) => c.id === selectedCategoryId)?.name || 'This Category'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoveCategoryOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Select All Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter products to move..."
                    value={moveSearchQuery}
                    onChange={(e) => setMoveSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center px-1 text-xs text-slate-500">
                  <span>
                    Selected: <strong className="text-slate-900 font-mono">{selectedItemIdsForMove.size}</strong> item(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const visibleProducts = products.filter((p) => {
                        if (!moveSearchQuery.trim()) return true;
                        const q = moveSearchQuery.toLowerCase();
                        return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
                      });
                      const allSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedItemIdsForMove.has(p.id));
                      const next = new Set(selectedItemIdsForMove);
                      if (allSelected) {
                        visibleProducts.forEach((p) => next.delete(p.id));
                      } else {
                        visibleProducts.forEach((p) => next.add(p.id));
                      }
                      setSelectedItemIdsForMove(next);
                    }}
                    className="text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Select / Deselect All
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-72">
                {products
                  .filter((p) => {
                    if (!moveSearchQuery.trim()) return true;
                    const q = moveSearchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
                  })
                  .map((p) => {
                    const isChecked = selectedItemIdsForMove.has(p.id);
                    const isAlreadyInCat =
                      selectedCategoryId === 'none'
                        ? !p.categoryId
                        : p.categoryId === selectedCategoryId;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          const next = new Set(selectedItemIdsForMove);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          setSelectedItemIdsForMove(next);
                        }}
                        className={`px-3 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="text-blue-600">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 block truncate">{p.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {p.code && <span className="font-mono">SKU: {p.code}</span>}
                              <span>
                                Cat: {p.category?.name || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isAlreadyInCat ? (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Current
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-500">
                              {Number(p.currentStock || 0)} {p.unit || 'Pcs'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMoveCategoryOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedItemIdsForMove.size === 0 || isMovingCategory}
                  onClick={async () => {
                    if (selectedItemIdsForMove.size === 0) return;
                    setIsMovingCategory(true);
                    try {
                      const targetName =
                        selectedCategoryId === 'none'
                          ? 'Items not in any Category'
                          : categories.find((c: any) => c.id === selectedCategoryId)?.name || 'Category';

                      await api.post('/items/bulk-move-category', {
                        itemIds: Array.from(selectedItemIdsForMove),
                        categoryId: selectedCategoryId === 'none' ? null : selectedCategoryId,
                      });

                      toast.success(`Moved ${selectedItemIdsForMove.size} item(s) to "${targetName}"!`);
                      setIsMoveCategoryOpen(false);
                      setSelectedItemIdsForMove(new Set());
                      refetchItems();
                      refetchCategories();
                    } catch (err: any) {
                      toast.error(err.response?.data?.error?.message || 'Failed to move items');
                    } finally {
                      setIsMovingCategory(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>
                    {isMovingCategory
                      ? 'Moving...'
                      : `Move ${selectedItemIdsForMove.size > 0 ? selectedItemIdsForMove.size : ''} Items`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        type="item"
        onCategoryCreated={(cat) => {
          refetchCategories();
          createForm.setValue('categoryId', cat.id);
          if (editingItem) editForm.setValue('categoryId', cat.id);
        }}
      />

      {/* Delete Item Confirmation Modal */}
      <ConfirmActionModal
        isOpen={!!deletingItemInfo}
        onClose={() => setDeletingItemInfo(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Item"
        itemName={deletingItemInfo?.name}
        actionText="Delete Item"
        isProcessing={deleteItem.isPending}
      />

      {/* Import Inventory Modal */}
      <ImportInventoryModal
        isOpen={isImportOpen}
        onClose={() => promptDiscardConfirmation(() => setIsImportOpen(false), 'Close import wizard?', 'Are you sure you want to cancel the import process?')}
        existingItems={rawItems}
        onSuccess={() => {
          refetchItems();
          refetchCategories();
        }}
      />

      {/* Export Confirmation Modal */}
      {exportModalConfig && (
        <ExportConfirmModal
          isOpen={exportModalConfig.isOpen}
          onClose={() => setExportModalConfig(null)}
          title={exportModalConfig.title}
          description={exportModalConfig.description}
          recordCount={exportModalConfig.recordCount}
          onConfirm={exportModalConfig.onConfirm}
        />
      )}

      {/* Discard Changes Confirmation Modal */}
      {discardModalConfig && (
        <DiscardConfirmModal
          isOpen={discardModalConfig.isOpen}
          onClose={() => setDiscardModalConfig(null)}
          onConfirm={() => {
            const cb = discardModalConfig.onConfirm;
            setDiscardModalConfig(null);
            cb();
          }}
          title={discardModalConfig.title}
          message={discardModalConfig.message}
        />
      )}
      {/* Save Changes Confirmation Modal */}
      <SaveConfirmModal
        isOpen={isEditSaveConfirmOpen}
        onClose={() => setIsEditSaveConfirmOpen(false)}
        onConfirm={handleConfirmEditSave}
        isLoading={updateItem.isPending}
        title="Save Changes to Item?"
        message={`Are you sure you want to update "${pendingEditData?.name || editingItem?.name || 'this item'}"?`}
        confirmText="Yes, Save Changes"
      />
    </div>
  );
}