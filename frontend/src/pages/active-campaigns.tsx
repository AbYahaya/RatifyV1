import React, { useEffect, useState } from "react";
import { CardanoWallet, useAddress } from "@meshsdk/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  deserializeDatum,
  serializeAddressObj,
  hexToString,
  UTxO,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { CreatorDatum } from "@/types/datums";

type CampaignInfoType = {
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
};

type CampaignDataType = {
  campaignTitle: string;
  creatorAddress: string;
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
};

type TxInfo = {
  hash: string;
  block_height: number;
  block_time: number;
};

export default function Transactions() {
  const router = useRouter();
  const address = useAddress();
  const { blockchainProvider } = useWallet();

  const [campaigns, setCampaigns] = useState<CampaignDataType[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [errorCampaigns, setErrorCampaigns] = useState<string | null>(null);

  const [campaignTxs, setCampaignTxs] = useState<Record<string, TxInfo[]>>({});
  const [loadingTxs, setLoadingTxs] = useState<Record<string, boolean>>({});
  const [errorTxs, setErrorTxs] = useState<Record<string, string>>({});

  // Load campaigns using blockchainProvider and SDK utilities
  useEffect(() => {
    if (!address || !blockchainProvider) {
      setCampaigns([]);
      return;
    }

    const loadCampaigns = async () => {
      setLoadingCampaigns(true);
      setErrorCampaigns(null);

      try {
        const stored = localStorage.getItem("campaigns");
        if (!stored) {
          setCampaigns([]);
          setLoadingCampaigns(false);
          return;
        }

        const parsed: CampaignInfoType[] = JSON.parse(stored);
        const campaignDataList: CampaignDataType[] = [];

        for (const c of parsed) {
          const { walletVK, walletSK, campaignIdHex, creatorUtxoRef } = c;

          const { ratifyAddress } = await getValidator(
            walletVK,
            walletSK,
            campaignIdHex,
            blockchainProvider,
            creatorUtxoRef
          );

          // Fetch all UTxOs at the validator address
          const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);

          // Find the creator UTxO with inline datum containing funding goal
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

          // Normalize addresses for case-insensitive comparison
          if (address.toLowerCase() === creatorAddress.toLowerCase()) {
            campaignDataList.push({
              campaignTitle: hexToString(creatorDatum.fields[0].bytes),
              creatorAddress,
              walletVK,
              walletSK,
              campaignIdHex,
              creatorUtxoRef,
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

  // Fetch transactions for a campaign using Blockfrost API
  const fetchTxHashes = async (address: string) => {
    const resp = await fetch(
      `https://cardano-preview.blockfrost.io/api/v0/addresses/${address}/transactions?order=desc&count=10`,
      {
        headers: { project_id: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "" },
      }
    );
    if (!resp.ok) throw new Error("Failed to fetch transaction hashes");
    return resp.json();
  };

  const fetchTxDetails = async (txHash: string) => {
    const resp = await fetch(
      `https://cardano-preview.blockfrost.io/api/v0/txs/${txHash}`,
      {
        headers: { project_id: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "" },
      }
    );
    if (!resp.ok) throw new Error("Failed to fetch transaction details");
    return resp.json();
  };

  const fetchCampaignTxs = async (campaign: CampaignDataType) => {
    if (campaignTxs[campaign.campaignIdHex]) return; // Already loaded
    if (!blockchainProvider) return; // Prevent passing null

    setLoadingTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: true }));
    setErrorTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: "" }));

    try {
      const { ratifyAddress } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      const txHashesResp = await fetchTxHashes(ratifyAddress);
      const txDetails = await Promise.all(
        txHashesResp.map((tx: any) => fetchTxDetails(tx.tx_hash))
      );

      setCampaignTxs((prev) => ({
        ...prev,
        [campaign.campaignIdHex]: txDetails,
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

  if (!address) {
    return (
      <div className="container mx-auto py-8 text-center text-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen px-4">
        <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
        <div className="mb-6 flex justify-center">
          <CardanoWallet label="Connect Wallet" persist={true} />
        </div>
        <p>Please connect your wallet to see your campaigns and transactions.</p>
      </div>
    );
  }

  if (!loadingCampaigns && campaigns.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center text-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen px-4">
        <h1 className="text-3xl font-bold mb-4">No Campaigns Found</h1>
        <Button
          onClick={() => router.push("/active-campaigns")}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded shadow"
        >
          Load Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl text-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Your Campaigns & Transaction History</h1>

      {loadingCampaigns && (
        <p className="text-center text-gray-300">Loading your campaigns...</p>
      )}
      {errorCampaigns && (
        <p className="text-red-500 bg-red-900/30 p-3 rounded mb-4">{errorCampaigns}</p>
      )}

      {campaigns.map((campaign) => (
        <div
          key={campaign.campaignIdHex}
          className="mb-10 border border-gray-700 rounded p-6 shadow-lg bg-gray-800"
        >
          <h2 className="text-xl font-semibold mb-4 text-white">{campaign.campaignTitle}</h2>
          <p className="mb-4 break-all">
            Campaign ID: <code className="font-mono bg-gray-900 px-2 py-1 rounded">{campaign.campaignIdHex}</code>
          </p>

          <Button
            onClick={() => fetchCampaignTxs(campaign)}
            className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded shadow"
          >
            Load Transaction History
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
                  <li key={tx.hash} className="break-all">
                    <a
                      href={`https://preview.cardanoscan.io/transaction/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {tx.hash.slice(0, 12)}...
                    </a>{" "}
                    | Block: {tx.block_height} | Time:{" "}
                    {new Date(tx.block_time * 1000).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
        </div>
      ))}
    </div>
  );
}
