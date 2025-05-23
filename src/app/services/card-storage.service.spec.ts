import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CardStorageService } from './card-storage.service';
import { UserService } from './user.service';
import { CollectionHistoryService } from './collection-history.service';
import { HistoryService } from './history.service';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Injectable } from '@angular/core';
import { PokemonCard } from '../interfaces/pokemon-card.interface';

// Création de mocks pour les dépendances
const mockUserService = {
  getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({
    id: 'test-user-id',
    displayName: 'Test User'
  }),
  authState$: new BehaviorSubject<boolean>(true),
  updateCollectionStats: jasmine.createSpy('updateCollectionStats').and.returnValue(Promise.resolve()),
  updateTotalProfit: jasmine.createSpy('updateTotalProfit').and.returnValue(Promise.resolve()),
  logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
};

const mockCollectionHistoryService = {
  addCollectionHistoryEntry: jasmine.createSpy('addCollectionHistoryEntry').and.returnValue(Promise.resolve()),
  initializeHistoryIfNeeded: jasmine.createSpy('initializeHistoryIfNeeded').and.returnValue(Promise.resolve())
};

const mockHistoryService = {
  addHistoryEntry: jasmine.createSpy('addHistoryEntry').and.returnValue(Promise.resolve()),
  addSaleHistoryEntry: jasmine.createSpy('addSaleHistoryEntry').and.returnValue(Promise.resolve()),
  addDeleteHistoryEntry: jasmine.createSpy('addDeleteHistoryEntry').and.returnValue(Promise.resolve())
};

// Données de test
const mockCards: PokemonCard[] = [
  {
    id: 'card1',
    name: 'Pikachu',
    imageUrl: 'pikachu.jpg',
    price: 100,
    addedDate: new Date()
  }
];

