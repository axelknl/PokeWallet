# Documentation d'Implémentation de la Stratégie de Mise en Cache

**Version:** 0.5  
**Date de dernière mise à jour:** 25 mai 2024

## Documentation Fonctionnelle

### Présentation Générale

La stratégie de mise en cache implémentée dans PokeWallet a pour objectif d'optimiser les performances de l'application en réduisant les appels inutiles à Firebase. Actuellement, l'application effectue des requêtes à la base de données à chaque navigation ou rechargement de page, ce qui mobilise des ressources et ralentit l'expérience utilisateur.

La solution mise en place exploite les BehaviorSubjects de RxJS pour stocker les données en mémoire après leur première récupération. Ces données sont ensuite réutilisées lors des consultations ultérieures, sans nécessiter de nouveaux appels à Firebase.

### Fonctionnalités Implémentées

#### Phase 1 - Préparation et Architecture

- **Analyse des services existants :** Les services CardStorageService, UserService, HistoryService et CollectionHistoryService ont été identifiés comme cibles principales pour l'optimisation par mise en cache.

- **Architecture de cache :** Une architecture standardisée basée sur BehaviorSubject a été définie pour tous les services, avec une gestion cohérente du cycle de vie du cache. L'interface `CacheableService<T>` et la classe abstraite `BaseCacheService<T>` ont été créées pour faciliter l'implémentation cohérente du pattern de cache.

- **Tests unitaires :** Une suite de tests unitaires a été mise en place pour valider le fonctionnement du cache, sa réinitialisation et sa gestion des erreurs.

#### Phase 2 - Implémentation du Cache pour CardStorageService

- **Refactorisation du CardStorageService :** Le service a été étendu depuis BaseCacheService pour hériter du pattern de cache standardisé. Les BehaviorSubjects existants ont été remplacés par ceux de la classe de base.

- **Implémentation de fetchFromSource :** Une méthode fetchFromSource a été implémentée pour charger les données depuis Firebase, conforme à l'architecture de cache définie.

- **Migration des méthodes CRUD :** Les méthodes d'ajout, de suppression et de modification des cartes ont été adaptées pour utiliser le cache via updateCache au lieu des BehaviorSubjects précédents.

- **Gestion des erreurs et rollback :** Toutes les méthodes CRUD (addCard, removeCard, updateCard) ont été améliorées pour sauvegarder l'état du cache avant modification et le restaurer en cas d'erreur.

- **Intégration avancée avec l'authentification :** Le service a été amélioré pour gérer de manière robuste les connexions, déconnexions et changements d'utilisateur, assurant l'isolation complète des données entre utilisateurs.

- **Tests unitaires spécifiques :** Des tests unitaires pour CardStorageService ont été créés pour valider le fonctionnement du cache, sa réinitialisation et les opérations CRUD avec leurs mécanismes de gestion d'erreurs.

### Bénéfices Attendus

L'implémentation complète de cette stratégie apportera les avantages suivants :

- **Réactivité accrue :** Les temps de chargement des pages après la première consultation seront pratiquement instantanés.
- **Économie de ressources :** Réduction significative des appels à Firebase, optimisant l'utilisation des quotas et la consommation de batterie sur mobile.
- **Expérience utilisateur fluide :** Les données modifiées seront immédiatement visibles dans toutes les vues, sans rechargement complet.
- **Robustesse :** Mise en place de mécanismes de gestion des erreurs et de fallback pour assurer la fiabilité.

## Documentation Technique

### État Actuel (Avant Optimisation)

#### Analyse des Services Firebase

L'analyse des services a révélé que plusieurs services effectuent des appels répétitifs à Firebase :

1. **CardStorageService :**
   - Gère déjà des BehaviorSubjects (`cardsSubject`, `totalValueSubject`) mais recharge depuis Firebase à chaque visite
   - Contient des méthodes de CRUD qui mettent à jour Firebase mais pas toujours le cache de manière optimale
   - Ne gère pas explicitement un cache avec identification de l'utilisateur courant

2. **UserService :**
   - Utilise un BehaviorSubject pour l'état d'authentification
   - Charge les données utilisateur à chaque changement d'état d'authentification
   - Ne met pas en cache les résultats des recherches ou les détails des amis

3. **HistoryService et CollectionHistoryService :**
   - Effectuent des appels répétitifs à Firebase même pour des données qui changent rarement
   - N'implémentent pas de mécanisme de cache

### Architecture de Cache Standardisée

