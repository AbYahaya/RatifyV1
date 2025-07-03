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
  mConStr0,
  mConStr1,
  mPubKeyAddress,
  stringToHex,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { CreatorDatum, BackerDatum } from "@/types/datums";
import { updateCurrentFunds } from "@/lib/updateCurrentFunds";

type campaignInfoType = {
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: UTxO;
  isActive?: boolean;
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
  isActive?: boolean;
};

const DUMMY_CAMPAIGNS: campaignInfoType[] = [
  {
    walletVK: "64756d6d79564b3164756d6d79564b3164756d6d79564b3164756d6d",
    walletSK: "79564b3164756d6d64756d6d79564b3164756d6d79564b3164756d6d",
    campaignIdHex: "64656d6f43616d706169676e31",
    creatorUtxoRef: {
      input: { txHash: "d79564b3164756d664756d6d79564b3164756d6d79564b3164756d6d64756d6d", outputIndex: 0 },
      output: { amount: [], address: "" },
    } as UTxO,
    isActive: true,
  },
  {
    walletVK: "79564b3164756d6d64756d6d79564b3164756d6d79564b3164756d6d",
    walletSK: "64756d6d79564b3164756d6d79564b3164756d6d79564b3164756d6d",
    campaignIdHex: "64656d6f43616d706169676e32",
    creatorUtxoRef: {
      input: { txHash: "664756d6d7956d79564b3164756d4b3164756d6d79564b3164756d6d64756d6d", outputIndex: 0 },
      output: { amount: [], address: "" },
    } as UTxO,
    isActive: true,
  },
];

const DUMMY_CAMPAIGN_DATA: campaignDataType[] = [
  {
    campaignTitle: "Mock Campaign 1",
    creatorAddress: "addr_test1qzmockaddress1",
    currentGoal: 18000,
    campaignGoal: 20000,
    walletVK: stringToHex("dummyVK1"),
    walletSK: stringToHex("dummySK1"),
    campaignIdHex: "64656d6f43616d706169676e31",
    creatorUtxoRef: DUMMY_CAMPAIGNS[0].creatorUtxoRef,
    isActive: true,
  },
  {
    campaignTitle: "Mock Campaign 2",
    creatorAddress: "addr_test1qzmockaddress2",
    currentGoal: 25000,
    campaignGoal: 25000,
    walletVK: stringToHex("dummyVK2"),
    walletSK: stringToHex("dummySK2"),
    campaignIdHex: "64656d6f43616d706169676e32",
    creatorUtxoRef: DUMMY_CAMPAIGNS[1].creatorUtxoRef,
    isActive: true,
  },
];

