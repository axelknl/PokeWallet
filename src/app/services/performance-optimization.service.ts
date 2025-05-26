import { Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/**
 * Service d'optimisation des performances pour la gestion des abonnements
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceOptimizationService {
  
  /**
   * Gestionnaire d'abonnements pour éviter les fuites de mémoire
   */
  public createSubscriptionManager(): SubscriptionManager {
    return new SubscriptionManager();
  }

  /**
   * Optimise un observable pour réduire les émissions inutiles
   */
  public optimizeObservable<T>(observable: Observable<T>): Observable<T> {
    // Ici on pourrait ajouter des opérateurs RxJS pour optimiser
    // comme distinctUntilChanged, debounceTime, etc.
    return observable;
  }

  /**
   * Mesure les performances d'une opération
   */
  public measurePerformance<T>(
    operation: () => Promise<T> | T,
    operationName: string
  ): Promise<T> | T {
    const startTime = performance.now();
    
    const result = operation();
    
    if (result instanceof Promise) {
      return result.then(value => {
        const endTime = performance.now();
        console.log(`[PERFORMANCE] ${operationName}: ${endTime - startTime}ms`);
        return value;
      });
    } else {
      const endTime = performance.now();
      console.log(`[PERFORMANCE] ${operationName}: ${endTime - startTime}ms`);
      return result;
    }
  }
}

/**
 * Gestionnaire d'abonnements pour éviter les fuites de mémoire
 */
export class SubscriptionManager {
  private subscriptions: Subscription[] = [];

  /**
   * Ajoute un abonnement à la liste gérée
   */
  public add(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Se désabonne de tous les abonnements et nettoie la liste
   */
  public unsubscribeAll(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  /**
   * Retourne le nombre d'abonnements actifs
   */
  public getActiveCount(): number {
    return this.subscriptions.filter(sub => sub && !sub.closed).length;
  }

  /**
   * Retourne le nombre total d'abonnements gérés
   */
  public getTotalCount(): number {
    return this.subscriptions.length;
  }
} 