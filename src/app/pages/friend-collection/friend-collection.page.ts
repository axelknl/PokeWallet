import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { IonicModule, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, searchOutline } from 'ionicons/icons';
import { UserService } from '../../services/user.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-friend-collection',
  templateUrl: './friend-collection.page.html',
  styleUrls: ['./friend-collection.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule,
    FormsModule,
    AppHeaderComponent
  ]
})
export class FriendCollectionPage implements OnInit {
  friendId: string = '';
  friend: any = null;
  cards: any[] = [];
  filteredCards: any[] = [];
  isLoading: boolean = true;
  error: string = '';
  searchTerm: string = '';
  sortOptions = {
    field: 'addedDate',
    direction: 'desc'
  };

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({ arrowBack, searchOutline });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.friendId = params['id'];
        this.loadFriendCollection();
      } else {
        this.error = 'Identifiant d\'ami non spécifié';
        this.isLoading = false;
      }
    });
  }

  async loadFriendCollection() {
    this.isLoading = true;
    
    const loading = await this.loadingController.create({
      message: 'Chargement de la collection...'
    });
    await loading.present();
    
    try {
      // Récupérer les détails de l'ami
      this.friend = await this.userService.getUserDetailsById(this.friendId);
      
      // Récupérer toutes les cartes de l'ami (avec une limite plus élevée)
      this.cards = await this.userService.getUserCardsById(this.friendId, 100);
      this.filterCards();
    } catch (error: any) {
      this.error = error.message || 'Erreur lors du chargement de la collection';
      this.showToast(this.error, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  filterCards() {
    // Filtrer par le terme de recherche
    this.filteredCards = this.cards.filter(card => {
      if (!this.searchTerm) return true;
      return card.name.toLowerCase().includes(this.searchTerm.toLowerCase());
    });

    // Trier les cartes
    this.filteredCards.sort((a, b) => {
      const fieldA = a[this.sortOptions.field];
      const fieldB = b[this.sortOptions.field];
      
      if (this.sortOptions.field === 'price' || this.sortOptions.field === 'purchasePrice') {
        const numA = Number(fieldA) || 0;
        const numB = Number(fieldB) || 0;
        return this.sortOptions.direction === 'asc' ? numA - numB : numB - numA;
      } else if (this.sortOptions.field === 'addedDate' || this.sortOptions.field === 'purchaseDate') {
        const dateA = fieldA ? new Date(fieldA).getTime() : 0;
        const dateB = fieldB ? new Date(fieldB).getTime() : 0;
        return this.sortOptions.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const strA = String(fieldA || '').toLowerCase();
        const strB = String(fieldB || '').toLowerCase();
        return this.sortOptions.direction === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });
  }

  updateSearch() {
    this.filterCards();
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

  changeSortOption(field: string) {
    if (this.sortOptions.field === field) {
      // Inverser la direction si le champ est déjà sélectionné
      this.sortOptions.direction = this.sortOptions.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Nouveau champ, utiliser la direction par défaut
      this.sortOptions.field = field;
      this.sortOptions.direction = 'desc';
    }
    this.filterCards();
  }

  refresh() {
    this.loadFriendCollection();
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
} 