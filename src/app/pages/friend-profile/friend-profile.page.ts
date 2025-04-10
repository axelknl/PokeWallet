import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline, arrowBack, calculatorOutline, arrowUpOutline, arrowDownOutline, gridOutline } from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { UserService } from '../../services/user.service';
import { CardsSectionComponent } from '../../components/cards-section/cards-section.component';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-friend-profile',
  templateUrl: './friend-profile.page.html',
  styleUrls: ['./friend-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule,
    AppHeaderComponent,
    CardsSectionComponent,
    CardModalComponent
  ]
})
export class FriendProfilePage implements OnInit {
  friendId: string = '';
  friend: any = null;
  recentCards: any[] = [];
  isLoading: boolean = true;
  error: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({ timeOutline, arrowBack, calculatorOutline, arrowUpOutline, arrowDownOutline, gridOutline });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.friendId = params['id'];
        this.loadFriendData();
      } else {
        this.error = 'Identifiant d\'ami non spécifié';
        this.isLoading = false;
      }
    });
  }

  async loadFriendData() {
    this.isLoading = true;
    
    const loading = await this.loadingController.create({
      message: 'Chargement du profil...'
    });
    await loading.present();
    
    try {
      // Récupérer les détails de l'ami
      this.friend = await this.userService.getUserDetailsById(this.friendId);
      
      // Récupérer les cartes récentes de l'ami
      this.recentCards = await this.userService.getUserCardsById(this.friendId, 5);
    } catch (error: any) {
      this.error = error.message || 'Erreur lors du chargement du profil';
      this.showToast(this.error, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  formatDate(date: Date): string {
    if (!date) return 'Non spécifié';
    return new Date(date).toLocaleDateString();
  }

  async openCardModal(card: any) {
    const modal = await this.modalCtrl.create({
      component: CardModalComponent,
      componentProps: {
        cardImage: card.imageUrl,
        cardName: card.name,
        cardPrice: card.price,
        cardId: card.id,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice,
        readOnly: true // Mode lecture seule pour les cartes d'un ami
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1]
    });
    await modal.present();
  }

  async refresh() {
    await this.loadFriendData();
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

  viewFriendCollection() {
    this.router.navigate(['/friend-collection'], {
      queryParams: { id: this.friendId }
    });
  }
} 