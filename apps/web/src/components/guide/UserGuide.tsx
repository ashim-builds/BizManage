'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Receipt,
  Users,
  Package,
  TrendingDown,
  TrendingUp,
  Wallet,
  Scale,
  Zap,
  Printer,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Languages,
} from 'lucide-react';

export type GuideLanguage = 'np' | 'en';

interface UserGuideProps {
  initialLanguage?: GuideLanguage;
  showLanguageSelector?: boolean;
}

export function UserGuide({ initialLanguage = 'np', showLanguageSelector = true }: UserGuideProps) {
  const [lang, setLang] = useState<GuideLanguage>(initialLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizmanage_guide_lang') as GuideLanguage;
      if (saved === 'np' || saved === 'en') {
        setLang(saved);
      }
    }
  }, []);

  const handleLangChange = (newLang: GuideLanguage) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_guide_lang', newLang);
    }
  };

  const isNepali = lang === 'np';

  // Guide Data Structure
  const guideSections = [
    {
      id: 'dashboard',
      icon: TrendingUp,
      badgeNp: 'ड्यासबोर्ड',
      badgeEn: 'Dashboard',
      titleNp: '१. ड्यासबोर्ड र नाफा-नोक्सान (Dashboard & Profit/Loss)',
      titleEn: '1. Executive Dashboard & Profit / Loss Overview',
      summaryNp: 'पसलको दैनिक बिक्री, सामान नाफा, कुल खरिद, खर्च र खुद नाफा बुझ्ने तरिका।',
      summaryEn: 'Understand real-time sales, sales margin, purchases, expenses, and net profit status.',
      stepsNp: [
        {
          title: 'नाफा वा नोक्सान स्थिति (Profit / Loss Status Card)',
          desc: 'ड्यासबोर्डको सबैभन्दा माथि "WE ARE IN PROFIT" (नाफामा) वा "WE ARE IN LOSS" (नोक्सानमा) ब्यानर देखिन्छ। यसले तपाईंको व्यापार अहिले नाफामा छ कि घाटामा छ भन्ने तुरुन्तै स्पष्ट पार्छ।',
        },
        {
          title: 'मुख्य ५ सूचकहरू (5 Core KPI Cards)',
          desc: '• Total Sales: आज वा छानिएको अवधिमा ग्राहकलाई बेचेको जम्मा रकम।\n• Sales Margin: बिकेको सामानबाट आएको कुल नाफा (बिक्री मूल्य - किनेको मूल्य)।\n• Purchases: सप्लायरबाट किनेको जम्मा सामानको खर्च।\n• Expenses: पसल भाडा, बिजुली, चिया खर्च आदि।\n• Total Balance: तपाईंको हातमा र बैंकमा भएको जम्मा रकम।',
        },
        {
          title: 'Today’s Live Sales Margin र COGS बुझ्ने तरिका',
          desc: '• Sold Cost (COGS): आज जति सामान बिक्यो, त्यो सामान तपाईंले किन्दा कति परेको थियो भन्ने हिसाब।\n• Sales Margin: आजको बिक्रीबाट COGS घटाएपछि बचेको खुद नाफा।',
        },
        {
          title: 'मिति फिल्टर गर्ने (Date Filters)',
          desc: 'Today (आज), Last 7 Days (पछिल्लो ७ दिन), This Month (यो महिना), वा क्यालेन्डरबाट चाहेको मिति छानेर हिसाब हेर्न सकिन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Profit / Loss Live Status Banner',
          desc: 'The top banner dynamically calculates and shows "WE ARE IN PROFIT" or "WE ARE IN LOSS", informing you of your net business performance in real time.',
        },
        {
          title: 'Core 5 KPI Cards',
          desc: '• Total Sales: Gross revenue collected from customers.\n• Sales Margin: Gross margin earned from sold goods (Net Sales - COGS).\n• Purchases: Total inventory procured from suppliers.\n• Expenses: Shop rent, electricity, refreshments, logistics, salaries.\n• Total Balance: Liquid cash in counter and bank balances.',
        },
        {
          title: 'Understanding Today’s Live Sales Margin & COGS',
          desc: '• Sold Cost (COGS): Original purchase cost of only the goods that were sold today.\n• Sales Margin: Net gross profit earned on today’s sales.',
        },
        {
          title: 'Dynamic Date Filtering',
          desc: 'Switch between Today, Last 7 Days, This Month, All Time, or select custom start and end dates from the calendar pickers.',
        },
      ],
      quickLink: '/dashboard',
      quickLinkTextNp: 'ड्यासबोर्ड हेर्नुहोस् →',
      quickLinkTextEn: 'View Dashboard →',
    },
    {
      id: 'parties',
      icon: Users,
      badgeNp: 'पार्टी खाता',
      badgeEn: 'Parties',
      titleNp: '२. ग्राहक र सप्लायर (Parties: Customers & Suppliers)',
      titleEn: '2. Managing Parties (Customers & Suppliers)',
      summaryNp: 'ग्राहक र सप्लायरको नाम, फोन नम्बर, PAN/VAT र पुरानो बाँकी हिसाब राख्ने तरिका।',
      summaryEn: 'How to create customer and supplier profiles, assign PAN/VAT, and track ledger balances.',
      stepsNp: [
        {
          title: 'नयाँ पार्टी थप्ने (Add New Party)',
          desc: 'बायाँ पट्टीको "Parties" मेनुमा जानुहोस् र "+ Add Party" बटन थिच्नुहोस्।',
        },
        {
          title: 'ग्राहक (Customer) वा सप्लायर (Supplier) छान्ने',
          desc: '• Customer: तपाईंको पसलबाट सामान किन्ने ग्राहक।\n• Supplier: तपाईंलाई सामान बेच्ने होलसेलर वा कम्पनी।',
        },
        {
          title: 'आवश्यक विवरण भर्ने',
          desc: '• Party Name: ग्राहक वा पसलको नाम।\n• Phone Number: सम्पर्क नम्बर (SMS वा बिल पठाउन सजिलो हुन्छ)।\n• PAN/VAT Number: यदि भ्याट बिल काट्नुपर्ने छ भने अनिवार्य रूपमा ९ अंकको PAN नम्बर राख्नुहोस्।\n• Opening Balance: यदि ग्राहकले पहिलेदेखि नै तिर्न बाँकी रकम छ भने "To Receive" मा राख्नुहोस्, यदि सप्लायरलाई तिर्न बाँकी छ भने "To Pay" मा राख्नुहोस्।',
        },
        {
          title: 'खाता र स्टेटमेन्ट हेर्ने (Party Ledger)',
          desc: 'कुनै पनि पार्टीमा क्लिक गरेर उसको सम्पूर्ण कारोबार, बिल, पेमेन्ट र बाँकी ब्यालेन्स हेर्न र प्रिन्ट गर्न सकिन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Adding a New Party',
          desc: 'Navigate to the "Parties" menu from the sidebar and click "+ Add Party".',
        },
        {
          title: 'Party Type Selection',
          desc: '• Customer: Buyers purchasing goods or services from your business.\n• Supplier: Vendors providing you with wholesale merchandise and raw materials.',
        },
        {
          title: 'Fill Contact & Tax Info',
          desc: '• Name & Phone: Primary contact details for sending receipts.\n• PAN / VAT Number: 9-digit tax identification for VAT invoices.\n• Opening Balance: Enter opening balance ("To Receive" for customer dues, "To Pay" for supplier payables).',
        },
        {
          title: 'Party Ledger & Statement Export',
          desc: 'Click on any party to view their real-time transaction history, invoice records, payment vouchers, and export/print account statements.',
        },
      ],
      quickLink: '/parties',
      quickLinkTextNp: 'पार्टी सूची खोल्नुहोस् →',
      quickLinkTextEn: 'Open Parties →',
    },
    {
      id: 'inventory',
      icon: Package,
      badgeNp: 'सामान / स्टक',
      badgeEn: 'Inventory',
      titleNp: '३. सामान र स्टक व्यवस्थापन (Items & Inventory)',
      titleEn: '3. Items & Inventory Management',
      summaryNp: 'सामानको नाम, खरिद मूल्य, बिक्री मूल्य, एकाइ र स्टक जोड्ने तरिका।',
      summaryEn: 'Set up products, purchase and selling prices, units, opening stock, and low stock alerts.',
      stepsNp: [
        {
          title: 'नयाँ सामान थप्ने (Add New Item)',
          desc: 'बायाँ पट्टीको "Inventory" मा गएर "+ Add Item" बटन थिच्नुहोस्।',
        },
        {
          title: 'सामानको विवरण (Item Details)',
          desc: '• Item Name: सामानको नाम (जस्तै: Wai Wai Noodles, Cotton Shirt)।\n• Item Code / SKU: बारकोड वा सामानको कोड (ऐच्छिक)।\n• Unit: सामान नाप्ने एकाइ (Pcs, Kg, Ltr, Box, Dzn, Meter आदि)।\n• Category: सामानको वर्ग।',
        },
        {
          title: 'मूल्य र स्टक (Pricing & Stock)',
          desc: '• Purchase Price (किनेको मूल्य): सामान किन्दा परेको मूल्य। यसैबाट नाफा (Margin) हिसाब हुन्छ।\n• Selling Price (बेच्ने मूल्य): ग्राहकलाई बेच्ने मूल्य।\n• Opening Stock: पसलमा अहिले भएको सामानको संख्या।\n• Low Stock Alert: कति पिसमा पुगेपछि सिस्टमले सूचना दिने (जस्तै: ५ पिस)।',
        },
        {
          title: 'स्टक स्वतः घट्ने र बढ्ने',
          desc: 'बिक्री बिल काट्दा स्टक स्वतः घट्छ र खरिद बिल चढाउँदा स्टक स्वतः बढ्छ। हातले मिलाइरहनु पर्दैन।',
        },
      ],
      stepsEn: [
        {
          title: 'Creating a New Product Item',
          desc: 'Go to the "Inventory" section in the sidebar and click "+ Add Item".',
        },
        {
          title: 'Item Master Information',
          desc: '• Item Name: Product title (e.g., Samsung Galaxy Charger, Cotton Shirt).\n• SKU / Barcode: Product code for quick barcode scanning.\n• Unit: Measurement unit (Pcs, Kg, Ltr, Box, Dzn, Meter).\n• Category: Grouping category for reporting.',
        },
        {
          title: 'Pricing & Initial Stock',
          desc: '• Purchase Price: Cost price from supplier (used to calculate Margin & COGS).\n• Selling Price: Standard retail or wholesale price for sales.\n• Opening Stock: Current quantity available in store.\n• Low Stock Alert: Threshold below which system triggers a restock reminder.',
        },
        {
          title: 'Automatic Stock Deduction & Restock',
          desc: 'Inventory counts automatically decrement upon issuing sales invoices and increment when logging purchase bills.',
        },
      ],
      quickLink: '/inventory',
      quickLinkTextNp: 'इन्भेन्टरी खोल्नुहोस् →',
      quickLinkTextEn: 'Open Inventory →',
    },
    {
      id: 'sales',
      icon: Receipt,
      badgeNp: 'बिक्री बिल',
      badgeEn: 'Sales Billing',
      titleNp: '४. बिक्री बिल काट्ने तरिका (Sales Invoices & Billing)',
      titleEn: '4. Creating Sales Invoices & Billing',
      summaryNp: 'साधारण बिल (Normal Bill) र भ्याट बिल (VAT Bill) काट्ने, डिस्काउन्ट दिने र प्रिन्ट गर्ने।',
      summaryEn: 'Issue normal receipts or 13% VAT tax invoices, apply discounts, and print bills.',
      stepsNp: [
        {
          title: 'बिक्री इन्ट्री सुरु गर्ने',
          desc: 'Transactions -> Sales Invoices मा गएर "+ Create Sales Invoice" थिच्नुहोस् वा माथिको "⚡ Quick Entry" बटन प्रयोग गर्नुहोस्।',
        },
        {
          title: 'Normal Bill र VAT Bill को नियम',
          desc: '• Normal Bill (साधारण बिल): यदि "VAT Bill" टिक गर्नुभएन भने बिलमा PAN नम्बर देखिँदैन (सामान्य बिल)।\n• VAT Bill (कर बीजक): यदि "VAT Bill" टिक गर्नुभयो भने तपाईंको र ग्राहकको PAN/VAT नम्बर स्वतः बिलमा देखिन्छ र १३% भ्याट हिसाब हुन्छ।',
        },
        {
          title: 'सामान र ग्राहक छान्ने',
          desc: '• Customer: ग्राहकको नाम छान्नुहोस् वा नयाँ थप्नुहोस् (वा Walk-in Customer राख्नुहोस्)।\n• Items: सामान छानेर Quantity (संख्या) र Discount (छुट) राख्नुहोस्।',
        },
        {
          title: 'नगद वा उधारो भुक्तानी',
          desc: '• ग्राहकले तुरुन्तै पैसा दिएमा "Received Amount" मा रकम लेख्नुहोस् (Bill Status = PAID)।\n• यदि उधारो हो भने Received Amount मा ० राख्नुहोस् (Bill Status = UNPAID, र ग्राहकको खातामा रकम स्वतः चढ्छ)।',
        },
        {
          title: 'प्रिन्ट / डाउनलोड',
          desc: 'बिल सेभ गरेपछि "Print / Export" थिचेर सिधै प्रिन्टरबाट बिल निकाल्न वा PDF सेभ गर्न सक्नुहुन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Initiating a Sale',
          desc: 'Go to Transactions -> Sales Invoices -> "+ Create Sales Invoice" or click the "⚡ Quick Entry" button in the top bar.',
        },
        {
          title: 'Normal Bill vs VAT Bill Rule',
          desc: '• Normal Bill (Unchecked): Standard receipt without PAN numbers displayed.\n• VAT Bill (Checked): Official Tax Invoice displaying 9-digit PAN numbers for both business and customer, with 13% VAT breakdown.',
        },
        {
          title: 'Selecting Party & Line Items',
          desc: '• Select an existing customer or Walk-in Customer.\n• Add inventory items, specify quantities, and apply unit discounts.',
        },
        {
          title: 'Payment Status (Cash vs Credit)',
          desc: '• Full cash payment: Enter amount in Received Amount (marked as PAID).\n• Credit sale (उधारो): Leave Received Amount empty or 0 (marked as UNPAID and posted to customer ledger).',
        },
        {
          title: 'Printing & Invoicing',
          desc: 'Click "Print Tax Invoice / Receipt" for a high-contrast, ink-friendly printable bill layout.',
        },
      ],
      quickLink: '/transactions/sales',
      quickLinkTextNp: 'बिक्री बिलमा जानुहोस् →',
      quickLinkTextEn: 'Go to Sales Invoices →',
    },
    {
      id: 'purchases',
      icon: Package,
      badgeNp: 'खरिद बिल',
      badgeEn: 'Purchases',
      titleNp: '५. खरिद बिल चढाउने तरिका (Purchase Bills & Stock In)',
      titleEn: '5. Purchase Bills & Restocking',
      summaryNp: 'सप्लायरबाट सामान किन्दा बिल चढाउने र स्टक स्वतः बढाउने तरिका।',
      summaryEn: 'Record supplier purchase invoices, auto-increment inventory stock, and track payables.',
      stepsNp: [
        {
          title: 'खरिद बिल इन्ट्री',
          desc: 'Transactions -> Purchase Bills -> "+ Create Purchase Bill" मा जानुहोस्।',
        },
        {
          title: 'सप्लायर र सामान छान्ने',
          desc: 'सामान किनेको सप्लायरको नाम छान्नुहोस् र किनेको सामान, संख्या (Qty) र खरिद मूल्य लेख्नुहोस्।',
        },
        {
          title: 'स्टक र हिसाब स्वतः अपडेट',
          desc: 'खरिद बिल सेभ हुनासाथ इन्भेन्टरीमा सामानको संख्या (Stock) स्वतः थपिन्छ र सप्लायरलाई तिर्न बाँकी रकम खातामा जोडिन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Recording Purchases',
          desc: 'Go to Transactions -> Purchase Bills -> "+ Create Purchase Bill".',
        },
        {
          title: 'Select Supplier & Items',
          desc: 'Choose the vendor and add the procured line items along with purchase rates and quantities.',
        },
        {
          title: 'Automatic Stock & Ledger Sync',
          desc: 'Upon saving, your inventory stock level increases immediately and supplier payable balance is updated.',
        },
      ],
      quickLink: '/transactions/purchases',
      quickLinkTextNp: 'खरिद बिलमा जानुहोस् →',
      quickLinkTextEn: 'Go to Purchase Bills →',
    },
    {
      id: 'payments',
      icon: Wallet,
      badgeNp: 'रकम लेनदेन',
      badgeEn: 'Payments',
      titleNp: '६. रकम भुक्तानी र प्राप्ति (Payment In & Payment Out)',
      titleEn: '6. Payments In (Receipts) & Payments Out (Vouchers)',
      summaryNp: 'ग्राहकले उधारो तिर्दा र सप्लायरलाई पैसा बुझाउँदा भौचर चढाउने तरिका।',
      summaryEn: 'Record customer receipt payments and supplier settlement vouchers.',
      stepsNp: [
        {
          title: 'Payment In (ग्राहकबाट रकम प्राप्त)',
          desc: 'उधारो लगेको ग्राहकले पैसा बुझाउँदा Transactions -> Payment In मा जानुहोस्। ग्राहकको नाम र रकम छानेर सेभ गर्नुहोस्। ग्राहकको उधारो स्वतः घट्छ।',
        },
        {
          title: 'Payment Out (सप्लायरलाई भुक्तानी)',
          desc: 'सप्लायरलाई सामानको पैसा तिर्दा Transactions -> Payment Out मा जानुहोस्। सप्लायरको नाम र तिरेको रकम लेख्नुहोस्। सप्लायरलाई तिर्न बाँकी रकम घट्छ।',
        },
        {
          title: 'भुक्तानी माध्यम (Payment Mode)',
          desc: 'नगद (Cash), बैंक (Bank Transfer), वा Fonepay/QR छानेर कुन खातामा पैसा आयो वा गयो मिलाउन सकिन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Payment In (Customer Receipts)',
          desc: 'When a customer settles their due balance, go to Transactions -> Payment In. Select the customer, amount, and payment mode.',
        },
        {
          title: 'Payment Out (Supplier Vouchers)',
          desc: 'When you pay a supplier for procured inventory, go to Transactions -> Payment Out and log the settlement.',
        },
        {
          title: 'Payment Mode',
          desc: 'Choose between Cash Counter, Bank Account, or QR / Digital Wallet.',
        },
      ],
      quickLink: '/transactions/payment-in',
      quickLinkTextNp: 'भुक्तानी इन्ट्रीमा जानुहोस् →',
      quickLinkTextEn: 'Go to Payments →',
    },
    {
      id: 'expenses',
      icon: TrendingDown,
      badgeNp: 'खर्च व्यवस्थापन',
      badgeEn: 'Expenses',
      titleNp: '७. पसलको खर्च र अन्य आम्दानी (Expenses & Other Income)',
      titleEn: '7. Expense Tracking & Additional Income',
      summaryNp: 'भाडा, बिजुली, चिया खर्च, तलब रेकर्ड गर्ने र नाफाबाट स्वतः घटाउने।',
      summaryEn: 'Track shop rent, utilities, tea refreshments, staff salaries, and commission income.',
      stepsNp: [
        {
          title: 'खर्च रेकर्ड गर्ने (Add Expense)',
          desc: 'बायाँ पट्टीको "Expenses" मा जानुहोस् र "+ Record Expense" थिच्नुहोस्।',
        },
        {
          title: 'खर्चको विवरण',
          desc: 'खर्चको वर्ग (Rent, Electricity, Tea/Food, Salary, Transport), रकम र तिरेको खाता (Cash/Bank) छान्नुहोस्।',
        },
        {
          title: 'नाफामा प्रभाव',
          desc: 'तपाईंले चढाएको खर्च स्वतः Profit & Loss Statement मा "Operating Expenses" मा जोडिन्छ र Net Profit बाट घट्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Recording an Expense',
          desc: 'Navigate to "Expenses" in the sidebar and click "+ Record Expense".',
        },
        {
          title: 'Expense Details',
          desc: 'Select expense category (Rent, Electricity, Food/Refreshment, Salary, Logistics), enter amount and payment account.',
        },
        {
          title: 'Impact on Profit & Loss',
          desc: 'All recorded expenses automatically feed into your Operating Expenses line item to compute accurate Net Profit.',
        },
      ],
      quickLink: '/expenses',
      quickLinkTextNp: 'खर्च खाता खोल्नुहोस् →',
      quickLinkTextEn: 'Open Expenses →',
    },
    {
      id: 'profit-loss',
      icon: Scale,
      badgeNp: 'नाफा-नोक्सान',
      badgeEn: 'Profit & Loss',
      titleNp: '८. नाफा-नोक्सान रिपोर्ट र प्रिन्ट (Profit & Loss Statement)',
      titleEn: '8. Profit & Loss Statement & Print Exports',
      summaryNp: 'पूरा हिसाब-किताब, ग्रस मार्जिन, खर्च र खुद नाफाको औपचारिक रिपोर्ट हेर्ने र प्रिन्ट गर्ने।',
      summaryEn: 'Generate official accounting statements comparing Gross Sales, Returns, COGS, Margins, Expenses, and Net Earnings.',
      stepsNp: [
        {
          title: 'Profit & Loss पृष्ठ खोल्ने',
          desc: 'बायाँ पट्टीको "Profit & Loss" मेनुमा जानुहोस्।',
        },
        {
          title: 'हिसाबको क्रम बुझ्ने (Accounting Flow)',
          desc: '१. Gross Sales Revenue (जम्मा बिक्री)\n२. (-) Sales Returns (फिर्ता भएको बिक्री)\n३. (=) Net Sales Revenue (खुद बिक्री)\n४. (-) Cost of Goods Sold / COGS (बिकेको सामानको खरिद मूल्य)\n५. (=) Gross Sales Margin (सामानको नाफा)\n६. (-) Operating Expenses (पसलको खर्च)\n७. (=) Net Profit / Loss (खर्च कटाएर बाँकी बचेको खुद नाफा)',
        },
        {
          title: 'प्रिन्ट र रिपोर्ट डाउनलोड (Print / Export)',
          desc: 'माथिको "Print / Export" बटन थिच्दा मिति फिल्टर हटेर सफा, व्यावसायिक A4 ढाँचाको स्टेटमेन्ट प्रिन्ट हुन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Accessing Profit & Loss Page',
          desc: 'Click "Profit & Loss" in the sidebar navigation.',
        },
        {
          title: 'Understanding the Financial Statement Breakdown',
          desc: '1. (+) Gross Sales Revenue\n2. (-) Sales Returns & Credit Notes\n3. (=) Net Sales Revenue\n4. (-) Cost of Goods Sold (COGS)\n5. (=) Gross Sales Margin\n6. (-) Operating Expenses\n7. (=) Net Profit / (Loss)',
        },
        {
          title: 'Clean Print & PDF Export',
          desc: 'Click "Print / Export" to produce an ink-friendly, black-and-white formal financial report complete with statement period and company header.',
        },
      ],
      quickLink: '/profit-loss',
      quickLinkTextNp: 'Profit & Loss हेर्नुहोस् →',
      quickLinkTextEn: 'View Profit & Loss →',
    },
    {
      id: 'quick-entry',
      icon: Zap,
      badgeNp: 'सर्टकट',
      badgeEn: 'Quick Entry',
      titleNp: '९. छिटो काम गर्ने सर्टकटहरू (Quick Entry & Tips)',
      titleEn: '9. Quick Entry (⚡) & Pro Tips',
      summaryNp: 'कुनै पनि पानामा रहँदा केही सेकेन्डमै नयाँ बिक्री, खरिद वा भुक्तानी इन्ट्री गर्ने तरिका।',
      summaryEn: 'Speed up daily operations with the global quick-entry modal and keyboard shortcuts.',
      stepsNp: [
        {
          title: '⚡ Quick Entry बटन',
          desc: 'स्क्रिनको सबैभन्दा माथि दायाँ रहेको निलो "⚡ Quick Entry" बटन थिच्नुहोस्।',
        },
        {
          title: 'एकै ठाउँबाट सबै काम',
          desc: 'त्यहाँबाट तपाईंले पेज नछोडीकनै सिधै Sales Invoice, Purchase Bill, Payment In, वा Expense चढाउन सक्नुहुन्छ।',
        },
        {
          title: 'सुरक्षित डाटा ब्याकअप (Backup)',
          desc: 'Settings -> Backup Data मा गएर आफ्नो सम्पूर्ण व्यापारको डाटा सुरक्षित रूपमा डाउनलोड गरी कम्प्युटरमा राख्न सक्नुहुन्छ।',
        },
      ],
      stepsEn: [
        {
          title: '⚡ Quick Entry Trigger',
          desc: 'Click the blue "⚡ Quick Entry" button situated at the top header bar anywhere across the app.',
        },
        {
          title: 'All-In-One Modal',
          desc: 'Instantly create Sales Invoices, Purchase Bills, Customer Receipts, or Record Expenses without leaving your current screen.',
        },
        {
          title: 'Encrypted Data Backups',
          desc: 'Navigate to Settings -> Backup & Data Export anytime to download an offline JSON backup archive of your business records.',
        },
      ],
      quickLink: '/settings?tab=backup',
      quickLinkTextNp: 'ब्याकअप सेटिङ्स →',
      quickLinkTextEn: 'Backup Settings →',
    },
    {
      id: 'pos-billing',
      icon: Zap,
      badgeNp: 'पीओएस बिलिङ',
      badgeEn: 'POS Billing',
      titleNp: '१०. पीओएस क्विक बिलिङ र थर्मल रसिद (POS Counter Mode & Thermal Bill)',
      titleEn: '10. POS Counter Mode & Thermal Receipt Printing',
      summaryNp: 'काउन्टरमा बारकोड स्क्यान गरी सेकेन्डमै बिल काट्ने, फिर्ता रकम हिसाब गर्ने र थर्मल प्रिन्टरबाट बिल निकाल्ने तरिका।',
      summaryEn: 'High-speed counter billing with hardware barcode scanning, live stock deduction, cash change calculator, and thermal printing.',
      stepsNp: [
        {
          title: 'बारकोड स्क्यानिङ र स्वचालित थप (Barcode Scanning)',
          desc: 'काउन्टरमा सामानको बारकोड स्क्यान गर्दा वा Enter थिच्दा सामान सिधै कार्टमा जोडिन्छ। खोज्दा पहिलो, बिचको वा अन्तिम नामको कुनै पनि शब्द टाइप गरेर सजिलै फेला पार्न सकिन्छ।',
        },
        {
          title: 'लाइभ स्टक र ब्यालेन्स घट्ने (Live Stock Tracking)',
          desc: 'प्रत्येक सामानको कार्डमा अहिले भएको स्टक (जस्तै: Stock: 50 Pcs) देखिन्छ। कार्टमा सामान थप्दै जाँदा स्टक संख्या स्वतः घट्छ (जस्तै: 2 in cart, Stock: 48 Pcs)।',
        },
        {
          title: 'फिर्ता रकम हिसाब (Cash Change Calculator)',
          desc: 'ग्राहकले दिएको नगद रकम (Cash Received) टाइप गर्नासाथ ग्राहकलाई फिर्ता दिनुपर्ने रकम (Change Return) स्वतः हिसाब हुन्छ।',
        },
        {
          title: '८० मिमी / ५८ मिमी थर्मल बिल प्रिन्ट (POS Thermal Print)',
          desc: 'Checkout थिच्नासाथ ८० मिमी वा ५८ मिमी थर्मल रसिद खुल्छ, जसमा पसलको नाम, PAN/VAT, क्यूआर कोड, बारकोड र विस्तृत हिसाब प्रिन्ट हुन्छ।',
        },
      ],
      stepsEn: [
        {
          title: 'Hardware Barcode Scanning & Smart Search',
          desc: 'Scanning a barcode SKU or pressing Enter automatically matches products and adds them to cart. Multi-word search matches any first, middle, or last name words in any order.',
        },
        {
          title: 'Live Stock Tracking & Cart Deduction',
          desc: 'Product cards show live available inventory (e.g. Stock: 50 Pcs). Adding units to cart dynamically deducts available stock in real-time (e.g. 2 in cart, Stock: 48 Pcs).',
        },
        {
          title: 'Cash Change Return Calculator',
          desc: 'Enter the cash amount tendered by the customer to automatically calculate exact change due.',
        },
        {
          title: '80mm / 58mm Thermal Receipt Printing',
          desc: 'Instantly generates authentic thermal receipt rolls complete with Store Header, PAN/VAT, Verification QR code, Barcode graphic, and line item breakdown.',
        },
      ],
      quickLink: '/transactions/pos',
      quickLinkTextNp: 'POS Counter Mode खोल्नुहोस् →',
      quickLinkTextEn: 'Open POS Counter →',
    },
  ];

  // Filtered sections by search and category
  const filteredSections = guideSections.filter((sec) => {
    const matchesCategory = activeCategory === 'all' || sec.id === activeCategory;
    const title = isNepali ? sec.titleNp : sec.titleEn;
    const summary = isNepali ? sec.summaryNp : sec.summaryEn;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      title.toLowerCase().includes(query) ||
      summary.toLowerCase().includes(query) ||
      (isNepali
        ? sec.stepsNp.some((s) => s.title.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query))
        : sec.stepsEn.some((s) => s.title.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query)));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP HEADER & LANGUAGE SELECTOR BAR */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {isNepali ? 'BizManage उपयोग निर्देशिका (User Guide)' : 'BizManage Official User Guide'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNepali
                  ? 'सफ्टवेयर प्रयोग गर्ने सजिलो र सम्पूर्ण गाइड। तल दिएका चरणहरू हेरेर सजिलै व्यापार चलाउनुहोस्।'
                  : 'Complete step-by-step documentation to run, manage, and scale your business operations.'}
              </p>
            </div>
          </div>

          {/* LANGUAGE SELECTOR TOGGLE BUTTONS */}
          {showLanguageSelector && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => handleLangChange('np')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isNepali
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇳🇵</span> नेपाली (Nepali)
              </button>
              <button
                onClick={() => handleLangChange('en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isNepali
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇬🇧</span> English
              </button>
            </div>
          )}
        </div>

        {/* SEARCH BAR & QUICK CATEGORY CHIPS */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isNepali
                  ? 'कुनै पनि शीर्षक खोज्नुहोस् (जस्तै: भ्याट बिल, पार्टी, स्टक, नाफा-नोक्सान, पेमेन्ट)...'
                  : 'Search guide topics (e.g. VAT invoice, inventory, margin, payment in, expenses)...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Quick topic buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isNepali ? 'सबै विषयहरू' : 'All Topics'}
            </button>
            {guideSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveCategory(sec.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeCategory === sec.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isNepali ? sec.badgeNp : sec.badgeEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. GUIDE SECTIONS LIST */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              {isNepali ? 'कुनै नतिजा भेटिएन' : 'No matching guide topic found'}
            </h3>
            <p className="text-xs text-slate-400">
              {isNepali
                ? 'कृपया अर्को शब्द खोज्नुहोस् वा "सबै विषयहरू" बटन थिच्नुहोस्।'
                : 'Try searching with different keywords or reset to All Topics.'}
            </p>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const Icon = sec.icon;
            const steps = isNepali ? sec.stepsNp : sec.stepsEn;
            const title = isNepali ? sec.titleNp : sec.titleEn;
            const summary = isNepali ? sec.summaryNp : sec.summaryEn;
            const linkText = isNepali ? sec.quickLinkTextNp : sec.quickLinkTextEn;

            return (
              <div
                key={sec.id}
                id={`guide-${sec.id}`}
                className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {isNepali ? sec.badgeNp : sec.badgeEn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{summary}</p>
                    </div>
                  </div>

                  {sec.quickLink && (
                    <Link
                      href={sec.quickLink}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all shrink-0 self-start"
                    >
                      {linkText}
                    </Link>
                  )}
                </div>

                {/* Steps List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-blue-500/30">
                          {sIdx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-200">{st.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 whitespace-pre-line pl-7 leading-relaxed">
                        {st.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. HELP & SUPPORT FOOTER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-white text-sm">
            {isNepali ? 'अझै केही सहयोग चाहिन्छ?' : 'Need additional assistance?'}
          </h4>
          <p className="text-slate-400 mt-0.5">
            {isNepali
              ? 'हाम्रो सहायता टिम तपाईंको व्यापार प्रवर्द्धन गर्न सधैं तयार छ।'
              : 'Our customer support team is available to assist your business setup.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings?tab=profile"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700"
          >
            {isNepali ? 'व्यापार प्रोफाइल मिलाउनुहोस्' : 'Business Profile'}
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/20"
          >
            {isNepali ? 'ड्यासबोर्ड जानुहोस् →' : 'Go to Dashboard →'}
          </Link>
        </div>
      </div>
    </div>
  );
}
