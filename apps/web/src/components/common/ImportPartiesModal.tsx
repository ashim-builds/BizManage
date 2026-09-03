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
  Users,
} from 'lucide-react';
import { useImportParties } from '@/services/utilityService';
import { PartyType } from '@bizmanage/types';
import { ModalPortal } from '@/components/common/ModalPortal';
import { downloadJson } from '@/lib/exportUtils';

interface ImportPartiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingParties: any[];
  onSuccess?: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'success';

interface ColumnMapping {
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  openingBalance: string;
  openingBalanceType: string;
}

export function ImportPartiesModal({
  isOpen,
  onClose,
  existingParties,
  onSuccess,
}: ImportPartiesModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    type: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    openingBalance: '',
    openingBalanceType: '',
  });

  const [validationResult, setValidationResult] = useState<{
    validParties: any[];
    invalidParties: { rowNumber: number; item: any; errors: string[] }[];
    duplicateParties: { rowNumber: number; item: any; reason: string }[];
  }>({
    validParties: [],
    invalidParties: [],
    duplicateParties: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPartiesMutation = useImportParties();
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  // 1. Download Sample Templates
  const downloadCsvTemplate = () => {
    const csvContent =
      'Party Name,Party Type (Customer/Supplier),Phone Number,Email,Address,PAN / VAT Number,Opening Balance,Balance Type (To Receive / To Pay)\n' +
      'Sharma Trading,Customer,9841234567,sharma@example.com,New Road, Kathmandu,100234567,5000,To Receive\n' +
      'Himalayan Suppliers,Supplier,9801987654,info@himalayan.com,Birgunj, Nepal,300987654,12000,To Pay';

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bizmanage_parties_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJsonTemplate = () => {
    const templateData = [
      {
        "Party Name": "Sharma Trading",
        "Party Type (Customer/Supplier)": "Customer",
        "Phone Number": "9841234567",
        "Email": "sharma@example.com",
        "Address": "New Road, Kathmandu",
        "PAN / VAT Number": "100234567",
        "Opening Balance": 5000,
        "Balance Type (To Receive / To Pay)": "To Receive"
      },
      {
        "Party Name": "Himalayan Suppliers",
        "Party Type (Customer/Supplier)": "Supplier",
        "Phone Number": "9801987654",
        "Email": "info@himalayan.com",
        "Address": "Birgunj, Nepal",
        "PAN / VAT Number": "300987654",
        "Opening Balance": 12000,
        "Balance Type (To Receive / To Pay)": "To Pay"
      }
    ];
    downloadJson('bizmanage_parties_template.json', templateData);
  };

  // Helper to auto-map party headers
  const autoMatchHeaders = (headers: string[]) => {
    const newMapping = { ...mapping };
    const fields: (keyof ColumnMapping)[] = [
      'name',
      'type',
      'phone',
      'email',
      'address',
      'taxNumber',
      'openingBalance',
      'openingBalanceType',
    ];

    const matchPatterns: Record<keyof ColumnMapping, RegExp> = {
      name: /name|party|customer|supplier|company|vendor/i,
      type: /type|role|kind/i,
      phone: /phone|mobile|tel|contact/i,
      email: /email|mail/i,
      address: /address|location|city|street/i,
      taxNumber: /pan|vat|tax|gst/i,
      openingBalance: /opening|balance|due|amount/i,
      openingBalanceType: /balance.*type|to.*receive|to.*pay|dr.*cr/i,
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

  // 2. Process Uploaded File (Excel, CSV, or JSON)
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
          let partiesArray: any[] = [];

          if (Array.isArray(parsed)) {
            partiesArray = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.parties)) partiesArray = parsed.parties;
            else if (Array.isArray(parsed.rows)) partiesArray = parsed.rows;
            else if (Array.isArray(parsed.data)) partiesArray = parsed.data;
            else if (Array.isArray(parsed.data?.parties)) partiesArray = parsed.data.parties;
            else {
              alert('JSON file does not contain a recognized list of parties.');
              return;
            }
          }

          if (partiesArray.length === 0) {
            alert('The JSON file contains no party records.');
            return;
          }

          let headers: string[] = [];
          let dataRows: any[][] = [];

          if (Array.isArray(partiesArray[0])) {
            headers = partiesArray[0].map((h: any) => String(h).trim());
            dataRows = partiesArray.slice(1);
          } else {
            const headerSet = new Set<string>();
            partiesArray.forEach((item) => {
              if (item && typeof item === 'object') {
                Object.keys(item).forEach((k) => headerSet.add(k));
              }
            });
            headers = Array.from(headerSet);
            dataRows = partiesArray.map((item) => headers.map((h) => item[h]));
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

  // 3. Validation & Parsing
  const runValidation = () => {
    if (!mapping.name) {
      alert('Please select a column for Party Name.');
      return;
    }

    const nameIdx = sheetHeaders.indexOf(mapping.name);
    const typeIdx = mapping.type ? sheetHeaders.indexOf(mapping.type) : -1;
    const phoneIdx = mapping.phone ? sheetHeaders.indexOf(mapping.phone) : -1;
    const emailIdx = mapping.email ? sheetHeaders.indexOf(mapping.email) : -1;
    const addressIdx = mapping.address ? sheetHeaders.indexOf(mapping.address) : -1;
    const taxNumberIdx = mapping.taxNumber ? sheetHeaders.indexOf(mapping.taxNumber) : -1;
    const balIdx = mapping.openingBalance ? sheetHeaders.indexOf(mapping.openingBalance) : -1;
    const balTypeIdx = mapping.openingBalanceType ? sheetHeaders.indexOf(mapping.openingBalanceType) : -1;

    const validParties: any[] = [];
    const invalidParties: { rowNumber: number; item: any; errors: string[] }[] = [];
    const duplicateParties: { rowNumber: number; item: any; reason: string }[] = [];

    const existingNames = new Set(existingParties.map((p) => p.name?.toLowerCase().trim()));
    const existingPhones = new Set(existingParties.filter((p) => p.phone).map((p) => p.phone.trim()));

    sheetRows.forEach((row, i) => {
      const rowNum = i + 2;
      const rawName = row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';

      const errors: string[] = [];
      if (!rawName) {
        errors.push('Party Name is required');
      }

      // Check duplicates
      const lowerName = rawName.toLowerCase();
      const rawPhone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';

      if (rawName && existingNames.has(lowerName)) {
        duplicateParties.push({
          rowNumber: rowNum,
          item: { name: rawName, phone: rawPhone },
          reason: 'Party with this name already exists in your business',
        });
        return;
      }

      if (rawPhone && existingPhones.has(rawPhone)) {
        duplicateParties.push({
          rowNumber: rowNum,
          item: { name: rawName, phone: rawPhone },
          reason: `Phone number ${rawPhone} already registered to another party`,
        });
        return;
      }

      // Parse type
      let type: PartyType = PartyType.CUSTOMER;
      if (typeIdx !== -1 && row[typeIdx]) {
        const t = String(row[typeIdx]).toUpperCase().trim();
        if (t.includes('SUPP') || t.includes('VEND')) {
          type = PartyType.SUPPLIER;
        }
      }

      // Parse balance
      let openingBalance = 0;
      if (balIdx !== -1 && row[balIdx]) {
        const num = parseFloat(String(row[balIdx]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) openingBalance = Math.abs(num);
      }

      let openingBalanceType = 'RECEIVABLE';
      if (balTypeIdx !== -1 && row[balTypeIdx]) {
        const bt = String(row[balTypeIdx]).toLowerCase();
        if (bt.includes('pay') || bt.includes('cr')) {
          openingBalanceType = 'PAYABLE';
        }
      }

      const partyData = {
        name: rawName,
        type,
        phone: rawPhone || null,
        email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : null,
        address: addressIdx !== -1 && row[addressIdx] ? String(row[addressIdx]).trim() : null,
        taxNumber: taxNumberIdx !== -1 && row[taxNumberIdx] ? String(row[taxNumberIdx]).trim() : null,
        openingBalance,
        openingBalanceType,
      };

      if (errors.length > 0) {
        invalidParties.push({ rowNumber: rowNum, item: partyData, errors });
      } else {
        validParties.push(partyData);
      }
    });

    setValidationResult({ validParties, invalidParties, duplicateParties });
    setStep('preview');
  };

  // 4. Submit Bulk Import
  const handleExecuteImport = async () => {
    if (validationResult.validParties.length === 0) {
      alert('No valid party records to import.');
      return;
    }

    setStep('importing');
    setImportProgress(10);
    setImportError('');

    try {
      setImportProgress(50);
      await importPartiesMutation.mutateAsync(validationResult.validParties);
      setImportProgress(100);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setImportError(
        err.response?.data?.error?.message ||
          'Failed to import parties. Please check party schemas or network connection.'
      );
      setStep('preview');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Import Parties</h3>
                <p className="text-xs text-slate-500 mt-0.5">Bulk upload customers and suppliers into directory</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold flex items-center gap-2">
            <span className={step === 'upload' ? 'text-blue-600 font-bold' : 'text-slate-500'}>1. Upload</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={step === 'map' ? 'text-blue-600 font-bold' : 'text-slate-500'}>2. Map Columns</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={step === 'preview' ? 'text-blue-600 font-bold' : 'text-slate-500'}>3. Validate & Import</span>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {importError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            {/* STEP 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Drag & drop your Excel, CSV, or JSON file</p>
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
                      <h4 className="text-xs font-bold text-slate-900">Need a sample parties template?</h4>
                      <p className="text-[11px] text-slate-500">Download formatted template in CSV or JSON.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={downloadCsvTemplate}
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

            {/* STEP 2: Map Columns */}
            {step === 'map' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                  Select which column in your file matches each BizManage party field. Party Name is required.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Party Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Party Name *</label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Select Column --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Party Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Type (Customer/Supplier)</label>
                    <select
                      value={mapping.type}
                      onChange={(e) => setMapping({ ...mapping, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Defaults to Customer --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Phone Number</label>
                    <select
                      value={mapping.phone}
                      onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Optional --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Optional --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Address / City</label>
                    <select
                      value={mapping.address}
                      onChange={(e) => setMapping({ ...mapping, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Optional --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* PAN/VAT */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">PAN / VAT Number</label>
                    <select
                      value={mapping.taxNumber}
                      onChange={(e) => setMapping({ ...mapping, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Optional --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Opening Balance */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Opening Balance</label>
                    <select
                      value={mapping.openingBalance}
                      onChange={(e) => setMapping({ ...mapping, openingBalance: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Defaults to 0 --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Balance Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Balance Type (To Receive/Pay)</label>
                    <select
                      value={mapping.openingBalanceType}
                      onChange={(e) => setMapping({ ...mapping, openingBalanceType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <option value="">-- Defaults to To Receive --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Preview */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <span className="text-xl font-bold text-emerald-600 block">
                      {validationResult.validParties.length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Ready to Import</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                    <span className="text-xl font-bold text-amber-600 block">
                      {validationResult.duplicateParties.length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">Skipped Duplicates</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                    <span className="text-xl font-bold text-rose-600 block">
                      {validationResult.invalidParties.length}
                    </span>
                    <span className="text-[11px] font-bold text-rose-700">Invalid Rows</span>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {validationResult.validParties.slice(0, 50).map((p, i) => (
                    <div key={i} className="px-4 py-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-slate-400 ml-2">({p.type})</span>
                        {p.phone && <span className="text-slate-500 ml-2">📞 {p.phone}</span>}
                      </div>
                      <span className="font-mono text-slate-700">
                        {p.openingBalance > 0 ? `Rs. ${p.openingBalance.toFixed(2)} (${p.openingBalanceType})` : 'Settled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Importing */}
            {step === 'importing' && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Importing Parties...</h4>
                <div className="w-48 bg-slate-100 rounded-full h-2 mx-auto overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* STEP 5: Success */}
            {step === 'success' && (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Parties Imported Successfully!</h4>
                <p className="text-xs text-slate-500">
                  {validationResult.validParties.length} parties were added to your directory.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            {step === 'map' ? (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Back
              </button>
            ) : step === 'preview' ? (
              <button
                type="button"
                onClick={() => setStep('map')}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {step === 'success' ? 'Close' : 'Cancel'}
              </button>

              {step === 'map' && (
                <button
                  type="button"
                  onClick={runValidation}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Continue
                </button>
              )}

              {step === 'preview' && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={validationResult.validParties.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Import {validationResult.validParties.length} Parties
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
