import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonTitle, ModalController } from '@ionic/angular/standalone';
import { CardModalComponent } from '../card-modal/card-modal.component';
import { CardStorageService } from '../../services/card-storage.service';
import { PokemonCard } from '../../interfaces/pokemon-card.interface';

@Component({
  selector: 'app-top-card',
  templateUrl: './top-card.component.html',
  styleUrls: ['./top-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonTitle, CardModalComponent]
})
export class TopCardComponent {
  @Input() card: PokemonCard | null = null;

  constructor(
    private modalCtrl: ModalController,
  ) {}

  ngOnInit() {
  }

  async openCardModal() {
    if (!this.card) return;
    
    const modal = await this.modalCtrl.create({
      component: CardModalComponent,
      componentProps: {
        cardImage: this.card.imageUrl,
        cardName: this.card.name,
        cardPrice: this.card.price,
        cardId: this.card.id,
        purchaseDate: this.card.purchaseDate,
        purchasePrice: this.card.purchasePrice
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1]
    });
    await modal.present();
  }
} 