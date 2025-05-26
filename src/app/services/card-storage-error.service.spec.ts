import { TestBed } from '@angular/core/testing';
import { CardStorageService } from './card-storage.service';
import { ErrorHandlingService } from './error-handling.service';
import { ErrorType, ErrorSeverity } from '../interfaces/error-handling.interface';
import { Firestore } from '@angular/fire/firestore';
import { UserService } from './user.service';
import { CollectionHistoryService } from './collection-history.service';
import { HistoryService } from './history.service';
import { BehaviorSubject, of } from 'rxjs';

describe('CardStorageService - Error Handling Integration', () => {
  let errorHandlingService: ErrorHandlingService;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    const authStateSubject = new BehaviorSubject(false);
    const userServiceSpy = jasmine.createSpyObj('UserService', 
      ['getCurrentUser', 'logout'], 
      { authState$: authStateSubject.asObservable() }
    );
    const firestoreSpy = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
    const collectionHistorySpy = jasmine.createSpyObj('CollectionHistoryService', ['initializeHistoryIfNeeded']);
    const historySpy = jasmine.createSpyObj('HistoryService', ['addItem']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlingService,
        { provide: Firestore, useValue: firestoreSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: CollectionHistoryService, useValue: collectionHistorySpy },
        { provide: HistoryService, useValue: historySpy }
      ]
    });

    errorHandlingService = TestBed.inject(ErrorHandlingService);
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should be created', () => {
    expect(errorHandlingService).toBeTruthy();
  });

  it('should handle Firebase errors with standardized error handling', () => {
    spyOn(errorHandlingService, 'handleError').and.callThrough();
    
    const firebaseError = new Error('firestore/permission-denied');
    
    const standardError = errorHandlingService.handleError(firebaseError, {
      operation: 'fetchCards',
      userId: 'test-user'
    });

    expect(errorHandlingService.handleError).toHaveBeenCalledWith(firebaseError, {
      operation: 'fetchCards',
      userId: 'test-user'
    });
    
    expect(standardError.type).toBe(ErrorType.FIREBASE);
    expect(standardError.severity).toBe(ErrorSeverity.HIGH);
    expect(standardError.retryable).toBe(false);
  });

  it('should handle network errors with retry capability', () => {
    spyOn(errorHandlingService, 'handleError').and.callThrough();
    
    const networkError = new Error('Network request failed');
    
    const standardError = errorHandlingService.handleError(networkError, {
      operation: 'addCard',
      userId: 'test-user'
    });

    expect(errorHandlingService.handleError).toHaveBeenCalledWith(networkError, {
      operation: 'addCard',
      userId: 'test-user'
    });
    
    expect(standardError.type).toBe(ErrorType.NETWORK);
    expect(standardError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(standardError.retryable).toBe(true);
  });

  it('should provide user-friendly error messages', () => {
    const authError = new Error('auth/user-not-found');
    const standardError = errorHandlingService.handleError(authError);
    
    const userMessage = errorHandlingService.getErrorMessage(standardError);
    
    expect(userMessage).toBe('Utilisateur non trouvé. Veuillez vérifier vos identifiants.');
  });

  it('should attempt recovery for retryable errors', async () => {
    const networkError = errorHandlingService.handleError(new Error('Network timeout'));
    
    let retryExecuted = false;
    const recoveryOptions = {
      canRetry: true,
      maxRetries: 2,
      fallbackAction: () => { retryExecuted = true; }
    };

    const recovered = await errorHandlingService.recoverFromError(networkError, recoveryOptions);
    
    expect(recovered).toBe(true);
    expect(retryExecuted).toBe(true);
  });

  it('should not attempt recovery for non-retryable errors', async () => {
    const authError = errorHandlingService.handleError(new Error('auth/permission-denied'));
    
    const recovered = await errorHandlingService.recoverFromError(authError, {
      canRetry: true,
      fallbackAction: () => { fail('Should not execute fallback for non-retryable error'); }
    });
    
    expect(recovered).toBe(false);
  });
}); 