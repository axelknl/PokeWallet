import { Component, OnInit } from '@angular/core';
import { ToastController, LoadingController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { 
  camera, sunny, moon, image, folder,
  logOutOutline, 
  personCircleOutline, 
  linkOutline, 
  cloudUploadOutline,
  cloudDownloadOutline,
  trashOutline,
  timeOutline,
  calculatorOutline,
  arrowUpOutline,
  arrowDownOutline,
  eyeOutline
} from 'ionicons/icons';
import { ActionSheetController, ModalController, IonicModule } from '@ionic/angular';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { CardsSectionComponent } from '../../components/cards-section/cards-section.component';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';
import { CardStorageService } from '../../services/card-storage.service';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user.interface';
import { ThemeService } from '../../services/theme.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { MigrationService } from '../../services/migration.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModalComponent,
    CardsSectionComponent,
    AppHeaderComponent,
    IonicModule
  ]
})
export class ProfilePage implements OnInit {
  profileImage: string = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  isDarkMode: boolean = false;
  recentCards: PokemonCard[] = [];
  totalCards: number = 0;
  collectionValue: number = 0;
  user: User | null = null;
  isMigrationRunning = false;

  constructor(
    private userService: UserService,
    private cardStorageService: CardStorageService,
    private actionSheetController: ActionSheetController,
    private themeService: ThemeService,
    private modalCtrl: ModalController,
    private migrationService: MigrationService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ 
      camera, sunny, moon, image, folder,
      logOutOutline, 
      personCircleOutline, 
      linkOutline, 
      cloudUploadOutline,
      cloudDownloadOutline,
      trashOutline,
      timeOutline,
      calculatorOutline,
      arrowUpOutline,
      arrowDownOutline,
      eyeOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.isDarkMode = this.themeService.isDarkMode();
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Observer l'état de la migration
    this.migrationService.migrationRunning$.subscribe(
      isRunning => this.isMigrationRunning = isRunning
    );
  }

  private loadUserData() {
    this.recentCards = this.cardStorageService.getLatestCards();
    this.totalCards = this.cardStorageService.getAllCards().length;
    this.collectionValue = this.cardStorageService.getCollectionTotalValue();
    this.user = this.userService.getCurrentUser();
  }

  async changeProfileImage() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Choisir une image',
      buttons: [
        {
          text: 'Prendre une photo',
          icon: 'camera',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          }
        },
        {
          text: 'Galerie photos',
          icon: 'image',
          handler: () => {
            this.takePicture(CameraSource.Photos);
          }
        },
        {
          text: 'Parcourir',
          icon: 'folder',
          handler: () => {
            this.takePicture(CameraSource.Prompt);
          }
        },
        {
          text: 'Annuler',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  private async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 400,
        height: 400,
        correctOrientation: true
      });

      if (image.dataUrl) {
        this.profileImage = image.dataUrl;
        if (this.user) {
          this.user.avatarUrl = image.dataUrl;
          this.userService.updateUserAvatar(image.dataUrl);
        }
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled photos app') {
        console.error('Erreur lors de la sélection de l\'image:', error);
      }
    }
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }

  async logout() {
    const alert = await this.actionSheetController.create({
      header: 'Confirmation',
      subHeader: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Déconnexion',
          role: 'destructive',
          handler: async () => {
            window.location.href = '/logout';
            return true;
          }
        }
      ]
    });
    
    await alert.present();
  }

  async openCardModal(card: PokemonCard) {
    const modal = await this.modalCtrl.create({
      component: CardModalComponent,
      componentProps: {
        cardImage: card.imageUrl,
        cardName: card.name,
        cardPrice: card.price,
        cardId: card.id,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1]
    });
    await modal.present();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Exécute la migration pour calculer le total des profits/pertes pour tous les utilisateurs
   */
  async runTotalProfitMigration() {
    const loading = await this.loadingController.create({
      message: 'Migration en cours...',
      backdropDismiss: false
    });
    await loading.present();
    
    try {
      await this.migrationService.migrateTotalProfit();
      
      // Recharger les données utilisateur après la migration
      this.loadUserData();
      
      const toast = await this.toastController.create({
        message: 'Migration du total des profits/pertes terminée avec succès',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      
      const toast = await this.toastController.create({
        message: 'Erreur lors de la migration du total des profits/pertes',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Exécute la migration pour ajouter la visibilité du profil à tous les utilisateurs
   * Cette fonction n'est disponible que pour les administrateurs
   */
  async runProfileVisibilityMigration() {
    try {
      // Afficher une confirmation avant d'exécuter la migration
      const actionSheet = await this.actionSheetController.create({
        header: 'Confirmation',
        subHeader: 'Voulez-vous exécuter la migration de confidentialité des profils ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Exécuter la migration',
            role: 'destructive',
            handler: async () => {
              try {
                const loading = await this.loadingController.create({
                  message: 'Migration en cours...'
                });
                await loading.present();
                
                const count = await this.userService.migrateUsersToAddProfileVisibility();
                
                await loading.dismiss();
                
                const toast = await this.toastController.create({
                  message: `Migration terminée : ${count} utilisateurs mis à jour.`,
                  duration: 3000,
                  position: 'bottom',
                  color: 'success'
                });
                await toast.present();
              } catch (error) {
                console.error('Erreur lors de la migration:', error);
                
                const toast = await this.toastController.create({
                  message: 'Erreur lors de la migration.',
                  duration: 3000,
                  position: 'bottom',
                  color: 'danger'
                });
                await toast.present();
              }
              return true;
            }
          }
        ]
      });
      
      await actionSheet.present();
    } catch (error) {
      console.error('Erreur lors du lancement de la migration:', error);
    }
  }
}
