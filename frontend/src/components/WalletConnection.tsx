// components/WalletConnection.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useMeshWallet, MeshProvider as MeshWalletProvider } from '@meshsdk/react';

// Define the shape of your wallet context
interface WalletContextType {
  connected: boolean;
  wallet: any; // Replace with your wallet type if available
  connect: () => Promise<void>;
  disconnect: () => void;
  address: string | null;
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export function WalletConnectionProvider({ children }: { children: ReactNode }) {
  // Use Mesh SDK's wallet hook internally
  const meshWallet = useMeshWallet();

  // You can add your own state or wrap meshWallet state here if needed
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (meshWallet.connected && meshWallet.wallet) {
      meshWallet.wallet.getChangeAddress().then(setAddress);
    } else {
      setAddress(null);
    }
  }, [meshWallet.connected]);

  const connect = async () => {
    try {
      await meshWallet.connect('eternal'); // or 'nami', 'flint', etc. based on your wallet
      let addr = null;
      if (meshWallet.wallet) {
        addr = await meshWallet.wallet.getChangeAddress();
      }
      setAddress(addr);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const disconnect = () => {
    meshWallet.disconnect();
    setAddress(null);
  };

  return (
    <WalletContext.Provider
      value={{
        connected: meshWallet.connected,
        wallet: meshWallet,
        connect,
        disconnect,
        address,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to consume wallet context easily
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletConnectionProvider');
  }
  return context;
}
