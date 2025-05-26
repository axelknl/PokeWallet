# Guide d'Utilisation des Optimisations de Performance

## Introduction

Ce guide explique comment utiliser les optimisations de performance implémentées dans PokeWallet pour créer des composants performants et éviter les fuites de mémoire.

## 1. Utilisation de la Stratégie OnPush

### Étapes d'implémentation

1. **Ajouter OnPush au composant**
```typescript
import { ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-my-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class MyComponent {
  constructor(private cdr: ChangeDetectorRef) {}
}
```

2. **Déclencher manuellement la détection**
```typescript
ngOnInit() {
  this.service.data$.subscribe(data => {
    this.data = data;
    this.cdr.markForCheck(); // Important !
  });
}
```

### Quand utiliser OnPush
- ✅ Composants avec beaucoup de données
- ✅ Composants qui s'abonnent à des observables
- ✅ Composants avec des listes importantes
- ❌ Composants simples sans abonnements

## 2. Gestion Optimisée des Abonnements

### Utilisation du SubscriptionManager

```typescript
import { PerformanceOptimizationService, SubscriptionManager } from '../services/performance-optimization.service';

export class MyComponent implements OnInit, OnDestroy {
  private subscriptionManager: SubscriptionManager;

  constructor(private performanceService: PerformanceOptimizationService) {
    this.subscriptionManager = this.performanceService.createSubscriptionManager();
  }

  ngOnInit() {
    // Ajouter des abonnements
    const sub1 = this.service1.data$.subscribe(data => {
      // Traitement
      this.cdr.markForCheck();
    });
    this.subscriptionManager.add(sub1);

    const sub2 = this.service2.status$.subscribe(status => {
      // Traitement
      this.cdr.markForCheck();
    });
    this.subscriptionManager.add(sub2);
  }

  ngOnDestroy() {
    // Nettoyer automatiquement tous les abonnements
    this.subscriptionManager.unsubscribeAll();
  }
}
```

### Gestion manuelle (alternative)

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.service.data$.subscribe(data => {
        this.data = data;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }
}
```

## 3. Mesure de Performance

### Mesurer les opérations critiques

```typescript
export class MyComponent {
  constructor(private performanceService: PerformanceOptimizationService) {}

  async loadData() {
    await this.performanceService.measurePerformance(async () => {
      // Opération à mesurer
      await this.service.loadUserData();
      await this.service.loadCards();
    }, 'Data loading');
  }

  syncOperation() {
    const result = this.performanceService.measurePerformance(() => {
      // Opération synchrone
      return this.processData();
    }, 'Data processing');
  }
}
```

### Interpréter les résultats

```
[PERFORMANCE] Data loading: 45.2ms    // Bon
[PERFORMANCE] Data loading: 250ms     // À optimiser
[PERFORMANCE] Data loading: 1200ms    // Problème !
```

## 4. Optimisation des Services avec Cache

### Étendre BaseCacheService

```typescript
@Injectable({ providedIn: 'root' })
export class MyDataService extends BaseCacheService<MyData[]> {
  constructor(private firestore: Firestore) {
    super();
  }

  protected async fetchFromSource(userId: string): Promise<MyData[]> {
    // Implémentation du chargement depuis Firebase
    const snapshot = await getDocs(collection(this.firestore, 'myData'));
    return snapshot.docs.map(doc => doc.data() as MyData);
  }
}
```

### Utilisation dans les composants

```typescript
export class MyComponent implements OnInit {
  data: MyData[] = [];
  loading = false;
  hasError = false;

  constructor(private myDataService: MyDataService) {}

  ngOnInit() {
    // S'abonner aux données avec cache automatique
    this.subscriptionManager.add(
      this.myDataService.data$.subscribe(data => {
        this.data = data || [];
        this.cdr.markForCheck();
      })
    );

    // S'abonner à l'état de chargement
    this.subscriptionManager.add(
      this.myDataService.isLoading$.subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      })
    );

    // Charger les données
    this.myDataService.getData(this.userId);
  }

  async refresh() {
    await this.myDataService.reloadData();
  }
}
```

## 5. Bonnes Pratiques

### Template Optimization

```html
<!-- Utiliser trackBy pour les listes -->
<ion-item *ngFor="let item of items; trackBy: trackByFn">
  {{ item.name }}
