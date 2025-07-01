import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Target } from 'lucide-react';

const Home = () => {
  const router = useRouter();

  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [totalCampaignCount, setTotalCampaignCount] = useState(0);
  const [totalRaised, setTotalRaised] = useState(0);

  useEffect(() => {
    const campaignsRaw = localStorage.getItem("campaigns");
    if (!campaignsRaw) {
      setActiveCampaignCount(0);
      setTotalCampaignCount(0);
      setTotalRaised(0);
      return;
    }

    try {
      const campaigns = JSON.parse(campaignsRaw);

      setTotalCampaignCount(campaigns.length);
      setActiveCampaignCount(campaigns.length); // Adjust if you have status info

      // Calculate total raised by summing currentGoal from each campaign
      // Assuming each campaign object has a currentGoal field (number)
      const totalRaisedAmount = campaigns.reduce((sum: number, campaign: any) => {
        // Defensive: check if currentGoal exists and is a number
        const raised = typeof campaign.currentGoal === 'number' ? campaign.currentGoal : 0;
        return sum + raised;
      }, 0);

      setTotalRaised(totalRaisedAmount);
    } catch (err) {
      console.error("Failed to parse campaigns from localStorage", err);
      setActiveCampaignCount(0);
      setTotalCampaignCount(0);
      setTotalRaised(0);
    }
  }, []);

  const stats = {
    totalCampaigns: totalCampaignCount,
    activeCampaigns: activeCampaignCount,
    totalRaised: totalRaised,
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-cardano-600 via-purple-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Fund the Future with Cardano
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Discover meaningful projects, support amazing causes, and make a real impact with transparent blockchain crowdfunding.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/start-campaign" passHref>
              <Button
                size="lg"
                className="bg-white text-cardano-600 hover:bg-blue-50 text-lg px-8 py-6 h-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start a Campaign
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
              onClick={() => router.push('/active-campaigns')}
            >
              Load Campaigns
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-cardano-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">{stats.totalCampaigns}</h3>
              <p className="text-slate-600">Total Campaigns</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">{stats.activeCampaigns}</h3>
              <p className="text-slate-600">Active Campaigns</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">{stats.totalRaised.toLocaleString()} ADA</h3>
              <p className="text-slate-600">Total Raised</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Discover Amazing Campaigns
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Support innovative projects and make a difference in communities around the world.
            </p>
          </div>

          {/* Search and campaigns removed as requested */}
        </div>
      </section>
    </div>
  );
};

export default Home;
