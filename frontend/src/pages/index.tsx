import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Target, ExternalLink } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';

const DUMMY_CAMPAIGNS_DATA = [
  {
    campaignTitle: "Mock Campaign 1",
    creatorAddress: "addr_test1qzmockaddress1",
    currentGoal: 18000,
    campaignGoal: 20000,
    walletVK: "dummyVK1",
    walletSK: "dummySK1",
    campaignIdHex: "64656d6f43616d706169676e31",
    creatorUtxoRef: {},
    isActive: true,
  },
  {
    campaignTitle: "Mock Campaign 2",
    creatorAddress: "addr_test1qzmockaddress2",
    currentGoal: 25000,
    campaignGoal: 25000,
    walletVK: "dummyVK2",
    walletSK: "dummySK2",
    campaignIdHex: "64656d6f43616d706169676e32",
    creatorUtxoRef: {},
    isActive: true,
  },
];

const Home = () => {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [totalCampaignCount, setTotalCampaignCount] = useState(0);
  const [totalRaised, setTotalRaised] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      const snapshot = await getDocs(collection(db, "campaigns"));
      const campaigns = snapshot.docs.map(doc => doc.data());

      const dummyCount = DUMMY_CAMPAIGNS_DATA.length;
      const activeCreatedCampaigns = campaigns.filter(c => c.isActive !== false);
      const activeCampaigns = dummyCount + activeCreatedCampaigns.length;
      const totalCampaigns = campaigns.length + dummyCount;

      const totalRaisedDummy = DUMMY_CAMPAIGNS_DATA.reduce((sum, c) => sum + (c.currentGoal || 0), 0);
      const totalRaisedCreated = activeCreatedCampaigns.reduce((sum, c) => sum + (c.currentGoal || 0), 0);
      const totalRaisedAmount = totalRaisedDummy + totalRaisedCreated;

      setActiveCampaignCount(activeCampaigns);
      setTotalCampaignCount(totalCampaigns);
      setTotalRaised(totalRaisedAmount);
      setCampaigns([...campaigns, ...DUMMY_CAMPAIGNS_DATA]);
    };

    loadStats();
  }, []);

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
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stats.totalCampaigns}</h3>
              <p className="text-gray-400">Total Campaigns</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stats.activeCampaigns}</h3>
              <p className="text-gray-400">Active Campaigns</p>
            </div>
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

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Discover Amazing Campaigns
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Support innovative projects and make a difference in communities around the world.
            </p>
          </div>
          {/* Additional content or campaigns can go here */}
        </div>
      </section>
    </div>
  );
};

export default Home;
