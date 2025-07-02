import {
  deserializeDatum,
  IWallet,
  mConStr0,
  mConStr1,
  mConStr2,
  MeshTxBuilder,
  mPubKeyAddress,
  UTxO,
} from "@meshsdk/core";
import { BackerDatum, CreatorDatum } from "@/types/datums.js";
import { BlockchainProviderType } from "@/types/general.js";

export const updateCurrentFunds = async (
  blockchainProvider: BlockchainProviderType,
  txBuilder: MeshTxBuilder,
  ratifyAddress: string,
  ratifyValidatorScript: string,
  campaignId: string,
  wallet: IWallet,
  walletAddress: string,
  walletVK: string,
  walletSK: string,
  walletUtxos: UTxO[],
  walletCollateral: UTxO
) => {
  const adminVK = "4248e9343c5ffafcb0e6b15b77c9150ac34987222b7482f821ada341";

  try {
    const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
    const creatorUtxo = allCampaignUtxos.find((utxo: UTxO) => {
      if (!utxo.output.plutusData) return false;
      const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
      return !!datum.fields[3];
    });
    if (!creatorUtxo) return;

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

    const plutusData = creatorUtxo.output.plutusData;
    if (!plutusData) return;
    const datum = deserializeDatum<CreatorDatum>(plutusData);
    if (datum.fields[2].int === updatedCurrentFunds) {
      console.log("Current funds already updated. No need to update again.");
      return;
    }

    const updatedCreatorDatum = mConStr0([
      campaignId,
      mPubKeyAddress(walletVK, walletSK),
      updatedCurrentFunds,
      mConStr1([Number(datum.fields[3].fields[0].int)]),
    ]);

    const unsignedTx = await txBuilder
      .spendingPlutusScriptV3()
      .txIn(
        creatorUtxo.input.txHash,
        creatorUtxo.input.outputIndex,
        creatorUtxo.output.amount,
        creatorUtxo.output.address
      )
      .txInScript(ratifyValidatorScript)
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(mConStr2([]))
      .txOut(ratifyAddress, creatorUtxo.output.amount)
      .txOutInlineDatumValue(updatedCreatorDatum)
      .changeAddress(walletAddress)
      .selectUtxosFrom(walletUtxos)
      .txInCollateral(
        walletCollateral.input.txHash,
        walletCollateral.input.outputIndex,
        walletCollateral.output.amount,
        walletCollateral.output.address
      )
      .requiredSignerHash(adminVK)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    console.log(`update campaign txHash: ${txHash}`);
  } catch (err) {
    console.log("err:", err);
  }
};
