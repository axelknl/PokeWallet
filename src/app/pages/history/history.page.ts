import { Component, OnInit } from '@angular/core';
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
  IonSelectOption
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
  searchOutline
} from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { HistoryService, TimePeriod } from '../../services/history.service';
import { HistoryItem, HistoryActionType } from '../../interfaces/history-item.interface';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';

interface PeriodOption {
  value: TimePeriod;
  label: string;
}

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
    AppHeaderComponent
  ]
})
export class HistoryPage implements OnInit {
  historyItems: HistoryItem[] = [];
  loading = true;
  selectedPeriod: TimePeriod = '1week';
  
  periodOptions: PeriodOption[] = [
    { value: '1week', label: '1 semaine' },
    { value: '1month', label: '1 mois' },
    { value: '3months', label: '3 mois' },
    { value: '6months', label: '6 mois' },
    { value: '1year', label: '1 an' },
    { value: '2years', label: '2 ans' }
  ];
  
  constructor(
    private historyService: HistoryService,
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
      searchOutline
    });
  }

  ngOnInit() {
    this.loadHistoryWithPeriod();
  }

  async loadHistoryWithPeriod() {
    this.loading = true;
    
    try {
      await this.historyService.loadUserHistoryWithPeriod(this.selectedPeriod);
      this.historyService.historyItems$.subscribe(items => {
        this.historyItems = items;
        this.loading = false;
      });
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      this.loading = false;
    }
  }
  
  // Charger l'historique avec la période sélectionnée
  searchWithPeriod() {
    this.loadHistoryWithPeriod();
  }
  
  async loadHistory() {
    // Utiliser la nouvelle méthode de chargement par période (par défaut 1 semaine)
    await this.loadHistoryWithPeriod();
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
    await this.loadHistoryWithPeriod();
    event.target.complete();
  }
} 