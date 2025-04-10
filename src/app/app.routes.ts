import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';
import { Component, inject, OnInit } from '@angular/core';
import { UserService } from './services/user.service';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  template: ``,
  standalone: true,
  imports: [IonContent, CommonModule]
})
export class LogoutComponent implements OnInit {
  private router = inject(Router);
  constructor(private userService: UserService) {}

  async ngOnInit() {
    try {
      await this.userService.logout();
      // Attendre un court instant avant de naviguer
      setTimeout(() => {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }, 500);
    } catch (err) {
      console.error('LogoutComponent: Erreur de déconnexion:', err);
      setTimeout(() => {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }, 500);
    }
  }
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
    canActivate: [loginGuard]
  },
  {
    path: 'logout',
    component: LogoutComponent
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: 'collection',
    loadComponent: () => import('./pages/my-wallet/my-wallet.page').then(m => m.MyWalletPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'add-card',
    loadComponent: () => import('./pages/add-card/add-card.page').then(m => m.AddCardPage),
    canActivate: [authGuard]
  },
  {
    path: 'pokemon-detail',
    loadComponent: () => import('./pages/pokemon-detail/pokemon-detail.page').then(m => m.PokemonDetailPage),
    canActivate: [authGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile-edit',
    loadComponent: () => import('./pages/profile-edit/profile-edit.page').then(m => m.ProfileEditPage),
    canActivate: [authGuard]
  },
  {
    path: 'friends',
    loadComponent: () => import('./pages/friends/friends.page').then(m => m.FriendsPage),
    canActivate: [authGuard]
  },
  {
    path: 'friend-profile',
    loadComponent: () => import('./pages/friend-profile/friend-profile.page').then(m => m.FriendProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'friend-collection',
    loadComponent: () => import('./pages/friend-collection/friend-collection.page').then(m => m.FriendCollectionPage),
    canActivate: [authGuard]
  }
]; 