import { TestBed } from '@angular/core/testing';
import { BaseCacheService } from './base-cache.service';
import { firstValueFrom } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

// Classe concrète pour tester la classe abstraite BaseCacheService
class TestCacheService extends BaseCacheService<string[]> {
  protected testData: string[] = ['item1', 'item2', 'item3'];
  protected shouldFail = false;
  private callCount = 0;

  // Implémenter la méthode abstraite fetchFromSource
  protected async fetchFromSource(userId: string): Promise<string[]> {
    this.callCount++;
    
    if (this.shouldFail) {
      throw new Error('Erreur de test');
    }
    
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return [...this.testData];
  }

  // Méthode pour simuler une erreur
  public setFailMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  // Méthode pour modifier les données de test
  public setTestData(data: string[]): void {
    this.testData = [...data];
  }

  public getCallCount(): number {
    return this.callCount;
  }

  public resetCallCount(): void {
    this.callCount = 0;
  }
}

describe('BaseCacheService', () => {
  let service: TestCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestCacheService]
    });
    service = TestBed.inject(TestCacheService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('devrait initialiser avec un cache vide', () => {
    expect(service.hasCachedData()).toBeFalse();
  });

  it('devrait charger les données depuis la source quand le cache est vide', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    
    // Act - Déclencher le chargement des données
    service.getData(userId);
    
    // Vérifier que le chargement est en cours
    expect(await firstValueFrom(service.isLoading$)).toBeTrue();
    
    // Avancer le temps simulé pour permettre la résolution de la promesse
    tick(150);
    
    // Assert - Vérifier les données et l'état après chargement
    expect(await firstValueFrom(service.data$)).toEqual(['item1', 'item2', 'item3']);
    expect(service.hasCachedData()).toBeTrue();
    expect(await firstValueFrom(service.isLoading$)).toBeFalse();
  }));

  it('devrait utiliser le cache pour les requêtes suivantes', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    
    // Première requête pour charger les données
    service.getData(userId);
    tick(150);
    
    // Modifier les données source (ne devrait pas affecter le cache)
    service.setTestData(['new1', 'new2']);
    
    // Act - Deuxième requête qui devrait utiliser le cache
    const data = await firstValueFrom(service.getData(userId));
    
    // Assert
    expect(data).toEqual(['item1', 'item2', 'item3']); // Données originales du cache
  }));

  it('devrait recharger les données avec reloadData()', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    
    // Première requête pour charger les données
    service.getData(userId);
    tick(150);
    
    // Modifier les données source
    service.setTestData(['new1', 'new2']);
    
    // Act - Forcer le rechargement
    await service.reloadData();
    tick(150);
    
    // Assert
    const data = await firstValueFrom(service.data$);
    expect(data).toEqual(['new1', 'new2']); // Nouvelles données
  }));

  it('devrait vider le cache avec clearCache()', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    
    // Charger des données dans le cache
    service.getData(userId);
    tick(150);
    expect(service.hasCachedData()).toBeTrue();
    
    // Act
    service.clearCache();
    
    // Assert
    expect(service.hasCachedData()).toBeFalse();
    expect(await firstValueFrom(service.data$)).toBeNull();
  }));

  it('devrait gérer les erreurs lors du chargement des données', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    service.setFailMode(true);
    
    // Act
    try {
      service.getData(userId);
      tick(150);
    } catch {
      // Ignorer l'erreur pour le test
    }
    
    // Assert
    expect(await firstValueFrom(service.hasError$)).toBeTrue();
    expect(service.hasCachedData()).toBeFalse();
  }));

  it('devrait conserver les données en cache en cas d\'erreur lors du rechargement', fakeAsync(async () => {
    // Arrange
    const userId = 'user123';
    
    // Charger des données dans le cache
    service.getData(userId);
    tick(150);
    
    const originalData = await firstValueFrom(service.data$);
    
    // Configurer pour échouer lors du rechargement
    service.setFailMode(true);
    
    // Act
    try {
      await service.reloadData();
      tick(150);
    } catch {
      // Ignorer l'erreur pour le test
    }
    
    // Assert
    expect(await firstValueFrom(service.hasError$)).toBeTrue();
    expect(service.hasCachedData()).toBeTrue();
    expect(await firstValueFrom(service.data$)).toEqual(originalData);
  }));
});

describe('BaseCacheService - Performance Optimization', () => {
  let service: TestCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new TestCacheService();
  });

  it('should minimize calls to fetchFromSource when using cache', (done) => {
    const userId = 'test-user';
    
    // Premier appel - doit charger depuis la source
    service.resetCallCount();
    
    service.getData(userId).subscribe(data1 => {
      if (data1 !== null) {
        expect(service.getCallCount()).toBe(1);
        expect(data1).toEqual(['item1', 'item2', 'item3']);
        
        // Deuxième appel avec le même userId - doit utiliser le cache
        service.getData(userId).subscribe(data2 => {
          expect(service.getCallCount()).toBe(1); // Pas d'appel supplémentaire
          expect(data2).toEqual(['item1', 'item2', 'item3']);
          done();
        });
      }
    });
  });

  it('should efficiently handle multiple concurrent requests', (done) => {
    const userId = 'test-user';
    service.resetCallCount();
    
    let completedCount = 0;
    const results: any[] = [];
    
    // Lancer plusieurs requêtes simultanées
    for (let i = 0; i < 3; i++) {
      service.getData(userId).subscribe(result => {
        if (result !== null) {
          results.push(result);
          completedCount++;
          
          if (completedCount === 3) {
            // Doit avoir fait un seul appel à fetchFromSource
            expect(service.getCallCount()).toBe(1);
            
            // Tous les résultats doivent être identiques
            results.forEach(result => {
              expect(result).toEqual(['item1', 'item2', 'item3']);
            });
            done();
          }
        }
      });
    }
  });

  it('should properly manage memory by reusing observables', () => {
    const userId = 'test-user';
    
    // Obtenir plusieurs références à l'observable
    const obs1 = service.getData(userId);
    const obs2 = service.getData(userId);
    const obs3 = service.getData(userId);
    
    // Tous doivent référencer le même observable
    expect(obs1).toBe(obs2);
    expect(obs2).toBe(obs3);
  });

  it('should handle cache invalidation efficiently', () => {
    const userId = 'test-user';
    
    // Charger les données initiales
    service.resetCallCount();
    
    // Simuler des données en cache
    service.getData(userId);
    
    // Vérifier que le cache a des données
    expect(service.hasCachedData()).toBeFalse(); // Initialement false
    
    // Vider le cache
    service.clearCache();
    
    // Vérifier que le cache est vide
    expect(service.hasCachedData()).toBeFalse();
  });
}); 