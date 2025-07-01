import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  deserializeDatum,
  hexToString,
  serializeAddressObj,
  UTxO,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { CreatorDatum } from "@/types/datums";

type campaignInfoType = {
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
};

type campaignDataType = {
  campaignTitle: string;
  creatorAddress: string;
  currentGoal: number;
  campaignGoal: number;
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
};

type TransactionInfo = {
  txHash: string;
  blockHeight: number;
};

const DUMMY_CAMPAIGNS: campaignInfoType[] = [
  {
    walletVK: "dummyVK1",
    walletSK: "dummySK1",
    campaignIdHex: "64656d6f43616d706169676e31", // "demoCampaign1" hex
    creatorUtxoRef: {
      input: { txHash: "dummyTxHash1", outputIndex: 0 },
      output: { amount: [], address: "" },
    } as UTxO,
  },
  {
    walletVK: "dummyVK2",
    walletSK: "dummySK2",
    campaignIdHex: "64656d6f43616d706169676e32", // "demoCampaign2" hex
    creatorUtxoRef: {
      input: { txHash: "dummyTxHash2", outputIndex: 0 },
      output: { amount: [], address: "" },
    } as UTxO,
  },
];

const DUMMY_CAMPAIGN_DATA: campaignDataType[] = [
  {
    campaignTitle: "Mock Campaign 1",
    creatorAddress: "addr_test1qzmockaddress1",
    currentGoal: 18000,
    campaignGoal: 20000,
    walletVK: "dummyVK1",
    walletSK: "dummySK1",
    campaignIdHex: "64656d6f43616d706169676e31",
    creatorUtxoRef: DUMMY_CAMPAIGNS[0].creatorUtxoRef,
  },
  {
    campaignTitle: "Mock Campaign 2",
    creatorAddress: "addr_test1qzmockaddress2",
    currentGoal: 25000,
    campaignGoal: 25000,
    walletVK: "dummyVK2",
    walletSK: "dummySK2",
    campaignIdHex: "64656d6f43616d706169676e32",
    creatorUtxoRef: DUMMY_CAMPAIGNS[1].creatorUtxoRef,
  },
];

