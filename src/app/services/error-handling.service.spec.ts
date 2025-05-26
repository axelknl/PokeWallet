import { TestBed } from '@angular/core/testing';
import { ErrorHandlingService } from './error-handling.service';
import { ErrorType, ErrorSeverity, StandardError } from '../interfaces/error-handling.interface';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorHandlingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should create a standardized error from a basic Error', () => {
      const originalError = new Error('Test error');
      const context = { userId: '123', operation: 'test' };

      const standardError = service.handleError(originalError, context);

      expect(standardError).toBeDefined();
      expect(standardError.id).toBeTruthy();
      expect(standardError.type).toBe(ErrorType.UNKNOWN);
      expect(standardError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardError.message).toBe('Test error');
      expect(standardError.originalError).toBe(originalError);
      expect(standardError.timestamp).toBeInstanceOf(Date);
      expect(standardError.context).toEqual(context);
      expect(standardError.userMessage).toBeTruthy();
      expect(standardError.retryable).toBe(false);
    });

    it('should detect Firebase errors and classify them correctly', () => {
      const firebaseError = new Error('firestore/permission-denied');
      
      const standardError = service.handleError(firebaseError);

      expect(standardError.type).toBe(ErrorType.FIREBASE);
      expect(standardError.severity).toBe(ErrorSeverity.HIGH);
      expect(standardError.retryable).toBe(false);
    });

    it('should detect network errors and make them retryable', () => {
      const networkError = new Error('Network request failed');
      
      const standardError = service.handleError(networkError);

      expect(standardError.type).toBe(ErrorType.NETWORK);
      expect(standardError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardError.retryable).toBe(true);
    });

    it('should assign unique IDs to different errors', () => {
      const error1 = service.handleError(new Error('Error 1'));
      const error2 = service.handleError(new Error('Error 2'));

      expect(error1.id).not.toBe(error2.id);
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for authentication errors', () => {
      const authError: StandardError = {
        id: '1',
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: 'auth/user-not-found',
        timestamp: new Date(),
        userMessage: '',
        retryable: false
      };

      const message = service.getErrorMessage(authError);

      expect(message).toBe('Utilisateur non trouvé. Veuillez vérifier vos identifiants.');
    });

    it('should return user-friendly message for network errors', () => {
      const networkError: StandardError = {
        id: '1',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network request failed',
        timestamp: new Date(),
        userMessage: '',
        retryable: true
      };

      const message = service.getErrorMessage(networkError);

      expect(message).toBe('Problème de connexion. Veuillez vérifier votre connexion internet et réessayer.');
    });
  });

  describe('recoverFromError', () => {
    it('should successfully recover from a retryable error', async () => {
      const retryableError: StandardError = {
        id: '1',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network timeout',
        timestamp: new Date(),
        userMessage: '',
        retryable: true
      };

      let retryCount = 0;
      const options = {
        canRetry: true,
        maxRetries: 2,
        fallbackAction: () => { retryCount++; }
      };

      const result = await service.recoverFromError(retryableError, options);

      expect(result).toBe(true);
      expect(retryCount).toBe(1);
    });

    it('should not attempt recovery for non-retryable errors', async () => {
      const nonRetryableError: StandardError = {
        id: '1',
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: 'auth/user-not-found',
        timestamp: new Date(),
        userMessage: '',
        retryable: false
      };

      const result = await service.recoverFromError(nonRetryableError);

      expect(result).toBe(false);
    });
  });
}); 