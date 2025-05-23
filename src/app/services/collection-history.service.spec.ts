import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CollectionHistoryService } from './collection-history.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { UserService } from './user.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CollectionValueHistory } from '../interfaces/collection-value-history.interface';

describe('CollectionHistoryService', () => {
  let service: CollectionHistoryService;

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

  const mockUserService = {
    getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({
      id: 'test-user-id',
      username: 'Test User',
      email: 'test@example.com'
    })
  };

  // Données de test
  const mockCollectionHistory: CollectionValueHistory = {
    id: 'test-history-id',
    userId: 'test-user-id',
    date: new Date('2024-01-01'),
    value: 1000
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CollectionHistoryService,
        { provide: Auth, useValue: mockAuth },
        { provide: Firestore, useValue: mockFirestore },
        { provide: UserService, useValue: mockUserService }
      ]
    });

    service = TestBed.inject(CollectionHistoryService);
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
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockCollectionHistory]));
      
      service.getData('test-user-id');
      tick();

      expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
      
      const isLoading = await firstValueFrom(service.isLoading$);
      expect(isLoading).toBeFalsy();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockCollectionHistory]);
    }));

    it('devrait utiliser le cache lors des appels suivants', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockCollectionHistory]));
      
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
      expect(history).toEqual([mockCollectionHistory]);
    }));

    it('devrait recharger les données lors d\'un appel à reloadData', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockCollectionHistory]));
      
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
      expect(history).toEqual([mockCollectionHistory]);
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
      (service as any).fetchFromSource.and.returnValue(Promise.resolve([mockCollectionHistory]));
      service.getData('test-user-id');
      tick();
      
      hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeFalse();
      
      const history = await firstValueFrom(service.data$);
      expect(history).toEqual([mockCollectionHistory]);
    }));
  });

  describe('Opérations sur l\'historique de collection', () => {
    beforeEach(() => {
      spyOn(service as any, 'addToFirestore').and.returnValue(Promise.resolve());
      spyOn(service as any, 'updateCache').and.callThrough();
    });

    it('devrait ajouter une nouvelle entrée d\'historique', fakeAsync(async () => {
      const newValue = 1500;
      await service.addCollectionHistoryEntry(newValue);
      tick();

      expect((service as any).addToFirestore).toHaveBeenCalled();
      expect((service as any).updateCache).toHaveBeenCalled();
    }));

    it('devrait initialiser l\'historique si nécessaire', fakeAsync(async () => {
      const currentValue = 1000;
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([]));
      
      await service.initializeHistoryIfNeeded(currentValue);
      tick();

      expect((service as any).addToFirestore).toHaveBeenCalled();
    }));

    it('devrait retourner les données formatées pour le graphique', () => {
      // Simuler des données en cache
      const mockHistory = [
        { id: '1', userId: 'test-user-id', date: new Date('2024-01-01'), value: 1000 },
        { id: '2', userId: 'test-user-id', date: new Date('2024-01-02'), value: 1200 },
        { id: '3', userId: 'test-user-id', date: new Date('2024-01-03'), value: 1100 }
      ];
      
      (service as any).dataSubject.next(mockHistory);
      
      const chartData = service.getFormattedChartData();
      
      expect(chartData.labels).toEqual(['01/01/24', '02/01/24', '03/01/24']);
      expect(chartData.values).toEqual([1000, 1200, 1100]);
    });
  });

  describe('Invalidation du Cache', () => {
    it('devrait vider le cache lors de la déconnexion', () => {
      service.clearCache();
      
      const data = (service as any).dataSubject.getValue();
      expect(data).toBeNull();
      
      const hasCache = service.hasCachedData();
      expect(hasCache).toBeFalse();
    });

    it('devrait recharger depuis Firebase après invalidation du cache', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve([mockCollectionHistory]));
      
      // Premier chargement
      service.getData('test-user-id');
      tick();
      
      // Vider le cache
      service.clearCache();
      
      // Réinitialiser le spy
      (service as any).fetchFromSource.calls.reset();
      
      // Nouveau chargement après invalidation
      service.getData('test-user-id');
      tick();
      
      expect((service as any).fetchFromSource).toHaveBeenCalled();
    }));
  });
}); 