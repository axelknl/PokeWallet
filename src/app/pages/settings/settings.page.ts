import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonItemDivider,
  IonNote,
  IonToast,
  IonIcon
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { UserService } from '../../services/user.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonItemDivider,
    IonNote,
    IonToast,
    IonIcon,
    AppHeaderComponent
  ]
})
export class SettingsPage implements OnInit {
  isDarkMode: boolean = false;
  isProfilePublic: boolean = true;
  isToastOpen: boolean = false;
  toastMessage: string = '';
  toastColor: string = 'success';
  version: string = environment.version;

  constructor(
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Initialiser le mode sombre selon les préférences utilisateur
    this.isDarkMode = this.themeService.isDarkMode();
    
    // Initialiser la visibilité du profil
    this.loadProfileVisibility();
  }
  
  /**
   * Charge la visibilité du profil utilisateur
   */
  private loadProfileVisibility() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.isProfilePublic = currentUser.isProfilPublic !== undefined ? currentUser.isProfilPublic : true;
    }
  }

  toggleTheme() {
    this.themeService.toggleDarkMode();
  }
  
  async toggleProfileVisibility() {
    try {
      await this.userService.updateProfileVisibility(this.isProfilePublic);
      this.showToast(`Votre profil est maintenant ${this.isProfilePublic ? 'public' : 'privé'}`, 'success');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la visibilité du profil:', error);
      this.isProfilePublic = !this.isProfilePublic; // Revenir à l'état précédent en cas d'erreur
      this.showToast('Erreur lors de la mise à jour de la visibilité du profil', 'danger');
    }
  }
  
  private showToast(message: string, color: string = 'success') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
    setTimeout(() => {
      this.isToastOpen = false;
    }, 3000);
  }
} 