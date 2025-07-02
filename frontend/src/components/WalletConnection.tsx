// components/WalletConnection.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { deserializeAddress, IWallet, MaestroProvider, MeshTxBuilder, UTxO } from '@meshsdk/core';
import { campaignInfoType } from '@/types/campaign'; // Ensure this path is correct

// Shape of wallet context
interface WalletContextType {
  walletReady: boolean;
  connected: boolean;
  wallet: IWallet;
  address: string;
  walletVK: string;
  walletSK: string;
  txBuilder: MeshTxBuilder | null;
  blockchainProvider: MaestroProvider | null;
  walletUtxos: UTxO[];
  walletCollateral: UTxO | null;
  refreshWalletState: () => void;
  campaignInfoList: campaignInfoType[]; // Added from colleague's version
  updateCampaignInfo: (newCampaignInfo: campaignInfoType) => void;
  replaceCampaignInfo: (newCampaignInfoList: campaignInfoType[]) => void; // Added from colleague's version
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export function WalletConnectionProvider({ children }: { children: ReactNode }) {
  const { wallet, connected } = useMeshWallet();
  const [address, setAddress] = useState<string>("");
  const [walletVK, setWalletVK] = useState<string>("");
  const [walletSK, setWalletSK] = useState<string>("");
  const [walletUtxos, setWalletUtxos] = useState<UTxO[]>([]);
  const [walletCollateral, setWalletCollateral] = useState<UTxO | null>(null);
  const [txBuilder, setTxBuilder] = useState<MeshTxBuilder | null>(null);
  const [blockchainProvider, setBlockchainProvider] = useState<MaestroProvider | null>(null);
  const [walletReady, setWalletReady] = useState<boolean>(false);
  const [refreshWallet, setRefreshWallet] = useState<boolean>(false);
  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]); // To store all campaign info

  useEffect(() => {
    const handleWallet = async () => {
      setWalletReady(false);

      // Initialize blockchain provider and txBuilder only once or if changed
      // Ensure these are correctly typed or use `as any` if you face issues
      const bp = new MaestroProvider({
        network: 'Preview', // Use 'Preview' or 'Mainnet' as needed
        apiKey: "I83ys1iz1JDqZ9LndZMEBe3hIYjMXvoz", // Replace with your actual Maestro API Key
      });
      const tb = new MeshTxBuilder({
        fetcher: bp,
        submitter: bp,
        evaluator: bp,
        verbose: false, // Colleague's version had verbose: false
      });
      tb.setNetwork('preview'); // Set network for txBuilder

      setTxBuilder(tb);
      setBlockchainProvider(bp);

      if (connected && wallet) {
        try {
          const walletAddress = await wallet.getChangeAddress();
          const { pubKeyHash: walletVK, stakeCredentialHash: walletSK } = deserializeAddress(walletAddress);
          console.log("Wallet Connected. VK:", walletVK); // Log VK for debugging

          const fetchedWalletUtxos = await wallet.getUtxos();
          const fetchedWalletCollateral: UTxO[] = await wallet.getCollateral();
          
          if (!fetchedWalletCollateral || fetchedWalletCollateral.length === 0) {
            // Handle case where no collateral is found, e.g., prompt user to create
            console.warn('No collateral UTxO found. Some transactions might fail.');
            // Optionally, throw an error or set a state to inform the user
          }

          const storedCampaigns: campaignInfoType[] = JSON.parse(localStorage.getItem("campaigns") || "[]");

          setAddress(walletAddress);
          setWalletVK(walletVK);
          setWalletSK(walletSK);
          setWalletUtxos(fetchedWalletUtxos);
          setWalletCollateral(fetchedWalletCollateral[0] || null); // Assuming first collateral UTxO is sufficient
          setCampaignInfo(storedCampaigns); // Load campaign info from localStorage
          setWalletReady(true);
        } catch(err) {
          console.error("Error setting up wallet state:", err);
          setWalletReady(false);
          // Clear wallet state on error
          setAddress("");
          setWalletVK("");
          setWalletSK("");
          setWalletUtxos([]);
          setWalletCollateral(null);
          setCampaignInfo([]);
        }
      } else {
        // Clear wallet state when disconnected
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

  }, [connected, wallet, refreshWallet]); // Dependencies for useEffect

  // Method to trigger a refresh of wallet state
  const refreshWalletState = () => {
    setRefreshWallet(prev => !prev);
  }

  // Method to add a new campaign info to the list and localStorage
  const updateCampaignInfo = (newCampaign: campaignInfoType) => {
    const updatedCampaigns = [...campaignInfo, newCampaign];
    setCampaignInfo(updatedCampaigns);
    localStorage.setItem("campaigns", JSON.stringify(updatedCampaigns));
  }
  
  // Method to replace the entire campaign info list and update localStorage
  const replaceCampaignInfo = (newCampaignList: campaignInfoType[]) => {
    setCampaignInfo(newCampaignList);
    localStorage.setItem("campaigns", JSON.stringify(newCampaignList));
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
        campaignInfoList: campaignInfo, // Expose the campaign info list
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