const ActiveCampaigns = () => {
  const router = useRouter();
  const {
    connected,
    address,
    blockchainProvider,
  } = useWallet();

  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]);
  const [campaignData, setCampaignData] = useState<campaignDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction history states
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Initialize dummy campaigns in localStorage if none exist
  useEffect(() => {
    const campaigns = localStorage.getItem("campaigns");
    if (!campaigns) {
      localStorage.setItem("campaigns", JSON.stringify(DUMMY_CAMPAIGNS));
    }
  }, []);

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!connected || !blockchainProvider) return;

      setLoading(true);
      setError(null);

      try {
        const campaigns = localStorage.getItem("campaigns");
        if (!campaigns) {
          setCampaignData([...DUMMY_CAMPAIGN_DATA]);
          setLoading(false);
          return;
        }

        const parsedCampaigns: campaignInfoType[] = JSON.parse(campaigns);
        setCampaignInfo(parsedCampaigns);

        const campaignDataList: campaignDataType[] = [];

        for (const c of parsedCampaigns) {
          const {
            walletVK: cwalletVK,
            walletSK: cWalletSK,
            campaignIdHex: cCampaignIdHex,
            creatorUtxoRef: cCreatorUtxoRef,
          } = c;

          const { ratifyAddress } = await getValidator(
            cwalletVK,
            cWalletSK,
            cCampaignIdHex,
            blockchainProvider,
            cCreatorUtxoRef
          );

          const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(
            ratifyAddress
          );

          const creatorUtxo = allCampaignUtxos.find((utxo) => {
            if (!utxo.output.plutusData) return false;
            try {
              const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
              return !!datum.fields[3];
            } catch {
              return false;
            }
          });

          if (!creatorUtxo) continue;

          if (!creatorUtxo.output.plutusData) continue;
          const creatorDatum = deserializeDatum<CreatorDatum>(
            creatorUtxo.output.plutusData
          );

          campaignDataList.push({
            campaignTitle: hexToString(creatorDatum.fields[0].bytes),
            creatorAddress: serializeAddressObj(creatorDatum.fields[1]),
            currentGoal: Number(creatorDatum.fields[2].int),
            campaignGoal: Number(creatorDatum.fields[3].fields[0].int),
            walletVK: cwalletVK,
            walletSK: cWalletSK,
            campaignIdHex: cCampaignIdHex,
            creatorUtxoRef: cCreatorUtxoRef,
          });
        }

        // Append dummy campaigns to list
        campaignDataList.push(...DUMMY_CAMPAIGN_DATA);

        setCampaignData(campaignDataList);
      } catch (err: any) {
        setError(err.message || "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [connected, blockchainProvider]);

  // Helper to detect dummy campaigns
  const isDummyCampaign = (campaign: campaignDataType) =>
    campaign.walletVK.startsWith("dummyVK");

  // Support campaign handler
  const handleSupportCampaign = (campaign: campaignDataType) => {
    if (isDummyCampaign(campaign)) {
      alert("This is a mock campaign. Please create a real campaign to interact.");
      return;
    }
    // Your real support logic here
    console.log("Support Campaign clicked for:", campaign.campaignTitle);
  };

  // Cancel campaign handler
  const handleCancelCampaign = (campaign: campaignDataType) => {
    if (isDummyCampaign(campaign)) {
      alert("This is a mock campaign. No real cancellation possible.");
      return;
    }
    // Your real cancel logic here
    console.log("Cancel Campaign clicked for:", campaign.campaignTitle);
  };

  // Fetch transaction history handler
  const fetchTransactionHistory = async (campaign: campaignDataType) => {
    if (isDummyCampaign(campaign)) {
      alert("This is a mock campaign. Please create a real campaign to view transaction history.");
      return;
    }

    if (!blockchainProvider) return;

    setShowHistoryFor(campaign.campaignIdHex);
    setTransactionHistory([]);
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const { ratifyAddress } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      const utxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);

      const txInfoList: TransactionInfo[] = utxos
        .filter((utxo: any) => utxo.input.txHash || utxo.input.tx_hash)
        .map((utxo: any) => ({
          txHash: utxo.input.txHash || utxo.input.tx_hash,
          blockHeight: utxo.blockHeight || utxo.block_height || 0,
        }));

      setTransactionHistory(txInfoList);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to fetch transaction history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6 py-6 border-b border-gray-700">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Active Campaigns
            </h1>
            <p className="mt-2 text-gray-400">
              Manage and support your ongoing fundraising campaigns
            </p>
          </div>
          <Button
            onClick={() => router.push("/start-campaign")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            Start New Campaign
          </Button>
        </div>

        {/* Wallet Connect */}
        {!connected && (
          <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex flex-col items-center justify-center gap-4">
              <h3 className="text-xl font-medium">Connect Your Wallet</h3>
              <p className="text-gray-400 text-center mb-4">
                Connect your Cardano wallet to view and manage your campaigns
              </p>
              <div className="w-full max-w-xs">
                <CardanoWallet label="Connect Wallet" />
              </div>
            </div>
          </div>
        )}

        {/* Loading & Error */}
        {loading && (
          <div className="flex flex-col items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-lg text-gray-300">Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* No campaigns */}
        {!loading && campaignData.length === 0 && connected && (
          <div className="text-center py-16">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 max-w-md mx-auto">
              <h3 className="text-2xl font-medium text-gray-200 mb-2">No Active Campaigns</h3>
              <p className="text-gray-400 mb-6">
                You haven't created any campaigns yet. Start your first fundraising campaign!
              </p>
              <Button
                onClick={() => router.push("/start-campaign")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Create Campaign
              </Button>
            </div>
          </div>
        )}

        {/* Campaign List */}
        <div className="space-y-8">
          {campaignData.map((campaign, idx) => (
            <Card
              key={idx}
              className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <CardHeader className="border-b border-gray-700">
                <CardTitle className="text-2xl font-bold text-white">
                  {campaign.campaignTitle}
                </CardTitle>
              </CardHeader>

              <CardContent className="py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-400 text-sm font-medium mb-1">Creator</h4>
                    <div className="bg-gray-900/50 px-4 py-3 rounded-lg border border-gray-700 break-all">
                      <p className="text-gray-300 font-mono text-sm">
                        {campaign.creatorAddress}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-gray-400 text-sm font-medium mb-1">Current Funds</h4>
                      <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-700/30 px-4 py-3 rounded-lg">
                        <p className="text-xl font-bold text-green-400">
                          {campaign.currentGoal} ADA
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-400 text-sm font-medium mb-1">Funding Goal</h4>
                      <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-700/30 px-4 py-3 rounded-lg">
                        <p className="text-xl font-bold text-blue-400">
                          {campaign.campaignGoal} ADA
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="py-6 border-t border-gray-700 flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 w-full">
                  <Button
                    variant="outline"
                    onClick={() => handleSupportCampaign(campaign)}
                  >
                    Support Campaign
                  </Button>

                  {address === campaign.creatorAddress && (
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelCampaign(campaign)}
                    >
                      Cancel Campaign
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => fetchTransactionHistory(campaign)}
                  >
                    View Transaction History
                  </Button>
                </div>

                {/* Transaction History Section */}
                {showHistoryFor === campaign.campaignIdHex && (
                  <div className="mt-4 w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 max-h-64 overflow-y-auto">
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Transaction History</h4>
                    {historyLoading && (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                      </div>
                    )}
                    {historyError && (
                      <p className="text-red-400 bg-red-900/30 p-3 rounded-lg">{historyError}</p>
                    )}
                    {!historyLoading && transactionHistory.length === 0 && (
                      <p className="text-gray-400 text-center py-4">No transactions found</p>
                    )}
                    <ul className="space-y-2">
                      {transactionHistory.map(tx => (
                        <li
                          key={tx.txHash}
                          className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <a
                            href={`https://preview.cardanoscan.io/transaction/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 group"
                          >
                            <span className="truncate flex-1">
                              {tx.txHash.slice(0, 20)}...{tx.txHash.slice(-6)}
                            </span>
                            <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded group-hover:bg-blue-800">
                              View
                            </span>
                          </a>
                          <div className="text-gray-500 text-sm mt-1">
                            Block: {tx.blockHeight}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveCampaigns;
