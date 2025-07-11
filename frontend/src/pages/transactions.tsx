import React, { useEffect, useState } from "react";
import { CardanoWallet, useAddress } from "@meshsdk/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  deserializeDatum,
  serializeAddressObj,
  hexToString,
  UTxO,
  deserializeDatum as deserializeDatumCore,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { CreatorDatum, BackerDatum } from "@/types/datums";
import axios from "axios";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type CampaignInfoType = {
  id?: string;
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
  isActive?: boolean;
  isCompleted?: boolean;
  currentGoal?: number;
  campaignGoal?: number;
};

type CampaignDataType = {
  id?: string;
  campaignTitle: string;
  creatorAddress: string;
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
  isActive?: boolean;
  isCompleted?: boolean;
  currentGoal?: number;
  campaignGoal?: number;
};

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
const BLOCKFROST_NETWORK = process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK || "preview";

const getBlockfrostApiUrl = () => {
  switch (BLOCKFROST_NETWORK) {
    case "mainnet":
      return "https://cardano-mainnet.blockfrost.io/api/v0";
    case "preprod":
      return "https://cardano-preprod.blockfrost.io/api/v0";
    case "preview":
    default:
      return "https://cardano-preview.blockfrost.io/api/v0";
  }
};

const getStatus = (campaign: CampaignDataType): "Active" | "Completed" | "Cancelled" => {
  if (campaign.isCompleted) return "Completed";
  if (campaign.isActive === false) return "Cancelled";
  if ((campaign.currentGoal ?? 0) >= (campaign.campaignGoal ?? Infinity)) return "Completed";
  return "Active";
};

