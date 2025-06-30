// components/WalletConnection.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { deserializeAddress, IWallet, MaestroProvider, MeshTxBuilder, UTxO } from '@meshsdk/core';

// Shape of wallet context
interface WalletContextType {
  connected: boolean;
  wallet: IWallet;
  address: string,
  walletVK: string
  walletSK: string
  txBuilder: MeshTxBuilder | null,
  blockchainProvider: MaestroProvider | null,
  walletUtxos: UTxO[],
  walletCollateral: UTxO | null,
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export function WalletConnectionProvider({ children }: { children: ReactNode }) {
  const { wallet, connected, } = useMeshWallet();
  const [address, setAddress] = useState<string>("");
  const [walletVK, setWalletVK] = useState<string>("");
  const [walletSK, setWalletSK] = useState<string>("");
  const [walletUtxos, setWalletUtxos] = useState<UTxO[]>([]);
  const [walletCollateral, setWalletCollateral] = useState<UTxO | null>(null);
  const [txBuilder, setTxBuilder] = useState<MeshTxBuilder | null>(null);
  const [blockchainProvider, setBlockchainProvider] = useState<MaestroProvider | null>(null);

  useEffect(() => {
    const handleWallet = async () => {
      if (connected && wallet) {
        try {
          const walletAddress = await wallet.getChangeAddress();
          const { pubKeyHash: walletVK, stakeCredentialHash: walletSK } = deserializeAddress(walletAddress);

          const blockchainProvider = new MaestroProvider({
            network: 'Preview',
            apiKey: "I83ys1iz1JDqZ9LndZMEBe3hIYjMXvoz",
          });
      
          const txBuilder = new MeshTxBuilder({
            fetcher: blockchainProvider,
            submitter: blockchainProvider,
            evaluator: blockchainProvider,
          });
          txBuilder.setNetwork('preview');

          const walletUtxos = await wallet.getUtxos();
          // const walletCollateral: UTxO = (await blockchainProvider.fetchUTxOs("cab914aca4fb11f8ed0d736915cc77a756a0b3abd8baebb2a39c734b60849c2e", 2))[0];
          const walletCollateral: UTxO = (await wallet.getCollateral())[0];
          if (!walletCollateral) {
              throw new Error('No collateral utxo found 1');
          }

          setAddress(walletAddress);
          setWalletVK(walletVK);
          setWalletSK(walletSK);
          setTxBuilder(txBuilder);
          setBlockchainProvider(blockchainProvider)
          setWalletUtxos(walletUtxos);
          setWalletCollateral(walletCollateral)
        } catch(err) {
          console.log(err);
        }
      } else {
        setAddress("");
        setWalletVK("");
        setWalletSK("");
        setTxBuilder(null);
        setBlockchainProvider(null)
        setWalletUtxos([]);
        setWalletCollateral(null)
      }
    }

    handleWallet();

  }, [connected]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        wallet,
        address,
        walletVK,
        walletSK,
        txBuilder,
        blockchainProvider,
        walletUtxos,
        walletCollateral,
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
