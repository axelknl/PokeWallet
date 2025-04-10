import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController, AlertController, ToastController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardStorageService } from '../../services/card-storage.service';
import { addIcons } from 'ionicons';
import { trashOutline, cashOutline, calendarOutline, createOutline } from 'ionicons/icons';

@Component({
  selector: 'app-card-modal',
  templateUrl: './card-modal.component.html',
  styleUrls: ['./card-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CardModalComponent implements OnInit {
  @Input() cardImage: string = '';
  @Input() cardName: string = '';
  @Input() cardPrice: number = 0;
  @Input() cardId: string = '';
  @Input() purchaseDate?: Date;
  @Input() purchasePrice?: number;
  @Input() isGraded: boolean = false;
  @Input() readOnly: boolean = false;
  
  showSaleForm: boolean = false;
  salePrice: number = 0;
  saleDate?: string;

  constructor(
    private modalCtrl: ModalController, 
    private cardStorage: CardStorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({ trashOutline, cashOutline, calendarOutline, createOutline });
  }

  ngOnInit() {
    // Initialiser le prix de vente avec le prix actuel de la carte
    this.salePrice = this.cardPrice;
    // Initialiser la date de vente à aujourd'hui
    const today = new Date();
    this.saleDate = today.toISOString();
  }
  
  toggleSaleForm() {
    this.showSaleForm = !this.showSaleForm;
  }
  
  async sellCard() {
    // Vérifier que le prix de vente est valide
    if (this.salePrice <= 0) {
      this.showToast('Le prix de vente doit être supérieur à 0', 'danger');
      return;
    }
    
    // Demander confirmation à l'utilisateur
    const alert = await this.alertController.create({
      header: 'Confirmer la vente',
      message: `Êtes-vous sûr de vouloir marquer cette carte comme vendue pour ${this.salePrice}€ ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.processSale();
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  private async processSale() {
    try {
      // Convertir la date de string à Date si elle existe
      const saleDateObj = this.saleDate ? new Date(this.saleDate) : undefined;
      
      // Appeler le service pour enregistrer la vente
      await this.cardStorage.sellCard(this.cardId, this.salePrice, saleDateObj);
      
      this.showToast('Carte marquée comme vendue avec succès', 'success');
      this.dismiss();
    } catch (error: any) {
      this.showToast(`Erreur: ${error.message}`, 'danger');
    }
  }

  async deleteCard() {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette carte de votre collection ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            try {
              await this.cardStorage.removeCard(this.cardId);
              this.showToast('Carte supprimée avec succès', 'success');
              this.dismiss();
            } catch (error: any) {
              this.showToast(`Erreur: ${error.message}`, 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
  
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
  
  // Calculer le profit ou la perte en cas de vente
  calculateProfit(): { amount: number, percentage: number } | null {
    if (this.purchasePrice === undefined || this.salePrice === undefined) {
      return null;
    }
    
    const amount = this.salePrice - this.purchasePrice;
    const percentage = (this.salePrice / this.purchasePrice - 1) * 100;
    
    return { amount, percentage };
  }

  editCard() {
    // Fermer le modal et naviguer vers la page d'ajout de carte avec les paramètres d'édition
    this.modalCtrl.dismiss().then(() => {
      // Naviguer vers la page d'ajout de carte en mode édition
      this.navCtrl.navigateForward('/add-card', {
        queryParams: {
          id: this.cardId,
          cardName: this.cardName,
          cardPrice: this.cardPrice,
          cardImage: this.cardImage,
          purchaseDate: this.purchaseDate ? this.purchaseDate.toISOString() : undefined,
          purchasePrice: this.purchasePrice,
          isGraded: this.isGraded
        }
      });
    });
  }
} 