import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, FirestoreUser } from '../interfaces/user.interface';
import { MOCK_USER } from '../mocks/user.mock';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { switchMap, tap, filter, take } from 'rxjs/operators';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  user,
  authState,
  UserCredential,
  User as FirebaseUser,
  onAuthStateChanged
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  Timestamp,
  updateDoc,
  collection,
  query,
  getDocs,
  writeBatch,
  where,
  arrayUnion,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { BaseCacheService } from './base-cache.service';

/**
 * Service de gestion des utilisateurs avec mise en cache
 * Étend BaseCacheService pour implémenter un système de cache efficace
 * 
 * Le service gère :
 * - L'authentification des utilisateurs
 * - La gestion des profils utilisateurs
 * - La mise en cache des données utilisateur
 * - La synchronisation avec Firestore
 * 
 * Le cache est automatiquement :
 * - Mis à jour lors des modifications de données
 * - Vidé lors de la déconnexion
 * - Rechargé lors de la reconnexion
 */
@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseCacheService<User> {
  private readonly USER_STORAGE_KEY = 'current_user';
  private currentUser: User | null = null;
  private authState = new BehaviorSubject<boolean>(false);
  private authChecked = new BehaviorSubject<boolean>(false);
  public authState$: Observable<boolean> = this.authState.asObservable();
  public authChecked$: Observable<boolean> = this.authChecked.asObservable();
  public user$ = user(this.auth);
  private router = inject(Router);

  // Alias pour compatibilité avec le code existant
  public get currentUserData$(): Observable<User | null> {
    return this.data$;
  }

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    super();
    this.initializeUser();
    
    // Observer les changements d'état d'authentification
    authState(this.auth).subscribe(user => {
      
      // Mettre à jour l'état d'authentification
      this.authState.next(!!user);
      this.authChecked.next(true);
      
      if (user) {
        // Si l'utilisateur est connecté, charger ses données via le cache
        this.loadUserDataWithCache(user.uid);
      } else {
        // Si l'utilisateur est déconnecté, réinitialiser les données et le cache
        this.currentUser = null;
        this.clearCache();
        
        // Si nous sommes sur une page protégée et que l'utilisateur
        // est déconnecté, rediriger vers login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/logout') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    });
  }

  private async initializeUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      this.loadUserDataWithCache(user.uid);
      this.authState.next(true);
    }
    // Indiquer que la vérification initiale est terminée
    setTimeout(() => this.authChecked.next(true), 1000);
  }

  // Méthode pour attendre la vérification d'authentification
  async waitForAuthCheck(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.authChecked$.pipe(
        filter(checked => checked === true),
        take(1) // ✅ se désabonne automatiquement après la première valeur true
      ).subscribe(() => {
        resolve(this.isAuthenticated());
      });
    });
  }

  // Connexion avec email et mot de passe
  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const userId = userCredential.user.uid;
      
      
      // Vérifier d'abord si l'utilisateur existe dans Firestore
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      
      if (userDoc.exists()) {
        // Mettre à jour seulement la dernière connexion sans écraser les autres champs
        await updateDoc(doc(this.firestore, 'users', userId), {
          lastLoginAt: new Date()
        });
      } else {
        // Si l'utilisateur n'existe pas dans Firestore, créer un nouveau document
        const userData: User = {
          id: userId,
          username: userCredential.user.displayName || 'Utilisateur',
          email: userCredential.user.email || '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          avatarUrl: userCredential.user.photoURL || 'https://ionicframework.com/docs/img/demos/avatar.svg',
          totalCards: 0,
          collectionValue: 0,
          totalProfit: 0,
          isProfilPublic: true
        };
        
        // Créer le document utilisateur complet
        await setDoc(doc(this.firestore, 'users', userId), userData);
      }
      
      // Charger les données utilisateur via le cache
      this.loadUserDataWithCache(userId);
      this.authState.next(true);
      

      // Attendre un peu avant de rediriger
      return new Promise((resolve) => {
        setTimeout(() => {
          this.router.navigateByUrl('/home');
          resolve();
        }, 500);
      });
    } catch (error) {
      console.error('Erreur de connexion:', error);
      this.authState.next(false);
      throw error;
    }
  }

  // Inscription d'un nouvel utilisateur
  async register(username: string, email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Mettre à jour le profil avec le nom d'utilisateur
      await updateProfile(user, {
        displayName: username
      });
      
      // Créer un document utilisateur dans Firestore
      const userData: User = {
        id: user.uid,
        username: username,
        email: user.email || '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg',
        totalCards: 0,
        collectionValue: 0,
        totalProfit: 0,
        isProfilPublic: true // Par défaut, le profil est public
      };
      
      await setDoc(doc(this.firestore, 'users', user.uid), userData);
      
      this.currentUser = userData;
      this.authState.next(true);
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  }

  // Déconnexion
  async logout(): Promise<void> {
    try {
      // Nettoyer les données utilisateur locales
      this.currentUser = null;
      
      // Mettre à jour l'état d'authentification
      this.authState.next(false);
      
      // Effectuer la déconnexion de Firebase
      await signOut(this.auth);
      
      return Promise.resolve();
    } catch (error) {
      console.error('UserService: Erreur de déconnexion:', error);
      throw error;
    }
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    return this.authState.value;
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Mettre à jour les données utilisateur
  async updateUser(userData: Partial<User>): Promise<void> {
    if (this.auth.currentUser) {
      try {
        const userId = this.auth.currentUser.uid;
        
        // Vérifier d'abord que nous avons les données utilisateur complètes
        if (!this.currentUser) {
          // Si currentUser est null, charger les données utilisateur via le cache
          this.loadUserDataWithCache(userId);
          // Attendre que les données soient chargées
          await new Promise<void>((resolve) => {
            this.data$.pipe(
              filter(user => user !== null),
              take(1)
            ).subscribe(() => resolve());
          });
        }
        
        // S'assurer que toutes les propriétés requises sont préservées
        const newData = {
          ...userData
        };
        
        // Utiliser updateDoc pour ne mettre à jour que les champs fournis sans écraser les autres
        await updateDoc(doc(this.firestore, 'users', userId), newData);
        
        // Mettre à jour l'objet currentUser localement et le cache
        if (this.currentUser) {
          const updatedUser = {
            ...this.currentUser,
            ...userData
          };
          this.currentUser = updatedUser;
          this.updateCache(updatedUser);
        }
        
      } catch (error) {
        console.error('Erreur lors de la mise à jour des données utilisateur:', error);
        throw error;
      }
    } else {
      console.error('Aucun utilisateur connecté, mise à jour impossible');
      throw new Error('Utilisateur non connecté');
    }
  }

  // Mettre à jour les statistiques de collection
  async updateCollectionStats(totalCards: number, collectionValue: number): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        console.warn('Tentative de mise à jour des statistiques sans utilisateur connecté');
        return;
      }
      
      const userId = this.auth.currentUser.uid;
      
      // S'assurer que les valeurs sont valides
      const stats = {
        totalCards: Math.max(0, totalCards), // Empêcher les valeurs négatives
        collectionValue: Math.max(0, collectionValue) // Empêcher les valeurs négatives
      };
      
      
      // Mettre à jour les statistiques dans Firestore
      await updateDoc(doc(this.firestore, 'users', userId), stats);
      
      // Mettre à jour l'objet currentUser localement et le cache
      if (this.currentUser) {
        const updatedUser = {
          ...this.currentUser,
          totalCards: stats.totalCards,
          collectionValue: stats.collectionValue
        };
        this.currentUser = updatedUser;
        this.updateCache(updatedUser);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
  }

  // Mettre à jour l'avatar de l'utilisateur
  async updateUserAvatar(avatarUrl: string): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        console.warn('Tentative de mise à jour de l\'avatar sans utilisateur connecté');
        return;
      }
      
      if (!avatarUrl || avatarUrl.trim() === '') {
        console.warn('URL d\'avatar invalide');
        return;
      }
      
      const userId = this.auth.currentUser.uid;
      
      // Mettre à jour l'avatar dans Firestore
      await updateDoc(doc(this.firestore, 'users', userId), { avatarUrl });
      
      // Mettre à jour l'objet currentUser localement et le cache
      if (this.currentUser) {
        const updatedUser = {
          ...this.currentUser,
          avatarUrl: avatarUrl
        };
        this.currentUser = updatedUser;
        this.updateCache(updatedUser);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', error);
    }
  }

  // Utiliser les données mock uniquement pour le développement
  resetToMockUser(): void {
    // Cette méthode ne devrait être utilisée que pour le développement
    console.warn('Utilisation de données mock - ne pas utiliser en production');
    this.currentUser = {
      ...MOCK_USER,
      lastLoginAt: new Date()
    };
  }

  /**
   * Met à jour le cumul des gains/pertes de l'utilisateur
   * @param amount Montant à ajouter au cumul des gains/pertes (peut être négatif)
   */
  async updateTotalProfit(amount: number): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Calculer la nouvelle valeur de totalProfit
      const newTotalProfit = (currentUser.totalProfit || 0) + amount;

      // Mettre à jour dans Firestore
      const userDocRef = doc(this.firestore, 'users', currentUser.id);
      await updateDoc(userDocRef, { totalProfit: newTotalProfit });

      // Mettre à jour dans le currentUser et le cache
      const updatedUser = {
        ...currentUser,
        totalProfit: newTotalProfit
      };
      this.currentUser = updatedUser;
      this.updateCache(updatedUser);
      
      console.log('totalProfit mis à jour avec succès:', this.currentUser);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du cumul des gains/pertes:', error);
      throw error;
    }
  }

  /**
   * Met à jour la confidentialité du profil de l'utilisateur
   * @param isPublic Indique si le profil doit être public ou privé
   */
  async updateProfileVisibility(isPublic: boolean): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Mettre à jour dans Firestore
      const userDocRef = doc(this.firestore, 'users', currentUser.id);
      await updateDoc(userDocRef, { isProfilePublic: isPublic });

      // Mettre à jour dans le currentUser et le cache
      const updatedUser = {
        ...currentUser,
        isProfilPublic: isPublic
      };
      this.currentUser = updatedUser;
      this.updateCache(updatedUser);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la visibilité du profil:', error);
      throw error;
    }
  }

  /**
   * Met à jour les informations du profil utilisateur
   * @param profileData Données du profil à mettre à jour
   */
  async updateUserProfile(profileData: { username?: string, avatarUrl?: string }): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Préparer les données à mettre à jour
      const updateData: { [key: string]: any } = {};
      
      if (profileData.username) {
        updateData['username'] = profileData.username;
      }
      
      if (profileData.avatarUrl) {
        updateData['avatarUrl'] = profileData.avatarUrl;
      }
      
      // Si aucune donnée à mettre à jour, sortir
      if (Object.keys(updateData).length === 0) {
        return;
      }
      
      // Mettre à jour dans Firestore
      const userDocRef = doc(this.firestore, 'users', currentUser.id);
      await updateDoc(userDocRef, updateData);
      
      // Mettre à jour aussi le profil Firebase si username est modifié
      if (profileData.username && this.auth.currentUser) {
        await updateProfile(this.auth.currentUser, {
          displayName: profileData.username
        });
      }

      // Mettre à jour dans le currentUser et le cache
      const updatedUser = {
        ...currentUser,
        ...updateData
      };
      this.currentUser = updatedUser;
      this.updateCache(updatedUser);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }

  /**
   * Migre tous les utilisateurs pour ajouter la propriété isProfilePublic
   * Cette méthode ne devrait être exécutée qu'une fois lors de la mise à jour de l'application
   * @returns Le nombre d'utilisateurs migrés
   */
  async migrateUsersToAddProfileVisibility(): Promise<number> {
    try {
      // Cette méthode devrait être appelée avec un compte administrateur
      const currentUser = this.getCurrentUser();
      if (!currentUser?.isAdmin) {
        throw new Error('Autorisation refusée: seuls les administrateurs peuvent exécuter cette migration');
      }

      const usersCollection = collection(this.firestore, 'users');
      const usersQuery = query(usersCollection);
      const snapshot = await getDocs(usersQuery);
      
      let migratedCount = 0;
      
      // Pour chaque utilisateur qui n'a pas la propriété isProfilePublic, l'ajouter
      const batch = writeBatch(this.firestore);
      
      snapshot.docs.forEach(userDoc => {
        const userData = userDoc.data() as FirestoreUser;
        if (userData.isProfilPublic === undefined) {
          const userRef = doc(this.firestore, 'users', userDoc.id);
          batch.update(userRef, { isProfilPublic: true });
          migratedCount++;
        }
      });
      
      // Exécuter toutes les mises à jour en une seule opération batch
      if (migratedCount > 0) {
        await batch.commit();
        console.log(`Migration terminée: ${migratedCount} utilisateurs mis à jour`);
      } else {
        console.log('Migration non nécessaire: tous les utilisateurs ont déjà la propriété isProfilePublic');
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Erreur lors de la migration des utilisateurs:', error);
      throw error;
    }
  }

  // Rechercher des utilisateurs par email
  async searchUsersByEmail(email: string): Promise<any[]> {
    try {
      // Création d'une requête Firestore pour rechercher des utilisateurs par email
      // Cette implémentation peut être adaptée à votre structure de base de données
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      throw new Error('Impossible de rechercher des utilisateurs');
    }
  }

  // Rechercher des utilisateurs par username
  async searchUsersByUsername(username: string): Promise<any[]> {
    try {
      // Création d'une requête Firestore pour rechercher des utilisateurs par username
      const usersRef = collection(this.firestore, 'users');
      
      // Recherche avec correspondance exacte
      // const q = query(usersRef, where('username', '==', username));
      
      // Récupérer tous les utilisateurs pour une recherche plus flexible
      const querySnapshot = await getDocs(usersRef);
      
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as Record<string, any>;
        // Recherche insensible à la casse contenant la chaîne de recherche
        if (userData['username'] && 
            userData['username'].toLowerCase().includes(username.toLowerCase())) {
          results.push({
            id: doc.id,
            ...userData
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      throw new Error('Impossible de rechercher des utilisateurs');
    }
  }

  // Ajouter un ami
  async addFriend(friendId: string): Promise<void> {
    try {
      // Utiliser la méthode getCurrentUser() du service pour obtenir l'utilisateur courant
      const currentUser = this.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('Vous devez être connecté pour ajouter un ami');
      }

      const currentUserId = currentUser.id;

      // Référence au document de l'utilisateur courant
      const userDocRef = doc(this.firestore, 'users', currentUserId);
      
      // Ajouter l'ID de l'ami au tableau des amis de l'utilisateur
      // Utiliser arrayUnion pour éviter les doublons
      await updateDoc(userDocRef, {
        friends: arrayUnion(friendId)
      });
      
      // Ne plus ajouter l'utilisateur courant à la liste d'amis de l'autre utilisateur
      // Relation désormais unidirectionnelle
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'un ami:', error);
      throw new Error('Impossible d\'ajouter cet ami');
    }
  }

  // Récupérer les détails des amis
  async getFriendsDetails(): Promise<any[]> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Si l'utilisateur n'a pas d'amis, retourner un tableau vide
      if (!currentUser.friends || currentUser.friends.length === 0) {
        return [];
      }

      // Pour chaque ami, récupérer les détails
      const friendsDetails = [];
      for (const friendId of currentUser.friends) {
        try {
          const friendDoc = await getDoc(doc(this.firestore, 'users', friendId));
          if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            friendsDetails.push({
              id: friendId,
              username: friendData['username'] || 'Utilisateur',
              email: friendData['email'] || '',
              avatarUrl: friendData['avatarUrl'] || 'https://ionicframework.com/docs/img/demos/avatar.svg'
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération des détails de l'ami ${friendId}:`, error);
        }
      }

      return friendsDetails;
    } catch (error) {
      console.error('Erreur lors de la récupération des amis:', error);
      throw new Error('Impossible de récupérer la liste d\'amis');
    }
  }

  // Récupérer les détails d'un utilisateur par son ID
  async getUserDetailsById(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('Utilisateur non trouvé');
      }

      const userData = userDoc.data();
      return {
        id: userId,
        username: userData['username'] || 'Utilisateur',
        email: userData['email'] || '',
        avatarUrl: userData['avatarUrl'] || 'https://ionicframework.com/docs/img/demos/avatar.svg',
        totalCards: userData['totalCards'] || 0,
        collectionValue: userData['collectionValue'] || 0,
        totalProfit: userData['totalProfit'] || 0,
        isProfilPublic: userData['isProfilPublic'] !== undefined ? userData['isProfilPublic'] : true,
        createdAt: userData['createdAt'] instanceof Timestamp ? userData['createdAt'].toDate() : new Date(userData['createdAt'])
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'utilisateur:', error);
      throw new Error('Impossible de récupérer les détails de l\'utilisateur');
    }
  }

  // Récupérer les cartes d'un utilisateur par son ID
  async getUserCardsById(userId: string, limitCount: number = 10): Promise<any[]> {
    try {
      // Vérifier d'abord que l'utilisateur a un profil public
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('Utilisateur non trouvé');
      }

      const userData = userDoc.data();
      const isProfilePublic = userData['isProfilPublic'] !== undefined ? userData['isProfilPublic'] : true;

      if (!isProfilePublic) {
        throw new Error('Ce profil est privé');
      }

      // Récupérer les cartes de l'utilisateur
      const cardsCollection = collection(this.firestore, 'users', userId, 'cards');
      const cardsQuery = query(cardsCollection, orderBy('addedDate', 'desc'), limit(limitCount));
      const snapshot = await getDocs(cardsQuery);

      return snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.name,
          imageUrl: data.imageUrl,
          price: data.price,
          addedDate: data.addedDate instanceof Timestamp ? data.addedDate.toDate() : data.addedDate,
          purchaseDate: data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : data.purchaseDate,
          purchasePrice: data.purchasePrice,
          isGraded: data.isGraded || false
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes de l\'utilisateur:', error);
      throw new Error('Impossible de récupérer les cartes de l\'utilisateur');
    }
  }

  // Supprimer un ami
  async removeFriend(friendId: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Si l'utilisateur n'a pas d'amis, rien à faire
      if (!currentUser.friends || !currentUser.friends.includes(friendId)) {
        return;
      }

      // Filtrer la liste d'amis pour retirer l'ami
      const updatedFriends = currentUser.friends.filter(id => id !== friendId);
      
      // Mettre à jour dans Firestore
      const userDocRef = doc(this.firestore, 'users', currentUser.id);
      await updateDoc(userDocRef, { friends: updatedFriends });

      // Mettre à jour le currentUser
      this.currentUser = {
        ...currentUser,
        friends: updatedFriends
      };
    } catch (error) {
      console.error('Erreur lors de la suppression d\'un ami:', error);
      throw new Error('Impossible de supprimer cet ami');
    }
  }

  /**
   * Charge les données utilisateur avec cache
   * @param userId ID de l'utilisateur
   */
  private loadUserDataWithCache(userId: string): void {
    // Utiliser la méthode getData de BaseCacheService qui gère le cache
    this.getData(userId).subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
  }

  /**
   * Implémentation de la méthode abstraite fetchFromSource
   * Récupère les données utilisateur depuis Firestore
   */
  protected override async fetchFromSource(userId: string): Promise<User> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      
      if (userDoc.exists()) {
        let userData = userDoc.data() as FirestoreUser;
        
        // Vérifier si toutes les propriétés requises sont présentes
        const requiredFields = ['username', 'email', 'createdAt', 'avatarUrl', 'totalCards', 'collectionValue', 'totalProfit', 'isProfilPublic'];
        const missingFields = requiredFields.filter(field => {
          return userData[field as keyof FirestoreUser] === undefined;
        });
        
        if (missingFields.length > 0) {
          console.warn(`Données utilisateur incomplètes, champs manquants: ${missingFields.join(', ')}`);
          
          // Récupérer les informations de l'utilisateur Firebase
          const firebaseUser = this.auth.currentUser;
          
          // Compléter les données manquantes
          const updatedData: Partial<User> = {};
          
          if (!userData.username && firebaseUser?.displayName) {
            updatedData.username = firebaseUser.displayName;
          } else if (!userData.username) {
            updatedData.username = 'Utilisateur';
          }
          
          if (!userData.email && firebaseUser?.email) {
            updatedData.email = firebaseUser.email;
          }
          
          if (!userData.avatarUrl && firebaseUser?.photoURL) {
            updatedData.avatarUrl = firebaseUser.photoURL;
          } else if (!userData.avatarUrl) {
            updatedData.avatarUrl = 'https://ionicframework.com/docs/img/demos/avatar.svg';
          }
          
          if (!userData.createdAt) {
            updatedData.createdAt = new Date();
          }
          
          if (userData.totalCards === undefined) {
            updatedData.totalCards = 0;
          }
          
          if (userData.collectionValue === undefined) {
            updatedData.collectionValue = 0;
          }
          
          if (userData.totalProfit === undefined) {
            updatedData.totalProfit = 0;
          }
          
          if (userData.isProfilPublic === undefined) {
            updatedData.isProfilPublic = true;
          }
          
          // Mettre à jour le document utilisateur avec les champs manquants
          if (Object.keys(updatedData).length > 0) {
            await setDoc(doc(this.firestore, 'users', userId), updatedData, { merge: true });
            
            // Récupérer les données utilisateur mises à jour
            const updatedUserDoc = await getDoc(doc(this.firestore, 'users', userId));
            if (updatedUserDoc.exists()) {
              userData = updatedUserDoc.data() as FirestoreUser;
            }
          }
        }
        
        // Convertir les timestamps en dates et retourner l'utilisateur
        const user: User = {
          ...userData as User,
          createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : userData.createdAt as Date,
          lastLoginAt: userData.lastLoginAt instanceof Timestamp ? userData.lastLoginAt.toDate() : userData.lastLoginAt as Date
        };
        
        // Mettre à jour currentUser pour la compatibilité
        this.currentUser = user;
        
        return user;
      } else {
        console.warn('Aucun document utilisateur trouvé dans Firestore');
        
        // Créer un document utilisateur par défaut si aucun n'existe
        const firebaseUser = this.auth.currentUser;
        if (firebaseUser) {
          const defaultUserData: User = {
            id: userId,
            username: firebaseUser.displayName || 'Utilisateur',
            email: firebaseUser.email || '',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            avatarUrl: firebaseUser.photoURL || 'https://ionicframework.com/docs/img/demos/avatar.svg',
            totalCards: 0,
            collectionValue: 0,
            totalProfit: 0,
            isProfilPublic: true
          };
          
          await setDoc(doc(this.firestore, 'users', userId), defaultUserData);
          this.currentUser = defaultUserData;
          return defaultUserData;
        } else {
          throw new Error('Aucun utilisateur Firebase connecté pour créer le document');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      throw error;
    }
  }
} 