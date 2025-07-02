import { deserializeDatum, IWallet, mConStr0, mConStr1, mConStr2, MeshTxBuilder, mPubKeyAddress, UTxO } from "@meshsdk/core";
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
  walletCollateral: UTxO,
) => {
  const adminVK = "96cbb27c96daf8cab890de6d7f87f5ffd025bf8ac80717cbc4fae7da";

  try {
    const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
    const creatorUtxo = (allCampaignUtxos.filter((utxo: UTxO) => {
      if (!utxo.output.plutusData) {
        return false;
      }
      const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
      if (datum.fields[3]) {
        return true;
      }
      return false;
    }))[0];
    // console.log("allCampaignUtxos:", allCampaignUtxos);
    // console.log("creatorUtxo:", creatorUtxo);

    const restCampaignUtxos = allCampaignUtxos.filter((utxo: UTxO) => {
      const plutusData = utxo.output.plutusData;
      if (!plutusData) return false;
      const datum = deserializeDatum<BackerDatum>(plutusData);
      if (!datum.fields[2]) return false;

      return (utxo !== creatorUtxo);
    });
    console.log("restCampaignUtxos:", restCampaignUtxos, "\n", restCampaignUtxos.length);

    let updatedCurrentFunds = 0;

    for (let i = 0; i < restCampaignUtxos.length; i++) {
      updatedCurrentFunds += Number(restCampaignUtxos[i].output.amount[0].quantity) / 1000000
    }

    // don't run the transaction if there's no change in the current funds
    const plutusData = creatorUtxo.output.plutusData;
    if (!plutusData) return;
    const datum = deserializeDatum<CreatorDatum>(plutusData);
    if (datum.fields[2].int == updatedCurrentFunds) {
      console.log("Current funds already updated. No need to update again.");
      return
    };

    const updatedCreatorDatum = mConStr0([
        campaignId, // campaign ID
        mPubKeyAddress(walletVK, walletSK), // creator address
        updatedCurrentFunds, // current_funds
        mConStr1([Number(datum.fields[3].fields[0].int)]) // funding_goal (here it's fundEnd: 100 ADA)
    ]);

    const unsignedTx = await txBuilder
      .spendingPlutusScriptV3()
      .txIn(
        creatorUtxo.input.txHash,
        creatorUtxo.input.outputIndex,
        creatorUtxo.output.amount,
        creatorUtxo.output.address,
      )
      .txInScript(ratifyValidatorScript)
      .spendingReferenceTxInInlineDatumPresent()
      .spendingReferenceTxInRedeemerValue(mConStr2([]))
      .txOut(ratifyAddress, creatorUtxo.output.amount)
      // .txOut(ratifyAddress, [...creatorUtxo.output.amount, { unit: "lovelace", quantity: "3000000" }])
      .txOutInlineDatumValue(updatedCreatorDatum)
      .changeAddress(walletAddress)
      .selectUtxosFrom(walletUtxos)
      .txInCollateral(
        walletCollateral.input.txHash,
        walletCollateral.input.outputIndex,
        walletCollateral.output.amount,
        walletCollateral.output.address,
      )
      .requiredSignerHash(adminVK)
      .complete()

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    console.log(`update campaign txHash: ${txHash}`);

  } catch(err) {
    console.log("err:", err);
  }
}
