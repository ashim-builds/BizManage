import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Lock,
  Server,
  Database,
  KeyRound,
  Eye,
  RefreshCw,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Cpu,
  Layers,
  FileCheck,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Security & Trust - BizManage Enterprise SaaS",
  description:
    "Explore BizManage enterprise security architecture, multi-tenant database isolation, data encryption standards, and compliance practices.",
};

export default function SecurityPage() {
  const securityPillars = [
    {
      icon: Database,
      title: "Multi-Tenant Data Isolation",
      tag: "Zero Cross-Tenant Leakage",
      desc: "Every database query is strictly scoped and quarantined by Tenant ID at the ORM layer. No organization or user can ever access or query another workspace's records.",
    },
    {
      icon: Lock,
      title: "Encryption in Transit & at Rest",
      tag: "TLS 1.3 & AES-256",
      desc: "All network traffic is encrypted with TLS 1.3 and forced HTTPS. Stored database volumes, files, and automated backups are secured using standard AES-256 keys.",
    },
    {
      icon: KeyRound,
      title: "Role-Based Access Control (RBAC)",
      tag: "Granular Permissions",
      desc: "Assign team members strict roles (Super Admin, Store Manager, Cashier, Accountant). Restrict sensitive financial margins, cost prices, and ledger modifications.",
    },
    {
      icon: RefreshCw,
      title: "Automated Backups & Redundancy",
      tag: "Point-in-Time Recovery",
      desc: "Continuous snapshots and geo-redundant database backups ensure zero data loss and rapid disaster recovery in the event of unexpected outages.",
    },
    {
      icon: Eye,
      title: "Immutable Financial Audit Trails",
      tag: "Tamper-Evident History",
      desc: "Every invoice, payment, sales return, and stock adjustment logs user IDs and exact timestamps for complete financial traceability and audit readiness.",
    },
    {
      icon: Cpu,
      title: "DDoS Mitigation & Rate Limiting",
      tag: "API Edge Protection",
      desc: "API endpoints are protected with automated rate limiters, web application firewalls (WAF), and brute-force login attack defenses.",
    },
  ];

  const securityPractices = [
    {
      title: "Zero Plaintext Password Policy",
      desc: "All authentication credentials and user passwords are irreversibly hashed with salted bcrypt algorithms. We never store or transmit plaintext credentials.",
    },
    {
      title: "No Data Selling or Model Training",
      desc: "We strictly guarantee that your proprietary customer records, product catalogs, and transaction ledgers are never monetized, sold, or used to train third-party AI models.",
    },
    {
      title: "JWT Authentication & Secure Sessions",
      desc: "Stateless, cryptographically signed JSON Web Tokens (JWT) with strict expiration limits and secure HTTP headers prevent session hijacking and cross-site scripting (XSS).",
    },
    {
      title: "Continuous Code Audits & Dependency Scanning",
      desc: "Our automated CI/CD pipeline scans dependencies and source code for known CVEs, outdated packages, and security regressions prior to deployment.",
    },
  ];

  const faqs = [
    {
      q: "How does BizManage prevent one tenant from seeing another tenant's financial data?",
      a: "BizManage employs strict multi-tenant isolation at both the application and database query levels. Every database request automatically injects and verifies the tenant ID from the verified user session token. Unauthenticated or mismatched tenant queries are immediately rejected.",
    },
    {
      q: "Where is my data hosted and how often are backups created?",
      a: "Data is securely hosted in top-tier cloud data centers (Render and Neon/Supabase PostgreSQL) with multi-zone redundancy. Automated database backups are captured daily with point-in-time recovery capabilities.",
    },
    {
      q: "Can I export my financial data if I decide to migrate?",
      a: "Yes. We believe in complete customer data portability. Workspace administrators can export complete customer, sales, purchases, inventory, and accounting ledger records at any time.",
    },
    {
      q: "What should I do if I discover a potential security vulnerability?",
      a: "We welcome reports through our Responsible Disclosure program. Please email security@bizmanage.com with details, reproduction steps, and contact info. We investigate and resolve all valid reports promptly.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <PublicHeader activePage="security" />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-blue-400">Security Architecture</span>
        </div>

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <ShieldCheck className="w-4 h-4" />
            Enterprise-Grade Security Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Security, Trust &amp; Reliability Built for Enterprises
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            BizManage was engineered from day one with a zero-trust mindset, strict multi-tenant isolation, bank-grade encryption, and high-availability architecture.
          </p>
        </div>

        {/* Live Status Card */}
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-indigo-950/40 border border-blue-800/40 rounded-2xl p-6 mb-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Platform Security &amp; Operational Status
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All production services, database partitions, and API gateways are operating normally.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-400">
              99.9% Uptime SLA Target
            </span>
          </div>
        </div>

        {/* 6 Core Pillars Grid */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Core Security Pillars
            </h2>
            <p className="text-sm text-slate-400">
              Comprehensive security controls designed to safeguard your mission-critical accounting and sales data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-6 transition-all shadow-sm hover:shadow-blue-900/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Security Practices */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 sm:p-10 mb-20">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Our Security &amp; Compliance Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              How we enforce zero-trust security throughout our software engineering lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityPractices.map((practice, index) => (
              <div
                key={index}
                className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/70 p-4 rounded-xl"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {practice.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {practice.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security FAQs */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Frequently Asked Security Questions
            </h2>
            <p className="text-sm text-slate-400">
              Common questions about our security, multi-tenancy, and data handling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-white mb-2 flex items-start gap-2">
                  <span className="text-blue-400 font-bold">Q:</span>
                  {faq.q}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible Disclosure Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <FileCheck className="w-3.5 h-3.5" />
              Responsible Disclosure
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Report a Security Vulnerability
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              We take security inquiries seriously. If you believe you have identified a vulnerability in BizManage, please contact our security team directly. We appreciate your responsible disclosure.
            </p>
          </div>
          <a
            href="mailto:security@bizmanage.com"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg shadow-blue-600/25 transition-all shrink-0"
          >
            <Mail className="w-4 h-4" />
            security@bizmanage.com
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
