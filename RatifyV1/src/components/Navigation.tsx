import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CardanoWallet } from '@meshsdk/react';
import { Home, Plus, History } from 'lucide-react';

const Navigation = () => {
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-cardano-600 to-purple-600 bg-clip-text text-transparent">
              RatifyV1
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive('/')
                    ? 'bg-cardano-100 text-cardano-700'
                    : 'text-slate-600 hover:text-cardano-600 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>

              <Link
                href="/start-campaign"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive('/start-campaign')
                    ? 'bg-cardano-100 text-cardano-700'
                    : 'text-slate-600 hover:text-cardano-600 hover:bg-slate-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                Start Campaign
              </Link>

              <Link
                href="/transactions"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive('/transactions')
                    ? 'bg-cardano-100 text-cardano-700'
                    : 'text-slate-600 hover:text-cardano-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                Transactions
              </Link>
            </div>
          </div>

          {/* Mesh CardanoWallet Button */}
          <CardanoWallet label="Connect Wallet" persist={true} />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
