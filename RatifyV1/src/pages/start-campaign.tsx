import React, { useState } from "react";
import { useRouter } from "next/router";
import { CardanoWallet, useAddress } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StartCampaign() {
  const router = useRouter();
  const address = useAddress();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isFormValid =
    formData.title &&
    formData.description &&
    formData.targetAmount &&
    formData.endDate &&
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
