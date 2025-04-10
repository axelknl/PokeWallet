import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, closeCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon]
})
export class SearchBarComponent {
  @Input() placeholder: string = 'Search';
  @Input() debounceTime: number = 300;
  @Output() searchChanged = new EventEmitter<string>();
  
  searchTerm: string = '';
  private debounceTimer: any;
  
  constructor() {
    addIcons({ searchOutline, closeCircleOutline });
  }
  
  /**
   * Gère le changement de valeur dans la barre de recherche
   */
  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set a new timer to debounce the search
    this.debounceTimer = setTimeout(() => {
      this.searchChanged.emit(this.searchTerm);
    }, this.debounceTime);
  }
  
  /**
   * Efface le texte de recherche
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.searchChanged.emit('');
  }
  
  /**
   * Vérifie si le champ est rempli ou non
   */
  get hasValue(): boolean {
    return this.searchTerm !== '';
  }
}
