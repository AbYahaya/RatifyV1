import {
  applyParamsToScript,
  builtinByteString,
  MaestroProvider,
  outputReference,
  pubKeyAddress,
  resolveScriptHash,
  serializePlutusScript,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import blueprint from "../../../smart_contracts/plutus.json" with { type: "json" };

const getValidator = async (
  walletVK: string,
  walletSK: string,
  campaignIdHex: string,
  blockchainProvider: MaestroProvider,
  creatorUtxoRef: UTxO
) => {
  const adminVK = "4248e9343c5ffafcb0e6b15b77c9150ac34987222b7482f821ada341";

  const creatorNftName = stringToHex("RTF-CC-") + campaignIdHex;
  const backerNftName = stringToHex("RTF-CB-") + campaignIdHex;
  const creatorUtxoNFTName = stringToHex("CC-UTXO");

  const ratifyValidator = blueprint.validators.filter((v) =>
    v.title.includes("ratify.ratify.mint")
  );
  const ratifyValidatorScript = applyParamsToScript(
    ratifyValidator[0].compiledCode,
    [
      builtinByteString(adminVK),
      pubKeyAddress(walletVK, walletSK),
      builtinByteString(campaignIdHex),
      outputReference(creatorUtxoRef.input.txHash, creatorUtxoRef.input.outputIndex),
    ],
    "JSON"
  );
  const ratifyPolicy = resolveScriptHash(ratifyValidatorScript, "V3");
  const ratifyAddress = serializePlutusScript(
    { code: ratifyValidatorScript, version: "V3" },
    undefined,
    0
  ).address;

  return {
    ratifyValidatorScript,
    ratifyPolicy,
    ratifyAddress,
    creatorNftName,
    backerNftName,
    creatorUtxoNFTName,
  };
};

export { getValidator };
