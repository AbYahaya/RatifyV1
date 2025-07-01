import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

const ActiveCampaigns = () => {
  const router = useRouter();
  const {
    connected,
    blockchainProvider,
  } = useWallet();

  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]);
  const [campaignData, setCampaignData] = useState<campaignDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
            return !!datum.fields[3];
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
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveCampaigns;
