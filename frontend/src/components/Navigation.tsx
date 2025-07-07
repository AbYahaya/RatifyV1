import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CardanoWallet } from '@meshsdk/react';
import { Home, Plus, History, List, Activity, Menu, X } from 'lucide-react';

const Navigation = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => router.pathname === path;

  const navLinks = [
    { href: "/", label: "Home", icon: <Home className="w-4 h-4" /> },
    { href: "/start-campaign", label: "Start Campaign", icon: <Plus className="w-4 h-4" /> },
    { href: "/all-campaigns", label: "All Campaigns", icon: <List className="w-4 h-4" /> },
    { href: "/active-campaigns", label: "Active Campaigns", icon: <Activity className="w-4 h-4" /> },
    { href: "/transactions", label: "Transactions", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-cardano-600 to-purple-600 bg-clip-text text-transparent">
          RatifyV1
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isActive(href)
                  ? 'bg-cardano-100 text-cardano-700'
                  : 'text-slate-600 hover:text-cardano-600 hover:bg-slate-100'
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden p-2 rounded-md text-slate-600 hover:text-cardano-600 hover:bg-slate-100 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mesh CardanoWallet Button */}
        <div className="ml-4">
          <CardanoWallet label="Connect Wallet" persist={true} />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/90 backdrop-blur-lg border-t border-slate-200/50 shadow-lg">
          <div className="flex flex-col px-4 py-4 space-y-2">
            {navLinks.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive(href)
                    ? 'bg-cardano-100 text-cardano-700'
                    : 'text-slate-600 hover:text-cardano-600 hover:bg-slate-100'
                }`}
                onClick={() => setMobileMenuOpen(false)} // close menu on link click
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
