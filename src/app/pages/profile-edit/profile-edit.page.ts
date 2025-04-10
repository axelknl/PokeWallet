import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonToast,
  IonBackButton,
  IonButtons
} from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonToast,
    IonBackButton,
    IonButtons,
    AppHeaderComponent
  ]
})
export class ProfileEditPage implements OnInit {
  // Champs du profil utilisateur
  username: string = '';
  email: string = '';
  
  // Toast
  isToastOpen: boolean = false;
  toastMessage: string = '';
  toastColor: string = 'success';

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    // Charger les données du profil
    this.loadUserProfile();
  }
  
  /**
   * Charge les informations du profil utilisateur
   */
  private loadUserProfile() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.username = currentUser.username || '';
      this.email = currentUser.email || '';
    }
  }

  /**
   * Met à jour les informations du profil utilisateur
   */
  async updateProfile() {
    try {
      await this.userService.updateUserProfile({
        username: this.username
      });
      this.showToast('Profil mis à jour avec succès', 'success');
      
      // Retourner à la page des paramètres après un court délai
      setTimeout(() => {
        this.router.navigateByUrl('/settings');
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      this.showToast('Erreur lors de la mise à jour du profil', 'danger');
      // Recharger les données initiales en cas d'erreur
      this.loadUserProfile();
    }
  }
  
  /**
   * Annule les modifications et retourne à la page précédente
   */
  cancel() {
    this.router.navigateByUrl('/settings');
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