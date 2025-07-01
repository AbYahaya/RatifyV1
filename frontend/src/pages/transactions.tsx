import React, { useEffect, useState } from "react";
import { CardanoWallet, useAddress } from "@meshsdk/react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  deserializeDatum,
  serializeAddressObj,
  hexToString,
} from "@meshsdk/core";
import { getValidator } from "@/lib/contract";
import { CreatorDatum } from "@/types/datums";

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
const BLOCKFROST_API_URL = "https://cardano-preview.blockfrost.io/api/v0";

async function fetchTxHashes(address: string) {
  const resp = await fetch(
    `${BLOCKFROST_API_URL}/addresses/${address}/transactions?order=desc&count=10`,
    {
      headers: { project_id: BLOCKFROST_API_KEY! },
    }
  );
  if (!resp.ok) throw new Error("Failed to fetch transactions");
  return resp.json();
}

async function fetchTxDetails(txHash: string) {
  const resp = await fetch(`${BLOCKFROST_API_URL}/txs/${txHash}`, {
    headers: { project_id: BLOCKFROST_API_KEY! },
  });
  if (!resp.ok) throw new Error("Failed to fetch transaction details");
  return resp.json();
}

type CampaignInfoType = {
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: any;
};

type CampaignDataType = {
  campaignTitle: string;
  creatorAddress: string;
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: any;
};

type TxInfo = {
  hash: string;
  block_height: number;
  block_time: number;
};

export default function Transactions() {
  const router = useRouter();
  const address = useAddress();

  const [campaigns, setCampaigns] = useState<CampaignDataType[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [errorCampaigns, setErrorCampaigns] = useState<string | null>(null);

  // Map campaignIdHex -> list of TxInfo
  const [campaignTxs, setCampaignTxs] = useState<Record<string, TxInfo[]>>({});
  const [loadingTxs, setLoadingTxs] = useState<Record<string, boolean>>({});
  const [errorTxs, setErrorTxs] = useState<Record<string, string>>({});

  // Load campaigns created by connected wallet
  useEffect(() => {
    if (!address) {
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
            // @ts-ignore
            window.cardano ? window.cardano : undefined,
            creatorUtxoRef
          );

          // Fetch UTxOs at ratifyAddress to find creator datum
          const utxos = await fetch(
            `https://cardano-preview.blockfrost.io/api/v0/addresses/${ratifyAddress}/utxos`,
            {
              headers: { project_id: BLOCKFROST_API_KEY! },
            }
          ).then((res) => {
            if (!res.ok) throw new Error("Failed to fetch UTxOs");
            return res.json();
          });

          // Find the creator UTxO (with CreatorDatum)
          const creatorUtxo = utxos.find((utxo: any) => {
            if (!utxo.plutus_data && !utxo.data_hash) return false;
            try {
              const datumHex = utxo.plutus_data || utxo.data_hash;
              // You might need to fetch datum by hash if not inline, adjust accordingly
              // For now, skip if no inline datum
              if (!utxo.plutus_data) return false;
              const datum = deserializeDatum<CreatorDatum>(utxo.plutus_data);
              return !!datum.fields[3];
            } catch {
              return false;
            }
          });

          if (!creatorUtxo || !creatorUtxo.plutus_data) continue;

          const creatorDatum = deserializeDatum<CreatorDatum>(creatorUtxo.plutus_data);
          const creatorAddress = serializeAddressObj(creatorDatum.fields[1]);

          // Normalize addresses for comparison
          const normalizedConnectedAddress = address.toLowerCase();
          const normalizedCreatorAddress = creatorAddress.toLowerCase();

          // Filter: only include campaigns created by connected wallet
          if (normalizedConnectedAddress === normalizedCreatorAddress) {
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
  }, [address]);

  // Fetch transactions for a given campaign
  const fetchCampaignTxs = async (campaign: CampaignDataType) => {
    if (campaignTxs[campaign.campaignIdHex]) return; // Already loaded

    setLoadingTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: true }));
    setErrorTxs((prev) => ({ ...prev, [campaign.campaignIdHex]: "" }));

    try {
      const { ratifyAddress } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        // @ts-ignore
        window.cardano ? window.cardano : undefined,
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
      <div className="container mx-auto py-8">
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
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">No Campaigns Found</h1>
        <Button
          onClick={() => router.push("/active-campaigns")}
          className="bg-cardano-600 hover:bg-cardano-700 text-white px-6 py-3 rounded"
        >
          Load Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Your Campaigns & Transaction History</h1>

      {loadingCampaigns && <p>Loading your campaigns...</p>}
      {errorCampaigns && <p className="text-red-600">{errorCampaigns}</p>}

      {campaigns.map((campaign) => (
        <div
          key={campaign.campaignIdHex}
          className="mb-10 border border-gray-300 rounded p-6 shadow-lg bg-white dark:bg-slate-800"
        >
          <h2 className="text-xl font-semibold mb-4">{campaign.campaignTitle}</h2>
          <p className="mb-4">
            Campaign ID: <code className="font-mono">{campaign.campaignIdHex}</code>
          </p>

          <Button
            onClick={() => fetchCampaignTxs(campaign)}
            className="mb-4 bg-cardano-600 hover:bg-cardano-700 text-white px-4 py-2 rounded"
          >
            Load Transaction History
          </Button>

          {loadingTxs[campaign.campaignIdHex] && <p>Loading transactions...</p>}
          {errorTxs[campaign.campaignIdHex] && (
            <p className="text-red-600">{errorTxs[campaign.campaignIdHex]}</p>
          )}

          {campaignTxs[campaign.campaignIdHex] &&
            campaignTxs[campaign.campaignIdHex].length === 0 && (
              <p>No transactions found for this campaign.</p>
            )}

          {campaignTxs[campaign.campaignIdHex] &&
            campaignTxs[campaign.campaignIdHex].length > 0 && (
              <ul className="list-disc list-inside space-y-2 max-h-64 overflow-y-auto">
                {campaignTxs[campaign.campaignIdHex].map((tx: any) => (
                  <li key={tx.hash} className="break-all">
                    <a
                      href={`https://preview.cardanoscan.io/transaction/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
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
