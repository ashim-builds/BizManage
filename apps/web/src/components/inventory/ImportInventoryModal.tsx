'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  AlertCircle,
} from 'lucide-react';
import { useBulkCreateItems } from '@/services/itemService';
import { ItemType } from '@bizmanage/types';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: any[];
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

  if (!isOpen) return null;

  // 1. Download Sample CSV Template
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

  // 2. Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
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

        // Auto-match mapping fields based on common words
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

        // Set default name fallback to the first header if no match found
        if (!newMapping.name && headers.length > 0) {
          newMapping.name = headers[0];
        }

        setMapping(newMapping);
        setStep('map');
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Please upload a valid Excel or CSV file.');
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

  // 4. Run Batch Import Request
  const handleImport = async () => {
    if (validationResult.validItems.length === 0) return;
    setImportError('');
    setStep('importing');
    setImportProgress(10);

    try {
      setImportProgress(40);
      await bulkCreate.mutateAsync(validationResult.validItems);
      setImportProgress(100);
      setStep('success');
    } catch (err: any) {
      console.error(err);
      setImportError(err.response?.data?.error?.message || 'Failed to import inventory items. Check your server logs.');
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" /> Import Inventory Items
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Upload a CSV or Excel spreadsheet to register inventory items in bulk.</p>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex justify-center border-b border-slate-800 bg-slate-900/40 py-2.5 px-6 text-[10px] sm:text-xs">
          <div className="flex items-center gap-6 select-none font-semibold">
            <span className={`${step === 'upload' ? 'text-blue-400' : 'text-slate-500'}`}>1. Upload File</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`${step === 'map' ? 'text-blue-400' : 'text-slate-500'}`}>2. Map Columns</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`${step === 'preview' ? 'text-blue-400' : 'text-slate-500'}`}>3. Review & Validate</span>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {importError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
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
                className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/60 hover:bg-slate-950/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Drag & drop your Excel or CSV file here</p>
                  <p className="text-[10px] text-slate-500 mt-1">Supports .xlsx, .xls, and .csv formats up to 10MB</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 hover:text-white hover:bg-slate-700 transition-all mt-1"
                >
                  Browse File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Need a spreadsheet layout template?</h4>
                    <p className="text-[10px] text-slate-500">Download a pre-formatted template with standard headers.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shrink-0 text-center"
                >
                  Download Template
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MAP COLUMNS */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800 text-slate-400 text-xs leading-relaxed">
                <p>💡 Map the columns in your spreadsheet file to BizManage inventory system fields. Fields marked with <span className="text-rose-400 font-bold">*</span> are required.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Item Name <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">SKU / Code</label>
                  <select
                    value={mapping.code}
                    onChange={(e) => setMapping((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Item Type (Product/Service)</label>
                  <select
                    value={mapping.type}
                    onChange={(e) => setMapping((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={mapping.categoryName}
                    onChange={(e) => setMapping((prev) => ({ ...prev, categoryName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Purchase Cost</label>
                  <select
                    value={mapping.purchasePrice}
                    onChange={(e) => setMapping((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Sale Price</label>
                  <select
                    value={mapping.salePrice}
                    onChange={(e) => setMapping((prev) => ({ ...prev, salePrice: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Opening Stock Level</label>
                  <select
                    value={mapping.openingStock}
                    onChange={(e) => setMapping((prev) => ({ ...prev, openingStock: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Min Stock Alert Level</label>
                  <select
                    value={mapping.minStockAlert}
                    onChange={(e) => setMapping((prev) => ({ ...prev, minStockAlert: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Unit (e.g. Pcs, Box, Kg)</label>
                  <select
                    value={mapping.unit}
                    onChange={(e) => setMapping((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Store Description</label>
                  <select
                    value={mapping.storeDescription}
                    onChange={(e) => setMapping((prev) => ({ ...prev, storeDescription: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ready to Import</h4>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{validationResult.validItems.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skipping (Duplicates)</h4>
                  <p className="text-xl font-bold text-amber-400 mt-1">{validationResult.duplicateItems.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Errors (Action Required)</h4>
                  <p className="text-xl font-bold text-rose-400 mt-1">{validationResult.invalidItems.length}</p>
                </div>
              </div>

              {/* Duplicate Warnings Alert */}
              {validationResult.duplicateItems.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate protection active:</span> {validationResult.duplicateItems.length} items will be skipped during import because their Name or SKU already matches items in your database or earlier rows in your file.
                  </div>
                </div>
              )}

              {/* Ready to Import Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Preview of items to import ({validationResult.validItems.length})</h4>
                {validationResult.validItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center border border-slate-800 rounded-xl bg-slate-900/40">No valid items found to import. Please check file columns or edit mapping.</p>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5">Name</th>
                          <th className="px-4 py-2.5">SKU / Code</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5 text-right font-mono">Cost</th>
                          <th className="px-4 py-2.5 text-right font-mono">Sale Price</th>
                          <th className="px-4 py-2.5 text-right font-mono">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                        {validationResult.validItems.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-800/20">
                            <td className="px-4 py-2.5 font-medium text-white truncate max-w-44" title={item.name}>{item.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{item.code || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-400">{item.categoryName || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-mono">Rs. {item.purchasePrice.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono">Rs. {item.salePrice.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{item.openingStock} {item.unit}</td>
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
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Rows with validation errors ({validationResult.invalidItems.length})
                  </h4>
                  <div className="border border-rose-500/20 rounded-xl overflow-hidden max-h-44 overflow-y-auto bg-rose-500/[0.02]">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-rose-950/20 text-rose-400 font-semibold border-b border-rose-500/20">
                        <tr>
                          <th className="px-4 py-2">Row #</th>
                          <th className="px-4 py-2">Item Name</th>
                          <th className="px-4 py-2">Validation Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-500/10">
                        {validationResult.invalidItems.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-950/10">
                            <td className="px-4 py-2 text-rose-400 font-bold font-mono">Row {err.rowNumber}</td>
                            <td className="px-4 py-2 text-slate-400 truncate max-w-44">{err.item.name || '(Empty Name)'}</td>
                            <td className="px-4 py-2 text-rose-400 font-semibold">{err.errors.join(', ')}</td>
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
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div>
                <p className="text-sm font-bold text-white">Encrypting and uploading inventory...</p>
                <p className="text-xs text-slate-500 mt-1">Computing E2EE ciphertexts and saving batch transaction safely.</p>
              </div>
              <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2 border border-slate-700">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Import Completed Successfully!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Imported <span className="font-bold text-emerald-400">{validationResult.validItems.length}</span> new products/services successfully.
                </p>
                {validationResult.duplicateItems.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ({validationResult.duplicateItems.length} duplicate rows were automatically skipped).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step !== 'importing' && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 rounded-b-2xl">
            {step === 'upload' && (
              <>
                <span className="text-[10px] text-slate-500">Step 1 of 3</span>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-800"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleMapSubmit}
                  disabled={!mapping.name}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    mapping.name
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Adjust Mapping
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={validationResult.validItems.length === 0}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    validationResult.validItems.length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
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
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 text-center"
              >
                Close Wizard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