Pour standardiser la mise en cache à travers les services, nous avons défini les principes architecturaux suivants et créé deux fichiers essentiels :

#### 1. Interface `CacheableService<T>` (src/app/interfaces/cacheable-service.interface.ts)

Cette interface définit le contrat que tous les services avec cache doivent respecter :

```typescript
export interface CacheableService<T> {
  // Observables pour les données et l'état du cache
  data$: Observable<T | null>;
  isLoading$: Observable<boolean>;
  hasError$: Observable<boolean>;
  
  // Méthodes principales
  getData(): Observable<T | null>;
  clearCache(): void;
  reloadData(): Promise<void>;
  hasCachedData(): boolean;
}
```

#### 2. Classe abstraite `BaseCacheService<T>` (src/app/services/base-cache.service.ts)

Cette classe fournit une implémentation de base du pattern de cache :

```typescript
export abstract class BaseCacheService<T> implements CacheableService<T> {
  // BehaviorSubjects pour stocker les données et l'état
  protected dataSubject = new BehaviorSubject<T | null>(null);
  protected loadingSubject = new BehaviorSubject<boolean>(false);
  protected errorSubject = new BehaviorSubject<boolean>(false);
  
  // Observables publiques
  public data$ = this.dataSubject.asObservable();
  public isLoading$ = this.loadingSubject.asObservable();
  public hasError$ = this.errorSubject.asObservable();
  
  // Méthode abstraite à implémenter dans chaque service
  protected abstract fetchFromSource(userId: string): Promise<T>;
  
  // Implémentation des méthodes de l'interface
  public getData(userId?: string): Observable<T | null> { ... }
  protected async loadData(userId: string): Promise<void> { ... }
  public async reloadData(): Promise<void> { ... }
  public clearCache(): void { ... }
  public hasCachedData(): boolean { ... }
}
```

### Implémentation du Cache pour CardStorageService

Le CardStorageService a été refactorisé pour étendre BaseCacheService et implémenter le pattern de cache standardisé :

#### 1. Extension de BaseCacheService

```typescript
@Injectable({
  providedIn: 'root'
})
export class CardStorageService extends BaseCacheService<PokemonCard[]> {
  // BehaviorSubject additionnel pour la valeur totale
  private totalValueSubject = new BehaviorSubject<number>(0);
  
  // Observable public de la valeur totale
  public totalValue$ = this.totalValueSubject.asObservable();
  
  // ...
}
```

#### 2. Implémentation de fetchFromSource

```typescript
protected override async fetchFromSource(userId: string): Promise<PokemonCard[]> {
  try {
    if (!userId) {
      throw new Error('ID utilisateur requis pour récupérer les cartes');
    }

    const cardsCollection = collection(this.firestore, 'users', userId, 'cards');
    const cardsQuery = query(cardsCollection, orderBy('addedDate', 'desc'));
    const snapshot = await getDocs(cardsQuery);

    const cards = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        name: data.name,
        imageUrl: data.imageUrl,
        price: data.price,
        // ...autres propriétés...
      };
    });

    // Actions supplémentaires après chargement
    await this.historyService.initializeHistoryIfNeeded(totalValue);
    await this.updateUserStats();
    
    return cards;
  } catch (error) {
    console.error('Erreur lors du chargement des cartes depuis Firestore:', error);
    throw error;
  }
}
```

#### 3. Implémentation de getCardsByUserId

```typescript
/**
 * Récupère les cartes d'un utilisateur spécifique avec gestion du cache
 * @param userId ID de l'utilisateur dont on veut récupérer les cartes
 * @param forceReload Indique si on doit forcer le rechargement depuis Firebase
 * @returns Observable émettant les cartes depuis le cache ou chargées depuis Firebase
 */
getCardsByUserId(userId: string, forceReload: boolean = false): Observable<PokemonCard[]> {
  if (forceReload) {
    // Si le rechargement est forcé, vider le cache d'abord
    this.clearCache();
  }
  
  // Utiliser getData de BaseCacheService qui gère déjà la logique de cache
  return this.getData(userId).pipe(
    map(cards => cards || [])
  );
}
```

#### 4. Adaptation des méthodes CRUD

Les méthodes d'ajout, de suppression et de modification ont été modifiées pour utiliser le cache standardisé et améliorer la gestion des erreurs :

