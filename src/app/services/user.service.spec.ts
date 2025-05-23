import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserService } from './user.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { User } from '../interfaces/user.interface';

describe('UserService', () => {
  let service: UserService;

  // Mock des dépendances
  const mockRouter = {
    navigateByUrl: jasmine.createSpy('navigateByUrl')
  };

  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: jasmine.createSpy('onAuthStateChanged'),
    authState: new BehaviorSubject(false)
  };

  const mockFirestore = {
    doc: jasmine.createSpy('doc').and.returnValue({
      get: () => Promise.resolve({
        exists: () => false,
        data: () => ({})
      })
    })
  };

  // Données de test
  const mockUser: User = {
    id: 'test-user-id',
    username: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    avatarUrl: 'test-avatar.jpg',
    totalCards: 0,
    collectionValue: 0,
    totalProfit: 0,
    isProfilPublic: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Auth, useValue: mockAuth },
        { provide: Firestore, useValue: mockFirestore },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(UserService);
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
    it('devrait charger les données utilisateur depuis Firebase lors du premier appel', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve(mockUser));
      
      service.getData('test-user-id');
      tick();

      expect((service as any).fetchFromSource).toHaveBeenCalledWith('test-user-id');
      
      const isLoading = await firstValueFrom(service.isLoading$);
      expect(isLoading).toBeFalsy();
      
      const user = await firstValueFrom(service.data$);
      expect(user).toEqual(mockUser);
    }));

    it('devrait utiliser le cache lors des appels suivants', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve(mockUser));
      
      // Premier appel
      service.getData('test-user-id');
      tick();
      
      // Réinitialiser le spy
      (service as any).fetchFromSource.calls.reset();
      
      // Deuxième appel
      service.getData('test-user-id');
      tick();
      
      expect((service as any).fetchFromSource).not.toHaveBeenCalled();
      
      const user = await firstValueFrom(service.data$);
      expect(user).toEqual(mockUser);
    }));

    it('devrait recharger les données lors d\'un appel à reloadData', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.resolve(mockUser));
      
      // Premier appel
      service.getData('test-user-id');
      tick();
      
      // Réinitialiser le spy
      (service as any).fetchFromSource.calls.reset();
      
      // Forcer le rechargement
      service.reloadData();
      tick();
      
      expect((service as any).fetchFromSource).toHaveBeenCalled();
      
      const user = await firstValueFrom(service.data$);
      expect(user).toEqual(mockUser);
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
      (service as any).fetchFromSource.and.returnValue(Promise.resolve(mockUser));
      service.getData('test-user-id');
      tick();
      
      hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeFalse();
      
      const user = await firstValueFrom(service.data$);
      expect(user).toEqual(mockUser);
    }));

    it('devrait gérer le cas où l\'utilisateur n\'existe pas', fakeAsync(async () => {
      spyOn(service as any, 'fetchFromSource').and.returnValue(Promise.reject(new Error('User not found')));
      
      service.getData('non-existent-id');
      tick();
      
      const hasError = await firstValueFrom(service.hasError$);
      expect(hasError).toBeTrue();
      
      const user = await firstValueFrom(service.data$);
      expect(user).toBeNull();
    }));
  });
}); 