const ActiveCampaigns = () => {
  const router = useRouter();
  const {
    connected,
    address,
    blockchainProvider,
    txBuilder,
    walletUtxos,
    walletVK,
    walletSK,
    walletCollateral,
    wallet,
    refreshWalletState,
    campaignInfoList,
    replaceCampaignInfo,
  } = useWallet();

  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]);
  const [campaignData, setCampaignData] = useState<campaignDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [adaSupportAmount, setAdaSupportAmount] = useState<string>("");

  useEffect(() => {
    const campaigns = localStorage.getItem("campaigns");
    if (!campaigns) {
      localStorage.setItem("campaigns", JSON.stringify(DUMMY_CAMPAIGNS));
    }
  }, []);

  const loadCampaigns = async () => {
    if (!connected || !blockchainProvider) return;

    setLoading(true);
    setError(null);

    try {
      const campaignsRaw = localStorage.getItem("campaigns");
      if (!campaignsRaw) {
        setCampaignData([...DUMMY_CAMPAIGN_DATA]);
        setLoading(false);
        return;
      }

      const parsedCampaigns: campaignInfoType[] = JSON.parse(campaignsRaw);
      setCampaignInfo(parsedCampaigns);

      const campaignDataList: campaignDataType[] = [];

      for (const c of parsedCampaigns) {
        if (c.isActive === false) continue; // skip inactive campaigns

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

        const restCampaignUtxos = allCampaignUtxos.filter((utxo: UTxO) => {
          const plutusData = utxo.output.plutusData;
          if (!plutusData) return false;
          const datum = deserializeDatum<BackerDatum>(plutusData);
          if (!datum.fields[2]) return false;
          return utxo !== creatorUtxo;
        });

        let updatedCurrentFunds = 0;
        for (const utxo of restCampaignUtxos) {
          updatedCurrentFunds += Number(utxo.output.amount[0].quantity) / 1000000;
        }

        const currentGoal = updatedCurrentFunds;

        // const currentGoal = Number(creatorDatum.fields[2].int);
        const campaignGoal = Number(creatorDatum.fields[3].fields[0].int);

        campaignDataList.push({
          campaignTitle: hexToString(creatorDatum.fields[0].bytes),
          creatorAddress: serializeAddressObj(creatorDatum.fields[1]),
          currentGoal,
          campaignGoal,
          walletVK: cwalletVK,
          walletSK: cWalletSK,
          campaignIdHex: cCampaignIdHex,
          creatorUtxoRef: cCreatorUtxoRef,
          isActive: true,
        });
      }

      // Add dummy campaigns (always active)
      campaignDataList.push(...DUMMY_CAMPAIGN_DATA);

      setCampaignData(campaignDataList);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [connected, blockchainProvider]);

  const isDummyCampaign = (campaign: campaignDataType) =>
    campaign.walletVK.startsWith("dummyVK");

  // Mark campaign inactive in localStorage and update context
  const markCampaignInactive = (campaignIdHex: string) => {
    const campaignsRaw = localStorage.getItem("campaigns");
    if (!campaignsRaw) return;

    let campaigns = JSON.parse(campaignsRaw);
    campaigns = (campaigns as campaignInfoType[]).map((c: campaignInfoType): campaignInfoType => {
      if (c.campaignIdHex === campaignIdHex) {
      return { ...c, isActive: false };
      }
      return c;
    });
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
    replaceCampaignInfo(campaigns);
  };

  const handleSupportCampaign = async (campaign: campaignDataType) => {
    if (isDummyCampaign(campaign)) {
      alert("This is a mock campaign. Please create a real campaign to interact.");
      return;
    }
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      alert("Wallet parameters not initialized for support!");
      return;
    }

    if (!adaSupportAmount) {
      alert("Please provide amount of support!");
      return;
    }

    try {
      const { ratifyAddress, ratifyValidatorScript, ratifyPolicy, backerNftName } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      const backerDatum = mConStr1([
        campaign.campaignIdHex,
        mPubKeyAddress(walletVK, walletSK, false),
        mPubKeyAddress(campaign.walletVK, campaign.walletSK),
      ]);

      const unsignedTx = await txBuilder
        .mintPlutusScriptV3()
        .mint("1", ratifyPolicy, backerNftName)
        .mintingScript(ratifyValidatorScript)
        .mintRedeemerValue(mConStr1([]))
        .txOut(ratifyAddress, [{ unit: "lovelace", quantity: String(Number(adaSupportAmount) * 1000000) }])
        .txOutInlineDatumValue(backerDatum)
        .txOut(address, [{ unit: ratifyPolicy + backerNftName, quantity: "1" }])
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address
        )
        .requiredSignerHash(walletVK)
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      await wallet.submitTx(signedTx);

      alert("Support transaction submitted successfully!");
      setAdaSupportAmount("");
      txBuilder.reset();
      refreshWalletState();
      await loadCampaigns();
    } catch (err) {
      alert("Support transaction failed: " + (err as Error).message);
      txBuilder.reset();
      refreshWalletState();
    }
  };

  const handleCancelCampaign = async (campaign: campaignDataType) => {
    if (isDummyCampaign(campaign)) {
      alert("This is a mock campaign. No real cancellation possible.");
      return;
    }
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      alert("Wallet parameters not initialized for cancel!");
      return;
    }

    try {
      const { ratifyAddress, ratifyValidatorScript } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);

      const creatorUtxo = allCampaignUtxos.find((utxo) => {
        if (!utxo.output.plutusData) return false;
        const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
        return !!datum.fields[3];
      });

      if (!creatorUtxo) throw new Error("Creator Utxo not found!");

      const restCampaignUtxos = allCampaignUtxos.filter((utxo) => {
        const plutusData = utxo.output.plutusData;
        if (!plutusData) return false;
        const datum = deserializeDatum<BackerDatum>(plutusData);
        if (!datum.fields[2]) return false;
        return utxo !== creatorUtxo;
      });

      let initialTx = txBuilder
        .spendingPlutusScriptV3()
        .txIn(
          creatorUtxo.input.txHash,
          creatorUtxo.input.outputIndex,
          creatorUtxo.output.amount,
          creatorUtxo.output.address
        )
        .txInScript(ratifyValidatorScript)
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue(mConStr0([]));

      for (const utxo of restCampaignUtxos) {
        initialTx = initialTx
          .spendingPlutusScriptV3()
          .txIn(
            utxo.input.txHash,
            utxo.input.outputIndex,
            utxo.output.amount,
            utxo.output.address
          )
          .txInScript(ratifyValidatorScript)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr0([]));
      }

      for (const utxo of restCampaignUtxos) {
        const datum = deserializeDatum<BackerDatum>(utxo.output.plutusData!);
        const backerAddress = serializeAddressObj(datum.fields[1]);
        initialTx = initialTx.txOut(backerAddress, utxo.output.amount);
      }

      const unsignedTx = await initialTx
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address
        )
        .requiredSignerHash(walletVK)
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      await wallet.submitTx(signedTx);

      alert("Cancel transaction submitted successfully!");

      // Mark campaign inactive locally
      markCampaignInactive(campaign.campaignIdHex);

      // Reload campaigns to update UI
      await loadCampaigns();

      txBuilder.reset();
      refreshWalletState();
    } catch (err) {
      alert("Cancel transaction failed: " + (err as Error).message);
      txBuilder.reset();
      refreshWalletState();
    }
  };

  const handleUpdateCampaign = async (campaign: campaignDataType) => {
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      alert("Wallet parameters not initialized for update!");
      return;
    }

    try {
      const { ratifyAddress, ratifyValidatorScript } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      await updateCurrentFunds(
        blockchainProvider,
        txBuilder,
        ratifyAddress,
        ratifyValidatorScript,
        campaign.campaignIdHex,
        wallet,
        address,
        campaign.walletVK,
        campaign.walletSK,
        walletUtxos,
        walletCollateral
      );

      alert("Update campaign funds transaction submitted successfully!");
      txBuilder.reset();
      refreshWalletState();
      await loadCampaigns();
    } catch (err) {
      alert("Update transaction failed: " + (err as Error).message);
      txBuilder.reset();
      refreshWalletState();
    }
  };

  const handleWithdrawFunds = async (campaign: campaignDataType) => {
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      alert("Wallet parameters not initialized for withdraw!");
      return;
    }

    try {
      const { ratifyAddress, ratifyValidatorScript } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );

      const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);

      const filteredCampaignUtxos = allCampaignUtxos.filter((utxo) => {
        const plutusData = utxo.output.plutusData;
        if (!plutusData) return false;
        if (deserializeDatum<BackerDatum>(plutusData)) {
          const datum = deserializeDatum<BackerDatum>(plutusData);
          if (!datum.fields[2]) return false;
        } else if (deserializeDatum<CreatorDatum>(plutusData)) {
          const datum = deserializeDatum<CreatorDatum>(plutusData);
          if (!datum.fields[3]) return false;
        }

        return true;
      });

      let initialTx = txBuilder;

      for (const utxo of filteredCampaignUtxos) {
        initialTx = initialTx
          .spendingPlutusScriptV3()
          .txIn(
            utxo.input.txHash,
            utxo.input.outputIndex,
            utxo.output.amount,
            utxo.output.address
          )
          .txInScript(ratifyValidatorScript)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr1([]));
      }

      for (const utxo of filteredCampaignUtxos) {
        initialTx = initialTx.txOut(address, utxo.output.amount);
      }

      const unsignedTx = await initialTx
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address
        )
        .requiredSignerHash(walletVK)
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      await wallet.submitTx(signedTx);

      alert("Withdraw transaction submitted successfully!");

      // Mark campaign inactive locally
      markCampaignInactive(campaign.campaignIdHex);

      txBuilder.reset();
      refreshWalletState();
      await loadCampaigns();
    } catch (err) {
      alert("Withdraw transaction failed: " + (err as Error).message);
      txBuilder.reset();
      refreshWalletState();
    }
  };

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

      const txInfoList = utxos
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
                  <input
                    className="text-black text-center"
                    type="text"
                    value={adaSupportAmount}
                    onChange={(e) => setAdaSupportAmount(e.target.value)}
                    disabled={campaign.currentGoal >= campaign.campaignGoal}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSupportCampaign(campaign)}
                    disabled={campaign.currentGoal >= campaign.campaignGoal}
                  >
                    Support Campaign
                  </Button>

                  {address === campaign.creatorAddress && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelCampaign(campaign)}
                      >
                        Cancel Campaign
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleUpdateCampaign(campaign)}
                        disabled={campaign.currentGoal < campaign.campaignGoal}
                      >
                        Update Campaign Funds
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleWithdrawFunds(campaign)}
                        disabled={campaign.currentGoal < campaign.campaignGoal}
                      >
                        Withdraw
                      </Button>
                    </>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => fetchTransactionHistory(campaign)}
                  >
                    View Transaction History
                  </Button>
                </div>

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
