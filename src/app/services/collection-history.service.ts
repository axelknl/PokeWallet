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
  limit,
  serverTimestamp
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import { CollectionValueHistory } from '../interfaces/collection-value-history.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { formatDate } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CollectionHistoryService {
  private historySubject = new BehaviorSubject<CollectionValueHistory[]>([]);
  public history$ = this.historySubject.asObservable();
  
  constructor(
    private firestore: Firestore,
    private userService: UserService
  ) { }

  /**
   * Charge l'historique de valeur de la collection pour l'utilisateur actuel
   */
  async loadCollectionHistory(): Promise<void> {
    try {
      const currentUser = this.userService.getCurrentUser();
      if (!currentUser) {
        this.historySubject.next([]);
        return;
      }

      const userId = currentUser.id;
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

      this.historySubject.next(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique de collection:', error);
      this.historySubject.next([]);
    }
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
      
      // Charger l'historique actuel
      const historyCollection = collection(this.firestore, 'collectionHistory');
      const historyQuery = query(
        historyCollection, 
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(historyQuery);
      
      if (!snapshot.empty) {
        // Vérifier si la dernière entrée est d'aujourd'hui
        const lastEntry = snapshot.docs[0];
        const lastEntryData = lastEntry.data() as any;
        const lastDate = lastEntryData.date instanceof Timestamp 
          ? lastEntryData.date.toDate() 
          : new Date(lastEntryData.date);
        
        // Réinitialiser l'heure à minuit pour comparer uniquement les dates
        lastDate.setHours(0, 0, 0, 0);
        
        if (lastDate.getTime() === today.getTime()) {
          // Mettre à jour l'entrée d'aujourd'hui
          await deleteDoc(doc(this.firestore, 'collectionHistory', lastEntry.id));
        }
      }
      
      // Ajouter une nouvelle entrée
      const historyEntry: Omit<CollectionValueHistory, 'id'> = {
        userId,
        date: today,
        value
      };
      
      await addDoc(historyCollection, historyEntry);
      
      // Recharger l'historique
      await this.loadCollectionHistory();
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une entrée d\'historique:', error);
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
      const historyCollection = collection(this.firestore, 'collectionHistory');
      const historyQuery = query(historyCollection, where('userId', '==', userId), limit(1));
      
      const snapshot = await getDocs(historyQuery);
      
      // Si aucune entrée n'existe, créer une entrée initiale
      if (snapshot.empty) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const historyEntry: Omit<CollectionValueHistory, 'id'> = {
          userId,
          date: today,
          value: currentValue
        };
        
        await addDoc(historyCollection, historyEntry);
        
        // Recharger l'historique
        await this.loadCollectionHistory();
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
    const history = this.historySubject.getValue();
    
    const labels = history.map(entry => 
      formatDate(entry.date, 'dd/MM/yy', 'fr-FR')
    );

    const values = history.map(entry => entry.value);
    
    return { labels, values };
  }
} 