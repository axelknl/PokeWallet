import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardContent, 
  IonCardTitle, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonIcon,
  IonAvatar,
  IonChip,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSkeletonText,
  IonRefresher,
  IonRefresherContent,
  IonNote,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  calendarOutline, 
  trophyOutline, 
  cardOutline,
  cashOutline,
  settingsOutline,
  createOutline,
  statsChartOutline,
  logOutOutline,
  cameraOutline,
  calculatorOutline,
  eyeOutline
} from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { CardsSectionComponent } from '../../components/cards-section/cards-section.component';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { UserService } from '../../services/user.service';
import { CardStorageService } from '../../services/card-storage.service';
import { User } from '../../interfaces/user.interface';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';
import { Router } from '@angular/router';
import { PerformanceOptimizationService, SubscriptionManager } from '../../services/performance-optimization.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonAvatar,
    IonChip,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonNote,
    AppHeaderComponent,
    CardsSectionComponent
  ]
})
export class ProfilePage implements OnInit, OnDestroy {
  user: User | null = null;
  totalCards = 0;
  totalValue = 0;
  loading = false;
  isDarkMode = false;
  recentCards: PokemonCard[] = [];
  isMigrationRunning = false;
  
  private subscriptionManager: SubscriptionManager;

  constructor(
    private userService: UserService,
    private cardStorage: CardStorageService,
    private router: Router,
    private performanceService: PerformanceOptimizationService,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController
  ) {
    addIcons({ 
      personOutline, 
      mailOutline, 
      calendarOutline, 
      trophyOutline, 
      cardOutline,
      cashOutline,
      settingsOutline,
      createOutline,
      statsChartOutline,
      logOutOutline,
      cameraOutline,
      calculatorOutline,
      eyeOutline
    });
    
    // Initialiser le gestionnaire d'abonnements optimisé
    this.subscriptionManager = this.performanceService.createSubscriptionManager();
    
    // Initialiser le mode sombre depuis le localStorage
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
  }

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    // Utiliser le gestionnaire optimisé pour nettoyer tous les abonnements
    this.subscriptionManager.unsubscribeAll();
  }

  private loadUserData() {
    this.loading = true;
    this.cdr.markForCheck();
    
    // Mesurer les performances du chargement des données utilisateur
    this.performanceService.measurePerformance(async () => {
      // S'abonner aux données utilisateur avec optimisation
      const userSub = this.userService.data$.subscribe(user => {
        this.user = user;
        this.cdr.markForCheck();
      });
      this.subscriptionManager.add(userSub);

      // S'abonner aux cartes avec optimisation
      const cardsSub = this.cardStorage.cards$.subscribe(cards => {
        if (cards) {
          this.totalCards = cards.length;
          this.totalValue = cards.reduce((sum, card) => sum + (card.price || 0), 0);
          // Prendre les 3 dernières cartes ajoutées
          this.recentCards = cards
            .sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime())
            .slice(0, 3);
        } else {
          this.totalCards = 0;
          this.totalValue = 0;
          this.recentCards = [];
        }
        this.cdr.markForCheck();
      });
      this.subscriptionManager.add(cardsSub);

      // S'abonner à l'état de chargement avec optimisation
      const loadingSub = this.cardStorage.isLoading$.subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
      this.subscriptionManager.add(loadingSub);

      // Charger les données si nécessaire
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        await this.userService.getData(currentUser.id);
        await this.cardStorage.getData(currentUser.id);
      }
    }, 'Profile data loading');
  }

  async handleRefresh(event: any) {
    await this.performanceService.measurePerformance(async () => {
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        await Promise.all([
          this.userService.reloadData(),
          this.cardStorage.reloadData()
        ]);
      }
    }, 'Profile data refresh');
    
    event.target.complete();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    
    // Appliquer le thème au document
    if (this.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    this.cdr.markForCheck();
  }

  async changeProfileImage() {
    // TODO: Implémenter le changement d'image de profil
    console.log('Changement d\'image de profil à implémenter');
  }

  async openCardModal(card: PokemonCard) {
    const modal = await this.modalController.create({
      component: CardModalComponent,
      componentProps: {
        card: card
      }
    });
    
    await modal.present();
  }

  async logout() {
    try {
      await this.userService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  async runTotalProfitMigration() {
    if (this.isMigrationRunning) return;
    
    this.isMigrationRunning = true;
    this.cdr.markForCheck();
    
    try {
      // TODO: Implémenter la migration des gains/pertes
      console.log('Migration des gains/pertes à implémenter');
      
      // Simuler un délai de migration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
    } finally {
      this.isMigrationRunning = false;
      this.cdr.markForCheck();
    }
  }

  async runProfileVisibilityMigration() {
    if (this.isMigrationRunning) return;
    
    this.isMigrationRunning = true;
    this.cdr.markForCheck();
    
    try {
      // TODO: Implémenter la migration de visibilité des profils
      console.log('Migration de visibilité des profils à implémenter');
      
      // Simuler un délai de migration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
    } finally {
      this.isMigrationRunning = false;
      this.cdr.markForCheck();
    }
  }

  editProfile() {
    this.router.navigate(['/profile-edit']);
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Non défini';
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
