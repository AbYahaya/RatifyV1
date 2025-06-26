
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, Loader2 } from 'lucide-react';

const WalletConnection = () => {
  const { wallet, connectWallet, disconnectWallet } = useWallet();

  if (wallet.isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <Wallet className="w-3 h-3 mr-1" />
          Connected
        </Badge>
        <div className="text-sm text-muted-foreground">
          {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
        </div>
        <div className="text-sm font-medium">
          {wallet.balance.toFixed(2)} ADA
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnectWallet}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={wallet.isLoading}
      className="bg-cardano-600 hover:bg-cardano-700 text-white"
    >
      {wallet.isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  );
};

export default WalletConnection;
