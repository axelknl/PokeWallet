# Système de Gestion d'Erreurs Standardisée - PokeWallet

## Vue d'ensemble

Le système de gestion d'erreurs standardisée de PokeWallet a été développé en utilisant la méthodologie TDD (Test-Driven Development) pour fournir une approche cohérente et robuste de la gestion des erreurs dans toute l'application.

## Architecture

### 🏗️ **Composants Principaux**

1. **Interface de Définition** (`error-handling.interface.ts`)
2. **Service de Gestion** (`error-handling.service.ts`)
3. **Composant d'Affichage** (`error-display.component.*`)
4. **Tests Complets** (22 tests au total)

## Interfaces et Types

### ErrorType
```typescript
export enum ErrorType {
  NETWORK = 'NETWORK',           // Erreurs de connexion réseau
  FIREBASE = 'FIREBASE',         // Erreurs liées à Firebase
  AUTHENTICATION = 'AUTHENTICATION', // Erreurs d'authentification
  VALIDATION = 'VALIDATION',     // Erreurs de validation de données
  CACHE = 'CACHE',              // Erreurs de cache
  UNKNOWN = 'UNKNOWN'           // Erreurs non identifiées
}
```

### ErrorSeverity
```typescript
export enum ErrorSeverity {
  LOW = 'LOW',                  // Impact minimal (cache miss)
  MEDIUM = 'MEDIUM',            // Impact modéré (réseau)
  HIGH = 'HIGH',                // Impact élevé (Firebase, Auth)
  CRITICAL = 'CRITICAL'         // Impact critique (perte de données)
}
```

### StandardError
```typescript
export interface StandardError {
  id: string;                   // Identifiant unique
  type: ErrorType;              // Type d'erreur détecté
  severity: ErrorSeverity;      // Niveau de sévérité
  message: string;              // Message technique
  originalError?: Error;        // Erreur originale (si disponible)
  timestamp: Date;              // Horodatage de l'erreur
  context?: Record<string, any>; // Contexte supplémentaire
  userMessage: string;          // Message convivial pour l'utilisateur
  retryable: boolean;           // Indique si l'opération peut être retentée
}
```

## ErrorHandlingService

### 📋 **Fonctionnalités Principales**

#### 1. Détection Automatique du Type d'Erreur
```typescript
// Détection basée sur les messages d'erreur
private detectErrorType(error: any): ErrorType {
  const message = error?.message || '';
  
  // Priorité : AUTHENTICATION > FIREBASE > NETWORK > CACHE > UNKNOWN
  if (message.includes('auth/')) return ErrorType.AUTHENTICATION;
  if (message.includes('firestore/')) return ErrorType.FIREBASE;
  if (message.includes('Network')) return ErrorType.NETWORK;
  // ...
}
```

#### 2. Classification de Sévérité
```typescript
private determineSeverity(type: ErrorType): ErrorSeverity {
  switch (type) {
    case ErrorType.AUTHENTICATION: return ErrorSeverity.HIGH;
    case ErrorType.FIREBASE: return ErrorSeverity.HIGH;
    case ErrorType.NETWORK: return ErrorSeverity.MEDIUM;
    case ErrorType.CACHE: return ErrorSeverity.LOW;
    default: return ErrorSeverity.MEDIUM;
  }
}
```

#### 3. Messages Utilisateur Conviviaux
```typescript
private generateUserMessage(type: ErrorType, error: any): string {
  switch (type) {
    case ErrorType.AUTHENTICATION:
      if (message.includes('user-not-found')) {
        return 'Utilisateur non trouvé. Veuillez vérifier vos identifiants.';
      }
      // ...
    case ErrorType.NETWORK:
      return 'Problème de connexion. Veuillez vérifier votre connexion internet et réessayer.';
    // ...
  }
}
```

