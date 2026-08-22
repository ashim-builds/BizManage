import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Scale,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Zap,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service - BizManage SaaS",
  description:
    "Review the terms and conditions governing the use of the BizManage multi-tenant business management and accounting SaaS platform.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "January 15, 2026";

  const keyHighlights = [
    {
      icon: Building,
      title: "Authorized Business Use",
      desc: "BizManage is designed for commercial business management, invoicing, inventory tracking, and POS operations.",
    },
    {
      icon: Scale,
      title: "Your Data is Yours",
      desc: "You retain full ownership of all proprietary business, financial, customer, and catalog records uploaded to your workspace.",
    },
    {
      icon: CreditCard,
      title: "Transparent Subscriptions",
      desc: "Clear monthly or annual pricing with straightforward free trials, easy upgrades, and no hidden cancellation fees.",
    },
    {
      icon: ShieldCheck,
      title: "Enterprise SLA & Security",
      desc: "Continuous service monitoring, isolated multi-tenant architecture, automated backups, and 99.9% uptime target.",
    },
  ];

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "services", title: "2. Description of Services" },
    { id: "accounts", title: "3. Account Registration & Security" },
    { id: "subscription-billing", title: "4. Subscription & Billing Terms" },
    { id: "acceptable-use", title: "5. Acceptable Use Policy" },
    { id: "intellectual-property", title: "6. Data Ownership & IP Rights" },
    { id: "sla-availability", title: "7. Availability, Maintenance & SLA" },
    { id: "liability-disclaimers", title: "8. Disclaimers & Limitation of Liability" },
    { id: "termination", title: "9. Suspension & Termination" },
    { id: "governing-law", title: "10. Governing Law & Contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <PublicHeader activePage="terms" />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-blue-400">Terms of Service</span>
        </div>

        {/* Hero Header */}
        <div className="border-b border-slate-800 pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Scale className="w-3.5 h-3.5" />
            Terms &amp; Conditions
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            BizManage Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Please read these Terms of Service carefully before creating an account or using the BizManage SaaS platform. These terms define the legal rights, obligations, and relationship between your organization and BizManage.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-400">
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
              <strong>Effective Date:</strong> {lastUpdated}
            </span>
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
              <strong>Version:</strong> 2.4 (Enterprise Edition)
            </span>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {keyHighlights.map((item, index) => {
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
                Sections
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
                  Need custom enterprise terms?
                </p>
                <a
                  href="mailto:legal@bizmanage.com"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  legal@bizmanage.com
                </a>
              </div>
            </div>
          </aside>

          {/* Detailed Terms Content */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-12 text-sm leading-relaxed text-slate-300">
            {/* Section 1 */}
            <section id="acceptance" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">01.</span>
                Acceptance of Terms
              </h2>
              <p>
                By accessing, browsing, registering for, or using the BizManage SaaS platform (the &ldquo;Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you are registering an account on behalf of a company or legal entity, you represent and warrant that you possess the legal authority to bind that entity to these Terms.
              </p>
              <p>
                If you do not agree with any part of these Terms, you must not access or utilize the BizManage platform or API endpoints.
              </p>
            </section>

            {/* Section 2 */}
            <section id="services" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">02.</span>
                Description of Services
              </h2>
              <p>
                BizManage provides a cloud-native SaaS software suite encompassing:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                <li>Multi-tenant business management and workspace administration</li>
                <li>Point-of-Sale (POS), retail checkout, and barcode scanning</li>
                <li>Sales invoicing, purchase orders, customer &amp; vendor ledger accounting</li>
                <li>Real-time inventory ERP, low-stock alerts, and stock adjustments</li>
                <li>Profit &amp; Loss, balance, cashflow, and tax reporting analytics</li>
                <li>Multi-user role permissioning (Admins, Managers, Accountants, Cashiers)</li>
              </ul>
              <p>
                We continually improve our platform; features may be updated, enhanced, or optimized over time.
              </p>
            </section>

            {/* Section 3 */}
            <section id="accounts" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">03.</span>
                Account Registration &amp; Security
              </h2>
              <p>
                When creating an account, you must provide accurate, current, and complete organization and contact information. You are solely responsible for:
              </p>
              <div className="space-y-2 bg-slate-900/40 border border-slate-800 p-4 rounded-lg text-xs">
                <p>• Maintaining the strict confidentiality of your login credentials and API tokens.</p>
                <p>• All transactions, invoices, sales entries, and records executed under your account credentials.</p>
                <p>• Promptly notifying BizManage at <code>security@bizmanage.com</code> upon discovering any unauthorized access or security breach.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="subscription-billing" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">04.</span>
                Subscription, Free Trials &amp; Billing Terms
              </h2>
              <p>
                <strong className="text-white">A. Free Trials:</strong> We may offer complimentary trial periods for select subscription packages. At the conclusion of the trial, continued access requires an active paid subscription.
              </p>
              <p>
                <strong className="text-white">B. Billing Cycles:</strong> Subscriptions are billed in advance on a recurring monthly or annual basis depending on your selected package.
              </p>
              <p>
                <strong className="text-white">C. Cancellations &amp; Refunds:</strong> You may cancel your subscription at any time via your workspace settings. Cancellation takes effect at the end of the current paid billing cycle. Unless required by law, subscription fees are non-refundable.
              </p>
            </section>

            {/* Section 5 */}
            <section id="acceptable-use" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">05.</span>
                Acceptable Use Policy
              </h2>
              <p>You agree not to use the BizManage platform to:</p>
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 text-red-200 text-xs leading-relaxed space-y-1.5">
                <p>• Violate any applicable local, national, or international tax, commercial, or financial laws.</p>
                <p>• Attempt unauthorized access to other tenant workspaces, database partitions, or server infrastructure.</p>
                <p>• Reverse-engineer, decompile, or copy the platform&rsquo;s source code, algorithms, or API architecture.</p>
                <p>• Transmit malware, worms, or execute automated denial-of-service (DDoS) requests against our endpoints.</p>
                <p>• Resell, sublicense, or rent the SaaS services to third parties without prior written consent.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">06.</span>
                Data Ownership &amp; Intellectual Property Rights
              </h2>
              <p>
                <strong className="text-white">Your Data:</strong> You retain complete and exclusive ownership of all customer data, inventory records, sales transactions, tax IDs, and financial ledgers created within your workspace.
              </p>
              <p>
                <strong className="text-white">BizManage IP:</strong> All platform software, design layouts, logos, trademarks, documentation, and user interfaces remain the exclusive property of BizManage SaaS Inc.
              </p>
            </section>

            {/* Section 7 */}
            <section id="sla-availability" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">07.</span>
                Service Availability, Maintenance &amp; SLA
              </h2>
              <p>
                BizManage strives for a <strong>99.9% uptime availability</strong> for all core transactional systems. We perform regular system maintenance during scheduled off-peak windows and announce planned downtimes in advance whenever possible.
              </p>
            </section>

            {/* Section 8 */}
            <section id="liability-disclaimers" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">08.</span>
                Disclaimers &amp; Limitation of Liability
              </h2>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs space-y-2 text-slate-300">
                <p>
                  <strong className="text-white">Accounting Disclaimer:</strong> BizManage provides tools for business record keeping and calculation. However, BizManage is not a certified public accounting firm or licensed tax advisor. You are solely responsible for ensuring your business records comply with statutory tax rules and local commercial reporting standards.
                </p>
                <p>
                  <strong className="text-white">Limitation:</strong> To the maximum extent permitted by law, BizManage SaaS Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, or business opportunity.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section id="termination" className="scroll-mt-24 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">09.</span>
                Suspension &amp; Termination
              </h2>
              <p>
                We may suspend or terminate your account if you materially breach these Terms. In the event of account closure, administrators have a 30-day window to export and download all organizational financial records before data is permanently purged.
              </p>
            </section>

            {/* Section 10 */}
            <section id="governing-law" className="scroll-mt-24 space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono text-base">10.</span>
                Governing Law &amp; Legal Inquiries
              </h2>
              <p>
                These Terms are governed by and construed in accordance with standard international commercial and SaaS contract laws.
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">BizManage Legal &amp; Contracts Team</h4>
                  <p className="text-xs text-slate-400 mt-1">Inquiries: legal@bizmanage.com</p>
                  <p className="text-xs text-slate-400">Response time: Within 24-48 business hours</p>
                </div>
                <a
                  href="mailto:legal@bizmanage.com"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
                >
                  Contact Legal Team
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
