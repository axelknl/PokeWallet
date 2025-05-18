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

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
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

  // État d'initialisation des données
  private dataInitialized = false;
  private currentUserId: string | null = null;

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

  // Charge les cartes depuis Firestore
  private async loadCards(): Promise<void> {
    try {
      const user = this.userService.getCurrentUser();
      if (!user) {
        this.resetState();
        return;
      }

      // Charger depuis Firestore
      await this.loadCardsFromFirestore(true);
    } catch (error) {
      console.error('Erreur lors du chargement des cartes:', error);
      this.cardsLoaded.next(true);
    }
  }

  // Réinitialiser l'état quand l'utilisateur se déconnecte
  private resetState(): void {
    this.cardsSubject.next([]);
    this.totalValueSubject.next(0);
    this.cardsLoaded.next(false);
    this.dataInitialized = false;
    this.currentUserId = null;
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
    
    // Forcer un rechargement depuis Firestore
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
        
        // Mettre à jour la valeur totale
        this.calculateTotalValue();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la carte', error);
      throw error;
    }
  }
} 