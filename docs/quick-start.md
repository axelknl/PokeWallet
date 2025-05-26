# 🚀 Guide de Démarrage Rapide - PokeWallet

## Configuration Initiale

### 1. Prérequis
```bash
node --version    # v18+
npm --version     # v9+
```

### 2. Installation du Projet
```bash
git clone <repository-url>
cd PokeWallet
npm install
```

### 3. Configuration Firebase
- Copier `src/environments/environment.example.ts` vers `src/environments/environment.ts`
- Ajouter vos clés Firebase dans le fichier de configuration

### 4. Lancement du Projet
```bash
npm run start    # http://localhost:8100
```

## Architecture Clés à Connaître

### 🧱 Services Principaux

#### BaseCacheService
Service de base pour tous les caches :
```typescript
// Étendre BaseCacheService pour nouveau service
export class MonService extends BaseCacheService<MonType[]> {
  protected async fetchFromSource(userId: string): Promise<MonType[]> {
    // Logique de récupération depuis Firebase
  }
}
```

#### ErrorHandlingService
Gestion d'erreurs standardisée :
```typescript
// Utilisation dans un service
try {
  // Opération Firebase
} catch (error) {
  const standardError = this.errorHandler.handleError(error, {
    operation: 'monOperation',
    userId: this.currentUserId
  });
  throw standardError;
}
```

### 🎨 Composants UI

#### ErrorDisplayComponent
Affichage d'erreurs cohérent :
```html
<app-error-display
  [error]="currentError"
  [showError]="showError"
  (retryClicked)="onRetryError()"
  (dismissed)="onDismissError()">
</app-error-display>
```

## Patterns de Développement

### ✅ Test-Driven Development (TDD)

1. **Red** : Écrire le test qui échoue
```typescript
it('should handle network errors', () => {
  // Test qui échoue car fonctionnalité n'existe pas
});
```

2. **Green** : Implémenter le minimum pour passer
```typescript
handleNetworkError(error: any) {
  // Implémentation minimale
}
```

3. **Refactor** : Améliorer le code
```typescript
handleNetworkError(error: any): StandardError {
  // Implémentation complète et optimisée
}
```

### 🔄 Gestion du Cache

#### Récupération avec Cache
```typescript
// Dans un service étendu de BaseCacheService
getMyData(userId: string): Observable<MyData[]> {
  return this.getData(userId).pipe(
    map(data => data || [])
  );
}
```

#### Mise à Jour du Cache
```typescript
async addItem(item: MyItem): Promise<void> {
  const previousData = this.dataSubject.getValue();
  
  try {
    // Optimistic update
    const updatedData = [...(previousData || []), item];
    this.updateCache(updatedData);
    
    // Persistence Firebase
    await this.saveToFirebase(item);
    
  } catch (error) {
    // Rollback en cas d'erreur
    this.dataSubject.next(previousData);
    throw error;
  }
}
```

### ⚠️ Gestion des Erreurs

#### Dans une Page/Composant
```typescript
export class MaPage {
  currentError: StandardError | null = null;
  showError = false;
  
  async loadData() {
    try {
      this.data = await this.monService.getData();
    } catch (error) {
      this.currentError = error instanceof StandardError 
        ? error 
        : this.errorHandler.handleError(error);
      this.showError = true;
    }
  }
  
  onRetryError() {
    this.showError = false;
    this.loadData();
  }
  
  onDismissError() {
    this.showError = false;
    this.currentError = null;
  }
}
```

## Commandes Utiles

### 🧪 Tests
```bash
npm test                    # Tous les tests
npm test -- --watch        # Mode watch
npm test CardStorage        # Tests spécifiques
```

### 🔧 Développement
```bash
npm run lint               # Vérification code
npm run build              # Build production
ionic serve                # Serveur de dev avec live reload
```

### 📱 Mobile
```bash
ionic capacitor add ios
ionic capacitor add android
ionic capacitor run ios
ionic capacitor run android
```

## Checklist Nouveau Feature

### ✅ Avant de commencer
- [ ] Écrire les tests (TDD)
- [ ] Vérifier l'architecture existante
- [ ] Identifier les services concernés

### ✅ Pendant le développement
- [ ] Utiliser BaseCacheService si données persistantes
- [ ] Intégrer ErrorHandlingService pour les erreurs
- [ ] Suivre les patterns établis
- [ ] Tests passent à chaque étape

### ✅ Avant la PR
- [ ] Tous les tests passent
- [ ] Documentation mise à jour
- [ ] Messages d'erreur en français
- [ ] Code compatible Angular 18

## Structure des Fichiers Types

### Service avec Cache
```
src/app/services/
├── mon-service.service.ts        # Service principal
├── mon-service.service.spec.ts   # Tests unitaires
└── mon-service-integration.spec.ts # Tests d'intégration
```

### Composant UI
```
src/app/components/mon-component/
├── mon-component.component.ts       # Logique
├── mon-component.component.html     # Template
├── mon-component.component.scss     # Styles
└── mon-component.component.spec.ts  # Tests
```

### Interface/Types
```
src/app/interfaces/
└── mon-type.interface.ts           # Définitions TypeScript
```

## FAQ Développeur

### ❓ Quand utiliser BaseCacheService ?
- Données user-specific qui changent peu
- Appels Firebase répétitifs
- Besoin d'optimisation performance

### ❓ Quand utiliser ErrorHandlingService ?
- Toutes les opérations Firebase
- Interactions réseau
- Operations critiques pour l'utilisateur

### ❓ Comment débugger le cache ?
```typescript
// Vérifier l'état du cache
console.log('Cache has data:', this.hasCachedData());
console.log('Cached user:', this.cachedUserId);
console.log('Cache data:', this.dataSubject.getValue());
```

### ❓ Comment forcer un reload ?
```typescript
// Forcer le rechargement depuis Firebase
await this.monService.reloadData();

// Ou vider le cache
this.monService.clearCache();
```

## Ressources

### 📚 Documentation
- [Architecture Cache](cache/cache_implementation.md)
- [Gestion d'Erreurs](error-handling.md)
- [Task List](../task-list/cache_task-list.md)

### 🔗 Liens Externes
- [Angular 18 Docs](https://angular.io/docs)
- [Ionic 8 Docs](https://ionicframework.com/docs)
- [RxJS Operators](https://rxjs.dev/api)
- [Firebase Web SDK](https://firebase.google.com/docs/web)

---

*Happy Coding! 🎮* 