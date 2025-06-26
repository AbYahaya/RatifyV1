import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@meshsdk/react";

const WalletConnection = () => {
  const { connected, wallet, connect, disconnect } = useWallet();

  const [balance, setBalance] = React.useState<number | null>(null);
  const [address, setAddress] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function fetchWalletInfo() {
      if (connected && wallet) {
        setLoading(true);
        try {
          const usedAddresses = await wallet.getUsedAddresses();
          const addr = usedAddresses && usedAddresses.length > 0 ? usedAddresses[0] : "";
          setAddress(addr);

          const bal = await wallet.getBalance();
          // bal is BigInt in lovelace
          setBalance(Number(bal) / 1_000_000);
        } catch (error) {
          console.error("Failed to fetch wallet info:", error);
          setAddress(null);
          setBalance(null);
        } finally {
          setLoading(false);
        }
      } else {
        setAddress(null);
        setBalance(null);
      }
    }
    fetchWalletInfo();
  }, [connected, wallet]);

  if (connected && wallet) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <Wallet className="w-3 h-3 mr-1" />
          Connected
        </Badge>
        <div className="text-sm text-muted-foreground">
          {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ""}
        </div>
        <div className="text-sm font-medium">
          {loading ? "Loading..." : balance?.toFixed(2)} ADA
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => connect("eternl")}
      className="bg-cardano-600 hover:bg-cardano-700 text-white"
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
};

export default WalletConnection;
