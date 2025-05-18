import { TestBed } from '@angular/core/testing';
import { BaseCacheService } from './base-cache.service';
import { firstValueFrom } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

// Classe concrète pour tester la classe abstraite BaseCacheService
class TestCacheService extends BaseCacheService<string[]> {
  protected testData: string[] = ['item1', 'item2', 'item3'];
  protected shouldFail = false;

  // Implémenter la méthode abstraite fetchFromSource
  protected async fetchFromSource(userId: string): Promise<string[]> {
    // Simuler une requête asynchrone
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.shouldFail) {
          reject(new Error('Erreur simulée'));
        } else {
          resolve([...this.testData]); // Retourner une copie pour éviter les mutations
        }
      }, 100);
    });
  }

  // Méthode pour simuler une erreur
  public setFailMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  // Méthode pour modifier les données de test
  public setTestData(data: string[]): void {
    this.testData = [...data];
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