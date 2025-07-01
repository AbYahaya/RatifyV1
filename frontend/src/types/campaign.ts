import { UTxO } from "@meshsdk/core";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  endDate: string;
  creator: string;
  imageUrl?: string;
  category: string;
  status: 'active' | 'completed' | 'expired';
}

export interface Transaction {
  id: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  donor: string;
  timestamp: string;
  txHash: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  isLoading: boolean;
  error: string | null;
}

export interface campaignInfoType {
  walletVK: string,
  walletSK: string,
  campaignIdHex: string,
  creatorUtxoRef: UTxO,
};
