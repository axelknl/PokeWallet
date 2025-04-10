import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonicModule, 
  ModalController, 
  ToastController,
  LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personAdd, search, close, checkmark } from 'ionicons/icons';
import { UserService } from '../../services/user.service';
import { CustomInputComponent } from '../custom-input/custom-input.component';

@Component({
  selector: 'app-add-friend-modal',
  templateUrl: './add-friend-modal.component.html',
  styleUrls: ['./add-friend-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CustomInputComponent
  ]
})
export class AddFriendModalComponent implements OnInit {
  friendUsername: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private userService: UserService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ personAdd, search, close, checkmark });
  }

  ngOnInit() {
    // Initialisation du composant
  }

  // Fermeture de la modal
  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Recherche d'utilisateurs par username
  async searchUsers() {
    if (!this.friendUsername || this.friendUsername.trim() === '') {
      this.showToast('Veuillez entrer un nom d\'utilisateur', 'warning');
      return;
    }

    this.isSearching = true;
    const loading = await this.loadingController.create({
      message: 'Recherche en cours...'
    });
    await loading.present();

    try {
      // Utiliser la méthode pour rechercher par username
      this.searchResults = await this.userService.searchUsersByUsername(this.friendUsername);
      
      if (this.searchResults.length === 0) {
        this.showToast('Aucun utilisateur trouvé avec ce nom d\'utilisateur', 'warning');
      }
    } catch (error: any) {
      this.showToast(`Erreur de recherche: ${error.message}`, 'danger');
    } finally {
      this.isSearching = false;
      await loading.dismiss();
    }
  }

  // Ajout d'un ami
  async addFriend(userId: string) {
    const loading = await this.loadingController.create({
      message: 'Ajout en cours...'
    });
    await loading.present();

    try {
      // Cette méthode devra être implémentée dans le UserService
      await this.userService.addFriend(userId);
      this.showToast('Ami ajouté avec succès', 'success');
      this.modalCtrl.dismiss({ added: true });
    } catch (error: any) {
      this.showToast(`Erreur: ${error.message}`, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Affichage des notifications
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
} 