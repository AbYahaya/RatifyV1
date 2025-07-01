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

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!connected || !blockchainProvider) return;

      setLoading(true);
      setError(null);

      try {
        const campaigns = localStorage.getItem("campaigns");
        if (!campaigns) {
          setCampaignData([]);
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

        setCampaignData(campaignDataList);
      } catch (err: any) {
        setError(err.message || "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [connected, blockchainProvider]);

  // Placeholder handlers for Support and Cancel buttons
  const handleSupportCampaign = (campaign: campaignDataType) => {
    console.log("Support Campaign clicked for:", campaign.campaignTitle);
    // Implementation to be added later
  };

  const handleCancelCampaign = (campaign: campaignDataType) => {
    console.log("Cancel Campaign clicked for:", campaign.campaignTitle);
    // Implementation to be added later
  };

  // Fetch transaction history for a campaign
  const fetchTransactionHistory = async (campaign: campaignDataType) => {
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

      // MaestroProvider does not have fetchAddressTransactions, so use fetchAddressUTxOs as a workaround
      const utxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
      console.log("Fetched UTXOs for campaign:", utxos);

      // Extract transaction hashes from UTXOs
      const txInfoList: TransactionInfo[] = utxos.map((utxo: any) => ({
        txHash: utxo.txHash || utxo.tx_hash || "Unknown TxHash",
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
    <div className="min-h-screen py-12 bg-white/50">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-10 flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-800">Active Campaigns</h1>
          <Button
            onClick={() => router.push("/start-campaign")}
            className="bg-cardano-600 hover:bg-cardano-700 text-white"
          >
            Start New Campaign
          </Button>
        </div>

        {/* Wallet Connect */}
        {!connected && (
          <div className="mb-6 flex justify-center">
            <CardanoWallet label="Connect Wallet to Load Campaigns" persist={true} />
          </div>
        )}

        {/* Loading & Error */}
        {loading && (
          <p className="text-center text-slate-700 text-lg font-medium">Loading campaigns...</p>
        )}
        {error && (
          <p className="text-center text-red-600 font-semibold">{error}</p>
        )}

        {/* No campaigns */}
        {!loading && campaignData.length === 0 && connected && (
          <p className="text-center text-slate-600 text-lg font-medium">
            No active campaigns found.
          </p>
        )}

        {/* Campaign List */}
        <div className="space-y-6">
          {campaignData.map((campaign, idx) => (
            <Card key={idx} className="gradient-card border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl text-slate-800">
                  {campaign.campaignTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  <strong>Creator:</strong>{" "}
                  <code className="font-mono text-sm">{campaign.creatorAddress}</code>
                </p>
                <p className="mb-1">
                  <strong>Current Funds:</strong> {campaign.currentGoal} ADA
                </p>
                <p>
                  <strong>Funding Goal:</strong> {campaign.campaignGoal} ADA
                </p>
              </CardContent>

              <CardFooter className="flex justify-end gap-4 pt-6 border-t">
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
                  View Campaign History
                </Button>
              </CardFooter>

              {/* Transaction History Section */}
              {showHistoryFor === campaign.campaignIdHex && (
                <div className="mt-4 p-4 bg-white border border-gray-300 rounded shadow-sm max-h-64 overflow-y-auto">
                  <h4 className="text-lg font-semibold mb-2">Transaction History</h4>
                  {historyLoading && <p>Loading transactions...</p>}
                  {historyError && <p className="text-red-600">{historyError}</p>}
                  {!historyLoading && transactionHistory.length === 0 && <p>No transactions found.</p>}
                  <ul className="list-disc list-inside space-y-1">
                    {transactionHistory.map(tx => (
                      <li key={tx.txHash} className="break-all">
                        <a
                          href={`https://preview.cardanoscan.io/transaction/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          TxHash: {tx.txHash}
                        </a>{" "}
                        (Block: {tx.blockHeight})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveCampaigns;
