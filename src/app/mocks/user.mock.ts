import { User } from '../interfaces/user.interface';

export const MOCK_USER: User = {
  id: '1',
  username: 'JohnDoe',
  email: 'john.doe@example.com',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date(),
  totalCards: 3,
  collectionValue: 299.99,
  totalProfit: 100,
  isProfilPublic: true
}; 