import { Injectable } from '@angular/core';
import { PokemonCard } from '../interfaces/pokemon-card.interface';
import { MOCK_POKEMON_CARDS } from '../mocks/pokemon-cards.mock';
import { UserService } from './user.service';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  getDoc
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { CollectionHistoryService } from './collection-history.service';
import { HistoryService } from './history.service';
import { HistoryActionType } from '../interfaces/history-item.interface';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
  private readonly STORAGE_KEY = 'pokemon_cards';
  private readonly TOTAL_VALUE_KEY = 'collection_total_value';
  private readonly CACHE_TIMESTAMP_KEY = 'cards_cache_timestamp';
  private readonly CARD_IDS_KEY = 'card_ids';
  private readonly CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes en millisecondes
  
  // Utiliser BehaviorSubject pour réagir aux changements
  private cardsSubject = new BehaviorSubject<PokemonCard[]>([]);
  private totalValueSubject = new BehaviorSubject<number>(0);
  private cardsLoaded = new BehaviorSubject<boolean>(false);
  
  // Exposer les observables
  public cards$ = this.cardsSubject.asObservable();
  public totalValue$ = this.totalValueSubject.asObservable();
  public cardsLoaded$ = this.cardsLoaded.asObservable();
  
  // Empêcher les rechargements multiples
  private isLoading = false;

  // Système de cache pour éviter les appels multiples à Firestore
  private dataInitialized = false;
  private currentUserId: string | null = null;
  private lastCardUpdate: number = 0;

  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private historyService: CollectionHistoryService,
    private userHistoryService: HistoryService
  ) {
    // Écouter les changements d'état d'authentification
    this.userService.authState$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        const user = this.userService.getCurrentUser();
        // Charger les cartes seulement si l'utilisateur est connecté et que ses données n'ont pas encore été chargées
        // ou si l'utilisateur a changé
        if (user && (!this.dataInitialized || this.currentUserId !== user.id)) {
          this.currentUserId = user.id;
          this.loadCards();
        }
      } else {
        // Réinitialiser l'état quand l'utilisateur se déconnecte
        this.resetState();
      }
    });
  }

  // Charge les cartes depuis le cache local ou Firestore si nécessaire
  private async loadCards(): Promise<void> {
    try {
      const user = this.userService.getCurrentUser();
      if (!user) {
        this.resetState();
        return;
      }

      // Vérifier le cache local d'abord
      const cachedData = await this.loadFromCache();

      if (cachedData) {
        // Utiliser les données du cache
        this.cardsSubject.next(cachedData.cards);
        this.totalValueSubject.next(cachedData.totalValue);
        this.cardsLoaded.next(true);
        this.dataInitialized = true;
        
        // Rechargement en arrière-plan si le cache est ancien
        if (this.isCacheExpired()) {
          this.loadCardsFromFirestore(false);
        }
      } else {
        // Aucun cache disponible, charger depuis Firestore
        await this.loadCardsFromFirestore(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cartes:', error);
      // En cas d'erreur, essayer de charger depuis Firestore
      await this.loadCardsFromFirestore(true);
    }
  }

  // Vérifie si le cache est expiré
  private isCacheExpired(): boolean {
    const now = Date.now();
    return now - this.lastCardUpdate > this.CACHE_EXPIRY_TIME;
  }

  // Charge les données depuis le cache local
  private async loadFromCache(): Promise<{cards: PokemonCard[], totalValue: number} | null> {
    try {
      const userId = this.currentUserId;
      if (!userId) return null;

      // Récupérer le timestamp du dernier cache
      const timestampResult = await Preferences.get({ key: `${this.CACHE_TIMESTAMP_KEY}_${userId}` });
      if (!timestampResult.value) return null;
      
      this.lastCardUpdate = parseInt(timestampResult.value);
      
      // Récupérer la liste des IDs de cartes
      const cardIdsResult = await Preferences.get({ key: `${this.CARD_IDS_KEY}_${userId}` });
      if (!cardIdsResult.value) return null;
      
      const cardIds = JSON.parse(cardIdsResult.value) as string[];
      
      // Récupérer chaque carte individuellement
      const cards: PokemonCard[] = [];
      for (const cardId of cardIds) {
        const cardResult = await Preferences.get({ key: `${this.STORAGE_KEY}_${userId}_${cardId}` });
        if (cardResult.value) {
          const card = JSON.parse(cardResult.value) as PokemonCard;
          
          // Convertir les dates
          card.addedDate = new Date(card.addedDate);
          if (card.purchaseDate) {
            card.purchaseDate = new Date(card.purchaseDate);
          }
          if (card.lastModificationDate) {
            card.lastModificationDate = new Date(card.lastModificationDate);
          }
          
          cards.push(card);
        }
      }
      
      // Si aucune carte n'a été récupérée, considérer que le cache est invalide
      if (cards.length === 0) return null;
      
      // Récupérer la valeur totale en cache
      const totalValueResult = await Preferences.get({ key: `${this.TOTAL_VALUE_KEY}_${userId}` });
      const totalValue = totalValueResult.value ? parseFloat(totalValueResult.value) : 0;
      
      return { cards, totalValue };
    } catch (error) {
      console.error('Erreur lors du chargement depuis le cache:', error);
      return null;
    }
  }

  // Sauvegarde les données dans le cache local
  private async saveToCache(cards: PokemonCard[], totalValue: number): Promise<void> {
    try {
      const userId = this.currentUserId;
      if (!userId) return;
      
      const now = Date.now();
      this.lastCardUpdate = now;
      
      // Sauvegarder le timestamp du cache
      await Preferences.set({
        key: `${this.CACHE_TIMESTAMP_KEY}_${userId}`,
        value: now.toString()
      });
      
      // Sauvegarder la liste des IDs de cartes
      const cardIds = cards.map(card => card.id);
      await Preferences.set({
        key: `${this.CARD_IDS_KEY}_${userId}`,
        value: JSON.stringify(cardIds)
      });
      
      // Sauvegarder chaque carte individuellement
      for (const card of cards) {
        try {
          await Preferences.set({
            key: `${this.STORAGE_KEY}_${userId}_${card.id}`,
            value: JSON.stringify(card)
          });
        } catch (cardError) {
          console.warn(`Impossible de sauvegarder la carte ${card.id} dans le cache:`, cardError);
          // Continuer avec les autres cartes même si une échoue
        }
      }
      
      // Sauvegarder la valeur totale
      await Preferences.set({
        key: `${this.TOTAL_VALUE_KEY}_${userId}`,
        value: totalValue.toString()
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans le cache:', error);
    }
  }

  // Supprime une carte du cache
  private async removeCardFromCache(cardId: string): Promise<void> {
    try {
      const userId = this.currentUserId;
      if (!userId) return;
      
      // Supprimer la carte du cache
      await Preferences.remove({ key: `${this.STORAGE_KEY}_${userId}_${cardId}` });
      
      // Mettre à jour la liste des IDs
      const cardIdsResult = await Preferences.get({ key: `${this.CARD_IDS_KEY}_${userId}` });
      if (cardIdsResult.value) {
        const cardIds = JSON.parse(cardIdsResult.value) as string[];
        const updatedCardIds = cardIds.filter(id => id !== cardId);
        
        await Preferences.set({
          key: `${this.CARD_IDS_KEY}_${userId}`,
          value: JSON.stringify(updatedCardIds)
        });
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression de la carte ${cardId} du cache:`, error);
    }
  }

  // Réinitialiser l'état quand l'utilisateur se déconnecte
  private resetState(): void {
    this.cardsSubject.next([]);
    this.totalValueSubject.next(0);
    this.cardsLoaded.next(false);
    this.dataInitialized = false;
    this.currentUserId = null;
    this.lastCardUpdate = 0;
  }

  // Charger les cartes depuis Firestore
  private async loadCardsFromFirestore(updateUI: boolean = true) {
    // Éviter les rechargements multiples simultanés
    if (this.isLoading) {
      return;
    }
    
    this.isLoading = true;
    
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) {
        if (updateUI) {
          this.cardsSubject.next([]);
          this.cardsLoaded.next(true);
        }
        this.isLoading = false;
        return;
      }

      const userId = currentUser.id;
      const cardsCollection = collection(this.firestore, 'users', userId, 'cards');
      const cardsQuery = query(cardsCollection, orderBy('addedDate', 'desc'));
      const snapshot = await getDocs(cardsQuery);

      const cards = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.name,
          imageUrl: data.imageUrl,
          price: data.price,
          addedDate: data.addedDate instanceof Timestamp ? data.addedDate.toDate() : data.addedDate,
          purchaseDate: data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : data.purchaseDate,
          purchasePrice: data.purchasePrice,
          isGraded: data.isGraded || false
        };
      });

      // Calculer la valeur totale
      const totalValue = cards.reduce((sum, card) => sum + card.price, 0);
      
      // Sauvegarder dans le cache local
      await this.saveToCache(cards, totalValue);

      if (updateUI) {
        // Mettre à jour le BehaviorSubject avec les nouvelles cartes
        this.cardsSubject.next(cards);
        this.totalValueSubject.next(totalValue);
        this.cardsLoaded.next(true);
        this.dataInitialized = true;
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des cartes depuis Firestore:', error);
      if (updateUI) {
        this.cardsLoaded.next(true);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Récupérer toutes les cartes
  getAllCards(): PokemonCard[] {
    return this.cardsSubject.getValue();
  }

  // Forcer le rechargement des cartes
  async reloadCards(): Promise<void> {
    // Vérifier si un chargement est déjà en cours
    if (this.isLoading) {
      return Promise.resolve();
    }
    
    // Si le cache existe et n'est pas expiré, simplement renvoyer les données en cache
    if (this.dataInitialized && !this.isCacheExpired()) {
      // Initialiser l'historique avec la valeur actuelle
      const totalValue = this.totalValueSubject.getValue();
      await this.historyService.initializeHistoryIfNeeded(totalValue);
      return Promise.resolve();
    }
    
    // Sinon, forcer un rechargement depuis Firestore
    return this.loadCardsFromFirestore().then(() => {
      // Initialiser l'historique avec la valeur actuelle si nécessaire
      const totalValue = this.totalValueSubject.getValue();
      this.historyService.initializeHistoryIfNeeded(totalValue);
    });
  }

  // Méthode pour ajouter une carte
  async addCard(cardData: Partial<PokemonCard>): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) throw new Error('Utilisateur non connecté');

      const userId = currentUser.id;
      const cardsCollection = collection(this.firestore, 'users', userId, 'cards');
      
      // Préparer l'objet à sauvegarder, y compris les nouveaux champs optionnels
      const cardToSave: any = {
        name: cardData.name || '',
        imageUrl: cardData.imageUrl || '',
        price: cardData.price || 0,
        addedDate: cardData.addedDate || new Date()
      };
      
      // Ajouter les champs optionnels s'ils existent
      if (cardData.purchaseDate) {
        cardToSave.purchaseDate = cardData.purchaseDate;
      }
      
      if (cardData.purchasePrice !== undefined) {
        cardToSave.purchasePrice = cardData.purchasePrice;
      }

      if (cardData.isGraded !== undefined) {
        cardToSave.isGraded = cardData.isGraded;
      }

      const docRef = await addDoc(cardsCollection, cardToSave);

      // Ajouter la carte en mémoire locale et mettre à jour le BehaviorSubject
      const newCard: PokemonCard = {
        id: docRef.id,
        ...cardToSave
      };
      
      const currentCards = this.cardsSubject.getValue();
      const updatedCards = [newCard, ...currentCards];
      this.cardsSubject.next(updatedCards);
      
      this.calculateTotalValue();
      // Mettre à jour les statistiques de l'utilisateur
      this.updateUserStats();
      
      // Ajouter une entrée dans l'historique des actions utilisateur
      await this.userHistoryService.addHistoryEntry(newCard);
      
      // Mettre à jour le cache
      await this.saveToCache(updatedCards, this.totalValueSubject.getValue());
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la carte:', error);
      throw error;
    }
  }

  // Récupérer une carte par son ID
  getCardById(cardId: string): PokemonCard | undefined {
    const cards = this.cardsSubject.getValue();
    return cards.find(card => card.id === cardId);
  }

  /**
   * Marque une carte comme vendue
   * @param cardId ID de la carte à vendre
   * @param salePrice Prix de vente
   * @param saleDate Date de vente (optionnel, par défaut la date actuelle)
   * @returns void
   */
  async sellCard(cardId: string, salePrice: number, saleDate?: Date): Promise<void> {
    try {
      const user = this.userService.getCurrentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Trouver la carte dans le cache local
      const card = this.cardsSubject.getValue().find(c => c.id === cardId);
      if (!card) {
        throw new Error('Carte non trouvée');
      }

      // Supprimer la carte de la base de données
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) throw new Error('Utilisateur non connecté');

      const userId = currentUser.id;
      await deleteDoc(doc(this.firestore, 'users', userId, 'cards', cardId)); 

      // Supprimer la carte en mémoire locale et mettre à jour le BehaviorSubject
      const currentCards = this.cardsSubject.getValue();
      const updatedCards = currentCards.filter(c => c.id !== cardId);
      this.cardsSubject.next(updatedCards);

      // Calculer le profit/perte si le prix d'achat est disponible
      let profit: number | undefined = undefined;
      if (card.purchasePrice !== undefined) {
        profit = salePrice - card.purchasePrice;
        
        // Mettre à jour le cumul des gains/pertes de l'utilisateur
        await this.userService.updateTotalProfit(profit);
      }

      // Enregistrer la vente dans l'historique
      await this.userHistoryService.addSaleHistoryEntry(card, salePrice, saleDate);

      // Mettre à jour la valeur de la collection
      this.calculateTotalValue();

      // Mettre à jour les statistiques de l'utilisateur
      this.updateUserStats();
      
      // Supprimer la carte du cache
      await this.removeCardFromCache(cardId);
      
      // Mettre à jour le reste du cache
      await this.saveToCache(updatedCards, this.totalValueSubject.getValue());
    } catch (error) {
      console.error('Erreur lors de la vente de la carte:', error);
      throw error;
    }
  }

  // Supprimer une carte
  async removeCard(cardId: string): Promise<void> {
    try {
      // Récupérer les infos de la carte avant suppression pour l'historique
      const card = this.getCardById(cardId);
      
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) throw new Error('Utilisateur non connecté');

      const userId = currentUser.id;
      await deleteDoc(doc(this.firestore, 'users', userId, 'cards', cardId));

      // Supprimer la carte en mémoire locale et mettre à jour le BehaviorSubject
      const currentCards = this.cardsSubject.getValue();
      const updatedCards = currentCards.filter(c => c.id !== cardId);
      this.cardsSubject.next(updatedCards);
      
      // Ajouter une entrée dans l'historique des suppressions si la carte existait
      if (card) {
        await this.userHistoryService.addDeleteHistoryEntry(card);
      }
      
      this.calculateTotalValue();
      // Mettre à jour les statistiques de l'utilisateur
      this.updateUserStats();
      
      // Supprimer la carte du cache
      await this.removeCardFromCache(cardId);
      
      // Mettre à jour le reste du cache
      await this.saveToCache(updatedCards, this.totalValueSubject.getValue());
    } catch (error) {
      console.error('Erreur lors de la suppression de la carte:', error);
      throw error;
    }
  }

  // Calculer la valeur totale de la collection
  private calculateTotalValue(): void {
    const cards = this.cardsSubject.getValue();
    const totalValue = cards.reduce((sum, card) => sum + card.price, 0);
    this.totalValueSubject.next(totalValue);
  }

  // Mettre à jour les statistiques de l'utilisateur
  private async updateUserStats(): Promise<void> {
    const cards = this.cardsSubject.getValue();
    const totalValue = this.totalValueSubject.getValue();
    await this.userService.updateCollectionStats(cards.length, totalValue);
    
    // Ajouter une entrée dans l'historique de la valeur
    await this.historyService.addCollectionHistoryEntry(totalValue);
  }

  // Récupérer la valeur totale de la collection
  getCollectionTotalValue(): number {
    return this.totalValueSubject.getValue();
  }

  // Récupérer la carte la plus chère
  getMostExpensiveCard(): PokemonCard | null {
    const cards = this.cardsSubject.getValue();
    if (cards.length === 0) return null;
    
    return cards.reduce((max, card) => 
      card.price > max.price ? card : max
    );
  }

  // Récupérer les 3 dernières cartes ajoutées
  getLatestCards(limit: number = 3): PokemonCard[] {
    const cards = this.cardsSubject.getValue();
    return cards.slice(0, Math.min(limit, cards.length));
  }

  /**
   * Met à jour une carte existante dans la collection
   * @param cardId L'ID de la carte à mettre à jour
   * @param cardData Les nouvelles données de la carte
   */
  async updateCard(cardId: string, cardData: Partial<PokemonCard>): Promise<void> {
    try {
      if (!this.userService.getCurrentUser()) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Ajouter la date de dernière modification
      const updatedCardData = {
        ...cardData,
        lastModificationDate: new Date()
      };
      
      // Obtenir la référence du document
      const cardDocRef = doc(this.firestore, `users/${this.userService.getCurrentUser()?.id}/cards/${cardId}`);
      
      // Mettre à jour les données sans toucher à la date d'ajout ou autres champs non fournis
      await updateDoc(cardDocRef, updatedCardData);
      
      // Mettre à jour le cache local
      const updatedIndex = this.cardsSubject.getValue().findIndex(card => card.id === cardId);
      if (updatedIndex !== -1) {
        const currentCards = this.cardsSubject.getValue();
        const updatedCard = {
          ...currentCards[updatedIndex],
          ...updatedCardData
        };
        const updatedCards = [
          ...currentCards.slice(0, updatedIndex),
          updatedCard,
          ...currentCards.slice(updatedIndex + 1)
        ];
        this.cardsSubject.next(updatedCards);
        
        // Mettre à jour le cache individuel pour cette carte
        try {
          const userId = this.currentUserId;
          if (userId) {
            await Preferences.set({
              key: `${this.STORAGE_KEY}_${userId}_${cardId}`,
              value: JSON.stringify(updatedCard)
            });
          }
        } catch (error) {
          console.warn(`Erreur lors de la mise à jour de la carte ${cardId} dans le cache:`, error);
        }
        
        // Mettre à jour la valeur totale
        this.calculateTotalValue();
        await Preferences.set({
          key: `${this.TOTAL_VALUE_KEY}_${this.currentUserId}`,
          value: this.totalValueSubject.getValue().toString()
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte', error);
      throw error;
    }
  }
  
  // Nettoie tout le cache pour l'utilisateur actuel
  async clearCache(): Promise<void> {
    try {
      const userId = this.currentUserId;
      if (!userId) return;
      
      // Récupérer la liste des IDs de cartes
      const cardIdsResult = await Preferences.get({ key: `${this.CARD_IDS_KEY}_${userId}` });
      if (cardIdsResult.value) {
        const cardIds = JSON.parse(cardIdsResult.value) as string[];
        
        // Supprimer chaque carte du cache
        for (const cardId of cardIds) {
          await Preferences.remove({ key: `${this.STORAGE_KEY}_${userId}_${cardId}` });
        }
      }
      
      // Supprimer les clés principales
      await Preferences.remove({ key: `${this.CARD_IDS_KEY}_${userId}` });
      await Preferences.remove({ key: `${this.TOTAL_VALUE_KEY}_${userId}` });
      await Preferences.remove({ key: `${this.CACHE_TIMESTAMP_KEY}_${userId}` });
      
      console.log('Cache nettoyé avec succès');
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
    }
  }
} 