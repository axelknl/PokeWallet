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
import { BehaviorSubject, Observable, firstValueFrom, map } from 'rxjs';
import { CollectionHistoryService } from './collection-history.service';
import { HistoryService } from './history.service';
import { HistoryActionType } from '../interfaces/history-item.interface';
import { BaseCacheService } from './base-cache.service';

/**
 * Service de gestion des cartes Pokémon avec mise en cache
 */
@Injectable({
  providedIn: 'root'
})
export class CardStorageService extends BaseCacheService<PokemonCard[]> {
  // BehaviorSubject additionnel pour la valeur totale
  private totalValueSubject = new BehaviorSubject<number>(0);
  
  // Observable public de la valeur totale
  public totalValue$ = this.totalValueSubject.asObservable();
  
  // Alias pour compatibilité avec le code existant
  public get cards$(): Observable<PokemonCard[] | null> {
    return this.data$;
  }
  
  // Empêcher les rechargements multiples
  private isLoading = false;

  /**
   * Constructeur du service
   */
  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private historyService: CollectionHistoryService,
    private userHistoryService: HistoryService
  ) {
    super();
    
    // Initialiser la connexion avec le système d'authentification
    this.initAuthenticationListener();
    
    // S'abonner aux changements du cache pour calculer la valeur totale
    this.data$.subscribe(cards => {
      if (cards) {
        const totalValue = cards.reduce((sum, card) => sum + (card.price || 0), 0);
        this.totalValueSubject.next(totalValue);
      } else {
        this.totalValueSubject.next(0);
      }
    });
  }

  /**
   * Initialise l'écoute des changements d'authentification pour gérer le cache
   * Implémentation de la tâche 2.5 du plan de mise en cache
   */
  private initAuthenticationListener(): void {
    // Variable pour stocker l'ID de l'utilisateur précédent
    let previousUserId: string | null = null;
    
    // Écouter les changements d'état d'authentification
    this.userService.authState$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        const user = this.userService.getCurrentUser();
        if (user) {
          // Si l'utilisateur a changé, vider le cache
          if (previousUserId !== null && previousUserId !== user.id) {
            console.log('Changement d\'utilisateur détecté, réinitialisation du cache');
            this.clearCache();
          }
          
          // Mettre à jour l'ID de l'utilisateur précédent
          previousUserId = user.id;
          
          // Charger les cartes via getData qui gère le cache
          this.getData(user.id);
        }
      } else {
        // Réinitialiser le cache et l'ID de l'utilisateur précédent quand l'utilisateur se déconnecte
        console.log('Déconnexion détectée, réinitialisation du cache');
        previousUserId = null;
        this.clearCache();
      }
    });
    
    // S'abonner à la méthode de déconnexion explicite pour garantir le nettoyage du cache
    this.connectLogoutToCache();
  }
  
  /**
   * Connecte la méthode de déconnexion du UserService au nettoyage du cache
   * Cette méthode garantit que le cache est vidé même si l'événement authState n'est pas déclenché
   */
  private connectLogoutToCache(): void {
    // Méthode originale de déconnexion
    const originalLogout = this.userService.logout;
    
    // Remplacer la méthode de déconnexion par une version qui nettoie également le cache
    this.userService.logout = async (): Promise<void> => {
      try {
        // Vider le cache avant la déconnexion
        console.log('Déconnexion explicite, nettoyage du cache');
        this.clearCache();
        
        // Appeler la méthode originale de déconnexion
        return await originalLogout.call(this.userService);
      } catch (error) {
        console.error('Erreur lors de la déconnexion avec nettoyage du cache:', error);
        throw error;
      }
    };
  }

  /**
   * Vérifie qu'aucune donnée de l'utilisateur précédent ne persiste dans le cache
   * @param currentUserId ID de l'utilisateur actuel
   * @returns true si le cache est propre, false sinon
   */
  public verifyCleanCache(currentUserId: string): boolean {
    // Vérifier si les données en cache appartiennent à l'utilisateur actuel
    if (this.hasCachedData() && this.cachedUserId !== currentUserId) {
      console.warn('Données d\'un autre utilisateur détectées dans le cache!');
      
      // Nettoyage automatique
      this.clearCache();
      return false;
    }
    
    return true;
  }

  /**
   * Surcharge de la méthode clearCache pour effectuer des nettoyages supplémentaires
   */
  public override clearCache(): void {
    // Appeler la méthode de base
    super.clearCache();
    
    // Réinitialiser également la valeur totale
    this.totalValueSubject.next(0);
    
    console.log('Cache vidé avec succès');
  }

  /**
   * Implémentation de la méthode abstraite fetchFromSource
   * Récupère les cartes depuis Firebase pour un utilisateur donné
   */
  protected override async fetchFromSource(userId: string): Promise<PokemonCard[]> {
    try {
      if (!userId) {
        throw new Error('ID utilisateur requis pour récupérer les cartes');
      }

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
          isGraded: data.isGraded || false,
          lastModificationDate: data.lastModificationDate instanceof Timestamp ? 
            data.lastModificationDate.toDate() : data.lastModificationDate
        };
      });

      // Une fois les cartes chargées, initialiser l'historique si nécessaire
      const totalValue = cards.reduce((sum, card) => sum + (card.price || 0), 0);
      await this.historyService.initializeHistoryIfNeeded(totalValue);
      
      // Mettre à jour les statistiques de l'utilisateur
      await this.updateUserStats();
      
      return cards;
    } catch (error) {
      console.error('Erreur lors du chargement des cartes depuis Firestore:', error);
      throw error;
    }
  }

  /**
   * Surcharge de reloadData pour déclencher des actions supplémentaires
   */
  public override async reloadData(): Promise<void> {
    // Utiliser l'implémentation de base pour recharger les données
    await super.reloadData();
    
    // Mettre à jour les statistiques après le rechargement
    await this.updateUserStats();
    
    return Promise.resolve();
  }

  /**
   * Récupérer toutes les cartes
   * Méthode maintenue pour compatibilité avec le code existant
   */
  getAllCards(): PokemonCard[] {
    return this.dataSubject.getValue() || [];
  }

  /**
   * Forcer le rechargement des cartes
   * Méthode maintenue pour compatibilité avec le code existant
   */
  async reloadCards(): Promise<void> {
    return this.reloadData();
  }

  /**
   * Récupère les cartes d'un utilisateur spécifique avec gestion du cache
   * @param userId ID de l'utilisateur dont on veut récupérer les cartes
   * @param forceReload Indique si on doit forcer le rechargement depuis Firebase
   * @returns Observable émettant les cartes depuis le cache ou chargées depuis Firebase
   */
  getCardsByUserId(userId: string, forceReload: boolean = false): Observable<PokemonCard[]> {
    if (forceReload) {
      // Si le rechargement est forcé, vider le cache d'abord
      this.clearCache();
    }
    
    // Utiliser getData de BaseCacheService qui gère déjà la logique de cache
    return this.getData(userId).pipe(
      map(cards => cards || [])
    );
  }

  /**
   * Méthode pour ajouter une carte
   * @param cardData Données de la carte à ajouter
   */
  async addCard(cardData: Partial<PokemonCard>): Promise<void> {
    // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
    const previousCards = this.dataSubject.getValue();
    
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

      // Tentative d'ajout dans Firebase
      const docRef = await addDoc(cardsCollection, cardToSave);

      // Créer l'objet carte complet
      const newCard: PokemonCard = {
        id: docRef.id,
        ...cardToSave
      };
      
      // Mettre à jour le cache avec la nouvelle carte (en créant une nouvelle instance du tableau)
      const currentCards = this.dataSubject.getValue() || [];
      const updatedCards = [newCard, ...currentCards]; // Garantir l'immutabilité
      this.updateCache(updatedCards);
      
      try {
        // Actions secondaires qui ne doivent pas bloquer l'ajout de la carte
        await this.updateUserStats();
        await this.userHistoryService.addHistoryEntry(newCard);
      } catch (secondaryError) {
        // Logger l'erreur sans interrompre le flux principal
        console.warn('Erreur lors des actions secondaires après ajout de carte:', secondaryError);
      }
    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent du cache
      if (previousCards !== null) {
        this.updateCache(previousCards);
      }
      console.error('Erreur lors de l\'ajout de la carte:', error);
      throw error;
    }
  }

  /**
   * Récupérer une carte par son ID
   * @param cardId ID de la carte à récupérer
   */
  getCardById(cardId: string): PokemonCard | undefined {
    const cards = this.dataSubject.getValue() || [];
    return cards.find(card => card.id === cardId);
  }

  /**
   * Marque une carte comme vendue
   * @param cardId ID de la carte à vendre
   * @param salePrice Prix de vente
   * @param saleDate Date de vente (optionnel, par défaut la date actuelle)
   */
  async sellCard(cardId: string, salePrice: number, saleDate?: Date): Promise<void> {
    // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
    const previousCards = this.dataSubject.getValue();
    
    try {
      const user = this.userService.getCurrentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Trouver la carte dans le cache
      const cards = this.dataSubject.getValue() || [];
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        throw new Error('Carte non trouvée');
      }

      // Supprimer la carte de la base de données
      const userId = user.id;
      await deleteDoc(doc(this.firestore, 'users', userId, 'cards', cardId)); 

      // Mettre à jour le cache (en créant une nouvelle instance du tableau pour l'immutabilité)
      const updatedCards = cards.filter(c => c.id !== cardId);
      this.updateCache(updatedCards);

      try {
        // Actions secondaires qui ne doivent pas bloquer la vente
        // Calculer le profit/perte si le prix d'achat est disponible
        let profit: number | undefined = undefined;
        if (card.purchasePrice !== undefined) {
          profit = salePrice - card.purchasePrice;
          
          // Mettre à jour le cumul des gains/pertes de l'utilisateur
          await this.userService.updateTotalProfit(profit);
        }

        // Enregistrer la vente dans l'historique
        await this.userHistoryService.addSaleHistoryEntry(card, salePrice, saleDate);

        // Mettre à jour les statistiques de l'utilisateur
        await this.updateUserStats();
      } catch (secondaryError) {
        // Logger l'erreur sans interrompre le flux principal
        console.warn('Erreur lors des actions secondaires après vente de carte:', secondaryError);
      }
    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent du cache
      if (previousCards !== null) {
        this.updateCache(previousCards);
      }
      console.error('Erreur lors de la vente de la carte:', error);
      throw error;
    }
  }

  /**
   * Supprimer une carte
   * @param cardId ID de la carte à supprimer
   */
  async removeCard(cardId: string): Promise<void> {
    // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
    const previousCards = this.dataSubject.getValue();
    
    try {
      // Récupérer les infos de la carte avant suppression pour l'historique
      const card = this.getCardById(cardId);
      
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) throw new Error('Utilisateur non connecté');

      const userId = currentUser.id;
      
      // Supprimer la carte de Firebase
      await deleteDoc(doc(this.firestore, 'users', userId, 'cards', cardId));

      // Mettre à jour le cache (en créant une nouvelle instance du tableau pour l'immutabilité)
      const currentCards = this.dataSubject.getValue() || [];
      const updatedCards = currentCards.filter(c => c.id !== cardId);
      this.updateCache(updatedCards);
      
      try {
        // Actions secondaires qui ne doivent pas bloquer la suppression
        if (card) {
          await this.userHistoryService.addDeleteHistoryEntry(card);
        }
        await this.updateUserStats();
      } catch (secondaryError) {
        // Logger l'erreur sans interrompre le flux principal
        console.warn('Erreur lors des actions secondaires après suppression de carte:', secondaryError);
      }
    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent du cache
      if (previousCards !== null) {
        this.updateCache(previousCards);
      }
      console.error('Erreur lors de la suppression de la carte:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les statistiques de l'utilisateur
   */
  private async updateUserStats(): Promise<void> {
    const cards = this.dataSubject.getValue() || [];
    const totalValue = this.totalValueSubject.getValue();
    await this.userService.updateCollectionStats(cards.length, totalValue);
    
    // Ajouter une entrée dans l'historique de la valeur
    await this.historyService.addCollectionHistoryEntry(totalValue);
  }

  /**
   * Récupérer la valeur totale de la collection
   */
  getCollectionTotalValue(): number {
    return this.totalValueSubject.getValue();
  }

  /**
   * Récupérer la carte la plus chère
   */
  getMostExpensiveCard(): PokemonCard | null {
    const cards = this.dataSubject.getValue() || [];
    if (cards.length === 0) return null;
    
    return cards.reduce((max, card) => 
      (card.price || 0) > (max.price || 0) ? card : max
    );
  }

  /**
   * Récupérer les dernières cartes ajoutées
   * @param limit Nombre de cartes à récupérer
   */
  getLatestCards(limit: number = 3): PokemonCard[] {
    const cards = this.dataSubject.getValue() || [];
    return cards.slice(0, Math.min(limit, cards.length));
  }

  /**
   * Met à jour une carte existante dans la collection
   * @param cardId L'ID de la carte à mettre à jour
   * @param cardData Les nouvelles données de la carte
   */
  async updateCard(cardId: string, cardData: Partial<PokemonCard>): Promise<void> {
    // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
    const previousCards = this.dataSubject.getValue();
    
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Ajouter la date de dernière modification
      const updatedCardData = {
        ...cardData,
        lastModificationDate: new Date()
      };
      
      // Obtenir la référence du document
      const cardDocRef = doc(this.firestore, `users/${currentUser.id}/cards/${cardId}`);
      
      // Mettre à jour les données dans Firebase
      await updateDoc(cardDocRef, updatedCardData);
      
      // Mettre à jour le cache (en créant une nouvelle instance du tableau pour l'immutabilité)
      const currentCards = this.dataSubject.getValue() || [];
      const updatedIndex = currentCards.findIndex(card => card.id === cardId);
      
      if (updatedIndex !== -1) {
        // Créer une nouvelle instance de la carte mise à jour
        const updatedCard = {
          ...currentCards[updatedIndex],
          ...updatedCardData
        };
        
        // Créer une nouvelle instance du tableau
        const updatedCards = [
          ...currentCards.slice(0, updatedIndex),
          updatedCard,
          ...currentCards.slice(updatedIndex + 1)
        ];
        
        this.updateCache(updatedCards);
        
        try {
          // Actions secondaires qui ne doivent pas bloquer la mise à jour
          if (cardData.price !== undefined) {
            await this.updateUserStats();
          }
        } catch (secondaryError) {
          // Logger l'erreur sans interrompre le flux principal
          console.warn('Erreur lors des actions secondaires après mise à jour de carte:', secondaryError);
        }
      }
    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent du cache
      if (previousCards !== null) {
        this.updateCache(previousCards);
      }
      console.error('Erreur lors de la mise à jour de la carte', error);
      throw error;
    }
  }
} 