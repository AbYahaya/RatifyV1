import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deserializeDatum, hexToString, mConStr0, mConStr1, mPubKeyAddress, serializeAddressObj, stringToHex, UTxO } from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { CreatorDatum } from "@/types/datums";

// Simple toast component or replace with your UI library's toast
const Toast = ({ message, type }: { message: string; type: "success" | "error" }) => (
  <div
    className={`fixed top-4 right-4 px-4 py-2 rounded shadow-md font-semibold ${
      type === "success" ? "bg-green-500 text-white" : "bg-red-600 text-white"
    }`}
  >
    {message}
  </div>
);

type campaignInfoType = {
  walletVK: string,
  walletSK: string,
  campaignIdHex: string,
  creatorUtxoRef: UTxO,
};

type campaignDataType = {
  campaignTitle: string,
  creatorAddress: string,
  currentGoal: number,
  campaignGoal: number,
}

export default function StartCampaign() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [campaignInfo, setCampaignInfo] = useState<campaignInfoType[]>([]);
  const [campaignData, setCampaignData] = useState<campaignDataType[]>([]);

  const {
    connected,
    wallet,
    walletVK,
    walletSK,
    address,
    blockchainProvider,
    txBuilder,
    walletUtxos,
    walletCollateral,
  } = useWallet();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAmount: "",
    endDate: "",
    category: "",
    imageUrl: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid =
    formData.title.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.targetAmount.trim() !== "" &&
    !isNaN(Number(formData.targetAmount)) &&
    Number(formData.targetAmount) > 0 &&
    formData.category.trim() !== "";

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const campaigns = localStorage.getItem("campaigns");
        if (!campaigns || !blockchainProvider) return;

        const parsedCampaigns: campaignInfoType[] = JSON.parse(campaigns);
        setCampaignInfo(parsedCampaigns);

        const campaignData: campaignDataType[] = [];

        for (let i = 0; i < parsedCampaigns.length; i++) {
          const { walletVK: cwalletVK, walletSK: cWalletSK, campaignIdHex: cCampaignIdHex, creatorUtxoRef: cCreatorUtxoRef, } = parsedCampaigns[i];

          // if (!blockchainProvider) throw new Error("Blockchain provider doesn't exist");
          const { ratifyAddress } = await getValidator(cwalletVK, cWalletSK, cCampaignIdHex, blockchainProvider, cCreatorUtxoRef);

          const allCampaignUtxos = await blockchainProvider.fetchAddressUTxOs(ratifyAddress);
          console.log("allCampaignUtxos:", allCampaignUtxos), "\n", allCampaignUtxos.length;

          const creatorUtxo = allCampaignUtxos.find((utxo) => {
            if (!utxo.output.plutusData) return false;
            const datum = deserializeDatum<CreatorDatum>(utxo.output.plutusData);
            return !!(datum.fields[3]);
          });
          if (!creatorUtxo) throw new Error("Creator Utxo not found!");
          console.log("creatorUtxo:", creatorUtxo, "\n", 1);

          if (!creatorUtxo.output.plutusData) return false;
          const creatorDatum = deserializeDatum<CreatorDatum>(creatorUtxo.output.plutusData);
          const newCampaignData: campaignDataType = {
            campaignTitle: hexToString(creatorDatum.fields[0].bytes),
            creatorAddress: serializeAddressObj(creatorDatum.fields[1]),
            currentGoal: Number(creatorDatum.fields[2].int),
            campaignGoal: Number(creatorDatum.fields[3].fields[0].int),
          }

          campaignData.push(newCampaignData);
        }

        setCampaignData(campaignData);

        console.log("campaignInfo:", campaignInfo);
        console.log("campaignData:", campaignData);
      } catch(err) {
        console.log(err);
      }
    }

    if (blockchainProvider) loadCampaigns();
    console.log("connected:", connected);
    console.log("blockchainProvider:", blockchainProvider);
  }, [formData, blockchainProvider]);

  const createCampaign = async () => {
    if (!walletCollateral || !blockchainProvider || !txBuilder) {
      throw new Error("Wallet parameters not set up correctly!");
    }

    const campaignIdHex = stringToHex(formData.title);
    const creatorUtxoRef = walletUtxos[0];

    const {
      ratifyValidatorScript,
      ratifyPolicy,
      ratifyAddress,
      creatorNftName,
      creatorUtxoNFTName,
    } = await getValidator(walletVK, walletSK, campaignIdHex, blockchainProvider, creatorUtxoRef);

    const creatorDatum = mConStr0([
      campaignIdHex, // campaign ID
      mPubKeyAddress(walletVK, walletSK), // creator address
      0, // current_funds
      mConStr1([Number(formData.targetAmount)]), // funding_goal
    ]);

    const unsignedTx = await txBuilder
      .txIn(
        creatorUtxoRef.input.txHash,
        creatorUtxoRef.input.outputIndex,
        creatorUtxoRef.output.amount,
        creatorUtxoRef.output.address,
      )
      .mintPlutusScriptV3()
      .mint("1", ratifyPolicy, creatorNftName)
      .mintingScript(ratifyValidatorScript)
      .mintRedeemerValue(mConStr0([]))
      .mintPlutusScriptV3()
      .mint("1", ratifyPolicy, creatorUtxoNFTName)
      .mintingScript(ratifyValidatorScript)
      .mintRedeemerValue(mConStr0([]))
      .txOut(ratifyAddress, [{ unit: ratifyPolicy + creatorUtxoNFTName, quantity: "1" }])
      .txOutInlineDatumValue(creatorDatum)
      .changeAddress(address)
      .selectUtxosFrom(walletUtxos)
      .txInCollateral(
        walletCollateral.input.txHash,
        walletCollateral.input.outputIndex,
        walletCollateral.output.amount,
        walletCollateral.output.address,
      )
      .requiredSignerHash(walletVK)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    txBuilder.reset();

    const newCampaignInfo: campaignInfoType = { walletVK, walletSK, campaignIdHex, creatorUtxoRef };
    const updatedCampaignInfo = [...campaignInfo, newCampaignInfo];
    setCampaignInfo(updatedCampaignInfo);
    localStorage.setItem("campaigns", JSON.stringify(updatedCampaignInfo));

    return txHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !isFormValid) {
      setToast({ message: "Please fill all required fields correctly and connect your wallet.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const txHash = await createCampaign();
      setToast({ message: `Campaign created successfully! TxHash: ${txHash}`, type: "success" });
      // Redirect after a short delay to let user see the toast
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to create campaign: ${err.message || err}`, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Start Your Campaign</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Create a crowdfunding campaign and connect with supporters who believe in your vision.
          </p>
        </div>

        {/* Mesh CardanoWallet Connect Button */}
        <div className="mb-6 flex justify-center">
          <CardanoWallet label="Connect Wallet" persist={true} />
        </div>

        {address && (
          <div className="mb-6 text-sm text-gray-600 text-center">
            Connected as: <span className="font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
          </div>
        )}

        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                className="w-full border p-2 rounded"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
              <textarea
                className="w-full border p-2 rounded"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Target Amount (ADA)"
                type="number"
                min="0"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => handleInputChange("targetAmount", e.target.value)}
                required
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="End Date"
                type="date"
                value={formData.endDate}
                disabled={true}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                required
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Image URL"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
              />

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1 h-12"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!address || !isFormValid || isSubmitting}
                  className="flex-1 h-12 bg-cardano-600 hover:bg-cardano-700"
                >
                  {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
