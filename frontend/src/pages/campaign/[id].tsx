import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Campaign {
  id: string;
  campaignTitle: string;
  campaignGoal: number;
  currentGoal: number;
  creatorAddress: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  isCompleted?: boolean;
}

type CampaignStatus = "Active" | "Completed" | "Cancelled";

const DEFAULT_IMAGE = "/default-campaign.png"; // Your default image path

const getStatus = (campaign: Campaign): CampaignStatus => {
  if (campaign.isCompleted) return "Completed";
  if (campaign.isActive === false) return "Cancelled";
  if (campaign.currentGoal >= campaign.campaignGoal) return "Completed";
  return "Active";
};

export default function CampaignDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCampaign = async () => {
      setLoading(true);
      const ref = doc(db, "campaigns", id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) setCampaign({ id: snap.id, ...(snap.data() as Omit<Campaign, "id">) });
      setLoading(false);
    };
    fetchCampaign();
  }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!campaign) return <div className="text-center py-8">Campaign not found.</div>;

  const status = getStatus(campaign);
  const isSupportable = status === "Active";

  const imageUrl = campaign.imageUrl && campaign.imageUrl.trim() !== "" ? campaign.imageUrl : DEFAULT_IMAGE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-4">{campaign.campaignTitle}</h1>
          <div className="mb-4">
            <span
              className={`px-3 py-1 rounded-full font-semibold ${
                status === "Active"
                  ? "bg-blue-900 text-blue-400"
                  : status === "Completed"
                  ? "bg-green-900 text-green-400"
                  : "bg-red-900 text-red-400"
              }`}
            >
              {status}
            </span>
          </div>
          <img
            src={imageUrl}
            alt={campaign.campaignTitle}
            className="rounded-lg mb-6 w-full object-cover max-h-64"
          />
          <div className="mb-4 text-gray-400 text-sm flex items-center">
            Creator:{" "}
            <span
              className="font-mono bg-gray-700 px-2 py-1 rounded truncate block ml-2 flex-1 min-w-0"
              title={campaign.creatorAddress}
            >
              {campaign.creatorAddress}
            </span>
          </div>
          <div className="mb-4 flex gap-8">
            <div>
              <span className="text-gray-400">Goal:</span>{" "}
              <span className="font-bold text-blue-400">{campaign.campaignGoal} ADA</span>
            </div>
            <div>
              <span className="text-gray-400">Raised:</span>{" "}
              <span className="font-bold text-green-400">{campaign.currentGoal} ADA</span>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-white">Description</h2>
            <p className="text-gray-200 whitespace-pre-line">{campaign.description}</p>
          </div>
          {isSupportable && (
            <Link
              href={{
                pathname: "/active-campaigns",
                query: { highlight: campaign.id },
              }}
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:from-purple-700 hover:to-blue-700"
            >
              Support Campaign
            </Link>
          )}
          {!isSupportable && (
            <button
              disabled
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg font-bold opacity-60 cursor-not-allowed"
            >
              {status === "Completed" ? "Campaign Completed" : "Campaign Cancelled"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
