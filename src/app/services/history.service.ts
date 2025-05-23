import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, orderBy, getDocs, addDoc, Timestamp } from '@angular/fire/firestore';
import { BaseCacheService } from './base-cache.service';
import { HistoryItem, HistoryActionType } from '../interfaces/history-item.interface';
import { PokemonCard } from '../interfaces/pokemon-card.interface';

@Injectable({
  providedIn: 'root'
})
export class HistoryService extends BaseCacheService<HistoryItem[]> {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    super();
  }

  protected async fetchFromSource(userId: string): Promise<HistoryItem[]> {
    try {
      const historyRef = collection(this.firestore, 'history');
      const q = query(
        historyRef,
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date'] instanceof Timestamp ? data['date'].toDate() : new Date(data['date']),
          purchaseDate: data['purchaseDate'] ? 
            (data['purchaseDate'] instanceof Timestamp ? 
              data['purchaseDate'].toDate() : new Date(data['purchaseDate'])) : undefined,
          saleDate: data['saleDate'] ? 
            (data['saleDate'] instanceof Timestamp ? 
              data['saleDate'].toDate() : new Date(data['saleDate'])) : undefined
        } as HistoryItem;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  async addHistoryEntry(card: PokemonCard): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      const userId = currentUser.uid;
      
      // Déterminer le type d'action
      const actionType = (card.purchaseDate || card.purchasePrice) ? 
        HistoryActionType.ACHAT : 
        HistoryActionType.AJOUT;
      
      // Créer l'entrée d'historique
      const historyItem: Omit<HistoryItem, 'id'> = {
        userId: userId,
        date: new Date(),
        actionType: actionType,
        cardName: card.name,
        cardId: card.id,
        cardImageUrl: card.imageUrl,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice
      };
      
      await this.addToFirestore(historyItem);
      
      // Mettre à jour le cache
      const currentData = this.dataSubject.value || [];
      const updatedData = [{ ...historyItem, id: 'temp-id' } as HistoryItem, ...currentData];
      this.dataSubject.next(updatedData);
    } catch (error) {
      console.error('Erreur lors de l\'ajout à l\'historique:', error);
      throw error;
    }
  }

  async addSaleHistoryEntry(card: PokemonCard, salePrice: number, saleDate?: Date): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      const userId = currentUser.uid;
      const actionDate = new Date();
      const saleDateObj = saleDate || actionDate;
      
      // Calculer le profit si un prix d'achat existe
      let profit = undefined;
      if (card.purchasePrice !== undefined) {
        profit = salePrice - card.purchasePrice;
      }
      
      // Créer l'entrée d'historique
      const historyItem: Omit<HistoryItem, 'id'> = {
        userId: userId,
        date: actionDate,
        actionType: HistoryActionType.VENTE,
        cardName: card.name,
        cardId: card.id,
        cardImageUrl: card.imageUrl,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice,
        saleDate: saleDateObj,
        salePrice: salePrice,
        profit: profit
      };
      
      await this.addToFirestore(historyItem);
      
      // Mettre à jour le cache
      const currentData = this.dataSubject.value || [];
      const updatedData = [{ ...historyItem, id: 'temp-id' } as HistoryItem, ...currentData];
      this.dataSubject.next(updatedData);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vente à l\'historique:', error);
      throw error;
    }
  }

  async addDeleteHistoryEntry(card: PokemonCard): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      const userId = currentUser.uid;
      
      // Créer l'entrée d'historique
      const historyItem: Omit<HistoryItem, 'id'> = {
        userId: userId,
        date: new Date(),
        actionType: HistoryActionType.SUPPRESSION,
        cardName: card.name,
        cardId: card.id,
        cardImageUrl: card.imageUrl,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice
      };
      
      await this.addToFirestore(historyItem);
      
      // Mettre à jour le cache
      const currentData = this.dataSubject.value || [];
      const updatedData = [{ ...historyItem, id: 'temp-id' } as HistoryItem, ...currentData];
      this.dataSubject.next(updatedData);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la suppression à l\'historique:', error);
      throw error;
    }
  }

  private async addToFirestore(item: Omit<HistoryItem, 'id'>): Promise<void> {
    const historyRef = collection(this.firestore, 'history');
    await addDoc(historyRef, {
      ...item,
      date: item.date.toISOString(),
      purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString() : null,
      saleDate: item.saleDate ? item.saleDate.toISOString() : null
    });
  }
} 