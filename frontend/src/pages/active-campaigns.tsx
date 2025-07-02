import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  deserializeAddress,
  deserializeDatum,
  hexToString,
  mConStr0,
  mConStr1,
  mPubKeyAddress,
  serializeAddressObj,
  UTxO,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { BackerDatum, CreatorDatum } from "@/types/datums";
import { updateCurrentFunds } from "@/lib/updateCurrentFunds";

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
  const handleSupportCampaign = async (campaign: campaignDataType) => {
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      throw new Error("paramters not initialized in support campaign!");
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
          campaign.campaignIdHex, // campaign ID
          mPubKeyAddress(walletVK, walletSK, false), // backer address
          mPubKeyAddress(campaign.walletVK, campaign.walletSK), // creator address
      ]);

      // console.log("address:", address);
      // console.log("deserializeAddress(address):", deserializeAddress(address));
      // console.log("sk, vk:", walletVK, walletSK);
      console.log("ratifyPolicy:", ratifyPolicy);

      const unsignedTx = await txBuilder
        .mintPlutusScriptV3()
        .mint("1", ratifyPolicy, backerNftName)
        .mintingScript(ratifyValidatorScript)
        .mintRedeemerValue(mConStr1([]))
        .txOut(ratifyAddress, [ { unit: "lovelace", quantity: "30000000" } ])
        .txOutInlineDatumValue(backerDatum)
        .txOut(address, [ { unit: ratifyPolicy + backerNftName, quantity: "1" } ])
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address,
        )
        .requiredSignerHash(walletVK)
        .complete()

      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      console.log(`support campaign txHash: ${txHash}`);

      txBuilder.reset();
      refreshWalletState();
    } catch (err) {
      console.log(err);
      txBuilder.reset();
      refreshWalletState();
    }
  };

  const handleCancelCampaign = async (campaign: campaignDataType) => {
    // console.log("Cancel Campaign clicked for:", campaign.campaignTitle);
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      throw new Error("paramters not initialized in cancel campaign!");
    }

    try {
      const { ratifyAddress, ratifyValidatorScript } = await getValidator(
        campaign.walletVK,
        campaign.walletSK,
        campaign.campaignIdHex,
        blockchainProvider,
        campaign.creatorUtxoRef
      );
      console.log("campaign.creatorUtxoRef:", campaign.creatorUtxoRef);

      const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
      console.log("allCampaignUtxos:", allCampaignUtxos), "\n", allCampaignUtxos.length;

      const creatorUtxo = allCampaignUtxos.find((utxo) => {
        if (!utxo.output.plutusData) return false;
        const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
        return !!(datum.fields[3]);
      });
      if (!creatorUtxo) throw new Error("Creator Utxo not found!");
      console.log("creatorUtxo:", creatorUtxo, "\n", 1);

      const restCampaignUtxos = allCampaignUtxos.filter((utxo) => {
        const plutusData = utxo.output.plutusData;
        if (!plutusData) return false;
        const datum = deserializeDatum<BackerDatum>(plutusData);
        if (!datum.fields[2]) return false;

        return (utxo !== creatorUtxo);
      });
      console.log("restCampaignUtxos:", restCampaignUtxos, "\n", restCampaignUtxos.length);

      let initialTx = txBuilder
        .spendingPlutusScriptV3()
        .txIn(
          creatorUtxo.input.txHash,
          creatorUtxo.input.outputIndex,
          creatorUtxo.output.amount,
          creatorUtxo.output.address,
        )
        .txInScript(ratifyValidatorScript)
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue(mConStr0([]))

      for (let i = 0; i < restCampaignUtxos.length; i++) {
        initialTx = initialTx
          .spendingPlutusScriptV3()
          .txIn(
            restCampaignUtxos[i].input.txHash,
            restCampaignUtxos[i].input.outputIndex,
            restCampaignUtxos[i].output.amount,
            restCampaignUtxos[i].output.address,
          )
          .txInScript(ratifyValidatorScript)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr0([]))
      }

      // const creatorDatum = deserializeDatum<CreatorDatum>(creatorUtxo.output.plutusData!);
      // const creatorAddress = serializeAddressObj(creatorDatum.fields[1]);
      // initialTx = initialTx.txOut(creatorAddress, creatorUtxo.output.amount);

      for (let i = 0; i < restCampaignUtxos.length; i++) {
        const datum = deserializeDatum<BackerDatum>(restCampaignUtxos[i].output.plutusData!);
        const backerAddress = serializeAddressObj(datum.fields[1]);

        initialTx = initialTx
          .txOut(backerAddress, restCampaignUtxos[i].output.amount)
      }

      const unsignedTx = await initialTx
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address,
        )
        .requiredSignerHash(walletVK)
        .complete()

      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      console.log(`cancel campaign txHash: ${txHash}`);

      // remove cancelled campaign from local storage
      const restCampaigns = campaignInfoList.filter((cInfo) => cInfo.creatorUtxoRef !== campaign.creatorUtxoRef);
      replaceCampaignInfo(restCampaigns);

      txBuilder.reset();
      refreshWalletState();
    } catch(err) {
      console.log(err);
      txBuilder.reset();
      refreshWalletState();
    }
  };

  const handleUpdateCampaign = async (campaign: campaignDataType) => {
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      throw new Error("paramters not initialized in update current funds!");
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
        walletCollateral,
      );

      txBuilder.reset();
      refreshWalletState();
    } catch (err) {
      console.log(err);
      txBuilder.reset();
      refreshWalletState();
    }
  }

  const handleWithdrawFunds = async (campaign: campaignDataType) => {
    if (!blockchainProvider || !txBuilder || !walletCollateral) {
      throw new Error("paramters not initialized in update current funds!");
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

      let initialTx = txBuilder

      for (let i = 0; i < filteredCampaignUtxos.length; i++) {
        initialTx = initialTx
          .spendingPlutusScriptV3()
          .txIn(
            filteredCampaignUtxos[i].input.txHash,
            filteredCampaignUtxos[i].input.outputIndex,
            filteredCampaignUtxos[i].output.amount,
            filteredCampaignUtxos[i].output.address,
          )
          .txInScript(ratifyValidatorScript)
          .spendingReferenceTxInInlineDatumPresent()
          .spendingReferenceTxInRedeemerValue(mConStr1([]))
      }

      for (let i = 0; i < filteredCampaignUtxos.length; i++) {
        initialTx = initialTx
          .txOut(address, filteredCampaignUtxos[i].output.amount)
      }

      const unsignedTx = await initialTx
        .changeAddress(address)
        .selectUtxosFrom(walletUtxos)
        .txInCollateral(
          walletCollateral.input.txHash,
          walletCollateral.input.outputIndex,
          walletCollateral.output.amount,
          walletCollateral.output.address,
        )
        .requiredSignerHash(walletVK)
        .complete()

      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      console.log(`withdraw campaign funds txHash: ${txHash}`);

      // remove cancelled campaign from local storage
      const restCampaigns = campaignInfoList.filter((cInfo) => cInfo.creatorUtxoRef !== campaign.creatorUtxoRef);
      replaceCampaignInfo(restCampaigns);

      txBuilder.reset();
      refreshWalletState();
    } catch (err) {
      console.log(err);
      txBuilder.reset();
      refreshWalletState();
    }
  }

  // Fetch transaction history for a single campaign only
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

      // MaestroProvider workaround: fetch UTxOs instead of transactions
      const utxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
      console.log("Fetched UTXOs for campaign:", utxos);

      // Map UTxOs to transaction info
      const txInfoList: TransactionInfo[] = utxos
        .filter((utxo: any) => utxo.txHash || utxo.tx_hash) // filter valid tx hashes
        .map((utxo: any) => ({
          txHash: utxo.txHash || utxo.tx_hash,
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
                  variant="outline"
                  onClick={() => handleWithdrawFunds(campaign)}
                >
                  {/* This button is for testing  */}
                  Withdraw
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => fetchTransactionHistory(campaign)}
                >
                  View Campaign History
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleUpdateCampaign(campaign)}
                >
                  {/* This button is for testing  */}
                  Update Campaign CF
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
