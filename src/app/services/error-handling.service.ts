import { Injectable } from '@angular/core';
import { 
  ErrorHandlingService as IErrorHandlingService, 
  StandardError, 
  ErrorType, 
  ErrorSeverity, 
  ErrorRecoveryOptions 
} from '../interfaces/error-handling.interface';

/**
 * Service de gestion d'erreurs standardisée
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService implements IErrorHandlingService {
  
  /**
   * Transforme une erreur en erreur standardisée
   * @param error Erreur originale
   * @param context Contexte supplémentaire
   * @returns StandardError
   */
  handleError(error: any, context?: Record<string, any>): StandardError {
    const errorType = this.detectErrorType(error);
    const severity = this.determineSeverity(errorType, error);
    const retryable = this.isRetryable(errorType, error);
    
    const standardError: StandardError = {
      id: this.generateErrorId(),
      type: errorType,
      severity,
      message: error?.message || 'Erreur inconnue',
      originalError: error instanceof Error ? error : undefined,
      timestamp: new Date(),
      context,
      userMessage: this.generateUserMessage(errorType, error),
      retryable
    };

    // Logger l'erreur pour le débogage
    this.logError(standardError);
    
    return standardError;
  }

  /**
   * Tente de récupérer d'une erreur
   * @param error Erreur standardisée
   * @param options Options de récupération
   * @returns Promise<boolean> true si la récupération a réussi
   */
  async recoverFromError(
    error: StandardError, 
    options?: ErrorRecoveryOptions
  ): Promise<boolean> {
    // Si l'erreur n'est pas récupérable, retourner false
    if (!error.retryable || !options?.canRetry) {
      return false;
    }

    // Exécuter l'action de fallback si disponible
    if (options.fallbackAction) {
      try {
        options.fallbackAction();
        return true;
      } catch (fallbackError) {
        console.error('Erreur lors de l\'exécution du fallback:', fallbackError);
        return false;
      }
    }

    return true;
  }

  /**
   * Récupère un message utilisateur friendly pour une erreur
   * @param error Erreur standardisée
   * @returns Message utilisateur
   */
  getErrorMessage(error: StandardError): string {
    if (error.userMessage) {
      return error.userMessage;
    }
    
    return this.generateUserMessage(error.type, error);
  }

  /**
   * Détecte le type d'erreur
   * @param error Erreur originale
   * @returns ErrorType
   */
  private detectErrorType(error: any): ErrorType {
    const message = error?.message || '';
    
    // Erreurs d'authentification (priorité sur Firebase)
    if (message.includes('auth/') || message.includes('Utilisateur non connecté') || 
        message.includes('non trouvé') || message.includes('Autorisation')) {
      return ErrorType.AUTHENTICATION;
    }
    
    // Erreurs Firebase
    if (message.includes('firestore/') || message.includes('firebase')) {
      return ErrorType.FIREBASE;
    }
    
    // Erreurs réseau
    if (message.includes('Network') || message.includes('timeout') || 
        message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }
    
    // Erreurs de cache
    if (message.includes('cache') || message.includes('Cache')) {
      return ErrorType.CACHE;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Détermine la sévérité d'une erreur
   * @param type Type d'erreur
   * @param error Erreur originale
   * @returns ErrorSeverity
   */
  private determineSeverity(type: ErrorType, error: any): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return ErrorSeverity.HIGH;
      case ErrorType.FIREBASE:
        return ErrorSeverity.HIGH;
      case ErrorType.NETWORK:
        return ErrorSeverity.MEDIUM;
      case ErrorType.CACHE:
        return ErrorSeverity.LOW;
      case ErrorType.VALIDATION:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Détermine si une erreur est récupérable
   * @param type Type d'erreur
   * @param error Erreur originale
   * @returns boolean
   */
  private isRetryable(type: ErrorType, error: any): boolean {
    switch (type) {
      case ErrorType.NETWORK:
        return true;
      case ErrorType.CACHE:
        return true;
      case ErrorType.FIREBASE:
        // Certaines erreurs Firebase sont récupérables
        const message = error?.message || '';
        return message.includes('timeout') || message.includes('unavailable');
      default:
        return false;
    }
  }

  /**
   * Génère un message utilisateur friendly
   * @param type Type d'erreur
   * @param error Erreur originale
   * @returns Message utilisateur
   */
  private generateUserMessage(type: ErrorType, error: any): string {
    const message = error?.message || '';
    
    switch (type) {
      case ErrorType.AUTHENTICATION:
        if (message.includes('user-not-found')) {
          return 'Utilisateur non trouvé. Veuillez vérifier vos identifiants.';
        }
        if (message.includes('wrong-password')) {
          return 'Mot de passe incorrect. Veuillez réessayer.';
        }
        return 'Problème d\'authentification. Veuillez vous reconnecter.';
        
      case ErrorType.NETWORK:
        return 'Problème de connexion. Veuillez vérifier votre connexion internet et réessayer.';
        
      case ErrorType.FIREBASE:
        return 'Problème temporaire avec nos serveurs. Veuillez réessayer dans quelques instants.';
        
      case ErrorType.CACHE:
        return 'Problème temporaire avec le cache. Les données vont être rechargées.';
        
      case ErrorType.VALIDATION:
        return 'Données non valides. Veuillez vérifier les informations saisies.';
        
      default:
        return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    }
  }

  /**
   * Génère un ID unique pour l'erreur
   * @returns ID unique
   */
  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Log l'erreur pour le débogage
   * @param error Erreur standardisée
   */
  private logError(error: StandardError): void {
    const logLevel = this.getLogLevel(error.severity);
    
    console[logLevel](`[${error.type}] ${error.message}`, {
      id: error.id,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      originalError: error.originalError
    });
  }

  /**
   * Détermine le niveau de log selon la sévérité
   * @param severity Sévérité de l'erreur
   * @returns Niveau de log
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }
} 