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

const adminVK = "96cbb27c96daf8cab890de6d7f87f5ffd025bf8ac80717cbc4fae7da";

const getValidator = async (
  walletVK: string,
  walletSK: string,
  campaignIdHex: string,
  blockchainProvider: MaestroProvider,
  creatorUtxoRef: UTxO
) => {
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

export { adminVK, getValidator };
