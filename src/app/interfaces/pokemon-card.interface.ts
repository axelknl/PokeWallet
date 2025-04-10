export interface PokemonCard {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  addedDate: Date;
  purchaseDate?: Date;
  purchasePrice?: number;
  isGraded?: boolean;
  lastModificationDate?: Date;
} 