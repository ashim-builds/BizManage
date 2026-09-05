'use client';

import { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import { downloadJson } from '@/lib/exportUtils';
import { useBulkCreateItems } from '@/services/itemService';
import { ItemType } from '@bizmanage/types';
import { ModalPortal } from '@/components/common/ModalPortal';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: any[];
  onSuccess?: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'success';

interface ColumnMapping {
  name: string;
  code: string;
  type: string;
  categoryName: string;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  openingStock: string;
  minStockAlert: string;
  storeDescription: string;
}

export function ImportInventoryModal({ isOpen, onClose, existingItems }: ImportInventoryModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    code: '',
    type: '',
    categoryName: '',
    unit: '',
    purchasePrice: '',
    salePrice: '',
    openingStock: '',
    minStockAlert: '',
    storeDescription: '',
  });

  const [validationResult, setValidationResult] = useState<{
    validItems: any[];
    invalidItems: { rowNumber: number; item: any; errors: string[] }[];
    duplicateItems: { rowNumber: number; item: any; reason: string }[];
  }>({
    validItems: [],
    invalidItems: [],
    duplicateItems: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateItems();
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState('');
  const [importStatusText, setImportStatusText] = useState('');

  if (!isOpen) return null;

  // 1. Download Sample Templates (CSV & JSON)
  const downloadTemplate = () => {
    const csvContent =
      'Item Name,SKU / Code,Type (Product/Service),Category,Unit,Purchase Cost,Sale Price,Opening Stock,Min Stock Alert,Description\n' +
      'Copper Wire 2.5mm,SKU-CW-25,Product,Electrical,Meters,120,150,50,10,High quality electrical wire\n' +
      'Plumbing Service,,Service,Plumbing,Hour,0,500,0,0,Standard hourly plumbing repair labor';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bizmanage_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJsonTemplate = () => {
    const templateData = [
      {
        "Item Name": "Copper Wire 2.5mm",
        "SKU / Code": "SKU-CW-25",
        "Type (Product/Service)": "Product",
        "Category": "Electrical",
        "Unit": "Meters",
        "Purchase Cost": 120,
        "Sale Price": 150,
        "Opening Stock": 50,
        "Min Stock Alert": 10,
        "Description": "High quality electrical wire"
      },
      {
        "Item Name": "Plumbing Service",
        "SKU / Code": "SAC-PLUMB",
        "Type (Product/Service)": "Service",
        "Category": "Plumbing",
        "Unit": "Hour",
        "Purchase Cost": 0,
        "Sale Price": 500,
        "Opening Stock": 0,
        "Min Stock Alert": 0,
        "Description": "Standard hourly plumbing repair labor"
      }
    ];
    downloadJson('bizmanage_inventory_template.json', templateData);
  };

  // Helper to match column headers automatically
  const autoMatchHeaders = (headers: string[]) => {
    const newMapping = { ...mapping };
    const fields: (keyof ColumnMapping)[] = [
      'name',
      'code',
      'type',
      'categoryName',
      'unit',
      'purchasePrice',
      'salePrice',
      'openingStock',
      'minStockAlert',
      'storeDescription',
    ];

    const matchPatterns: Record<keyof ColumnMapping, RegExp> = {
      name: /name|title|product|item/i,
      code: /code|sku|barcode|id/i,
      type: /type|product.*service/i,
      categoryName: /category|cat|group/i,
      unit: /unit|measure|pkg/i,
      purchasePrice: /purchase|cost|buy|pur.*price/i,
      salePrice: /sale|sell|retail|mrp|price/i,
      openingStock: /opening|qty|stock|quantity/i,
      minStockAlert: /min|alert|low|limit/i,
      storeDescription: /description|desc|notes|details/i,
    };

    fields.forEach((field) => {
      const match = headers.find((h) => matchPatterns[field].test(h));
      if (match) {
        newMapping[field] = match;
      }
    });

    if (!newMapping.name && headers.length > 0) {
      newMapping.name = headers[0];
    }

    setMapping(newMapping);
  };

  // 2. Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const isJson =
      selectedFile.name.toLowerCase().endsWith('.json') ||
      selectedFile.type === 'application/json';

    if (isJson) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          let itemsArray: any[] = [];

          if (Array.isArray(parsed)) {
            itemsArray = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.items)) itemsArray = parsed.items;
            else if (Array.isArray(parsed.rows)) itemsArray = parsed.rows;
            else if (Array.isArray(parsed.products)) itemsArray = parsed.products;
            else if (Array.isArray(parsed.data)) itemsArray = parsed.data;
            else if (Array.isArray(parsed.data?.items)) itemsArray = parsed.data.items;
            else {
              alert('JSON file does not contain a recognized list of items.');
              return;
            }
          }

          if (itemsArray.length === 0) {
            alert('The JSON file contains no item records.');
            return;
          }

          let headers: string[] = [];
          let dataRows: any[][] = [];

          if (Array.isArray(itemsArray[0])) {
            headers = itemsArray[0].map((h: any) => String(h).trim());
            dataRows = itemsArray.slice(1);
          } else {
            const headerSet = new Set<string>();
            itemsArray.forEach((item) => {
              if (item && typeof item === 'object') {
                Object.keys(item).forEach((k) => headerSet.add(k));
              }
            });
            headers = Array.from(headerSet);
            dataRows = itemsArray.map((item) => headers.map((h) => item[h]));
          }

          setSheetHeaders(headers);
          setSheetRows(dataRows);
          autoMatchHeaders(headers);
          setStep('map');
        } catch (err) {
          console.error(err);
          alert('Failed to parse JSON file. Please ensure it contains valid JSON.');
        }
      };
      reader.readAsText(selectedFile);
      return;
    }

    // Excel or CSV file
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonRows.length === 0) {
          alert('The uploaded file is empty.');
          return;
        }

        const headers = (jsonRows[0] || []).map((h) => String(h).trim());
        const dataRows = jsonRows.slice(1).filter((row) => {
          return Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '');
        });

        setSheetHeaders(headers);
        setSheetRows(dataRows);
        autoMatchHeaders(headers);
        setStep('map');
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Please upload a valid Excel, CSV, or JSON file.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const extension = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
        processFile(droppedFile);
      } else {
        alert('Please upload only Excel (.xlsx, .xls) or CSV (.csv) files.');
      }
    }
  };

  // 3. Handle Mapping & Validate Row Data
  const handleMapSubmit = () => {
    const valid: any[] = [];
    const invalid: any[] = [];
    const duplicates: any[] = [];

    const existingNames = new Set(existingItems.map((i) => i.name?.trim().toLowerCase()));
    const existingCodes = new Set(existingItems.map((i) => i.code?.trim().toLowerCase()).filter(Boolean));

    const nameMapIndex = sheetHeaders.indexOf(mapping.name);
    const codeMapIndex = mapping.code ? sheetHeaders.indexOf(mapping.code) : -1;
    const typeMapIndex = mapping.type ? sheetHeaders.indexOf(mapping.type) : -1;
    const catMapIndex = mapping.categoryName ? sheetHeaders.indexOf(mapping.categoryName) : -1;
    const unitMapIndex = mapping.unit ? sheetHeaders.indexOf(mapping.unit) : -1;
    const purchaseMapIndex = mapping.purchasePrice ? sheetHeaders.indexOf(mapping.purchasePrice) : -1;
    const saleMapIndex = mapping.salePrice ? sheetHeaders.indexOf(mapping.salePrice) : -1;
    const openingMapIndex = mapping.openingStock ? sheetHeaders.indexOf(mapping.openingStock) : -1;
    const minStockMapIndex = mapping.minStockAlert ? sheetHeaders.indexOf(mapping.minStockAlert) : -1;
    const descMapIndex = mapping.storeDescription ? sheetHeaders.indexOf(mapping.storeDescription) : -1;

    sheetRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const errors: string[] = [];

      const name = String(row[nameMapIndex] || '').trim();
      const code = codeMapIndex !== -1 ? String(row[codeMapIndex] || '').trim() : '';
      const typeRaw = typeMapIndex !== -1 ? String(row[typeMapIndex] || '').trim().toUpperCase() : 'PRODUCT';
      const categoryName = catMapIndex !== -1 ? String(row[catMapIndex] || '').trim() : '';
      const unit = unitMapIndex !== -1 ? String(row[unitMapIndex] || '').trim() : 'Pcs';
      const purchasePriceRaw = purchaseMapIndex !== -1 ? row[purchaseMapIndex] : 0;
      const salePriceRaw = saleMapIndex !== -1 ? row[saleMapIndex] : 0;
      const openingStockRaw = openingMapIndex !== -1 ? row[openingMapIndex] : 0;
      const minStockAlertRaw = minStockMapIndex !== -1 ? row[minStockMapIndex] : 0;
      const storeDescription = descMapIndex !== -1 ? String(row[descMapIndex] || '').trim() : '';

      // Standardize type
      let type: ItemType = ItemType.PRODUCT;
      if (typeRaw.includes('SERVICE') || typeRaw === 'S') {
        type = ItemType.SERVICE;
      }

      // Validations
      if (!name) {
        errors.push('Item Name is required');
      }

      const purchasePrice = Number(purchasePriceRaw) || 0;
      if (purchasePriceRaw !== undefined && isNaN(Number(purchasePriceRaw))) {
        errors.push('Purchase Cost must be a valid number');
      } else if (purchasePrice < 0) {
        errors.push('Purchase Cost cannot be negative');
      }

      const salePrice = Number(salePriceRaw) || 0;
      if (salePriceRaw !== undefined && isNaN(Number(salePriceRaw))) {
        errors.push('Sale Price must be a valid number');
      } else if (salePrice < 0) {
        errors.push('Sale Price cannot be negative');
      }

      const openingStock = Number(openingStockRaw) || 0;
      if (openingStockRaw !== undefined && isNaN(Number(openingStockRaw))) {
        errors.push('Opening Stock must be a valid number');
      } else if (openingStock < 0) {
        errors.push('Opening Stock cannot be negative');
      }

      const minStockAlert = Number(minStockAlertRaw) || 0;
      if (minStockAlertRaw !== undefined && isNaN(Number(minStockAlertRaw))) {
        errors.push('Min Stock Alert must be a valid number');
      } else if (minStockAlert < 0) {
        errors.push('Min Stock Alert cannot be negative');
      }

      const parsedItem = {
        name,
        code: code || null,
        type,
        categoryName: categoryName || null,
        unit: unit || 'Pcs',
        purchasePrice,
        salePrice,
        openingStock,
        minStockAlert,
        storeDescription: storeDescription || null,
      };

      if (errors.length > 0) {
        invalid.push({ rowNumber, item: parsedItem, errors });
      } else {
        // Check for duplicates
        const normalizedName = name.toLowerCase();
        const normalizedCode = code.toLowerCase();

        if (existingNames.has(normalizedName)) {
          duplicates.push({ rowNumber, item: parsedItem, reason: `Item with name "${name}" already exists` });
        } else if (code && existingCodes.has(normalizedCode)) {
          duplicates.push({ rowNumber, item: parsedItem, reason: `Item with SKU / Code "${code}" already exists` });
        } else {
          // Check for duplicate within the excel upload itself
          const isDuplicateInBatch = valid.some(
            (v) =>
              v.name.toLowerCase() === normalizedName ||
              (code && v.code && v.code.toLowerCase() === normalizedCode)
          );

          if (isDuplicateInBatch) {
            duplicates.push({
              rowNumber,
              item: parsedItem,
              reason: `Duplicate row in the file (matching Name or SKU)`,
            });
          } else {
            valid.push(parsedItem);
          }
        }
      }
    });

    setValidationResult({
      validItems: valid,
      invalidItems: invalid,
      duplicateItems: duplicates,
    });
    setStep('preview');
  };

  // 4. Run Batch Import Request with Chunking
  const handleImport = async () => {
    const totalItems = validationResult.validItems.length;
    if (totalItems === 0) return;
    setImportError('');
    setStep('importing');
    setImportProgress(5);
    setImportStatusText(`Preparing ${totalItems} items for secure upload...`);

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(totalItems / BATCH_SIZE);

    try {
      for (let b = 0; b < totalBatches; b++) {
        const start = b * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalItems);
        const batch = validationResult.validItems.slice(start, end);

        setImportStatusText(`Importing batch ${b + 1} of ${totalBatches} (${start + 1}–${end} of ${totalItems} items)...`);
        await bulkCreate.mutateAsync(batch);

        const progressPercent = Math.min(95, Math.round(((b + 1) / totalBatches) * 100));
        setImportProgress(progressPercent);
      }

      setImportProgress(100);
      setImportStatusText('All items imported successfully!');
      setStep('success');
    } catch (err: any) {
      console.error(err);
      setImportError(err.response?.data?.error?.message || 'Failed to import inventory items. Check your server logs or network.');
      setStep('preview');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-3xl bg-white border border-slate-200/90 rounded-3xl flex flex-col shadow-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Import Inventory Items
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a CSV or Excel spreadsheet to register inventory items in bulk.
                </p>
              </div>
            </div>
            {step !== 'importing' && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Wizard Steps indicator */}
          <div className="flex justify-center border-b border-slate-100 bg-slate-50/70 py-2.5 px-6 text-xs">
            <div className="flex items-center gap-6 select-none font-semibold">
              <span className={step === 'upload' ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                1. Upload File
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={step === 'map' ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                2. Map Columns
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={step === 'preview' ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                3. Review & Validate
              </span>
            </div>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {importError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            {/* STEP 1: UPLOAD FILE */}
            {step === 'upload' && (
              <div className="space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Drag & drop your Excel, CSV, or JSON file here</p>
                    <p className="text-xs text-slate-500 mt-0.5">Supports .xlsx, .xls, .csv, and .json formats up to 10MB</p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all mt-1"
                  >
                    Browse File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .json, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-purple-50/40 border border-purple-100 rounded-2xl gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Need an import sample template?</h4>
                      <p className="text-[11px] text-slate-500">Download a pre-formatted template with standard headers in CSV or JSON.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shrink-0 text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadJsonTemplate}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition-all shrink-0 text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5 text-purple-600" />
                      <span>JSON Template</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MAP COLUMNS */}
            {step === 'map' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-600 text-xs leading-relaxed">
                  <p>💡 Map the columns in your spreadsheet file to BizManage inventory system fields. Fields marked with <span className="text-rose-600 font-bold">*</span> are required.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Item Name <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SKU / Code */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">SKU / Code</label>
                    <select
                      value={mapping.code}
                      onChange={(e) => setMapping((prev) => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Item Type (Product/Service)</label>
                    <select
                      value={mapping.type}
                      onChange={(e) => setMapping((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Category</label>
                    <select
                      value={mapping.categoryName}
                      onChange={(e) => setMapping((prev) => ({ ...prev, categoryName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Purchase Cost */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Purchase Cost</label>
                    <select
                      value={mapping.purchasePrice}
                      onChange={(e) => setMapping((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sale Price */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Sale Price</label>
                    <select
                      value={mapping.salePrice}
                      onChange={(e) => setMapping((prev) => ({ ...prev, salePrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Opening Stock */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Opening Stock Level</label>
                    <select
                      value={mapping.openingStock}
                      onChange={(e) => setMapping((prev) => ({ ...prev, openingStock: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min Stock Alert */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Min Stock Alert Level</label>
                    <select
                      value={mapping.minStockAlert}
                      onChange={(e) => setMapping((prev) => ({ ...prev, minStockAlert: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Unit (e.g. Pcs, Box, Kg)</label>
                    <select
                      value={mapping.unit}
                      onChange={(e) => setMapping((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Store Description</label>
                    <select
                      value={mapping.storeDescription}
                      onChange={(e) => setMapping((prev) => ({ ...prev, storeDescription: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Spreadsheet Column (Optional)</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & PREVIEW */}
            {step === 'preview' && (
              <div className="space-y-6">
                {/* Validation Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Ready to Import</h4>
                    <p className="text-xl font-black text-emerald-600 mt-1">{validationResult.validItems.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Skipping (Duplicates)</h4>
                    <p className="text-xl font-black text-amber-600 mt-1">{validationResult.duplicateItems.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide">Errors</h4>
                    <p className="text-xl font-black text-rose-600 mt-1">{validationResult.invalidItems.length}</p>
                  </div>
                </div>

                {/* Duplicate Warnings Alert */}
                {validationResult.duplicateItems.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Duplicate protection active:</span> {validationResult.duplicateItems.length} items will be skipped during import because their Name or SKU already exists in your database or earlier rows in your file.
                    </div>
                  </div>
                )}

                {/* Ready to Import Items Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Preview of items to import ({validationResult.validItems.length})
                  </h4>
                  {validationResult.validItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center border border-slate-200 rounded-2xl bg-slate-50">
                      No valid items found to import. Please check file columns or edit mapping.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Name</th>
                            <th className="px-4 py-2.5">SKU / Code</th>
                            <th className="px-4 py-2.5">Category</th>
                            <th className="px-4 py-2.5 text-right font-mono">Cost</th>
                            <th className="px-4 py-2.5 text-right font-mono">Sale Price</th>
                            <th className="px-4 py-2.5 text-right font-mono">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {validationResult.validItems.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 font-medium text-slate-900 truncate max-w-44" title={item.name}>{item.name}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{item.code || '-'}</td>
                              <td className="px-4 py-2.5 text-slate-600">{item.categoryName || '-'}</td>
                              <td className="px-4 py-2.5 text-right font-mono">Rs. {Number(item.purchasePrice || 0).toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">Rs. {Number(item.salePrice || 0).toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-bold">{item.openingStock} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Rows with Errors Table */}
                {validationResult.invalidItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Rows with validation errors ({validationResult.invalidItems.length})
                    </h4>
                    <div className="border border-rose-200 rounded-2xl overflow-hidden max-h-44 overflow-y-auto bg-rose-50/40">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-rose-100/60 text-rose-800 font-bold border-b border-rose-200">
                          <tr>
                            <th className="px-4 py-2">Row #</th>
                            <th className="px-4 py-2">Item Name</th>
                            <th className="px-4 py-2">Validation Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100 bg-white/70">
                          {validationResult.invalidItems.map((err, i) => (
                            <tr key={i} className="hover:bg-rose-50/50">
                              <td className="px-4 py-2 text-rose-600 font-bold font-mono">Row {err.rowNumber}</td>
                              <td className="px-4 py-2 text-slate-600 truncate max-w-44">{err.item.name || '(Empty Name)'}</td>
                              <td className="px-4 py-2 text-rose-600 font-medium">{err.errors.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: IMPORTING */}
            {step === 'importing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {importStatusText || 'Uploading inventory in high-speed batches...'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Processing batches with automated category mapping & stock ledger initialization.
                  </p>
                </div>
                <div className="w-72 bg-slate-100 rounded-full h-2.5 overflow-hidden mt-1 border border-slate-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">{importProgress}% Completed</span>
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Import Completed Successfully!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Imported <span className="font-bold text-emerald-600">{validationResult.validItems.length}</span> new products/services successfully.
                  </p>
                  {validationResult.duplicateItems.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ({validationResult.duplicateItems.length} duplicate rows were automatically skipped).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          {step !== 'importing' && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-b-3xl">
              {step === 'upload' && (
                <>
                  <span className="text-[11px] text-slate-400 font-mono">Step 1 of 3</span>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 'map' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleMapSubmit}
                    disabled={!mapping.name}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      mapping.name
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    Preview Data <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 'preview' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('map')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Adjust Mapping
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={validationResult.validItems.length === 0}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      validationResult.validItems.length > 0
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    Confirm & Import <CheckCircle2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 'success' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center cursor-pointer shadow-xs"
                >
                  Close Wizard
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
