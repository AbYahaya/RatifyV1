import React, { useState, useMemo } from 'react';
import Link from 'next/link'; // Next.js Link
import { Button } from '@/components/ui/button';
import CampaignCard from '@/components/CampaignCard';
import SearchBar from '@/components/SearchBar';
import { mockCampaigns } from '@/data/mockData';
import { Plus, TrendingUp, Users, Target } from 'lucide-react';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCampaigns = useMemo(() => {
    return mockCampaigns.filter(campaign => {
      const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || campaign.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  const stats = {
    totalCampaigns: mockCampaigns.length,
    activeCampaigns: mockCampaigns.filter(c => c.status === 'active').length,
    totalRaised: mockCampaigns.reduce((sum, c) => sum + c.currentAmount, 0),
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
              <Link href="/start-campaign">
                <Button size="lg" className="bg-white text-cardano-600 hover:bg-blue-50 text-lg px-8 py-6 h-auto">
                  <Plus className="w-5 h-5 mr-2" />
                  Start a Campaign
                </Button>
              </Link>
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
  
            <SearchBar
              onSearch={setSearchQuery}
              onCategoryFilter={setCategoryFilter}
              onStatusFilter={setStatusFilter}
            />
  
            {filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-2">No campaigns found</h3>
                <p className="text-slate-600 mb-8">Try adjusting your search criteria or browse all campaigns.</p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="bg-cardano-600 hover:bg-cardano-700"
                >
                  View All Campaigns
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };
  
  export default Home;