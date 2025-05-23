export interface PokemonCard {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  purchaseDate?: Date;
  purchasePrice?: number;
  addedDate: Date;
  isGraded?: boolean;
  lastModificationDate?: Date;
} 