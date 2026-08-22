import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  FileText,
  Server,
  Database,
  EyeOff,
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy - BizManage SaaS",
  description:
    "Learn how BizManage protects your multi-tenant enterprise data, respects your privacy, and ensures compliance with global security and data protection standards.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 15, 2026";

  const keyGuarantees = [
    {
      icon: Database,
      title: "100% Data Ownership",
      desc: "Your business, sales, accounting, and customer data belongs entirely to you. We never sell, monetize, or train AI on your business data.",
    },
    {
      icon: Lock,
      title: "Tenant Isolation",
      desc: "Every database query is strictly scoped to your unique Tenant ID. No organization can ever access another tenant's records.",
    },
    {
      icon: ShieldCheck,
      title: "Bank-Grade Encryption",
      desc: "All traffic is secured via TLS 1.3 in transit and AES-256 encrypted at rest across PostgreSQL databases and automated backups.",
    },
    {
      icon: Download,
      title: "Full Portability & Export",
      desc: "Export your complete business data, ledgers, inventory, and invoices at any time in structured formats without lock-in.",
    },
  ];

  const sections = [
    { id: "overview", title: "1. Overview & Scope" },
    { id: "data-collected", title: "2. Information We Collect" },
    { id: "tenant-isolation", title: "3. Multi-Tenant Isolation & Ownership" },
    { id: "how-we-use", title: "4. How We Use Your Information" },
    { id: "security-encryption", title: "5. Security & Encryption Safeguards" },
    { id: "data-retention", title: "6. Data Retention & Account Deletion" },
    { id: "subprocessors", title: "7. Third-Party Sub-processors" },
    { id: "data-rights", title: "8. Your Data Protection Rights" },
    { id: "cookies-sessions", title: "9. Cookies, Local Storage & Sessions" },
    { id: "contact-dpo", title: "10. Contact & Privacy Inquiries" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <PublicHeader activePage="privacy" />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-blue-400">Privacy Policy</span>
        </div>

        {/* Hero Header */}
        <div className="border-b border-slate-800 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" />
            Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            BizManage Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            This Privacy Policy outlines how BizManage SaaS Inc. (&ldquo;BizManage&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, protects, isolates, and processes your organization&rsquo;s data when using our Business Management &amp; Accounting Platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-400">
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
              <strong>Last Updated:</strong> {lastUpdated}
            </span>
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
              <strong>Applies to:</strong> Global SaaS Platform &amp; API Services
            </span>
          </div>
        </div>

        {/* Key Guarantees Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {keyGuarantees.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-blue-500/40 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3.5 text-blue-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Content Layout with Side Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Table of Contents
              </h3>
              <nav className="space-y-1 text-xs">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block py-1.5 px-2.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-2 font-medium">
                  Have questions about privacy?
                </p>
                <a
                  href="mailto:privacy@bizmanage.com"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  privacy@bizmanage.com
                </a>
              </div>
            </div>
          </aside>

          {/* Detailed Legal Content */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-12 text-sm leading-relaxed text-slate-300">
            {/* Section 1 */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">01.</span>
                Overview &amp; Scope
              </h2>
              <p>
                BizManage SaaS Inc. provides an enterprise-grade, multi-tenant Business Management, Point-of-Sale (POS), ERP, and Accounting platform. We understand that our customers entrust us with sensitive business transactions, financial records, inventory data, customer contacts, and employee details.
              </p>
              <p>
                This policy explains what information we collect when you access our web application, create an account, register your organization, and process transactions through our APIs. By using BizManage, you consent to the practices described in this document.
              </p>
            </section>

            {/* Section 2 */}
            <section id="data-collected" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">02.</span>
                Information We Collect
              </h2>
              <p>We collect information strictly necessary to provide and operate the platform:</p>
              
              <div className="space-y-3 bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                <div className="border-b border-slate-800 pb-2.5">
                  <strong className="text-white block mb-1">A. Account &amp; Identity Credentials</strong>
                  <span className="text-xs text-slate-400">Full name, email address, hashed passwords, role assignments, phone numbers, and workspace profile metadata.</span>
                </div>
                <div className="border-b border-slate-800 pb-2.5">
                  <strong className="text-white block mb-1">B. Business &amp; Commercial Records</strong>
                  <span className="text-xs text-slate-400">Registered business name, tax identification (e.g., VAT/PAN), official currency, physical store locations, warehouses, and receipt printing configurations.</span>
                </div>
                <div className="border-b border-slate-800 pb-2.5">
                  <strong className="text-white block mb-1">C. Transactional &amp; Financial Data</strong>
                  <span className="text-xs text-slate-400">Sales invoices, purchase orders, customer ledgers, supplier payments, profit/loss records, expense receipts, barcode SKU mappings, and inventory stock adjustments.</span>
                </div>
                <div>
                  <strong className="text-white block mb-1">D. Technical &amp; Security Logs</strong>
                  <span className="text-xs text-slate-400">IP addresses, browser type, device identifiers, timestamped audit logs for financial updates, and API request performance metrics.</span>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="tenant-isolation" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">03.</span>
                Multi-Tenant Isolation &amp; Customer Ownership
              </h2>
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-white block mb-1">Strict Logical &amp; Cryptographic Segregation</strong>
                  Our architecture guarantees that every data query is bound to your assigned Organization / Tenant ID. No tenant can ever view, query, or modify another organization&rsquo;s records under any circumstances.
                </div>
              </div>
              <p>
                <strong>You own 100% of your business data:</strong> BizManage acts solely as a data processor on your behalf. We will never sell, lease, disclose, or use your private sales figures, customer identities, or inventory pricing for commercial advertisement, external monetization, or third-party marketing.
              </p>
            </section>

            {/* Section 4 */}
            <section id="how-we-use" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">04.</span>
                How We Use Your Information
              </h2>
              <ul className="space-y-2 list-disc list-inside text-slate-300">
                <li><strong className="text-white">Providing SaaS Services:</strong> Processing sales transactions, POS checkouts, inventory tracking, financial statement compilation, and invoice generation.</li>
                <li><strong className="text-white">Authentication &amp; Security:</strong> Verifying user login credentials, verifying session tokens, and enforcing role-based permissions.</li>
                <li><strong className="text-white">Audit Trails &amp; Dispute Resolution:</strong> Recording immutable ledger entries and change histories to assist your business in regulatory and accounting reconciliations.</li>
                <li><strong className="text-white">Subscription Management &amp; Billing:</strong> Managing business subscriptions, renewals, trial expirations, and payment transaction statuses.</li>
                <li><strong className="text-white">System Reliability:</strong> Monitoring uptime, identifying API latency bottlenecks, and preventing unauthorized malicious activity or DDoS attacks.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="security-encryption" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">05.</span>
                Security &amp; Encryption Safeguards
              </h2>
              <p>
                We implement industry standard administrative, technical, and physical safeguards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block mb-1">In Transit</span>
                  <p className="text-xs text-slate-400">All data transferred between client browsers and our API servers is encrypted using modern TLS 1.3 with HTTPS enforcement.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block mb-1">At Rest</span>
                  <p className="text-xs text-slate-400">Database storage volumes and automated snapshot archives are encrypted using standard AES-256 encryption keys.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block mb-1">Password Hashing</span>
                  <p className="text-xs text-slate-400">User authentication secrets are hashed using salted cryptographic algorithms (bcrypt). We never store plaintext passwords.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block mb-1">Granular RBAC</span>
                  <p className="text-xs text-slate-400">Role-Based Access Control ensures employees (Cashiers, Accountants, Managers) only access authorized business modules.</p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="data-retention" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">06.</span>
                Data Retention &amp; Account Deletion
              </h2>
              <p>
                We retain your tenant data for as long as your organization maintains an active subscription or account with BizManage.
              </p>
              <p>
                Upon cancellation or deletion request, we initiate a 30-day grace period during which administrators can export complete financial archives. After 30 days, your business records, invoices, item catalogs, and customer records are permanently and irrecoverably purged from our live operational databases and phased out of backup cycles.
              </p>
            </section>

            {/* Section 7 */}
            <section id="subprocessors" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">07.</span>
                Third-Party Sub-processors
              </h2>
              <p>
                We partner with vetted, enterprise-tier infrastructure providers to deliver high availability and performance:
              </p>
              <ul className="space-y-2 list-disc list-inside text-slate-400 text-xs">
                <li><strong className="text-white">Cloud Infrastructure &amp; Hosting:</strong> Render / AWS (Secure server hosting and networking)</li>
                <li><strong className="text-white">Managed Database:</strong> Neon / Supabase PostgreSQL (Encrypted multi-tenant data storage)</li>
                <li><strong className="text-white">Transactional Notifications:</strong> SendGrid / Resend (Order confirmation &amp; password reset emails)</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="data-rights" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">08.</span>
                Your Data Protection Rights
              </h2>
              <p>
                Regardless of your location (including rights under GDPR, CCPA/CPRA, and relevant data laws), BizManage provides you with:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300"><strong>Right to Access &amp; Portability:</strong> Export your data in JSON/Excel formats anytime.</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300"><strong>Right to Rectification:</strong> Edit customer details, products, and ledger corrections immediately.</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300"><strong>Right to Erasure:</strong> Request permanent removal of business records and accounts.</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300"><strong>Right to Restrict Processing:</strong> Freeze account activity during audits or investigations.</span>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section id="cookies-sessions" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">09.</span>
                Cookies, Local Storage &amp; Sessions
              </h2>
              <p>
                BizManage uses strictly necessary session cookies and browser local storage to maintain your authenticated login state, active business selection, theme preferences, and cart/POS staging data. We do not use intrusive cross-site third-party advertising tracking cookies.
              </p>
            </section>

            {/* Section 10 */}
            <section id="contact-dpo" className="scroll-mt-24 space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">10.</span>
                Contact &amp; Privacy Inquiries
              </h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or your business&rsquo;s data protection, please contact our Data Protection Office:
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">BizManage Privacy &amp; Legal Department</h4>
                  <p className="text-xs text-slate-400 mt-1">Email: privacy@bizmanage.com</p>
                  <p className="text-xs text-slate-400">Response time: Within 24-48 business hours</p>
                </div>
                <a
                  href="mailto:privacy@bizmanage.com"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
                >
                  Contact Privacy Team
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
