import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { HistoryItem, HistoryActionType } from '../interfaces/history-item.interface';
import { UserService } from './user.service';
import { PokemonCard } from '../interfaces/pokemon-card.interface';

export type TimePeriod = '1week' | '1month' | '3months' | '6months' | '1year' | '2years';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private historyItemsSubject = new BehaviorSubject<HistoryItem[]>([]);
  public historyItems$ = this.historyItemsSubject.asObservable();
  private loading = false;

  constructor(
    private firestore: Firestore,
    private userService: UserService
  ) { }

  // Récupérer l'historique d'un utilisateur avec une période spécifique
  async loadUserHistoryWithPeriod(period: TimePeriod = '1week'): Promise<void> {
    if (this.loading) return;
    
    this.loading = true;
    
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) {
        this.historyItemsSubject.next([]);
        this.loading = false;
        return;
      }

      const startDate = this.getStartDateForPeriod(period);
      const userId = currentUser.id;
      const historyCollection = collection(this.firestore, 'history');
      
      const historyQuery = query(
        historyCollection,
        where('userId', '==', userId),
        where('date', '>=', startDate.toISOString()),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(historyQuery);
      
      const historyItems = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          userId: data.userId,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          actionType: data.actionType as HistoryActionType,
          cardName: data.cardName,
          cardId: data.cardId,
          cardImageUrl: data.cardImageUrl,
          purchaseDate: data.purchaseDate ? 
            (data.purchaseDate instanceof Timestamp ? 
              data.purchaseDate.toDate() : new Date(data.purchaseDate)) : undefined,
          saleDate: data.saleDate ? 
            (data.saleDate instanceof Timestamp ? 
              data.saleDate.toDate() : new Date(data.saleDate)) : undefined,
          purchasePrice: data.purchasePrice,
          salePrice: data.salePrice,
          profit: data.profit
        } as HistoryItem;
      });
      
      this.historyItemsSubject.next(historyItems);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      this.loading = false;
    }
  }

  // Récupérer la date de début pour une période donnée
  private getStartDateForPeriod(period: TimePeriod): Date {
    const now = new Date();
    const startDate = new Date(now);
    
    switch(period) {
      case '1week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2years':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      default:
        startDate.setDate(now.getDate() - 7); // Par défaut: 1 semaine
    }
    
    return startDate;
  }

  // Récupérer l'historique d'un utilisateur
  async loadUserHistory(): Promise<void> {
    // Par défaut, charger 1 semaine d'historique
    await this.loadUserHistoryWithPeriod('1week');
  }

  // Ajouter un élément à l'historique lors de l'ajout d'une carte
  async addHistoryEntry(card: PokemonCard): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) return;

      const userId = currentUser.id;
      
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
      
      // Ajouter à Firestore
      const historyCollection = collection(this.firestore, 'history');
      await addDoc(historyCollection, {
        ...historyItem,
        date: historyItem.date.toISOString(),
        purchaseDate: historyItem.purchaseDate ? historyItem.purchaseDate.toISOString() : null
      });
      
      // Mettre à jour le BehaviorSubject
      const currentItems = this.historyItemsSubject.getValue();
      this.historyItemsSubject.next([
        { ...historyItem, id: 'temp-id' } as HistoryItem, 
        ...currentItems
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'ajout à l\'historique:', error);
    }
  }

  // Ajouter un élément à l'historique lors de la vente d'une carte
  async addSaleHistoryEntry(card: PokemonCard, salePrice: number, saleDate?: Date): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) return;

      const userId = currentUser.id;
      const actionDate = new Date();
      const saleDateObj = saleDate || actionDate;
      
      // Calculer le profit si un prix d'achat existe
      let profit = undefined;
      if (card.purchasePrice !== undefined) {
        profit = salePrice - card.purchasePrice;
      }
      console.log(card.purchasePrice);
      console.log(salePrice);
      console.log(profit);
      
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
      
      // Ajouter à Firestore
      const historyCollection = collection(this.firestore, 'history');
      await addDoc(historyCollection, {
        ...historyItem,
        date: historyItem.date.toISOString(),
        purchaseDate: historyItem.purchaseDate ? historyItem.purchaseDate.toISOString() : null,
        saleDate: saleDateObj.toISOString()
      });
      
      // Mettre à jour le BehaviorSubject
      const currentItems = this.historyItemsSubject.getValue();
      this.historyItemsSubject.next([
        { ...historyItem, id: 'temp-id' } as HistoryItem, 
        ...currentItems
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vente à l\'historique:', error);
    }
  }
  
  // Ajouter un élément à l'historique lors de la suppression d'une carte
  async addDeleteHistoryEntry(card: PokemonCard): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) return;

      const userId = currentUser.id;
      
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
      
      // Ajouter à Firestore
      const historyCollection = collection(this.firestore, 'history');
      await addDoc(historyCollection, {
        ...historyItem,
        date: historyItem.date.toISOString(),
        purchaseDate: historyItem.purchaseDate ? historyItem.purchaseDate.toISOString() : null
      });
      
      // Mettre à jour le BehaviorSubject
      const currentItems = this.historyItemsSubject.getValue();
      this.historyItemsSubject.next([
        { ...historyItem, id: 'temp-id' } as HistoryItem, 
        ...currentItems
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la suppression à l\'historique:', error);
    }
  }
} 