// components/WalletConnection.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { BlockfrostProvider, deserializeAddress, IWallet, MaestroProvider, MeshTxBuilder, UTxO } from '@meshsdk/core';
import { campaignInfoType } from '@/types/campaign';

// Shape of wallet context
interface WalletContextType {
  walletReady: boolean,
  connected: boolean;
  wallet: IWallet;
  address: string,
  walletVK: string
  walletSK: string
  txBuilder: MeshTxBuilder | null,
  blockchainProvider: MaestroProvider | null,
  walletUtxos: UTxO[],
  walletCollateral: UTxO | null,
  refreshWalletState: () => void,
  campaignInfoList: campaignInfoType[],
  updateCampaignInfo: (newCampaignInfo: campaignInfoType) => void,
  replaceCampaignInfo: (newCampaignInfoList: campaignInfoType[]) => void
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
  const [walletReady, setWalletReady] = useState<boolean>(false);
  const [refreshWallet, setRefreshWallet] = useState<boolean>(false);
  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]);

  useEffect(() => {
    const handleWallet = async () => {
      setWalletReady(false);

      const blockchainProvider = new MaestroProvider({
        network: "Preview",
        apiKey: "I83ys1iz1JDqZ9LndZMEBe3hIYjMXvoz",
      });
      // const blockchainProvider = new BlockfrostProvider("preview8CQGesUBcSE17REM7CB4NL0nKhLClmYD");
      // const evaluator = new OfflineEvaluator(blockchainProvider, "preview");

      const txBuilder = new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        evaluator: blockchainProvider,
        verbose: false,
      });
      txBuilder.setNetwork('preview');

      setTxBuilder(txBuilder);
      setBlockchainProvider(blockchainProvider);

      if (connected && wallet) {
        try {
          const walletAddress = await wallet.getChangeAddress();
          const { pubKeyHash: walletVK, stakeCredentialHash: walletSK } = deserializeAddress(walletAddress);
          console.log("walletVK:", walletVK);

          const walletUtxos = await wallet.getUtxos();
          // const walletCollateral: UTxO = (await blockchainProvider.fetchUTxOs("cab914aca4fb11f8ed0d736915cc77a756a0b3abd8baebb2a39c734b60849c2e", 2))[0];
          const walletCollateral: UTxO = (await wallet.getCollateral())[0];
          if (!walletCollateral) {
              throw new Error('No collateral utxo found');
          }

          const campaigns: campaignInfoType[] = JSON.parse(localStorage.getItem("campaigns") || "[]");

          setAddress(walletAddress);
          setWalletVK(walletVK);
          setWalletSK(walletSK);
          setWalletUtxos(walletUtxos);
          setWalletCollateral(walletCollateral);
          setWalletReady(true);
          setCampaignInfo(campaigns);
        } catch(err) {
          console.log(err);
          setWalletReady(false);
        }
      } else {
        setAddress("");
        setWalletVK("");
        setWalletSK("");
        setWalletUtxos([]);
        setWalletCollateral(null);
        setWalletReady(false);
        setCampaignInfo([]);
      }
    }

    handleWallet();

  }, [connected, wallet, refreshWallet]);

  const refreshWalletState = () => {
    setRefreshWallet(!refreshWallet);
  }

  const updateCampaignInfo = (newCampaignInfo: campaignInfoType) => {
    const updatedCampaignInfo = [...campaignInfo, newCampaignInfo];

    setCampaignInfo(updatedCampaignInfo);
    localStorage.setItem("campaigns", JSON.stringify(updatedCampaignInfo));
  }
  
  const replaceCampaignInfo = (newCampaignInfoList: campaignInfoType[]) => {
    setCampaignInfo(newCampaignInfoList);
    localStorage.setItem("campaigns", JSON.stringify(newCampaignInfoList));
  }

  return (
    <WalletContext.Provider
      value={{
        walletReady,
        connected,
        wallet,
        address,
        walletVK,
        walletSK,
        txBuilder,
        blockchainProvider,
        walletUtxos,
        walletCollateral,
        refreshWalletState,
        campaignInfoList: campaignInfo,
        updateCampaignInfo,
        replaceCampaignInfo,
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
