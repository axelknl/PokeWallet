import { BehaviorSubject, Observable, shareReplay, distinctUntilChanged } from 'rxjs';
import { CacheableService } from '../interfaces/cacheable-service.interface';

/**
 * Classe de base abstraite pour implémenter le pattern de cache avec optimisations de performance
 * @template T Type des données à mettre en cache
 */
export abstract class BaseCacheService<T> implements CacheableService<T> {
  /**
   * BehaviorSubject pour stocker les données en cache
   */
  protected dataSubject = new BehaviorSubject<T | null>(null);
  
  /**
   * BehaviorSubject pour suivre l'état de chargement
   */
  protected loadingSubject = new BehaviorSubject<boolean>(false);
  
  /**
   * BehaviorSubject pour suivre l'état d'erreur
   */
  protected errorSubject = new BehaviorSubject<boolean>(false);
  
  /**
   * ID de l'utilisateur pour lequel les données sont en cache
   */
  protected cachedUserId: string | null = null;
  
  /**
   * Flag indiquant si les données ont été initialisées
   */
  protected initialized = false;

  /**
   * Promise pour éviter les appels multiples simultanés
   */
  private loadingPromise: Promise<void> | null = null;

  /**
   * Observable publique des données en cache avec optimisations
   */
  public data$ = this.dataSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );
  
  /**
   * Observable publique de l'état de chargement avec optimisations
   */
  public isLoading$ = this.loadingSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );
  
  /**
   * Observable publique de l'état d'erreur avec optimisations
   */
  public hasError$ = this.errorSubject.asObservable().pipe(
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Méthode abstraite à implémenter pour charger les données depuis la source
   * @param userId ID de l'utilisateur
   * @returns Promise des données chargées
   */
  protected abstract fetchFromSource(userId: string): Promise<T>;

  /**
   * Récupère les données, en utilisant le cache si disponible
   * Optimisé pour éviter les appels multiples simultanés
   * @param userId ID de l'utilisateur
   * @returns Observable émettant les données depuis le cache ou la source
   */
  public getData(userId: string = 'default'): Observable<T | null> {
    // Si aucun ID utilisateur n'est fourni, utiliser celui en cache ou une valeur par défaut
    const targetUserId = userId || this.cachedUserId || 'default';
    
    // Si les données sont déjà en cache pour cet utilisateur, les retourner
    if (this.hasCachedData() && targetUserId === this.cachedUserId) {
      return this.data$;
    }
    
    // Si un chargement est déjà en cours, attendre qu'il se termine
    if (!this.loadingPromise) {
      this.loadingPromise = this.loadData(targetUserId).finally(() => {
        this.loadingPromise = null;
      });
    }
    
    return this.data$;
  }
  
  /**
   * Charge les données depuis la source et les met en cache
   * Optimisé pour éviter les appels multiples
   * @param userId ID de l'utilisateur
   * @returns Promise résolue quand les données sont chargées
   */
  protected async loadData(userId: string): Promise<void> {
    try {
      // Indiquer que le chargement est en cours
      this.loadingSubject.next(true);
      this.errorSubject.next(false);
      
      // Charger les données depuis la source
      const data = await this.fetchFromSource(userId);
      
      // Mettre à jour le cache avec les nouvelles données
      this.dataSubject.next(data);
      this.cachedUserId = userId;
      this.initialized = true;
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.errorSubject.next(true);
      
      // En cas d'erreur, ne pas mettre à jour le cache si on a déjà des données
      if (!this.initialized) {
        this.dataSubject.next(null);
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }
  
  /**
   * Force le rechargement des données depuis la source
   * Optimisé pour éviter les appels multiples simultanés
   * @returns Promise résolue quand les données sont rechargées
   */
  public async reloadData(): Promise<void> {
    if (!this.cachedUserId) {
      console.warn('Aucun ID utilisateur en cache, impossible de recharger les données');
      return;
    }
    
    // Attendre que tout chargement en cours se termine
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    
    // Sauvegarde l'état actuel du cache en cas d'erreur
    const previousData = this.dataSubject.getValue();
    const wasInitialized = this.initialized;
    
    try {
      this.loadingPromise = this.loadData(this.cachedUserId).finally(() => {
        this.loadingPromise = null;
      });
      return await this.loadingPromise;
    } catch (error) {
      // Restaurer l'état précédent en cas d'erreur
      if (wasInitialized) {
        this.dataSubject.next(previousData);
        this.initialized = true;
      }
      throw error;
    }
  }
  
  /**
   * Vide le cache et nettoie les ressources
   */
  public clearCache(): void {
    this.dataSubject.next(null);
    this.cachedUserId = null;
    this.initialized = false;
    this.errorSubject.next(false);
    this.loadingPromise = null;
  }
  
  /**
   * Vérifie si le cache contient des données valides
   * @returns true si le cache contient des données valides
   */
  public hasCachedData(): boolean {
    return this.initialized && this.dataSubject.getValue() !== null;
  }
  
  /**
   * Met à jour le cache avec de nouvelles données
   * @param data Nouvelles données
   */
  protected updateCache(data: T): void {
    this.dataSubject.next(data);
    this.initialized = true;
  }
} 