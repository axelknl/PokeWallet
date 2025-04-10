export enum HistoryActionType {
  AJOUT = 'ajout',
  ACHAT = 'achat',
  VENTE = 'vente',
  SUPPRESSION = 'suppression'
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
  profit?: number; // Gain ou perte (salePrice - purchasePrice)
} 