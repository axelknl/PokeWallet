export enum HistoryActionType {
  AJOUT = 'ajout',
  ACHAT = 'achat',
  VENTE = 'vente',
  SUPPRESSION = 'suppression'
}

export type HistoryAction = 'ADD_CARD' | 'REMOVE_CARD' | 'UPDATE_CARD' | 'SELL_CARD';

export interface HistoryItemDetails {
  price?: number;
  condition?: string;
  oldValue?: any;
  newValue?: any;
}

export interface HistoryItem {
  id: string;
  userId: string;
  date: Date;
  actionType: HistoryActionType;
  cardName: string;
  cardId: string;
  cardImageUrl: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  saleDate?: Date;
  salePrice?: number;
  profit?: number;
} 