export default function Transactions() {
  const router = useRouter();
  const address = useAddress();
  const { blockchainProvider } = useWallet();

  const [campaigns, setCampaigns] = useState<CampaignDataType[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [errorCampaigns, setErrorCampaigns] = useState<string | null>(null);

  const [campaignTxs, setCampaignTxs] = useState<Record<string, any[]>>({});
  const [loadingTxs, setLoadingTxs] = useState<Record<string, boolean>>({});
  const [errorTxs, setErrorTxs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!address || !blockchainProvider) {
      setCampaigns([]);
      return;
    }

    const loadCampaigns = async () => {
      setLoadingCampaigns(true);
      setErrorCampaigns(null);

      try {
        const snapshot = await getDocs(collection(db, "campaigns"));
        const stored: CampaignInfoType[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CampaignInfoType[];

        const campaignDataList: CampaignDataType[] = [];

        for (const c of stored) {
          const { walletVK, walletSK, campaignIdHex, creatorUtxoRef, id, isActive, isCompleted, currentGoal, campaignGoal } = c;

          const { ratifyAddress } = await getValidator(
            walletVK,
            walletSK,
            campaignIdHex,
            blockchainProvider!,
            creatorUtxoRef
          );

          const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);

          const creatorUtxo = allCampaignUtxos.find((utxo) => {
            if (!utxo.output.plutusData) return false;
            try {
              const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
              return !!datum.fields[3];
            } catch {
              return false;
            }
          });

          if (!creatorUtxo || !creatorUtxo.output.plutusData) continue;

          const creatorDatum = deserializeDatum<CreatorDatum>(creatorUtxo.output.plutusData);
          const creatorAddress = serializeAddressObj(creatorDatum.fields[1]);

          // Check if connected wallet is creator
          let isRelated = address.toLowerCase() === creatorAddress.toLowerCase();

          // If not creator, check if donor (backer)
          if (!isRelated) {
            // Check if wallet address owns backer NFTs for this campaign
            const backerUtxos = allCampaignUtxos.filter((utxo) => {
              if (!utxo.output.plutusData) return false;
              try {
                const datum = deserializeDatum<BackerDatum>(utxo.output.plutusData);
                // donor address is datum.fields[1]
                const donorAddress = serializeAddressObj(datum.fields[1]);
                return donorAddress.toLowerCase() === address.toLowerCase();
              } catch {
                return false;
              }
            });
            if (backerUtxos.length > 0) isRelated = true;
          }

          if (isRelated) {
            campaignDataList.push({
              id,
              campaignTitle: hexToString(creatorDatum.fields[0].bytes),
              creatorAddress,
              walletVK,
              walletSK,
              campaignIdHex,
              creatorUtxoRef,
              isActive,
              isCompleted,
              currentGoal,
              campaignGoal,
            });
          }
        }

        setCampaigns(campaignDataList);
      } catch (err: any) {
        setErrorCampaigns(err.message || "Failed to load campaigns");
      } finally {
        setLoadingCampaigns(false);
      }
    };

    loadCampaigns();
  }, [address, blockchainProvider]);

  const fetchCampaignTxs = async (campaign: CampaignDataType) => {
    if (campaignTxs[campaign.campaignIdHex]) return;

    setLoadingTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: true }));
    setErrorTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: "" }));

    try {
      const { ratifyAddress } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider!,
        campaign.creatorUtxoRef
      );

      const apiUrl = getBlockfrostApiUrl();

      const resp = await axios.get(
        `${apiUrl}/addresses/${ratifyAddress}/transactions?order=desc&count=20`,
        {
          headers: { project_id: BLOCKFROST_API_KEY },
        }
      );

      const txs = await Promise.all(
        resp.data.map(async (tx: any) => {
          const txHash = tx.tx_hash;

          const utxoResp = await axios.get(
            `${apiUrl}/txs/${txHash}/utxos`,
            {
              headers: { project_id: BLOCKFROST_API_KEY },
            }
          );

          const inputs = utxoResp.data.inputs;
          const outputs = utxoResp.data.outputs;

          const sumLovelaceForAddress = (utxos: any[], address: string) => {
            return utxos.reduce((sum, utxo) => {
              if (utxo.address === address) {
                const lovelaceAmount = utxo.amount.find(
                  (amt: any) => amt.unit === "lovelace"
                );
                return sum + (lovelaceAmount ? parseInt(lovelaceAmount.quantity) : 0);
              }
              return sum;
            }, 0);
          };

          const inputSum = sumLovelaceForAddress(inputs, ratifyAddress);
          const outputSum = sumLovelaceForAddress(outputs, ratifyAddress);

          const netLovelace = outputSum - inputSum;

          return {
            txHash,
            blockHeight: tx.block_height,
            blockTime: tx.block_time,
            amountAda: netLovelace / 1_000_000,
            direction: netLovelace > 0 ? "Receiving" : netLovelace < 0 ? "Spending" : "Neutral",
          };
        })
      );

      setCampaignTxs((prev) => ({
        ...prev,
        [campaign.campaignIdHex]: txs,
      }));
    } catch (err: any) {
      setErrorTxs((prev) => ({
        ...prev,
        [campaign.campaignIdHex]: err.message || "Failed to fetch transactions",
      }));
    } finally {
      setLoadingTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: false }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 flex flex-col">
      <div className="container mx-auto px-4 max-w-4xl flex-grow py-8">
        {!address ? (
          <>
            <h1 className="text-3xl font-bold mb-4 text-center">Your Campaigns & Transaction History</h1>
            <div className="mb-6 flex justify-center">
              <CardanoWallet label="Connect Wallet" persist={true} />
            </div>
            <p className="text-center">Please connect your wallet to see your campaigns and transactions.</p>
          </>
        ) : loadingCampaigns ? (
          <p className="text-center text-gray-300">Loading your campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">No Campaigns Found</h1>
            <Button
              onClick={() => router.push("/active-campaigns")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded shadow"
            >
              Load Campaigns
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6">Your Campaigns & Transaction History</h1>
            {campaigns.map((campaign) => {
              const status = getStatus(campaign);
              return (
                <div
                  key={campaign.campaignIdHex}
                  className="mb-10 border border-gray-700 rounded p-6 shadow-lg bg-gray-800"
                >
                  <h2 className="text-xl font-semibold mb-2 text-white">{campaign.campaignTitle}</h2>
                  <p className="mb-2 break-all">
                    Campaign ID: <code className="font-mono bg-gray-900 px-2 py-1 rounded">{campaign.campaignIdHex}</code>
                  </p>
                  <p className="mb-4">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        status === "Active"
                          ? "text-blue-400"
                          : status === "Completed"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {status}
                    </span>
                  </p>

                  <Button
                    onClick={() => fetchCampaignTxs(campaign)}
                    className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded shadow"
                  >
                    {campaignTxs[campaign.campaignIdHex] ? "Refresh Transaction History" : "Load Transaction History"}
                  </Button>

                  {loadingTxs[campaign.campaignIdHex] && <p>Loading transactions...</p>}
                  {errorTxs[campaign.campaignIdHex] && (
                    <p className="text-red-500">{errorTxs[campaign.campaignIdHex]}</p>
                  )}

                  {campaignTxs[campaign.campaignIdHex] &&
                    campaignTxs[campaign.campaignIdHex].length === 0 && (
                      <p>No transactions found for this campaign.</p>
                    )}

                  {campaignTxs[campaign.campaignIdHex] &&
                    campaignTxs[campaign.campaignIdHex].length > 0 && (
                      <ul className="list-disc list-inside space-y-2 max-h-64 overflow-y-auto text-gray-300">
                        {campaignTxs[campaign.campaignIdHex].map((tx: any) => (
                          <li key={tx.txHash} className="break-all flex justify-between items-center">
                            <a
                              href={`https://preview.cardanoscan.io/transaction/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline truncate max-w-[60%]"
                              title={tx.txHash}
                            >
                              {tx.txHash.slice(0, 12)}...
                            </a>
                            <div className="flex gap-4 items-center text-sm">
                              <span>
                                {tx.direction === "Receiving" && (
                                  <span className="text-green-400 font-semibold">+{tx.amountAda.toFixed(6)} ADA</span>
                                )}
                                {tx.direction === "Spending" && (
                                  <span className="text-red-400 font-semibold">-{Math.abs(tx.amountAda).toFixed(6)} ADA</span>
                                )}
                                {tx.direction === "Neutral" && <span className="text-gray-400">0 ADA</span>}
                              </span>
                              <span className="text-gray-400">| Block: {tx.blockHeight}</span>
                              <span className="text-gray-400">
                                | {new Date(tx.blockTime * 1000).toLocaleString()}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
