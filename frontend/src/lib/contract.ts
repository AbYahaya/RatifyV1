import { applyParamsToScript, builtinByteString, MaestroProvider, outputReference, pubKeyAddress, resolveScriptHash, serializePlutusScript, stringToHex } from "@meshsdk/core";
import blueprint from "../../../smart_contracts/plutus.json" with { type: "json" }

const getValidator = async (walletVK: string, walletSK: string, campaignIdHex: string, blockchainProvider: MaestroProvider) => {
  const adminVK = walletVK;

  const creatorUtxoRef = (await blockchainProvider.fetchUTxOs("3e9057f7737acdd4d8edb6ed6ca2c80a1043be8e6cb2ec858982b23d58dddc10", 2))[0];

  const creatorNftName = stringToHex("RTF-CC-") + campaignIdHex;
  const backerNftName = stringToHex("RTF-CB-") + campaignIdHex;
  const creatorUtxoNFTName = stringToHex("CC-UTXO");

  const ratifyValidator = blueprint.validators.filter(v => (
    v.title.includes("ratify.ratify.mint")
  ));
  const ratifyValidatorScript = applyParamsToScript(
      ratifyValidator[0].compiledCode,
      [
          builtinByteString(adminVK), // admin
          pubKeyAddress(walletVK, walletSK), // creator address
          builtinByteString(campaignIdHex), // campaign id
          outputReference(creatorUtxoRef.input.txHash, creatorUtxoRef.input.outputIndex), // utxo_ref
      ],
      "JSON",
  );
  const ratifyPolicy = resolveScriptHash(ratifyValidatorScript, "V3");
  const ratifyAddress = serializePlutusScript(
      { code: ratifyValidatorScript, version: "V3" },
      undefined,
      0,
  ).address;

  return {
    creatorUtxoRef,
    ratifyValidatorScript,
    ratifyPolicy,
    ratifyAddress,
    creatorNftName,
    backerNftName,
    creatorUtxoNFTName,
  };
}

export { getValidator };