#### 4. Système de Récupération
```typescript
async recoverFromError(
  error: StandardError, 
  options?: ErrorRecoveryOptions
): Promise<boolean> {
  if (!error.retryable || !options?.canRetry) {
    return false;
  }
  
  if (options.fallbackAction) {
    options.fallbackAction();
    return true;
  }
  
  return true;
}
```

### 🎯 **Utilisation du Service**

```typescript
import { ErrorHandlingService } from './services/error-handling.service';

constructor(private errorHandler: ErrorHandlingService) {}

// Gestion d'une erreur
private handleServiceError(error: any, context: Record<string, any>) {
  const standardError = this.errorHandler.handleError(error, context);
  
  // Afficher l'erreur à l'utilisateur
  this.showError = true;
  this.currentError = standardError;
  
  // Tenter une récupération si possible
  if (standardError.retryable) {
    this.errorHandler.recoverFromError(standardError, {
      canRetry: true,
      maxRetries: 3,
      fallbackAction: () => this.retryOperation()
    });
  }
}
```

## ErrorDisplayComponent

### 🖼️ **Composant d'Affichage UI**

Le composant `ErrorDisplayComponent` est un composant standalone Angular 18 qui fournit une interface utilisateur cohérente pour l'affichage des erreurs.

#### Propriétés
```typescript
@Input() error: StandardError | null = null;
@Input() showError: boolean = false;

@Output() retryClicked = new EventEmitter<void>();
@Output() dismissed = new EventEmitter<void>();
```

#### Utilisation dans un Template
```html
<app-error-display
  [error]="currentError"
  [showError]="showError"
  (retryClicked)="onRetryError()"
  (dismissed)="onDismissError()">
</app-error-display>
```

### 🎨 **Styles Adaptatifs**

Le composant adapte automatiquement son apparence selon la sévérité :

- **LOW** : Bordure grise, style discret
- **MEDIUM** : Bordure orange, style attention
- **HIGH** : Bordure rouge, arrière-plan légèrement coloré
- **CRITICAL** : Bordure rouge épaisse, arrière-plan rouge, bordure d'alerte

### 🔄 **Fonctionnalité Retry**

- Bouton "Réessayer" affiché uniquement pour les erreurs `retryable: true`
- Émission d'événement `retryClicked` pour permettre la logique de retry personnalisée
- Icônes contextuelles selon le type d'erreur

## Tests et Validation

### 📊 **Couverture de Tests**

**Total : 22 tests**

#### ErrorHandlingService (9 tests)
- ✅ Création du service
- ✅ Gestion d'erreurs basiques
- ✅ Détection d'erreurs Firebase
- ✅ Détection d'erreurs réseau
- ✅ Détection d'erreurs d'authentification
- ✅ Génération d'IDs uniques
- ✅ Messages utilisateur conviviaux
- ✅ Récupération d'erreurs retryable
- ✅ Non-récupération d'erreurs non-retryable

#### ErrorDisplayComponent (7 tests)
- ✅ Création du composant
- ✅ Affichage des messages d'erreur
- ✅ Bouton retry pour erreurs récupérables
- ✅ Absence de bouton retry pour erreurs non-récupérables
- ✅ Émission d'événements retry
- ✅ Émission d'événements dismiss
- ✅ Application de classes CSS selon sévérité

#### Tests d'Intégration (6 tests)
- ✅ Intégration avec services existants
- ✅ Gestion d'erreurs Firebase
- ✅ Gestion d'erreurs réseau
- ✅ Messages conviviaux
- ✅ Récupération d'erreurs
- ✅ Gestion d'erreurs non-récupérables

### 🧪 **Méthodologie TDD Appliquée**

1. **Phase Red** : Tests créés en premier (échecs attendus)
   - Définition des interfaces et spécifications
   - Création des tests unitaires et d'intégration

2. **Phase Green** : Implémentation minimale
   - Service de base répondant aux spécifications
   - Composant UI fonctionnel

3. **Phase Refactor** : Optimisation et amélioration
   - Amélioration de la détection d'erreurs
   - Optimisation des messages utilisateur
   - Corrections d'architecture Angular 18

