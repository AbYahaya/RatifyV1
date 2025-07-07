import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type CampaignDataType = {
  id?: string;
  campaignTitle: string;
  creatorAddress: string;
  currentGoal: number;
  campaignGoal: number;
  isActive?: boolean;
  isCompleted?: boolean;
};

const getStatus = (campaign: CampaignDataType) => {
  if (campaign.isCompleted) return { label: "Completed", color: "text-green-400" };
  if (campaign.isActive === false) return { label: "Cancelled", color: "text-red-400" };
  if (campaign.currentGoal >= campaign.campaignGoal) return { label: "Completed", color: "text-green-400" };
  return { label: "Active", color: "text-blue-400" };
};

export default function AllCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "campaigns"));
        const storedCampaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CampaignDataType[];
        setCampaigns(storedCampaigns);
      } catch (err: any) {
        setError(err.message || "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading campaigns...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">All Campaigns</h1>
        {campaigns.length === 0 ? (
          <div className="text-center text-gray-400">No campaigns found.</div>
        ) : (
          <div className="space-y-6">
            {campaigns.map((campaign) => {
              const status = getStatus(campaign);
              return (
                <div
                  key={campaign.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-bold text-white">{campaign.campaignTitle}</div>
                    <div className="text-gray-400 text-sm flex items-center">
                      Creator:{" "}
                      <span
                        className="font-mono bg-gray-700 px-2 py-1 rounded truncate block ml-2 flex-1 min-w-0"
                        title={campaign.creatorAddress}
                      >
                        {campaign.creatorAddress}
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm">Goal: {campaign.campaignGoal} ADA</div>
                    <div className="text-gray-400 text-sm">Raised: {campaign.currentGoal} ADA</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`font-bold ${status.color}`}>{status.label}</span>
                    <Link
                      href={`/campaign/${campaign.id}`}
                      className="text-blue-400 hover:underline text-sm font-semibold"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
