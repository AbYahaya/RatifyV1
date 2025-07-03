// components/WalletConnection.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet as useMeshWallet } from '@meshsdk/react';
import { deserializeAddress, IWallet, MaestroProvider, MeshTxBuilder, UTxO } from '@meshsdk/core';
import { sanitizeForFirestore } from '@/lib/firestoreSanitizer';
import { collection, getDocs, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  campaignInfoList: campaignInfoType[];
  updateCampaignInfo: (newCampaignInfo: campaignInfoType) => Promise<void>;
  replaceCampaignInfo: (newCampaignInfoList: campaignInfoType[]) => Promise<void>;
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
  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]); // Store campaigns from Firestore

  // Load campaigns from Firestore
  const loadCampaignsFromFirestore = async () => {
    try {
      const snapshot = await getDocs(collection(db, "campaigns"));
      const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<campaignInfoType, 'id'>) })) as campaignInfoType[];
      setCampaignInfo(campaigns);
    } catch (error) {
      console.error("Failed to load campaigns from Firestore:", error);
      setCampaignInfo([]);
    }
  };

  useEffect(() => {
    const handleWallet = async () => {
      setWalletReady(false);

      const bp = new MaestroProvider({
        network: 'Preview',
        apiKey: "xpK89bBiB0liZm1ktJFqOkp3fXCM88DS",
      });
      const tb = new MeshTxBuilder({
        fetcher: bp,
        submitter: bp,
        evaluator: bp,
        verbose: false,
      });
      tb.setNetwork('preview');

      setTxBuilder(tb);
      setBlockchainProvider(bp);

      if (connected && wallet) {
        try {
          const walletAddress = await wallet.getChangeAddress();
          const { pubKeyHash: walletVK, stakeCredentialHash: walletSK } = deserializeAddress(walletAddress);

          const fetchedWalletUtxos = await wallet.getUtxos();
          const fetchedWalletCollateral: UTxO[] = await wallet.getCollateral();

          setAddress(walletAddress);
          setWalletVK(walletVK);
          setWalletSK(walletSK);
          setWalletUtxos(fetchedWalletUtxos);
          setWalletCollateral(fetchedWalletCollateral[0] || null);

          await loadCampaignsFromFirestore();

          setWalletReady(true);
        } catch (err) {
          console.error("Error setting up wallet state:", err);
          setWalletReady(false);
          setAddress("");
          setWalletVK("");
          setWalletSK("");
          setWalletUtxos([]);
          setWalletCollateral(null);
          setCampaignInfo([]);
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
    };

    handleWallet();
  }, [connected, wallet, refreshWallet]);

  // Refresh wallet state trigger
  const refreshWalletState = () => {
    setRefreshWallet(prev => !prev);
  };

  // Add a new campaign to Firestore, sanitizing data first
  const updateCampaignInfo = async (newCampaign: campaignInfoType) => {
    try {
      const sanitizedCampaign = sanitizeForFirestore(newCampaign);
      await addDoc(collection(db, "campaigns"), sanitizedCampaign);
      await loadCampaignsFromFirestore();
    } catch (error) {
      console.error("Failed to add campaign:", error);
    }
  };

  // Replace entire campaign list in Firestore (update existing docs)
  const replaceCampaignInfo = async (newCampaignList: campaignInfoType[]) => {
    try {
      for (const c of newCampaignList) {
        if (c.id) {
          const sanitizedCampaign = sanitizeForFirestore(c);
          await setDoc(doc(db, "campaigns", c.id), sanitizedCampaign);
        }
      }
      await loadCampaignsFromFirestore();
    } catch (error) {
      console.error("Failed to replace campaigns:", error);
    }
  };

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

// Custom hook
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletConnectionProvider');
  }
  return context;
}

// campaign type definition
export interface campaignInfoType {
  id?: string; // Optional Firestore document ID
  // Add all other fields that a campaign should have, for example:
  // name: string;
  // description: string;
  // goal: number;
  // etc.
}
