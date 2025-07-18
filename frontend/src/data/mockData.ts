
import { Campaign, Transaction } from '@/types/campaign';

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    title: 'School Technology Upgrade',
    description: 'Help us bring modern technology to rural schools in developing countries. We need computers, tablets, and internet connectivity to give children access to quality education.',
    targetAmount: 5000,
    currentAmount: 3200,
    endDate: '2024-08-30',
    creator: 'addr1qxy2z8w9abc123...',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&h=300&fit=crop',
    category: 'Education',
    status: 'active',
  },
  {
    id: '2',
    title: 'Clean Water Initiative',
    description: 'Building water purification systems for communities without access to clean drinking water. Every donation helps save lives and improve health outcomes.',
    targetAmount: 8000,
    currentAmount: 6500,
    endDate: '2024-09-15',
    creator: 'addr1qxy2z8w9def456...',
    imageUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=500&h=300&fit=crop',
    category: 'Health',
    status: 'active',
  },
  {
    id: '3',
    title: 'Local Art Center',
    description: 'Creating a community space for artists to showcase their work and teach art classes to children and adults. Supporting local creativity and culture.',
    targetAmount: 3000,
    currentAmount: 2100,
    endDate: '2024-07-20',
    creator: 'addr1qxy2z8w9ghi789...',
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=500&h=300&fit=crop',
    category: 'Arts',
    status: 'active',
  },
  {
    id: '4',
    title: 'Environmental Restoration',
    description: 'Planting trees and restoring natural habitats damaged by deforestation. Join us in fighting climate change and preserving biodiversity.',
    targetAmount: 12000,
    currentAmount: 12000,
    endDate: '2024-06-30',
    creator: 'addr1qxy2z8w9jkl012...',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop',
    category: 'Environment',
    status: 'completed',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    campaignId: '1',
    campaignTitle: 'School Technology Upgrade',
    amount: 100,
    donor: 'addr1qxy2z8w9abc123...',
    timestamp: '2024-06-25T10:30:00Z',
    txHash: '0x1234567890abcdef...',
  },
  {
    id: '2',
    campaignId: '2',
    campaignTitle: 'Clean Water Initiative',
    amount: 250,
    donor: 'addr1qxy2z8w9abc123...',
    timestamp: '2024-06-24T15:45:00Z',
    txHash: '0xabcdef1234567890...',
  },
  {
    id: '3',
    campaignId: '1',
    campaignTitle: 'School Technology Upgrade',
    amount: 50,
    donor: 'addr1qxy2z8w9abc123...',
    timestamp: '2024-06-23T09:15:00Z',
    txHash: '0x567890abcdef1234...',
  },
];
