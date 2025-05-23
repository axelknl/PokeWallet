import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, ModalController, IonIcon, IonButton, IonCard, IonSkeletonText, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardsSectionComponent } from '../../components/cards-section/cards-section.component';
import { TopCardComponent } from '../../components/top-card/top-card.component';
import { CardStorageService } from '../../services/card-storage.service';
import { UserService } from '../../services/user.service';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';
import { CardModalComponent } from '../../components/card-modal/card-modal.component';
import { addIcons } from 'ionicons';
import { cardOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { CollectionChartComponent } from '../../components/collection-chart/collection-chart.component';
import { CollectionHistoryService } from '../../services/collection-history.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton,
    CardsSectionComponent,
    TopCardComponent,
    IonCard,
    AppHeaderComponent,
    CollectionChartComponent,
    IonSkeletonText,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle
  ]
})
export class HomePage implements OnInit, OnDestroy {
  recentCards: PokemonCard[] = [];
  hasCards: boolean = false;
  mostExpensiveCard: PokemonCard | null = null;
  isLoading: boolean = true;
  private cardsSubscription: Subscription | null = null;

  constructor(
    private cardStorage: CardStorageService,
    private userService: UserService,
    private modalController: ModalController,
    private historyService: CollectionHistoryService,
  ) {
    addIcons({ cardOutline });
  }

  ngOnInit() {
    // S'abonner aux changements des cartes
    this.cardsSubscription = this.cardStorage.cards$.subscribe(cards => {
      if (cards) {
        this.hasCards = cards.length > 0;
        if (cards.length > 0) {
          this.recentCards = cards.slice(0, 3);
          // Filtrer les cartes qui ont un prix défini
          const cardsWithPrice = cards.filter(card => card.price !== undefined);
          if (cardsWithPrice.length > 0) {
            this.mostExpensiveCard = cardsWithPrice.reduce(
              (max: PokemonCard, card: PokemonCard) => 
                (card.price ?? 0) > (max.price ?? 0) ? card : max,
              cardsWithPrice[0]
            );
          } else {
            this.mostExpensiveCard = cards[0];
          }
        } else {
          this.recentCards = [];
          this.mostExpensiveCard = null;
        }
      } else {
        this.hasCards = false;
        this.recentCards = [];
        this.mostExpensiveCard = null;
      }
      this.isLoading = false;
    });
  }

  ionViewWillEnter() {
    // Réinitialiser l'état de chargement quand on entre dans la vue
    this.isLoading = true;
    
    // Forcer le rechargement lorsqu'on revient sur cette page
    this.cardStorage.reloadCards().then(() => {
      this.isLoading = false;
    });
    
    // Charger l'historique de la collection
    this.historyService.loadCollectionHistory();
  }

  ngOnDestroy() {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.cardsSubscription) {
      this.cardsSubscription.unsubscribe();
    }
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
        purchasePrice: card.purchasePrice
      },
      cssClass: 'card-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      backdropDismiss: true,
      canDismiss: true
    });
    await modal.present();
  }
} 