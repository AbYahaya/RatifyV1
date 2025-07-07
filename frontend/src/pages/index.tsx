import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Target, ExternalLink } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';

const DEFAULT_IMAGE = "/default-campaign.png"; // Ensure this file exists in /public

type Campaign = {
  id: string;
  isActive?: boolean;
  imageUrl?: string;
  campaignTitle?: string;
  description?: string;
  currentGoal?: number;
  // Add other fields as needed
};

const Home = () => {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [totalCampaignCount, setTotalCampaignCount] = useState(0);
  const [totalRaised, setTotalRaised] = useState(0);

  // For highlight
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [highlightedCampaign, setHighlightedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const snapshot = await getDocs(collection(db, "campaigns"));
      const campaigns = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() } as Campaign)
      );

      const activeCreatedCampaigns = campaigns.filter(c => c.isActive !== false);
      const activeCampaignsCount = activeCreatedCampaigns.length;
      const totalCampaignsCount = campaigns.length;
      const totalRaisedAmount = campaigns.reduce((sum, c) => sum + (c.currentGoal || 0), 0);

      setActiveCampaignCount(activeCampaignsCount);
      setTotalCampaignCount(totalCampaignsCount);
      setTotalRaised(totalRaisedAmount);
      setCampaigns(campaigns);
      setActiveCampaigns(activeCreatedCampaigns);

      if (activeCreatedCampaigns.length > 0) {
        setHighlightedCampaign(activeCreatedCampaigns[0]);
      }
    };

    loadStats();
  }, []);

  // Change highlighted campaign every 7 seconds
  useEffect(() => {
    if (activeCampaigns.length === 0) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activeCampaigns.length);
      setHighlightedCampaign(activeCampaigns[randomIndex]);
    }, 7000);

    return () => clearInterval(interval);
  }, [activeCampaigns]);

  const stats = {
    totalCampaigns: totalCampaignCount,
    activeCampaigns: activeCampaignCount,
    totalRaised: totalRaised,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Fund the Future with Cardano
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Discover meaningful projects, support amazing causes, and make a real impact with transparent blockchain crowdfunding.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/start-campaign" passHref>
              <Button
                size="lg"
                className="bg-white text-cardano-600 hover:bg-blue-50 text-lg px-8 py-6 h-auto shadow-lg rounded-lg flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start a Campaign
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-300 hover:bg-white/10 text-lg px-8 py-6 h-auto shadow-sm rounded-lg flex items-center justify-center"
              onClick={() => router.push('/active-campaigns')}
            >
              Load Campaigns
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-300 hover:bg-white/10 text-lg px-8 py-6 h-auto shadow-sm rounded-lg flex items-center justify-center gap-2"
              onClick={() => window.open('https://github.com/AbYahaya/RatifyV1/blob/main/README.md', '_blank')}
            >
              Learn More
              <ExternalLink className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-900/70">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Total Campaigns (Clickable) */}
            <div
              className="text-center cursor-pointer hover:bg-gray-800 rounded-lg transition"
              onClick={() => router.push('/all-campaigns')}
              title="View all campaigns"
            >
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stats.totalCampaigns}</h3>
              <p className="text-gray-400">Total Campaigns</p>
            </div>
            {/* Active Campaigns (Clickable) */}
            <div
              className="text-center cursor-pointer hover:bg-gray-800 rounded-lg transition"
              onClick={() => router.push('/active-campaigns')}
              title="View active campaigns"
            >
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stats.activeCampaigns}</h3>
              <p className="text-gray-400">Active Campaigns</p>
            </div>
            {/* Total Raised */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stats.totalRaised.toLocaleString()} ADA</h3>
              <p className="text-gray-400">Total Raised</p>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Amazing Campaigns Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Discover Amazing Campaigns
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Support innovative projects and make a difference in communities around the world.
          </p>
        </div>
      </section>

      {/* Active Campaign Highlights Section */}
      {highlightedCampaign && (
        <section className="py-12">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="text-3xl font-extrabold mb-6 text-white text-center">
              Featured Active Campaign
            </h2>
            <div className="bg-gray-800 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-lg">
              <img
                src={
                  highlightedCampaign.imageUrl && highlightedCampaign.imageUrl.trim() !== ""
                    ? highlightedCampaign.imageUrl
                    : DEFAULT_IMAGE
                }
                alt={highlightedCampaign.campaignTitle}
                className="w-full md:w-64 h-64 object-cover rounded-xl shadow-md"
              />
              <div className="flex-1">
                <h3 className="text-3xl font-extrabold text-white mb-4">
                  {highlightedCampaign.campaignTitle}
                </h3>
                <p className="text-gray-300 line-clamp-4 mb-6">
                  {highlightedCampaign.description || "No description available."}
                </p>
                <Link
                  href={`/campaign/${highlightedCampaign.id}`}
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg font-extrabold shadow-lg hover:from-purple-700 hover:to-blue-700 transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Optional additional main content section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Add any additional content here if desired */}
        </div>
      </section>
    </div>
  );
};

export default Home;
