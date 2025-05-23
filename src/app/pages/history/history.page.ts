import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonList, 
  IonButton, 
  IonIcon,
  IonSkeletonText,
  IonBadge,
  IonAccordionGroup,
  IonAccordion,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  addCircleOutline, 
  cartOutline, 
  chevronDown, 
  chevronForward,
  timeOutline,
  cashOutline,
  pricetagOutline,
  trendingUpOutline,
  trendingDownOutline,
  trashOutline,
  searchOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { HistoryService } from '../../services/history.service';
import { HistoryItem, HistoryActionType } from '../../interfaces/history-item.interface';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';
import { UserService } from '../../services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
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
    IonList,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonBadge,
    IonAccordionGroup,
    IonAccordion,
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    AppHeaderComponent
  ]
})
export class HistoryPage implements OnInit, OnDestroy {
  historyItems: HistoryItem[] = [];
  loading = false;
  hasError = false;
  private subscriptions: Subscription[] = [];
  
  constructor(
    private historyService: HistoryService,
    private userService: UserService,
    private router: Router
  ) {
    addIcons({ 
      calendarOutline, 
      addCircleOutline, 
      cartOutline, 
      chevronDown, 
      chevronForward,
      timeOutline,
      cashOutline,
      pricetagOutline,
      trendingUpOutline,
      trendingDownOutline,
      trashOutline,
      searchOutline,
      alertCircleOutline
    });
  }

  ngOnInit() {
    // S'abonner à l'état de chargement
    this.subscriptions.push(
      this.historyService.isLoading$.subscribe(
        loading => this.loading = loading
      )
    );

    // S'abonner aux erreurs
    this.subscriptions.push(
      this.historyService.hasError$.subscribe(
        hasError => this.hasError = hasError
      )
    );

    // S'abonner aux données
    this.subscriptions.push(
      this.historyService.data$.subscribe(
        items => this.historyItems = items || []
      )
    );

    // Charger les données initiales
    this.loadHistory();
  }

  ngOnDestroy() {
    // Se désabonner de tous les observables
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadHistory() {
    const user = this.userService.getCurrentUser();
    if (user) {
      await this.historyService.getData(user.id);
    }
  }
  
  // Formater les dates
  formatDate(date: Date): string {
    try {
      return formatDate(date, 'dd/MM/yyyy', 'fr-FR');
    } catch (error) {
      return 'Date inconnue';
    }
  }
  
  // Obtenir la classe CSS en fonction du type d'action
  getActionTypeClass(type: HistoryActionType): string {
    switch(type) {
      case HistoryActionType.ACHAT:
        return 'achat';
      case HistoryActionType.VENTE:
        return 'vente';
      case HistoryActionType.SUPPRESSION:
        return 'suppression';
      default:
        return 'ajout';
    }
  }
  
  // Obtenir l'icône en fonction du type d'action
  getActionTypeIcon(type: HistoryActionType): string {
    switch(type) {
      case HistoryActionType.ACHAT:
        return 'cart-outline';
      case HistoryActionType.VENTE:
        return 'cash-outline';
      case HistoryActionType.SUPPRESSION:
        return 'trash-outline';
      default:
        return 'add-circle-outline';
    }
  }
  
  // Tirer vers le bas pour rafraîchir
  async handleRefresh(event: any) {
    await this.historyService.reloadData();
    event.target.complete();
  }
} 