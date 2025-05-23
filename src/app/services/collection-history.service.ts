import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  limit
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import { CollectionValueHistory } from '../interfaces/collection-value-history.interface';
import { formatDate } from '@angular/common';
import { BaseCacheService } from './base-cache.service';

@Injectable({
  providedIn: 'root'
})
export class CollectionHistoryService extends BaseCacheService<CollectionValueHistory[]> {
  
  constructor(
    private firestore: Firestore,
    private userService: UserService
  ) {
    super();
  }

  /**
   * Implémente la méthode abstraite pour charger les données depuis Firebase
   * @param userId ID de l'utilisateur
   * @returns Promise avec l'historique de collection
   */
  protected async fetchFromSource(userId: string): Promise<CollectionValueHistory[]> {
    try {
      const historyCollection = collection(this.firestore, 'collectionHistory');
      const historyQuery = query(
        historyCollection, 
        where('userId', '==', userId),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(historyQuery);
      
      const history = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          userId: data.userId,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          value: data.value
        } as CollectionValueHistory;
      });

      return history;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique de collection:', error);
      throw error;
    }
  }

  /**
   * Méthode utilitaire pour ajouter des données à Firestore
   * @param data Données à ajouter
   */
  private async addToFirestore(data: Omit<CollectionValueHistory, 'id'>): Promise<void> {
    const historyCollection = collection(this.firestore, 'collectionHistory');
    await addDoc(historyCollection, data);
  }

  /**
   * Charge l'historique de valeur de la collection pour l'utilisateur actuel
   */
  async loadCollectionHistory(): Promise<void> {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.updateCache([]);
      return;
    }

    // Utiliser la méthode getData du cache
    this.getData(currentUser.id).subscribe();
  }

  /**
   * Ajoute une nouvelle entrée à l'historique ou met à jour celle du jour
   * @param value Valeur actuelle de la collection
   */
  async addCollectionHistoryEntry(value: number): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const userId = currentUser.id;
      const today = new Date();
      // Mettre l'heure à minuit pour comparer uniquement les dates
      today.setHours(0, 0, 0, 0);
      
      // Charger l'historique actuel si nécessaire
      await this.getData(userId);
      const currentHistory = this.dataSubject.getValue() || [];
      
      // Vérifier si une entrée existe déjà pour aujourd'hui
      const todayEntry = currentHistory.find(entry => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      });

      if (todayEntry) {
        // Supprimer l'ancienne entrée de Firestore
        if (todayEntry.id) {
          await deleteDoc(doc(this.firestore, 'collectionHistory', todayEntry.id));
        }
      }
      
      // Ajouter une nouvelle entrée
      const historyEntry: Omit<CollectionValueHistory, 'id'> = {
        userId,
        date: today,
        value
      };
      
      await this.addToFirestore(historyEntry);
      
      // Mettre à jour le cache en recréant la liste mise à jour
      let updatedHistory = currentHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() !== today.getTime();
      });
      
      // Ajouter la nouvelle entrée (avec un ID temporaire car on ne connaît pas l'ID Firestore)
      const newEntry: CollectionValueHistory = {
        id: `temp-${Date.now()}`,
        ...historyEntry
      };
      
      updatedHistory.push(newEntry);
      updatedHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      this.updateCache(updatedHistory);
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une entrée d\'historique:', error);
      throw error;
    }
  }

  /**
   * Initialise l'historique si aucune entrée n'existe
   * @param currentValue Valeur actuelle de la collection
   */
  async initializeHistoryIfNeeded(currentValue: number): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) return;

      const userId = currentUser.id;
      
      // Charger l'historique actuel
      await this.getData(userId);
      const currentHistory = this.dataSubject.getValue() || [];
      
      // Si aucune entrée n'existe, créer une entrée initiale
      if (currentHistory.length === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const historyEntry: Omit<CollectionValueHistory, 'id'> = {
          userId,
          date: today,
          value: currentValue
        };
        
        await this.addToFirestore(historyEntry);
        
        // Mettre à jour le cache avec la nouvelle entrée
        const newEntry: CollectionValueHistory = {
          id: `temp-${Date.now()}`,
          ...historyEntry
        };
        
        this.updateCache([newEntry]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'historique:', error);
    }
  }

  /**
   * Formate les données pour le graphique Chart.js
   * @returns Données formatées pour Chart.js
   */
  getFormattedChartData(): { labels: string[], values: number[] } {
    const history = this.dataSubject.getValue() || [];
    
    const labels = history.map(entry => {
      const date = new Date(entry.date);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    });

    const values = history.map(entry => entry.value);
    
    return { labels, values };
  }

  /**
   * Alias pour la compatibilité avec l'ancienne interface
   */
  get history$() {
    return this.data$;
  }
} 