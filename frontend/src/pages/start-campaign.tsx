import React, { useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mConStr0, mConStr1, mPubKeyAddress, stringToHex } from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";

export default function StartCampaign() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setIsSubmitting(true);

    // TODO: Implement actual campaign creation logic here (off-chain or on-chain)
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/");
    }, 1500);
  };

  const createCampaign = async () => {
    try {
      if (!walletCollateral || !blockchainProvider || !txBuilder) throw new Error("Paramters not set up correctly!");

      const campaignIdHex = stringToHex(formData.title);
      const {
        creatorUtxoRef,
        ratifyValidatorScript,
        ratifyPolicy,
        ratifyAddress,
        creatorNftName,
        creatorUtxoNFTName,
      } = await getValidator(
        walletVK,
        walletSK,
        campaignIdHex,
        blockchainProvider,
      );

      const creatorDatum = mConStr0([
          campaignIdHex, // campaign ID
          mPubKeyAddress(walletVK, walletSK), // creator address
          0, // current_funds
          mConStr1([Number(formData.targetAmount)]) // funding_goal (here it's fundEnd: 100 ADA)
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
        .txOut(ratifyAddress, [ { unit: ratifyPolicy + creatorUtxoNFTName, quantity: "1" } ])
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
        .complete()

        const signedTx = await wallet.signTx(unsignedTx);
        const txHash = await wallet.submitTx(signedTx);
        txBuilder.reset();

        console.log(`create campaign txHash: ${txHash}`);
    } catch(err) {
      console.log(err);
    }
  }

  const isFormValid =
    formData.title &&
    formData.description &&
    formData.targetAmount &&
    // formData.endDate &&
    formData.category;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Start Your Campaign
          </h1>
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
              {/* Example form fields */}
              <input
                className="w-full border p-2 rounded"
                placeholder="Title"
                value={formData.title}
                onChange={e => handleInputChange("title", e.target.value)}
              />
              <textarea
                className="w-full border p-2 rounded"
                placeholder="Description"
                value={formData.description}
                onChange={e => handleInputChange("description", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Target Amount (ADA)"
                type="number"
                value={formData.targetAmount}
                onChange={e => handleInputChange("targetAmount", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="End Date"
                type="date"
                value={formData.endDate}
                disabled={true}
                onChange={e => handleInputChange("endDate", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Category"
                value={formData.category}
                onChange={e => handleInputChange("category", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Image URL"
                value={formData.imageUrl}
                onChange={e => handleInputChange("imageUrl", e.target.value)}
              />

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    createCampaign();
                  }}
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
    </div>
  );
}
