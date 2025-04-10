import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonCard, 
  IonPopover, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonFab, 
  IonFabButton, 
  ModalController,
  IonToggle,
  IonRadio,
  IonRadioGroup,
  IonListHeader,
  IonItemDivider,
  IonBadge
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { filter, arrowUp, arrowDown, add, ellipsisVertical } from 'ionicons/icons';
import { CardStorageService } from '../../services/card-storage.service';
import { UserService } from '../../services/user.service';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';
import { CardsSectionComponent } from '../../components/cards-section/cards-section.component';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';

@Component({
  selector: 'app-my-wallet',
  templateUrl: './my-wallet.page.html',
  styleUrls: ['./my-wallet.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    IonFab,
    IonFabButton,
    IonToggle,
    IonRadio,
    IonRadioGroup,
    IonListHeader,
    IonItemDivider,
    IonBadge,
    CardsSectionComponent,
    AppHeaderComponent,
    SearchBarComponent
  ]
})
export class MyWalletPage implements OnInit, OnDestroy {
  searchTerm: string = '';
  cards: PokemonCard[] = [];
  filteredCards: PokemonCard[] = [];
  sortOption: string = 'name-asc';
  showGradedOnly: boolean = false;
  private cardsSubscription: Subscription | null = null;

  constructor(
    private cardStorage: CardStorageService,
    private userService: UserService,
    private modalController: ModalController,
    private router: Router
  ) {
    addIcons({ filter, arrowUp, arrowDown, add, ellipsisVertical });
  }

  ngOnInit() {
    // S'abonner aux changements des cartes
    this.cardsSubscription = this.cardStorage.cards$.subscribe(cards => {
      this.cards = cards;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.cardsSubscription) {
      this.cardsSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
    // Forcer le rechargement des cartes lorsque la page devient active
    this.cardStorage.reloadCards();
  }

  onSearchChanged(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    // Filtrage par recherche
    let filtered = this.cards.filter(card => 
      card.name.toLowerCase().includes(this.searchTerm)
    );

    // Filtrage par statut gradé si l'option est activée
    if (this.showGradedOnly) {
      filtered = filtered.filter(card => card.isGraded === true);
    }

    // Tri selon l'option sélectionnée
    filtered.sort((a, b) => {
      switch (this.sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'date-asc':
          return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
        case 'date-desc':
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        default:
          return 0;
      }
    });

    this.filteredCards = filtered;
  }

  setSortOption(option: string) {
    this.sortOption = option;
    this.applyFilters();
  }

  resetFilters() {
    this.sortOption = 'name-asc';
    this.showGradedOnly = false;
    this.searchTerm = '';
    this.applyFilters();
  }

  async openCardModal(card: PokemonCard) {
    const modal = await this.modalController.create({
      component: CardModalComponent,
      componentProps: {
        cardImage: card.imageUrl,
        cardName: card.name,
        cardPrice: card.price,
        cardId: card.id,
        purchaseDate: card.purchaseDate,
        purchasePrice: card.purchasePrice,
        isGraded: card.isGraded
      },
      cssClass: 'card-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1
    });

    await modal.present();
  }

  deleteCard(cardId: string) {
    this.cardStorage.removeCard(cardId);
  }
}