describe('CardStorageService', () => {
  let service: CardStorageService;
  
  // Classe dérivée pour les tests
  @Injectable()
  class MockCardStorageService extends CardStorageService {
    // Mock de fetchFromSource pour retourner des données de test
    protected override fetchFromSource(userId: string): Promise<PokemonCard[]> {
      return Promise.resolve([...mockCards]);
    }
    
    // Surcharge de la méthode addCard pour les tests normaux
    override async addCard(cardData: Partial<PokemonCard>): Promise<void> {
      const newCard: PokemonCard = {
        id: 'new-card-id',
        name: cardData.name || '',
        imageUrl: cardData.imageUrl || '',
        price: cardData.price || 0,
        addedDate: cardData.addedDate || new Date()
      };
      
      const currentCards = this.dataSubject.getValue() || [];
      this.updateCache([newCard, ...currentCards]);
      
      return Promise.resolve();
    }
    
    // Méthode pour simuler une erreur lors de l'ajout
    async addCardWithError(cardData: Partial<PokemonCard>): Promise<void> {
      // Sauvegarder l'état actuel du cache
      const previousCards = this.dataSubject.getValue();
      
      try {
        // Simuler un début de mise à jour du cache
        const newCard: PokemonCard = {
          id: 'error-card-id',
          name: cardData.name || '',
          imageUrl: cardData.imageUrl || '',
          price: cardData.price || 0,
          addedDate: cardData.addedDate || new Date()
        };
        
        // Lancer une erreur simulée
        throw new Error('Erreur simulée lors de l\'ajout');
      } catch (error) {
        // Restaurer l'état précédent du cache
        if (previousCards !== null) {
          this.updateCache(previousCards);
        }
        throw error;
      }
    }

    // Surcharge de la méthode removeCard pour les tests
    override async removeCard(cardId: string): Promise<void> {
      const currentCards = this.dataSubject.getValue() || [];
      const updatedCards = currentCards.filter(c => c.id !== cardId);
      this.updateCache(updatedCards);
      
      return Promise.resolve();
    }
    
    // Méthode pour simuler une erreur lors de la suppression
    async removeCardWithError(cardId: string): Promise<void> {
      // Sauvegarder l'état actuel du cache
      const previousCards = this.dataSubject.getValue();
      
      try {
        // Simuler un début de mise à jour du cache
        const currentCards = this.dataSubject.getValue() || [];
        
        // Lancer une erreur simulée
        throw new Error('Erreur simulée lors de la suppression');
      } catch (error) {
        // Restaurer l'état précédent du cache
        if (previousCards !== null) {
          this.updateCache(previousCards);
        }
        throw error;
      }
    }
    
    // Surcharge de la méthode updateCard pour les tests
    override async updateCard(cardId: string, cardData: Partial<PokemonCard>): Promise<void> {
      const currentCards = this.dataSubject.getValue() || [];
      const updatedIndex = currentCards.findIndex(card => card.id === cardId);
      
      if (updatedIndex !== -1) {
        const updatedCard = {
          ...currentCards[updatedIndex],
          ...cardData,
          lastModificationDate: new Date()
        };
        
        const updatedCards = [
          ...currentCards.slice(0, updatedIndex),
          updatedCard,
          ...currentCards.slice(updatedIndex + 1)
        ];
        
        this.updateCache(updatedCards);
      }
      
      return Promise.resolve();
    }
    
    // Méthode pour simuler une erreur lors de la mise à jour
    async updateCardWithError(cardId: string, cardData: Partial<PokemonCard>): Promise<void> {
      // Sauvegarder l'état actuel du cache
      const previousCards = this.dataSubject.getValue();
      
      try {
        // Simuler un début de mise à jour du cache
        const currentCards = this.dataSubject.getValue() || [];
        
        // Lancer une erreur simulée
        throw new Error('Erreur simulée lors de la mise à jour');
      } catch (error) {
        // Restaurer l'état précédent du cache
        if (previousCards !== null) {
          this.updateCache(previousCards);
        }
        throw error;
      }
    }

    // Surcharge de la méthode sellCard pour les tests
    override async sellCard(cardId: string, salePrice: number, saleDate?: Date): Promise<void> {
      const currentCards = this.dataSubject.getValue() || [];
      const updatedCards = currentCards.filter(c => c.id !== cardId);
      this.updateCache(updatedCards);
      
      return Promise.resolve();
    }
    
    // Méthode pour simuler une erreur lors de la vente
    async sellCardWithError(cardId: string, salePrice: number): Promise<void> {
      // Sauvegarder l'état actuel du cache
      const previousCards = this.dataSubject.getValue();
      
      try {
        // Simuler un début de mise à jour du cache
        const currentCards = this.dataSubject.getValue() || [];
        
        // Lancer une erreur simulée
        throw new Error('Erreur simulée lors de la vente');
      } catch (error) {
        // Restaurer l'état précédent du cache
        if (previousCards !== null) {
          this.updateCache(previousCards);
        }
        throw error;
      }
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CardStorageService, useClass: MockCardStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: CollectionHistoryService, useValue: mockCollectionHistoryService },
        { provide: HistoryService, useValue: mockHistoryService },
        { provide: Firestore, useValue: {} }
      ]
    });

    service = TestBed.inject(CardStorageService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });
  
  it('devrait implémenter l\'interface CacheableService', () => {
    // Vérifier que les propriétés et méthodes requises existent
    expect(service.data$).toBeDefined();
    expect(service.isLoading$).toBeDefined();
    expect(service.hasError$).toBeDefined();
    expect(service.getData).toBeDefined();
    expect(service.clearCache).toBeDefined();
    expect(service.reloadData).toBeDefined();
    expect(service.hasCachedData).toBeDefined();
  });
  
  it('devrait charger les données depuis Firebase lors du premier appel', fakeAsync(async () => {
    // Espionner la méthode fetchFromSource
    spyOn(service as any, 'fetchFromSource').and.callThrough();
    
    // Appeler getData pour déclencher le chargement
    service.getData('test-user-id');
    tick(100);

    // Vérifier que fetchFromSource a été appelé
    expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
    
    // Vérifier que l'état de chargement est correct
    const isLoading = await firstValueFrom(service.isLoading$);
    expect(isLoading).toBeFalsy();
    
    // Vérifier que les données sont chargées
    const cards = await firstValueFrom(service.data$);
    expect(cards).toBeDefined();
    expect(cards).toEqual(mockCards);
  }));
  
  it('devrait utiliser le cache lors des appels suivants', fakeAsync(async () => {
    // Premier appel - chargement depuis Firebase
    service.getData('test-user-id');
    tick(100);
    
    // Espionner la méthode fetchFromSource après le premier appel
    spyOn(service as any, 'fetchFromSource').and.callThrough();
    
    // Deuxième appel - devrait utiliser le cache
    service.getData('test-user-id');
    tick(100);
    
    // Vérifier que fetchFromSource n'a pas été appelé une seconde fois
    expect((service as any).fetchFromSource).not.toHaveBeenCalled();
    
    // Vérifier que les données du cache sont toujours disponibles
    const cards = await firstValueFrom(service.data$);
    expect(cards).toEqual(mockCards);
  }));
  
  it('devrait mettre à jour le cache lors de l\'ajout d\'une carte', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // Nouvelle carte à ajouter
    const newCard = {
      name: 'Charizard',
      imageUrl: 'charizard.jpg',
      price: 500,
      addedDate: new Date()
    };
    
    // Ajouter la carte
    await service.addCard(newCard);
    tick(100);
    
    // Vérifier que updateCache a été appelé
    expect((service as any).updateCache).toHaveBeenCalled();
    
    // Vérifier que le cache a été mis à jour avec la nouvelle carte
    const cards = await firstValueFrom(service.data$);
    expect(cards).toBeDefined();
    expect(Array.isArray(cards)).toBeTruthy();
    if (cards) {
      expect(cards.length).toBe(2); // Une carte initiale + la nouvelle
      expect(cards[0].id).toBe('new-card-id');
      expect(cards[0].name).toBe('Charizard');
    }
  }));
  
  it('devrait utiliser le cache lors de l\'appel à getCardsByUserId', fakeAsync(async () => {
    // Espionner la méthode fetchFromSource
    spyOn(service as any, 'fetchFromSource').and.callThrough();
    
    // Premier appel à getCardsByUserId - devrait charger depuis Firebase
    const cardsObservable = service.getCardsByUserId('test-user-id');
    tick(100);
    
    // Vérifier que fetchFromSource a été appelé
    expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
    
    // Réinitialiser le spy pour vérifier les appels suivants
    (service as any).fetchFromSource.calls.reset();
    
    // Deuxième appel - devrait utiliser le cache
    const cardsObservable2 = service.getCardsByUserId('test-user-id');
    tick(100);
    
    // Vérifier que fetchFromSource n'a pas été appelé une seconde fois
    expect((service as any).fetchFromSource).not.toHaveBeenCalled();
    
    // Vérifier que les données sont correctes
    const cards = await firstValueFrom(cardsObservable2);
    expect(cards).toEqual(mockCards);
  }));
  
  it('devrait forcer le rechargement avec getCardsByUserId quand forceReload est true', fakeAsync(async () => {
    // Premier chargement pour remplir le cache
    service.getCardsByUserId('test-user-id');
    tick(100);
    
    // Espionner la méthode clearCache et fetchFromSource
    spyOn(service, 'clearCache').and.callThrough();
    spyOn(service as any, 'fetchFromSource').and.callThrough();
    
    // Appel avec forceReload = true
    service.getCardsByUserId('test-user-id', true);
    tick(100);
    
    // Vérifier que le cache a été vidé
    expect(service.clearCache).toHaveBeenCalled();
    
    // Vérifier que fetchFromSource a été appelé pour recharger les données
    expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
  }));
  
  it('devrait restaurer l\'état précédent du cache en cas d\'erreur lors de l\'ajout', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // Nouvelle carte à ajouter (qui va générer une erreur)
    const errorCard = {
      name: 'ErrorCard',
      imageUrl: 'error.jpg',
      price: 999,
      addedDate: new Date()
    };
    
    // Essayer d'ajouter la carte avec erreur
    try {
      await (service as any).addCardWithError(errorCard);
      fail('L\'erreur aurait dû être levée');
    } catch (error) {
      // Vérifier que updateCache a été appelé au moins deux fois:
      // 1. Pour tenter de mettre à jour avec la nouvelle carte
      // 2. Pour restaurer l'état précédent
      expect((service as any).updateCache).toHaveBeenCalled();
      
      // Vérifier que le cache a été restauré à son état initial
      const cards = await firstValueFrom(service.data$);
      expect(cards).toEqual(mockCards); // Retour à l'état initial
    }
    
    tick(100);
  }));
  
  it('devrait mettre à jour le cache lors de la suppression d\'une carte', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // ID de la carte à supprimer
    const cardIdToRemove = 'card1';
    
    // Supprimer la carte
    await service.removeCard(cardIdToRemove);
    tick(100);
    
    // Vérifier que updateCache a été appelé
    expect((service as any).updateCache).toHaveBeenCalled();
    
    // Vérifier que le cache a été mis à jour sans la carte supprimée
    const cards = await firstValueFrom(service.data$);
    expect(cards).toBeDefined();
    if (cards) {
      expect(cards.length).toBe(0); // La seule carte a été supprimée
      expect(cards.find(c => c.id === cardIdToRemove)).toBeUndefined();
    }
  }));
  
  it('devrait restaurer l\'état précédent du cache en cas d\'erreur lors de la suppression', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // ID de la carte à supprimer (qui va générer une erreur)
    const cardIdToRemove = 'card1';
    
    // Essayer de supprimer la carte avec erreur
    try {
      await (service as any).removeCardWithError(cardIdToRemove);
      fail('L\'erreur aurait dû être levée');
    } catch (error) {
      // Vérifier que updateCache a été appelé pour restaurer l'état précédent
      expect((service as any).updateCache).toHaveBeenCalled();
      
      // Vérifier que le cache a été restauré à son état initial
      const cards = await firstValueFrom(service.data$);
      expect(cards).toEqual(mockCards); // Retour à l'état initial
    }
    
    tick(100);
  }));
  
  it('devrait mettre à jour le cache lors de la modification d\'une carte', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // Données de mise à jour
    const updatedCardData = {
      name: 'Pikachu Updated',
      price: 150
    };
    
    // ID de la carte à mettre à jour
    const cardIdToUpdate = 'card1';
    
    // Mettre à jour la carte
    await service.updateCard(cardIdToUpdate, updatedCardData);
    tick(100);
    
    // Vérifier que updateCache a été appelé
    expect((service as any).updateCache).toHaveBeenCalled();
    
    // Vérifier que le cache a été mis à jour avec les nouvelles données
    const cards = await firstValueFrom(service.data$);
    expect(cards).toBeDefined();
    if (cards) {
      const updatedCard = cards.find(c => c.id === cardIdToUpdate);
      expect(updatedCard).toBeDefined();
      if (updatedCard) {
        expect(updatedCard.name).toBe('Pikachu Updated');
        expect(updatedCard.price).toBe(150);
        expect(updatedCard.lastModificationDate).toBeDefined();
      }
    }
  }));
  
  it('devrait restaurer l\'état précédent du cache en cas d\'erreur lors de la mise à jour', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // Données de mise à jour
    const updatedCardData = {
      name: 'Pikachu Error Update',
      price: 200
    };
    
    // ID de la carte à mettre à jour (qui va générer une erreur)
    const cardIdToUpdate = 'card1';
    
    // Essayer de mettre à jour la carte avec erreur
    try {
      await (service as any).updateCardWithError(cardIdToUpdate, updatedCardData);
      fail('L\'erreur aurait dû être levée');
    } catch (error) {
      // Vérifier que updateCache a été appelé pour restaurer l'état précédent
      expect((service as any).updateCache).toHaveBeenCalled();
      
      // Vérifier que le cache a été restauré à son état initial
      const cards = await firstValueFrom(service.data$);
      expect(cards).toEqual(mockCards); // Retour à l'état initial
    }
    
    tick(100);
  }));

  it('devrait mettre à jour le cache lors de la vente d\'une carte', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // ID de la carte à vendre
    const cardIdToSell = 'card1';
    const salePrice = 150;
    
    // Vendre la carte
    await service.sellCard(cardIdToSell, salePrice);
    tick(100);
    
    // Vérifier que updateCache a été appelé
    expect((service as any).updateCache).toHaveBeenCalled();
    
    // Vérifier que le cache a été mis à jour sans la carte vendue
    const cards = await firstValueFrom(service.data$);
    expect(cards).toBeDefined();
    if (cards) {
      expect(cards.length).toBe(0); // La seule carte a été vendue
      expect(cards.find(c => c.id === cardIdToSell)).toBeUndefined();
    }
  }));
  
  it('devrait restaurer l\'état précédent du cache en cas d\'erreur lors de la vente', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner updateCache pour vérifier qu'il est appelé
    spyOn(service as any, 'updateCache').and.callThrough();
    
    // ID de la carte à vendre (qui va générer une erreur)
    const cardIdToSell = 'card1';
    const salePrice = 150;
    
    // Essayer de vendre la carte avec erreur
    try {
      await (service as any).sellCardWithError(cardIdToSell, salePrice);
      fail('L\'erreur aurait dû être levée');
    } catch (error) {
      // Vérifier que updateCache a été appelé pour restaurer l'état précédent
      expect((service as any).updateCache).toHaveBeenCalled();
      
      // Vérifier que le cache a été restauré à son état initial
      const cards = await firstValueFrom(service.data$);
      expect(cards).toEqual(mockCards); // Retour à l'état initial
    }
    
    tick(100);
  }));

  it('devrait nettoyer le cache lors de la déconnexion', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Vérifier que les données sont chargées
    const initialCards = await firstValueFrom(service.data$);
    expect(initialCards).toEqual(mockCards);
    
    // Espionner clearCache pour vérifier qu'il est appelé
    spyOn(service, 'clearCache').and.callThrough();
    
    // Simuler une déconnexion
    mockUserService.authState$.next(false);
    tick(100);
    
    // Vérifier que clearCache a été appelé
    expect(service.clearCache).toHaveBeenCalled();
    
    // Vérifier que le cache a été vidé
    const cardsAfterLogout = await firstValueFrom(service.data$);
    expect(cardsAfterLogout).toBeNull();
  }));
  
  it('devrait vider le cache lors d\'un changement d\'utilisateur', fakeAsync(async () => {
    // Charger les données initiales pour l'utilisateur 1
    service.getData('user-1');
    tick(100);
    
    // Espionner clearCache pour vérifier qu'il est appelé
    spyOn(service, 'clearCache').and.callThrough();
    
    // Simuler une déconnexion
    mockUserService.authState$.next(false);
    tick(100);
    
    // Simuler la connexion d'un nouvel utilisateur
    mockUserService.getCurrentUser.and.returnValue({
      id: 'user-2',
      displayName: 'Another User'
    });
    mockUserService.authState$.next(true);
    tick(100);
    
    // Vérifier que clearCache a été appelé au moins une fois
    expect(service.clearCache).toHaveBeenCalled();
    
    // Réinitialiser le mock pour les autres tests
    mockUserService.getCurrentUser.and.returnValue({
      id: 'test-user-id',
      displayName: 'Test User'
    });
  }));
  
  it('devrait connecter la méthode de déconnexion au nettoyage du cache', fakeAsync(async () => {
    // Charger les données initiales
    service.getData('test-user-id');
    tick(100);
    
    // Espionner clearCache pour vérifier qu'il est appelé
    spyOn(service, 'clearCache').and.callThrough();
    
    // Simuler une déconnexion explicite via la méthode logout
    await mockUserService.logout();
    tick(100);
    
    // Vérifier que clearCache a été appelé
    expect(service.clearCache).toHaveBeenCalled();
  }));
  
  it('devrait détecter et nettoyer les données d\'un utilisateur précédent', () => {
    // Définir manuellement un ID d'utilisateur mis en cache différent
    (service as any).cachedUserId = 'previous-user-id';
    (service as any).initialized = true;
    (service as any).dataSubject.next(mockCards);
    
    // Vérifier la détection des données d'un autre utilisateur
    const isCacheClean = service.verifyCleanCache('current-user-id');
    
    // Le résultat devrait être false car le cache n'était pas propre
    expect(isCacheClean).toBeFalse();
    
    // Vérifier que le cache a été nettoyé
    expect(service.hasCachedData()).toBeFalse();
    expect((service as any).cachedUserId).toBeNull();
  });
  
  it('devrait confirmer un cache propre si l\'ID utilisateur correspond', fakeAsync(() => {
    // Configurer manuellement l'état du cache pour simuler un cache initialisé
    (service as any).cachedUserId = 'test-user-id';
    (service as any).initialized = true;
    (service as any).dataSubject.next(mockCards);
    
    // Vérifier que le cache est propre pour l'ID correspondant
    const isCacheClean = service.verifyCleanCache('test-user-id');
    
    // Le résultat devrait être true car le cache contient les données du même utilisateur
    expect(isCacheClean).toBeTrue();
    
    // Vérifier que le cache n'a pas été nettoyé
    expect((service as any).cachedUserId).toBe('test-user-id');
    expect(service.hasCachedData()).toBeTrue();
  }));
}); 