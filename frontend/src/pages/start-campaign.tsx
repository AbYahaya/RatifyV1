import React, { useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { sanitizeForFirestore } from '@/lib/firestoreSanitizer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mConStr0,
  mConStr1,
  mPubKeyAddress,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { useWallet } from "@/components/WalletConnection";
import { getValidator } from "@/lib/contract";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";

const Toast = ({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) => (
  <div
    className={`fixed top-4 right-4 px-5 py-3 rounded-lg shadow-lg font-semibold z-50 ${
      type === "success"
        ? "bg-green-600 text-white"
        : "bg-red-700 text-white"
    }`}
  >
    {message}
  </div>
);

export type campaignInfoType = {
  walletVK: string;
  walletSK: string;
  campaignIdHex: string;
  creatorUtxoRef: any;
  currentGoal: number;
  isActive: boolean;
};

export default function StartCampaign() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const {
    walletReady,
    wallet,
    walletVK,
    walletSK,
    address,
    blockchainProvider,
    txBuilder,
    walletUtxos,
    walletCollateral,
    refreshWalletState,
    updateCampaignInfo, // will replace with Firestore addDoc
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
    } = await getValidator(
      walletVK,
      walletSK,
      campaignIdHex,
      blockchainProvider,
      creatorUtxoRef
    );

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
        creatorUtxoRef.output.address
      )
      .mintPlutusScriptV3()
      .mint("1", ratifyPolicy, creatorNftName)
      .mintingScript(ratifyValidatorScript)
      .mintRedeemerValue(mConStr0([]))
      .mintPlutusScriptV3()
      .mint("1", ratifyPolicy, creatorUtxoNFTName)
      .mintingScript(ratifyValidatorScript)
      .mintRedeemerValue(mConStr0([]))
      .txOut(ratifyAddress, [
        { unit: "lovelace", quantity: "2000000" },
        { unit: ratifyPolicy + creatorUtxoNFTName, quantity: "1" },
      ])
      .txOutInlineDatumValue(creatorDatum)
      .changeAddress(address!)
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
    const txHash = await wallet.submitTx(signedTx);
    txBuilder.reset();
    refreshWalletState();

    // Save campaign info to Firestore
    const newCampaignInfo: campaignInfoType = {
      walletVK,
      walletSK,
      campaignIdHex,
      creatorUtxoRef,
      isActive: true,
      currentGoal: 0,
    };
    const sanitizedCampaign = sanitizeForFirestore(newCampaignInfo);

    // Save sanitized data to Firestore
    await addDoc(collection(db, "campaigns"), sanitizedCampaign);

    return txHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !isFormValid) {
      setToast({
        message:
          "Please fill all required fields correctly and connect your wallet.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const txHash = await createCampaign();
      setToast({
        message: `Campaign created successfully! TxHash: ${txHash}`,
        type: "success",
      });
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      setToast({
        message: `Failed to create campaign: ${err.message || err}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Start Your Campaign</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Create a crowdfunding campaign and connect with supporters who believe in your vision.
          </p>
        </div>

        <div className="mb-6 flex justify-center">
          <CardanoWallet label="Connect Wallet" persist={true} />
        </div>

        {address && (
          <div className="mb-6 text-sm text-gray-400 text-center">
            Connected as:{" "}
            <span className="font-mono bg-gray-700 px-2 py-1 rounded">
              {address.slice(0, 8)}...{address.slice(-6)}
            </span>
          </div>
        )}

        <Card className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
              <textarea
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
                rows={5}
              />
              <input
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Target Amount (ADA)"
                type="number"
                min="0"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => handleInputChange("targetAmount", e.target.value)}
                required
              />
              <input
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 cursor-not-allowed"
                placeholder="End Date"
                type="date"
                value={formData.endDate}
                disabled={true}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
              />
              <input
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                required
              />
              <input
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                  disabled={!walletReady || !isFormValid || isSubmitting}
                  className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    </div>
  );
}