</ion-item>
```

```typescript
trackByFn(index: number, item: any): any {
  return item.id; // Utiliser un identifiant unique
}
```

### Éviter les Fuites de Mémoire

```typescript
// ❌ Mauvais - fuite de mémoire
ngOnInit() {
  this.service.data$.subscribe(data => {
    this.data = data;
  }); // Pas de unsubscribe !
}

// ✅ Bon - avec SubscriptionManager
ngOnInit() {
  const sub = this.service.data$.subscribe(data => {
    this.data = data;
    this.cdr.markForCheck();
  });
  this.subscriptionManager.add(sub);
}

ngOnDestroy() {
  this.subscriptionManager.unsubscribeAll();
}
```

### Optimisation des Observables

```typescript
// Dans les services
public data$ = this.dataSubject.asObservable().pipe(
  distinctUntilChanged(),  // Éviter les émissions identiques
  shareReplay(1)          // Réutiliser l'observable
);
```

## 6. Debugging et Monitoring

### Vérifier les Abonnements

```typescript
ngOnDestroy() {
  console.log(`Active subscriptions: ${this.subscriptionManager.getActiveCount()}`);
  console.log(`Total subscriptions: ${this.subscriptionManager.getTotalCount()}`);
  this.subscriptionManager.unsubscribeAll();
}
```

### Surveiller les Performances

```typescript
// Activer le logging détaillé en développement
if (!environment.production) {
  console.log('[PERFORMANCE] Component initialized');
}
```

## 7. Checklist d'Optimisation

### Avant de créer un nouveau composant

- [ ] Ai-je besoin de OnPush ?
- [ ] Vais-je avoir des abonnements ?
- [ ] Ai-je prévu le nettoyage des abonnements ?
- [ ] Ai-je besoin de mesurer les performances ?

### Pendant le développement

- [ ] OnPush configuré si nécessaire
- [ ] ChangeDetectorRef injecté et utilisé
- [ ] SubscriptionManager configuré
- [ ] Tous les abonnements ajoutés au manager
- [ ] ngOnDestroy implémenté avec unsubscribeAll()

### Avant la mise en production

- [ ] Tests de performance écrits
- [ ] Pas de fuites de mémoire détectées
- [ ] Temps de chargement acceptables
- [ ] Logs de performance analysés

## 8. Exemples Complets

### Composant Simple avec OnPush

```typescript
@Component({
  selector: 'app-simple',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="loading">Chargement...</div>
    <div *ngFor="let item of items; trackBy: trackByFn">
      {{ item.name }}
    </div>
  `
})
export class SimpleComponent implements OnInit, OnDestroy {
  items: Item[] = [];
  loading = false;
  private subscriptionManager: SubscriptionManager;

  constructor(
    private service: ItemService,
    private performanceService: PerformanceOptimizationService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscriptionManager = this.performanceService.createSubscriptionManager();
  }

  ngOnInit() {
    this.subscriptionManager.add(
      this.service.items$.subscribe(items => {
        this.items = items;
        this.cdr.markForCheck();
      })
    );

    this.subscriptionManager.add(
      this.service.loading$.subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptionManager.unsubscribeAll();
  }

  trackByFn(index: number, item: Item): string {
    return item.id;
  }
}
```

### Service avec Cache Optimisé

```typescript
@Injectable({ providedIn: 'root' })
export class OptimizedService extends BaseCacheService<Item[]> {
  constructor(private firestore: Firestore) {
    super();
  }

  protected async fetchFromSource(userId: string): Promise<Item[]> {
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'items'),
        where('userId', '==', userId)
      )
    );
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Item));
  }

  async addItem(item: Partial<Item>): Promise<void> {
    // Ajouter à Firebase
    await addDoc(collection(this.firestore, 'items'), item);
    
    // Recharger le cache
    await this.reloadData();
  }
}
```

## Conclusion

En suivant ce guide, vous pourrez créer des composants performants qui :
- Utilisent efficacement la mémoire
- Évitent les fuites de mémoire
- Offrent une expérience utilisateur fluide
- Sont faciles à maintenir et déboguer

N'hésitez pas à consulter la documentation complète pour plus de détails sur l'architecture des optimisations. 