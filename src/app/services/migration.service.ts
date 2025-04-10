import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp, 
  where 
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';
import { HistoryActionType } from '../interfaces/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private migrationRunning = new BehaviorSubject<boolean>(false);
  public migrationRunning$ = this.migrationRunning.asObservable();

  constructor(
    private firestore: Firestore,
    private userService: UserService
  ) {}

  /**
   * Exécute la migration pour calculer le total des profits/pertes pour tous les utilisateurs
   * @returns Promise<void>
   */
  async migrateTotalProfit(): Promise<void> {
    // Vérifier si une migration est déjà en cours
    if (this.migrationRunning.getValue()) {
      console.log('Une migration est déjà en cours');
      return;
    }

    this.migrationRunning.next(true);

    try {
      console.log('Début de la migration totalProfit...');
      
      // 1. Récupérer tous les utilisateurs
      const usersCollection = collection(this.firestore, 'users');
      const usersQuery = query(usersCollection);
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log(`Nombre d'utilisateurs trouvés: ${usersSnapshot.size}`);
      
      // 2. Pour chaque utilisateur, calculer le total des profits/pertes
      const migrationPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        
        try {
          // Récupérer l'historique des ventes de l'utilisateur
          const historyCollection = collection(this.firestore, 'history');
          const historyQuery = query(
            historyCollection,
            where('userId', '==', userId),
            where('actionType', '==', HistoryActionType.VENTE)
          );
          
          const historySnapshot = await getDocs(historyQuery);
          
          // Calculer le total des profits/pertes
          let totalProfit = 0;
          
          historySnapshot.docs.forEach(historyDoc => {
            const historyData = historyDoc.data();
            // Si la vente a un profit défini, l'ajouter au total
            if (historyData['profit'] !== undefined && historyData['profit'] !== null) {
              totalProfit += historyData['profit'];
            }
          });
          
          // Mettre à jour l'utilisateur avec le totalProfit calculé
          const userDocRef = doc(this.firestore, 'users', userId);
          await updateDoc(userDocRef, { totalProfit });
          
          console.log(`Utilisateur ${userId} mis à jour avec totalProfit: ${totalProfit}`);
          
          return { userId, totalProfit, success: true };
        } catch (error) {
          console.error(`Erreur lors de la migration pour l'utilisateur ${userId}:`, error);
          return { userId, error, success: false };
        }
      });
      
      // Attendre que toutes les migrations soient terminées
      const results = await Promise.all(migrationPromises);
      
      // Compter les succès et les échecs
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`Migration terminée. Succès: ${successCount}, Échecs: ${failureCount}`);
      
      // Si l'utilisateur actuel est connecté, mettre à jour ses données en mémoire
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        const userResult = results.find(r => r.userId === currentUser.id);
        if (userResult && userResult.success) {
          // Mettre à jour l'utilisateur en mémoire
          this.userService.updateUser({ totalProfit: userResult.totalProfit });
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la migration totalProfit:', error);
    } finally {
      this.migrationRunning.next(false);
    }
  }
} 