import { Timestamp } from '@angular/fire/firestore';

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
  totalCards: number;
  collectionValue: number;
  totalProfit: number;
  isAdmin?: boolean;
  isProfilPublic: boolean;
  friends?: string[]; // IDs des amis
}

// Interface pour les données stockées dans Firestore
export interface FirestoreUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  createdAt: Date | Timestamp;
  lastLoginAt: Date | Timestamp;
  totalCards: number;
  collectionValue: number;
  totalProfit: number;
  isAdmin?: boolean;
  isProfilPublic: boolean;
  friends?: string[]; // IDs des amis
}

export interface LoginCredentials {
  username: string;
  password: string;
} 