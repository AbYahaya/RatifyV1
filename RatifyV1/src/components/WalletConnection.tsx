import React, { useEffect, useState } from "react";
import { useWallet, useWalletList } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Loader2 } from "lucide-react";

const WalletConnection = () => {
  const {
    wallet,
    state,
    connected,
    name,
    connecting,
    connect,
    disconnect,
    error,
  } = useWallet();
  const wallets = useWalletList();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // Auto-connect if user previously selected a wallet
  useEffect(() => {
    const stored = localStorage.getItem("selectedWallet");
    if (stored && !connected && !connecting) {
      connect(stored);
      setSelectedWallet(stored);
    }
  }, [connect, connected, connecting]);

  // Save selected wallet in local storage for persistence
  const handleConnect = (walletName: string) => {
    setSelectedWallet(walletName);
    localStorage.setItem("selectedWallet", walletName);
    connect(walletName);
  };

  return (
    <div className="flex items-center gap-3">
      {connected ? (
        <>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1"
          >
            <Wallet className="w-4 h-4" />
            {name || "Wallet"} Connected
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              disconnect();
              localStorage.removeItem("selectedWallet");
              setSelectedWallet(null);
            }}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Disconnect
          </Button>
        </>
      ) : (
        <>
          {wallets.length === 0 ? (
            <span className="text-sm text-red-600">
              No Cardano wallet extension found
            </span>
          ) : (
            wallets.map((w) => (
              <Button
                key={w.name}
                onClick={() => handleConnect(w.name)}
                disabled={connecting}
                className="bg-cardano-600 hover:bg-cardano-700 text-white flex items-center mr-2"
              >
                {connecting && selectedWallet === w.name ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect {w.name}
                  </>
                )}
              </Button>
            ))
          )}
        </>
      )}
      {/* Show connection state and error for debugging */}
      {(() => {
        let errorNode: React.ReactNode = null;
        if (error) {
          if (typeof error === "object" && error !== null && "message" in error) {
            errorNode = (
              <span className="text-red-600 ml-2">
                Error: {(error as { message: string }).message}
              </span>
            );
          } else if (typeof error === "string") {
            errorNode = (
              <span className="text-red-600 ml-2">
                Error: {error}
              </span>
            );
          } else {
            errorNode = (
              <span className="text-red-600 ml-2">
                Error: Unknown error
              </span>
            );
          }
        }
        return (
          <span className="text-xs text-slate-400 ml-2">
            {state}
            {errorNode}
          </span>
        );
      })()}
    </div>
  );
};

export default WalletConnection;
