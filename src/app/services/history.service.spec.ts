import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HistoryService } from './history.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HistoryItem, HistoryActionType } from '../interfaces/history-item.interface';
import { PokemonCard } from '../interfaces/pokemon-card.interface';

describe('HistoryService', () => {
  let service: HistoryService;

  // Mock des dépendances
  const mockAuth = {
    currentUser: {
      uid: 'test-user-id'
    },
    onAuthStateChanged: jasmine.createSpy('onAuthStateChanged'),
    authState: new BehaviorSubject(true)
  };

  const mockFirestore = {
    collection: jasmine.createSpy('collection').and.returnValue({
      where: () => ({
        orderBy: () => ({
          get: () => Promise.resolve({
            docs: []
          })
        })
      })
    })
  };

  // Données de test
  const mockHistoryItem: HistoryItem = {
    id: 'test-history-id',
    userId: 'test-user-id',
    date: new Date(),
    actionType: HistoryActionType.AJOUT,
    cardName: 'Pikachu',
    cardId: 'test-card-id',
    cardImageUrl: 'test-image.jpg',
    purchaseDate: undefined,
    purchasePrice: undefined
  };

  const mockCard: PokemonCard = {
    id: 'test-card-id',
    name: 'Pikachu',
    imageUrl: 'test-image.jpg',
    addedDate: new Date(),
    purchaseDate: undefined,
    purchasePrice: undefined
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HistoryService,
        { provide: Auth, useValue: mockAuth },
        { provide: Firestore, useValue: mockFirestore }
      ]
    });

    service = TestBed.inject(HistoryService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('devrait implémenter l\'interface CacheableService', () => {
    expect(service.data$).toBeDefined();
    expect(service.isLoading$).toBeDefined();
    expect(service.hasError$).toBeDefined();
    expect(service.getData).toBeDefined();
    expect(service.clearCache).toBeDefined();
    expect(service.reloadData).toBeDefined();
    expect(service.hasCachedData).toBeDefined();
  });

  describe('Gestion du Cache', () => {
    it('devrait charger l\'historique depuis Firebase lors du premier appel', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockHistoryItem]));
      
      service.getData('test-user-id');
      tick();

      expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
      
      const isLoading = await firstValueFrom(service.isLoading$);
      expect(isLoading).toBeFalsy();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockHistoryItem]);
    }));

    it('devrait utiliser le cache lors des appels suivants', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockHistoryItem]));
      
      // Premier appel
      service.getData('test-user-id');
      tick();
      
      // Réinitialiser le spy
      (service as any).fetchFromSource.calls.reset();
      
      // Deuxième appel
      service.getData('test-user-id');
      tick();
      
      expect((service as any).fetchFromSource).not.toHaveBeenCalled();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockHistoryItem]);
    }));

    it('devrait recharger les données lors d\'un appel à reloadData', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockHistoryItem]));
      
      // Premier appel
      service.getData('test-user-id');
      tick();
      
      // Réinitialiser le spy
      (service as any).fetchFromSource.calls.reset();
      
      // Forcer le rechargement
      service.reloadData();
      tick();
      
      expect((service as any).fetchFromSource).toHaveBeenCalled();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockHistoryItem]);
    }));
  });

  describe('Gestion des Erreurs', () => {
    it('devrait gérer les erreurs lors du chargement des données', fakeAsync(async () => {
      const errorMessage = 'Erreur de chargement';
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.reject(new Error(errorMessage)));
      
      service.getData('test-user-id');
      tick();
      
      const hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeTrue();
      
      const isLoading = await firstValueFrom(service.isLoading$);
      expect(isLoading).toBeFalse();
    }));

    it('devrait effacer les erreurs lors d\'un nouveau chargement réussi', fakeAsync(async () => {
      // Premier appel avec erreur
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.reject(new Error('Erreur')));
      service.getData('test-user-id');
      tick();
      
      let hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeTrue();
      
      // Deuxième appel réussi
      (service as any).fetchFromSource.and.returnValue(Promise.resolve([mockHistoryItem]));
      service.getData('test-user-id');
      tick();
      
      hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeFalse();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockHistoryItem]);
    }));
  });

  describe('Opérations sur l\'historique', () => {
    beforeEach(() => {
      spyOn(service as any, 'addToFirestore').and.returnValue(Promise.resolve());
    });

    it('devrait ajouter une entrée pour une nouvelle carte', fakeAsync(async () => {
      await service.addHistoryEntry(mockCard);
      tick();

      const history = await firstValueFrom(service.data$);
      expect(history?.[0].actionType).toBe(HistoryActionType.AJOUT);
      expect(history?.[0].cardName).toBe(mockCard.name);
      expect((service as any).addToFirestore).toHaveBeenCalled();
    }));

    it('devrait ajouter une entrée pour une vente', fakeAsync(async () => {
      const salePrice = 100;
      await service.addSaleHistoryEntry(mockCard, salePrice);
      tick();

      const history = await firstValueFrom(service.data$);
      expect(history?.[0].actionType).toBe(HistoryActionType.VENTE);
      expect(history?.[0].salePrice).toBe(salePrice);
      expect((service as any).addToFirestore).toHaveBeenCalled();
    }));

    it('devrait ajouter une entrée pour une suppression', fakeAsync(async () => {
      await service.addDeleteHistoryEntry(mockCard);
      tick();

      const history = await firstValueFrom(service.data$);
      expect(history?.[0].actionType).toBe(HistoryActionType.SUPPRESSION);
      expect(history?.[0].cardName).toBe(mockCard.name);
      expect((service as any).addToFirestore).toHaveBeenCalled();
    }));

    it('devrait calculer le profit lors d\'une vente', fakeAsync(async () => {
      const cardWithPrice = { ...mockCard, purchasePrice: 50 };
      const salePrice = 100;
      await service.addSaleHistoryEntry(cardWithPrice, salePrice);
      tick();

      const history = await firstValueFrom(service.data$);
      expect(history?.[0].profit).toBe(50); // salePrice - purchasePrice
    }));
  });
}); 