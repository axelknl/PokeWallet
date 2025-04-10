import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonBackButton } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonBackButton,
    RouterLink
  ]
})
export class AppHeaderComponent {
  @Input() title: string = '';
  @Input() showBackButton: boolean = false;
  @Input() defaultHref: string = '/';
  @Input() showThemeToggle: boolean = false;
  @Input() isDarkMode: boolean = false;
  @Input() showSettingsButton: boolean = false;
  
  @Input() customEndButtons: boolean = false;
  
  @Output() themeToggleClicked = new EventEmitter<void>();

  constructor() {
    addIcons({ settingsOutline });
  }
} 