```typescript
// Méthode pour ajouter une carte avec gestion des erreurs
async addCard(cardData: Partial<PokemonCard>): Promise<void> {
  // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
  const previousCards = this.dataSubject.getValue();
  
  try {
    // ... logique existante pour ajouter à Firebase ...

    // Mettre à jour le cache avec la nouvelle carte (en créant une nouvelle instance du tableau)
    const currentCards = this.dataSubject.getValue() || [];
    const updatedCards = [newCard, ...currentCards]; // Garantir l'immutabilité
    this.updateCache(updatedCards);
    
    try {
      // Actions secondaires qui ne doivent pas bloquer l'ajout de la carte
      await this.updateUserStats();
      await this.userHistoryService.addHistoryEntry(newCard);
    } catch (secondaryError) {
      // Logger l'erreur sans interrompre le flux principal
      console.warn('Erreur lors des actions secondaires après ajout de carte:', secondaryError);
    }
  } catch (error) {
    // En cas d'erreur, restaurer l'état précédent du cache
    if (previousCards !== null) {
      this.updateCache(previousCards);
    }
    console.error('Erreur lors de l\'ajout de la carte:', error);
    throw error;
  }
}

// Méthode pour supprimer une carte avec gestion des erreurs
async removeCard(cardId: string): Promise<void> {
  // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
  const previousCards = this.dataSubject.getValue();
  
  try {
    // ... logique existante pour supprimer de Firebase ...

    // Mettre à jour le cache (en créant une nouvelle instance du tableau pour l'immutabilité)
    const currentCards = this.dataSubject.getValue() || [];
    const updatedCards = currentCards.filter(c => c.id !== cardId);
    this.updateCache(updatedCards);
    
    try {
      // Actions secondaires qui ne doivent pas bloquer la suppression
      if (card) {
        await this.userHistoryService.addDeleteHistoryEntry(card);
      }
      await this.updateUserStats();
    } catch (secondaryError) {
      // Logger l'erreur sans interrompre le flux principal
      console.warn('Erreur lors des actions secondaires après suppression de carte:', secondaryError);
    }
  } catch (error) {
    // En cas d'erreur, restaurer l'état précédent du cache
    if (previousCards !== null) {
      this.updateCache(previousCards);
    }
    console.error('Erreur lors de la suppression de la carte:', error);
    throw error;
  }
}

// Méthode pour mettre à jour une carte avec gestion des erreurs
async updateCard(cardId: string, cardData: Partial<PokemonCard>): Promise<void> {
  // Sauvegarder l'état actuel du cache pour pouvoir le restaurer en cas d'erreur
  const previousCards = this.dataSubject.getValue();
  
  try {
    // ... logique existante pour mettre à jour dans Firebase ...
    
    // Mettre à jour le cache (en créant une nouvelle instance du tableau pour l'immutabilité)
    const currentCards = this.dataSubject.getValue() || [];
    const updatedIndex = currentCards.findIndex(card => card.id === cardId);
    
    if (updatedIndex !== -1) {
      // Créer une nouvelle instance de la carte mise à jour
      const updatedCard = {
        ...currentCards[updatedIndex],
        ...updatedCardData
      };
      
      // Créer une nouvelle instance du tableau
      const updatedCards = [
        ...currentCards.slice(0, updatedIndex),
        updatedCard,
        ...currentCards.slice(updatedIndex + 1)
      ];
      
      this.updateCache(updatedCards);
      
      try {
        // Actions secondaires qui ne doivent pas bloquer la mise à jour
        if (cardData.price !== undefined) {
          await this.updateUserStats();
        }
      } catch (secondaryError) {
        // Logger l'erreur sans interrompre le flux principal
        console.warn('Erreur lors des actions secondaires après mise à jour de carte:', secondaryError);
      }
    }
  } catch (error) {
    // En cas d'erreur, restaurer l'état précédent du cache
    if (previousCards !== null) {
      this.updateCache(previousCards);
    }
    console.error('Erreur lors de la mise à jour de la carte', error);
    throw error;
  }
}
```

Les principales améliorations apportées aux méthodes CRUD sont :

1. **Sauvegarde de l'état précédent** : L'état du cache est sauvegardé avant toute modification, permettant une restauration en cas d'erreur.

2. **Gestion robuste des erreurs** : 
   - Les erreurs principales sont capturées et l'état du cache est restauré
   - Les erreurs secondaires (actions post-modification) sont gérées séparément pour ne pas bloquer le flux principal

3. **Immutabilité garantie** : Toutes les mises à jour du cache créent explicitement de nouvelles instances des tableaux pour éviter les effets de bord.

4. **Séparation des préoccupations** : 
   - Les opérations critiques (modification Firebase, mise à jour du cache) sont séparées des opérations secondaires (mise à jour des statistiques, historique)
   - Les erreurs dans les opérations secondaires ne compromettent pas la cohérence du cache

