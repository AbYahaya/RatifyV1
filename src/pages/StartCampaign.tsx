
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';
import { Wallet, Camera, Calendar, Target } from 'lucide-react';

const StartCampaign = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    endDate: '',
    category: '',
    imageUrl: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create a campaign.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Mock campaign creation - in real app, this would interact with blockchain
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Campaign Created!",
        description: "Your campaign has been successfully created and published.",
      });
      
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.title && formData.description && formData.targetAmount && 
                     formData.endDate && formData.category;

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

        {!wallet.isConnected && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-full">
                  <Wallet className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800 mb-1">
                    Connect Your Wallet
                  </h3>
                  <p className="text-amber-700">
                    You need to connect your Cardano wallet to create a campaign.
                  </p>
                </div>
                <Button
                  onClick={connectWallet}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Connect Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-700 font-medium">
                    Campaign Title *
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter your campaign title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 font-medium">
                    Category *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Environment">Environment</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your campaign, its goals, and how the funds will be used..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="min-h-32"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount" className="text-slate-700 font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Target Amount (ADA) *
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    placeholder="1000"
                    value={formData.targetAmount}
                    onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                    className="h-12"
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-slate-700 font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    End Date *
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="h-12"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-slate-700 font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Image URL (optional)
                </Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  className="h-12"
                />
                <p className="text-sm text-slate-500">
                  Add an image to make your campaign more appealing to potential supporters.
                </p>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!wallet.isConnected || !isFormValid || isSubmitting}
                  className="flex-1 h-12 bg-cardano-600 hover:bg-cardano-700"
                >
                  {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StartCampaign;
