import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonButton, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonNote, 
  IonIcon,
  IonButtons,
  IonBackButton,
  ToastController,
  ActionSheetController,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  LoadingController,
  IonToggle
} from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CardStorageService } from '../../services/card-storage.service';
import { addIcons } from 'ionicons';
import { camera, image, folder, imageOutline } from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { compressImage } from '../../utils/image-utils';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';

@Component({
  selector: 'app-add-card',
  templateUrl: './add-card.page.html',
  styleUrls: ['./add-card.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent, 
    IonButton, 
    IonItem, 
    IonLabel, 
    IonInput, 
    IonNote, 
    IonIcon,
    IonButtons,
    IonBackButton,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonToggle,
    AppHeaderComponent,
    CustomInputComponent
  ]
})
export class AddCardPage implements OnInit {
  imageUrl: string | undefined;
  cardName: string = '';
  cardPrice: number = 0;
  purchasePrice?: number;
  purchaseDate?: string;
  isGraded: boolean = false;
  isLoading: boolean = false;
  
  // Données pour le mode édition
  editMode = false;
  editCardId: string | null = null;
  pageTitle = 'Ajouter une carte';

  constructor(
    private cardStorageService: CardStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ camera, image, folder, imageOutline });
  }

  async ngOnInit() {
    const queryParams = this.route.snapshot.queryParams;
    
    if (queryParams['id']) {
      this.editMode = true;
      this.editCardId = queryParams['id'];
      this.pageTitle = 'Modifier la carte';
      
      try {
        // Si les données de la carte sont fournies via les queryParams, les utiliser
        if (queryParams['cardName'] && queryParams['cardPrice'] && queryParams['cardImage']) {
          this.loadCardData(queryParams);
        } else {
          // Sinon, récupérer la carte complète depuis le service
          await this.loadCardFromFirestore(queryParams['id']);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données de la carte:', error);
        this.showToast('Impossible de charger les données de la carte', 'danger');
      }
    }
  }
  
  loadCardData(params: any) {
    // Charger les données existantes de la carte
    this.cardName = params['cardName'] || '';
    this.cardPrice = Number(params['cardPrice']) || 0;
    this.imageUrl = params['cardImage'] || undefined;
    
    if (params['purchaseDate']) {
      this.purchaseDate = params['purchaseDate'];
    }
    
    if (params['purchasePrice'] !== undefined) {
      this.purchasePrice = Number(params['purchasePrice']);
    }
    
    if (params['isGraded'] !== undefined) {
      this.isGraded = params['isGraded'] === 'true' || params['isGraded'] === true;
    }
  }

  // Charge la carte directement depuis Firestore
  async loadCardFromFirestore(cardId: string) {
    const loading = await this.loadingController.create({
      message: 'Chargement des données de la carte...'
    });
    await loading.present();
    
    try {
      const card = await this.cardStorageService.getCardById(cardId);
      if (card) {
        this.cardName = card.name;
        this.cardPrice = card.price || 0;
        this.imageUrl = card.imageUrl;
        this.purchaseDate = card.purchaseDate ? card.purchaseDate.toISOString() : undefined;
        this.purchasePrice = card.purchasePrice;
        this.isGraded = card.isGraded || false;
      } else {
        throw new Error('Carte non trouvée');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la carte:', error);
      this.showToast('Erreur lors du chargement de la carte', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async showImageOptions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Sélectionner une image',
      buttons: [
        {
          text: 'Appareil photo',
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
          text: 'Parcourir les fichiers',
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

  async takePicture(source: CameraSource) {
    try {
      const loading = await this.loadingController.create({
        message: 'Chargement de l\'image...'
      });
      await loading.present();

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source,
        width: 600,
        height: 600,
        correctOrientation: true
      });

      if (image.dataUrl) {
        try {
          // Compresser l'image si elle est trop volumineuse
          const compressedImageUrl = await compressImage(image.dataUrl);
          this.imageUrl = compressedImageUrl;
          
          // Afficher un toast si l'image a été compressée
          if (compressedImageUrl !== image.dataUrl) {
            this.showToast('L\'image a été compressée pour respecter les limites de taille', 'success');
          }
        } catch (error) {
          console.error('Erreur de compression:', error);
          this.showToast('Erreur lors de la compression de l\'image', 'danger');
        }
      }

      await loading.dismiss();
    } catch (error: any) {
      // Ne pas afficher d'erreur si l'utilisateur annule
      if (error.message !== 'User cancelled photos app') {
        this.showToast('Erreur lors de la sélection de l\'image : ' + error.message, 'danger');
      }
      
      const loading = await this.loadingController.create();
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  async onSubmit() {
    if (!this.cardName || !this.cardPrice || !this.imageUrl) {
      this.showToast('Veuillez remplir tous les champs et sélectionner une image', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.editMode ? 'Mise à jour de la carte...' : 'Ajout de la carte en cours...'
    });
    await loading.present();
    
    try {
      // S'assurer que cardPrice et purchasePrice sont des nombres
      const price = Number(this.cardPrice);
      const purchasePriceNumber = this.purchasePrice !== undefined ? Number(this.purchasePrice) : undefined;
      
      // Préparer les données de base de la carte
      const cardData: any = {
        name: this.cardName,
        imageUrl: this.imageUrl,
        price: price,
        isGraded: this.isGraded
      };
      
      // Ajouter purchasePrice uniquement s'il est défini
      if (purchasePriceNumber !== undefined) {
        cardData.purchasePrice = purchasePriceNumber;
      }
      
      // Ajouter purchaseDate uniquement si elle existe et est valide
      if (this.purchaseDate && this.purchaseDate.trim() !== '') {
        try {
          const purchaseDateObj = new Date(this.purchaseDate);
          // Vérifier si la date est valide
          if (!isNaN(purchaseDateObj.getTime())) {
            cardData.purchaseDate = purchaseDateObj;
          }
        } catch (e) {
          // Ne pas ajouter purchaseDate en cas d'erreur
        }
      }
      
      if (this.editMode) {
        // Mettre à jour la carte existante
        await this.cardStorageService.updateCard(this.editCardId as string, cardData);
        this.showToast('Carte mise à jour avec succès', 'success');
      } else {
        // Ajouter une nouvelle carte
        await this.cardStorageService.addCard({
          ...cardData,
          addedDate: new Date()
        });
        this.showToast('Carte ajoutée avec succès', 'success');
      }
      
      // Rediriger vers la page collection
      setTimeout(() => {
        this.router.navigateByUrl('/collection');
      }, 1000);
    } catch (error: any) {
      this.showToast(`Erreur: ${error.message}`, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