### Intégration avec le Système d'Authentification

Pour assurer une isolation complète des données entre utilisateurs et éviter les fuites de données, l'intégration avec le système d'authentification a été renforcée :

#### 1. Initialisation de l'écouteur d'authentification

```typescript
private initAuthenticationListener(): void {
  // Variable pour stocker l'ID de l'utilisateur précédent
  let previousUserId: string | null = null;
  
  // Écouter les changements d'état d'authentification
  this.userService.authState$.subscribe(isAuthenticated => {
    if (isAuthenticated) {
      const user = this.userService.getCurrentUser();
      if (user) {
        // Si l'utilisateur a changé, vider le cache
        if (previousUserId !== null && previousUserId !== user.id) {
          console.log('Changement d\'utilisateur détecté, réinitialisation du cache');
          this.clearCache();
        }
        
        // Mettre à jour l'ID de l'utilisateur précédent
        previousUserId = user.id;
        
        // Charger les cartes via getData qui gère le cache
        this.getData(user.id);
      }
    } else {
      // Réinitialiser le cache et l'ID de l'utilisateur précédent quand l'utilisateur se déconnecte
      console.log('Déconnexion détectée, réinitialisation du cache');
      previousUserId = null;
      this.clearCache();
    }
  });
}
```

#### 2. Connexion avec la méthode de déconnexion

Pour garantir que le cache est toujours vidé lors d'une déconnexion, même si l'événement authState n'est pas correctement déclenché, une connexion directe à la méthode logout du UserService a été mise en place :

```typescript
private connectLogoutToCache(): void {
  // Méthode originale de déconnexion
  const originalLogout = this.userService.logout;
  
  // Remplacer la méthode de déconnexion par une version qui nettoie également le cache
  this.userService.logout = async (): Promise<void> => {
    try {
      // Vider le cache avant la déconnexion
      console.log('Déconnexion explicite, nettoyage du cache');
      this.clearCache();
      
      // Appeler la méthode originale de déconnexion
      return await originalLogout.call(this.userService);
    } catch (error) {
      console.error('Erreur lors de la déconnexion avec nettoyage du cache:', error);
      throw error;
    }
  };
}
```

#### 3. Vérification de l'intégrité du cache

Une méthode dédiée a été ajoutée pour vérifier qu'aucune donnée d'un utilisateur précédent ne persiste dans le cache :

```typescript
public verifyCleanCache(currentUserId: string): boolean {
  // Vérifier si les données en cache appartiennent à l'utilisateur actuel
  if (this.hasCachedData() && this.cachedUserId !== currentUserId) {
    console.warn('Données d\'un autre utilisateur détectées dans le cache!');
    
    // Nettoyage automatique
    this.clearCache();
    return false;
  }
  
  return true;
}
```

#### 4. Amélioration de la méthode clearCache

La méthode clearCache a été surchargée pour effectuer des nettoyages supplémentaires spécifiques au CardStorageService :

```typescript
public override clearCache(): void {
  // Appeler la méthode de base
  super.clearCache();
  
  // Réinitialiser également la valeur totale
  this.totalValueSubject.next(0);
  
  console.log('Cache vidé avec succès');
}
```

### Cycle de Vie du Cache

Le cycle de vie du cache est géré de manière standardisée :

1. **Initialisation :** Le cache commence vide (`null`)
2. **Premier accès :** `getData()` vérifie si les données sont en cache, sinon appelle `loadData()` qui charge les données depuis la source via `fetchFromSource()`
3. **Accès suivants :** `getData()` retourne les données en cache si elles sont disponibles pour l'utilisateur demandé
4. **Rechargement forcé :** `reloadData()` force un rechargement des données depuis la source
5. **Réinitialisation :** `clearCache()` vide le cache et réinitialise l'état

### Gestion des Erreurs

La gestion des erreurs est intégrée au cycle de vie du cache :

1. **Erreur de chargement initial :** L'erreur est capturée, logguée et signalée via `errorSubject`
2. **Erreur lors du rechargement :** Si des données existaient déjà en cache, elles sont conservées

### Prochaines Étapes

Les prochaines étapes de l'implémentation (Phase 3) consisteront à :

1. Étendre le pattern de cache aux autres services: UserService, HistoryService et CollectionHistoryService
2. Optimiser les interactions entre les services pour minimiser les rechargements
3. Améliorer la gestion des erreurs et les mécanismes de repli 