import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonTitle } from '@ionic/angular/standalone';
import { CollectionHistoryService } from '../../services/collection-history.service';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

// Enregistrer les modules nécessaires de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-collection-chart',
  templateUrl: './collection-chart.component.html',
  styleUrls: ['./collection-chart.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTitle
  ]
})
export class CollectionChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | null = null;
  private historySubscription: Subscription | null = null;
  
  constructor(private historyService: CollectionHistoryService) {}
  
  ngOnInit() {
    // Charger l'historique
    this.historyService.loadCollectionHistory();
    
    // S'abonner aux changements d'historique
    this.historySubscription = this.historyService.history$.subscribe(history => {
      // Actualiser le graphique si des données sont disponibles
      if (history.length > 0) {
        this.initOrUpdateChart();
      }
    });
  }
  
  ngOnDestroy() {
    // Nettoyer les abonnements
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
    
    // Détruire le graphique
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  /**
   * Initialise ou met à jour le graphique
   */
  private initOrUpdateChart() {
    // S'assurer que l'élément canvas est disponible
    if (!this.chartCanvas) return;
    
    // Récupérer les données formatées pour le graphique
    const { labels, values } = this.historyService.getFormattedChartData();

    // Si aucune donnée, ne pas afficher le graphique
    if (labels.length === 0) return;
    
    // Détruire le graphique existant si nécessaire
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Créer un nouveau graphique
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valeur de la collection (€)',
          data: values,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          pointRadius: 6,           // Agrandir les points
          pointHoverRadius: 8,      // Agrandir les points au survol
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} €`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value} €`
            }
          }
        },
        elements: {
          point: {
            hitRadius: 10      // Augmenter la zone de clic
          }
        }
      }
    });
  }
} 