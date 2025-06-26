
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Campaign } from '@/types/campaign';
import { Calendar, User, Target } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const progressPercentage = (campaign.currentAmount / campaign.targetAmount) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

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
    <Link to={`/campaign/${campaign.id}`} className="block">
      <Card className="campaign-card h-full group">
        <CardHeader className="p-0">
          {campaign.imageUrl && (
            <div className="relative overflow-hidden rounded-t-xl">
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-4 left-4">
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-white/90 text-slate-700">
                  {campaign.category}
                </Badge>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-2 group-hover:text-cardano-600 transition-colors">
            {campaign.title}
          </h3>
          
          <p className="text-slate-600 mb-4 line-clamp-2">
            {campaign.description}
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Progress</span>
                <span className="text-sm font-medium">
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-slate-600">
                <Target className="w-4 h-4" />
                <span>{campaign.currentAmount} / {campaign.targetAmount} ADA</span>
              </div>
              
              <div className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <User className="w-3 h-3" />
              <span>by {campaign.creator.slice(0, 8)}...{campaign.creator.slice(-6)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CampaignCard;