## Intégration avec les Services Existants

### 🔗 **Modification des Services**

Pour intégrer le système de gestion d'erreurs dans un service existant :

```typescript
import { ErrorHandlingService } from './error-handling.service';

export class CardStorageService {
  constructor(
    private errorHandler: ErrorHandlingService,
    // ... autres dépendances
  ) {}
  
  async addCard(card: PokemonCard): Promise<void> {
    try {
      // Logique métier existante
      await this.firestore.collection('cards').add(card);
    } catch (error) {
      // Utilisation du système d'erreurs standardisé
      const standardError = this.errorHandler.handleError(error, {
        operation: 'addCard',
        userId: this.currentUserId,
        cardId: card.id
      });
      
      // Propagation de l'erreur standardisée
      throw standardError;
    }
  }
}
```

### 📱 **Intégration dans les Pages**

```typescript
export class MyWalletPage {
  currentError: StandardError | null = null;
  showError = false;
  
  constructor(
    private cardService: CardStorageService,
    private errorHandler: ErrorHandlingService
  ) {}
  
  async loadCards() {
    try {
      this.cards = await this.cardService.getCardsByUserId(this.userId);
    } catch (error) {
      if (error instanceof StandardError) {
        this.currentError = error;
        this.showError = true;
      } else {
        // Fallback pour erreurs non standardisées
        this.currentError = this.errorHandler.handleError(error);
        this.showError = true;
      }
    }
  }
  
  onRetryError() {
    this.showError = false;
    this.loadCards(); // Réessayer l'opération
  }
  
  onDismissError() {
    this.showError = false;
    this.currentError = null;
  }
}
```

## Bonnes Pratiques

### ✅ **À Faire**

1. **Utiliser les contextes** : Toujours fournir un contexte détaillé lors de la gestion d'erreurs
2. **Messages conviviaux** : S'assurer que tous les messages sont compréhensibles par l'utilisateur final
3. **Tests complets** : Tester tous les scénarios d'erreur possible
4. **Logging approprié** : Utiliser les niveaux de log selon la sévérité

### ❌ **À Éviter**

1. **Messages techniques** : Éviter d'exposer des messages d'erreur techniques à l'utilisateur
2. **Retry infini** : Implémenter des limites sur les tentatives de récupération
3. **Suppression d'erreurs** : Ne jamais ignorer silencieusement les erreurs
4. **Surcharge de contexte** : Éviter de stocker des données sensibles dans le contexte

## Métriques et Monitoring

### 📈 **Métriques Suivies**

- **Taux d'erreurs** par type et sévérité
- **Temps de résolution** des erreurs récupérables
- **Taux de succès** des opérations de retry
- **Fréquence** des différents types d'erreurs

### 🔍 **Logging et Debug**

Le service log automatiquement toutes les erreurs avec les niveaux appropriés :
- `console.error()` pour HIGH et CRITICAL
- `console.warn()` pour MEDIUM  
- `console.info()` pour LOW

## Évolutions Futures

### 🚀 **Améliorations Prévues**

1. **Tâche 4.2** : Intégration complète dans tous les services
2. **Tâche 4.3** : Dashboard de monitoring des erreurs
3. **Analytics** : Suivi des patterns d'erreur utilisateur
4. **Offline Support** : Gestion d'erreurs hors-ligne
5. **Notifications Push** : Alertes pour erreurs critiques

## Conclusion

Le système de gestion d'erreurs standardisée de PokeWallet fournit une base solide pour une expérience utilisateur cohérente et une maintenance simplifiée. L'approche TDD garantit la fiabilité et la couverture complète des scénarios d'erreur.

**Statut de la Tâche 4.1 : ✅ COMPLÉTÉE**

---

*Documentation mise à jour le {{ new Date().toLocaleDateString('fr-FR') }}*
*Version du système : v1.0.0* 