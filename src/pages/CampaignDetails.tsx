
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';
import { mockCampaigns } from '@/data/mockData';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Target, 
  Heart, 
  Share2, 
  Wallet,
  Clock,
  CheckCircle 
} from 'lucide-react';

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wallet, connectWallet } = useWallet();
  const [donationAmount, setDonationAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  const campaign = mockCampaigns.find(c => c.id === id);

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Campaign Not Found</h1>
          <Button onClick={() => navigate('/')} className="bg-cardano-600 hover:bg-cardano-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = (campaign.currentAmount / campaign.targetAmount) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDonation = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to make a donation.",
        variant: "destructive",
      });
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(donationAmount) > wallet.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough ADA in your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsDonating(true);

    try {
      // Mock donation transaction - in real app, this would interact with blockchain
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Donation Successful!",
        description: `You have successfully donated ${donationAmount} ADA to this campaign.`,
      });
      
      setDonationAmount('');
    } catch (error) {
      toast({
        title: "Donation Failed",
        description: "There was an error processing your donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDonating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Image */}
            {campaign.imageUrl && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={campaign.imageUrl}
                  alt={campaign.title}
                  className="w-full h-64 md:h-80 object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {campaign.status === 'active' && <Clock className="w-3 h-3 mr-1" />}
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/90 text-slate-700">
                    {campaign.category}
                  </Badge>
                </div>
              </div>
            )}

            {/* Campaign Info */}
            <Card className="gradient-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl text-slate-800 mb-2">
                      {campaign.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        by {campaign.creator.slice(0, 8)}...{campaign.creator.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {campaign.description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="gradient-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {campaign.currentAmount.toLocaleString()} ADA
                    </div>
                    <div className="text-slate-600">
                      raised of {campaign.targetAmount.toLocaleString()} ADA goal
                    </div>
                  </div>

                  <Progress value={progressPercentage} className="h-3" />

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {progressPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-slate-600">Funded</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {daysLeft > 0 ? daysLeft : 0}
                      </div>
                      <div className="text-sm text-slate-600">Days Left</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 justify-center">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Ends on {new Date(campaign.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Donation Card */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-cardano-600" />
                  Support This Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!wallet.isConnected ? (
                  <div className="text-center space-y-4">
                    <div className="bg-cardano-50 p-4 rounded-lg">
                      <Wallet className="w-8 h-8 text-cardano-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        Connect your wallet to support this campaign
                      </p>
                    </div>
                    <Button
                      onClick={connectWallet}
                      className="w-full bg-cardano-600 hover:bg-cardano-700 h-12"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-slate-700 font-medium">
                        Donation Amount (ADA)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="h-12"
                        min="1"
                        step="0.01"
                      />
                      <div className="text-sm text-slate-500">
                        Available balance: {wallet.balance.toFixed(2)} ADA
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[10, 50, 100].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setDonationAmount(amount.toString())}
                          className="h-10"
                        >
                          {amount} ADA
                        </Button>
                      ))}
                    </div>

                    <Button
                      onClick={handleDonation}
                      disabled={isDonating || !donationAmount || campaign.status !== 'active'}
                      className="w-full bg-cardano-600 hover:bg-cardano-700 h-12"
                    >
                      {isDonating ? 'Processing...' : 'Donate Now'}
                    </Button>

                    {campaign.status !== 'active' && (
                      <p className="text-sm text-slate-500 text-center">
                        This campaign is no longer accepting donations.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
