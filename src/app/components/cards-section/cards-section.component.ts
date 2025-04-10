import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonTitle, IonButton, IonIcon } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';

@Component({
  selector: 'app-cards-section',
  templateUrl: './cards-section.component.html',
  styleUrls: ['./cards-section.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonGrid, 
    IonRow, 
    IonCol, 
    IonCard, 
    IonCardContent, 
    IonTitle,
    IonButton,
    IonIcon,
    RouterLink
  ]
})
export class CardsSectionComponent {
  @Input() title: string = '';
  @Input() cards: PokemonCard[] = [];
  @Input() showHistoryButton: boolean = true;
  @Output() cardClick = new EventEmitter<PokemonCard>();

  constructor() {
    addIcons({ timeOutline });
  }

  openCardModal(card: PokemonCard) {
    this.cardClick.emit(card);
  }
} 