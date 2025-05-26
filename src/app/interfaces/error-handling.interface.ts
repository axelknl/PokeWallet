/**
 * Types d'erreurs possibles dans l'application
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  FIREBASE = 'FIREBASE', 
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  CACHE = 'CACHE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Niveaux de sévérité des erreurs
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Interface pour une erreur standardisée
 */
export interface StandardError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, any>;
  userMessage: string;
  retryable: boolean;
}

/**
 * Options de récupération d'erreur
 */
export interface ErrorRecoveryOptions {
  canRetry: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
  showUserMessage?: boolean;
}

/**
 * Interface pour les services avec gestion d'erreurs
 */
export interface ErrorHandlingService {
  handleError(error: any, context?: Record<string, any>): StandardError;
  recoverFromError(error: StandardError, options?: ErrorRecoveryOptions): Promise<boolean>;
  getErrorMessage(error: StandardError): string;
} 