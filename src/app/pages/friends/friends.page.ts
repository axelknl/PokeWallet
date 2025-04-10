import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { personAdd, search, personRemove, arrowBack } from 'ionicons/icons';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { UserService } from '../../services/user.service';
import { AddFriendModalComponent } from '../../components/add-friend-modal/add-friend-modal.component';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.page.html',
  styleUrls: ['./friends.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AppHeaderComponent,
    AddFriendModalComponent
  ]
})
export class FriendsPage implements OnInit {
  friends: any[] = [];
  isLoading: boolean = false;
  
  constructor(
    private router: Router,
    private userService: UserService,
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ personAdd, search, personRemove, arrowBack });
  }

  ngOnInit() {
    this.loadFriends();
  }

  // Charger la liste des amis
  async loadFriends() {
    this.isLoading = true;
    
    const loading = await this.loadingController.create({
      message: 'Chargement de vos amis...'
    });
    await loading.present();
    
    try {
      this.friends = await this.userService.getFriendsDetails();
    } catch (error: any) {
      this.showToast(`Erreur lors du chargement des amis: ${error.message}`, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // Un handler pour le rafraichissement de la page
  async handleRefresh(event: any) {
    try {
      await this.loadFriends();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      event.target.complete();
    }
  }

  // Ouvrir la modal pour ajouter un ami
  async openAddFriendModal() {
    const modal = await this.modalCtrl.create({
      component: AddFriendModalComponent,
      cssClass: 'add-friend-modal'
    });

    await modal.present();

    // Récupérer le résultat de la modal quand elle est fermée
    const { data } = await modal.onWillDismiss();
    
    // Si un ami a été ajouté, recharger la liste des amis
    if (data && data.added) {
      this.loadFriends();
    }
  }

  // Confirmer et supprimer un ami
  async confirmRemoveFriend(friend: any) {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: `Êtes-vous sûr de vouloir supprimer ${friend.username} de votre liste d'amis?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: () => {
            this.removeFriend(friend.id);
          }
        }
      ]
    });

    await alert.present();
  }

  // Supprimer un ami
  async removeFriend(friendId: string) {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();
    
    try {
      await this.userService.removeFriend(friendId);
      this.showToast('Ami supprimé avec succès', 'success');
      this.loadFriends(); // Recharger la liste des amis
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

  // Naviguer vers le profil d'un ami
  viewFriendProfile(friend: any) {
    this.router.navigate(['/friend-profile'], {
      queryParams: { id: friend.id }
    });
  }
} 