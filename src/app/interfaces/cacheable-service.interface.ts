import { Observable } from 'rxjs';

/**
 * Interface générique pour les services avec mise en cache
 * @template T Type des données à mettre en cache
 */
export interface CacheableService<T> {
  /**
   * Observable des données en cache
   */
  data$: Observable<T | null>;
  
  /**
   * État du chargement des données
   */
  isLoading$: Observable<boolean>;
  
  /**
   * État d'erreur du cache
   */
  hasError$: Observable<boolean>;
  
  /**
   * Récupère les données, en utilisant le cache si disponible
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Observable émettant les données depuis le cache ou la source
   */
  getData(userId?: string): Observable<T | null>;
  
  /**
   * Vide le cache
   */
  clearCache(): void;
  
  /**
   * Force le rechargement des données depuis la source
   * @returns Promise résolue quand les données sont rechargées
   */
  reloadData(): Promise<void>;
  
  /**
   * Vérifie si le cache contient des données valides
   * @returns true si le cache contient des données valides
   */
  hasCachedData(): boolean;
} 