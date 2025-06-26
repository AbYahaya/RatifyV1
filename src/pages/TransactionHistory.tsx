import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@meshsdk/react';
import { mockTransactions } from '@/data/mockData';
import { 
  Wallet, 
  ExternalLink, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Target,
  EthernetPort
} from 'lucide-react';

const TransactionHistory = () => {
  const { connected, wallet, connect } = useWallet();

  const [address, setAddress] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<number>(0);

  React.useEffect(() => {
    const fetchWalletInfo = async () => {
      if (connected && wallet) {
        const addr = await wallet.getChangeAddress();
        setAddress(addr);
        const bal = await wallet.getBalance();
        setBalance(Number(bal) / 1_000_000);
      } else {
        setAddress(null);
        setBalance(0);
      }
    };
    fetchWalletInfo();
  }, [connected, wallet]);

  // Filter transactions for the connected wallet
  const userTransactions = address
    ? mockTransactions.filter(tx => tx.donor === address)
    : [];

  const totalDonated = userTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  if (!connected) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Transaction History
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              View your donation history and track your contributions to campaigns.
            </p>
          </div>

          <Card className="gradient-card">
            <CardContent className="p-12 text-center">
              <div className="bg-cardano-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-cardano-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Connect your Cardano wallet to view your transaction history and track all your donations.
              </p>
              <Button
                onClick={() => connect('eternl')}
                className="bg-cardano-600 hover:bg-cardano-700 text-lg px-8 py-6 h-auto"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Transaction History
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Track your donation history and see the impact you've made.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-card">
            <CardContent className="p-6 text-center">
              <div className="bg-cardano-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-cardano-600" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">
                {userTransactions.length}
              </div>
              <div className="text-slate-600">Total Donations</div>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">
                {totalDonated} ADA
              </div>
              <div className="text-slate-600">Total Contributed</div>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">
                {balance.toFixed(2)} ADA
              </div>
              <div className="text-slate-600">Current Balance</div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction List */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800">
              Your Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userTransactions.length > 0 ? (
              <div className="space-y-4">
                {userTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white/50 rounded-lg p-6 border border-slate-200/50 hover:border-cardano-300/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-cardano-100 p-2 rounded-full">
                          <ArrowUpRight className="w-4 h-4 text-cardano-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {transaction.campaignTitle}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(transaction.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-cardano-600">
                          {transaction.amount} ADA
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Transaction Hash:</span>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs">
                          {transaction.txHash.slice(0, 10)}...{transaction.txHash.slice(-8)}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-cardano-600 border-cardano-200 hover:bg-cardano-50"
                        onClick={() => window.open(`https://cardanoscan.io/transaction/${transaction.txHash}`, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💝</div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No donations yet
                </h3>
                <p className="text-slate-600 mb-6">
                  Start supporting amazing campaigns and your donation history will appear here.
                </p>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="bg-cardano-600 hover:bg-cardano-700"
                >
                  Browse Campaigns
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistory;
