import { Component, OnInit, HostListener, NgZone } from '@angular/core';
import { 
  IonApp, 
  IonRouterOutlet, 
  IonTabBar, 
  IonTabButton, 
  IonIcon, 
  IonLabel,
  IonFooter,
  IonToolbar,
  IonButton
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { homeOutline, gridOutline, personOutline, timeOutline, addCircle, add } from 'ionicons/icons';
import { Router, Event, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonApp, 
    IonRouterOutlet, 
    IonTabBar, 
    IonTabButton, 
    IonIcon, 
    IonLabel, 
    IonFooter,
    IonToolbar,
    IonButton,
    RouterLink,
    RouterLinkActive
  ],
})
export class AppComponent implements OnInit {
  showTabs = false;
  isDarkMode = false;
  activeTab: string = 'home';

  constructor(
    private router: Router,
    private platform: Platform,
    private zone: NgZone
  ) {
    addIcons({ homeOutline, gridOutline, personOutline, timeOutline, addCircle, add });

    // Configuration des événements tactiles
    this.setupTouchEvents();

    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        // Afficher les tabs seulement sur les pages protégées
        const shouldShowTabs = !['/login', '/register', '/logout'].includes(event.url);
        this.showTabs = shouldShowTabs;
        
        // Mettre à jour l'onglet actif
        this.updateActiveTab(event.url);
      }
    });

    // Gérer les problèmes d'affichage sur la plateforme Android
    this.platform.ready().then(() => {
      if (this.platform.is('android')) {
        this.setupAndroidFixes();
      }
    });
  }

  private updateActiveTab(url: string) {
    if (url.includes('/home')) {
      this.activeTab = 'home';
    } else if (url.includes('/collection')) {
      this.activeTab = 'collection';
    } else if (url.includes('/add-card')) {
      this.activeTab = 'add-card';
    } else if (url.includes('/history')) {
      this.activeTab = 'history';
    } else if (url.includes('/profile')) {
      this.activeTab = 'profile';
    }
  }

  private setupAndroidFixes() {
    // Forcer la mise à jour de la vue sur Android
    document.addEventListener('ionViewWillEnter', () => {
      this.zone.run(() => {
        // Forcer la détection de changements
      });
    });
  }

  private setupTouchEvents() {
    // Ajouter les options passives aux événements tactiles
    const options = {
      passive: true,
      capture: false
    };

    document.addEventListener('touchstart', () => {}, options);
    document.addEventListener('touchmove', () => {}, options);
    document.addEventListener('wheel', () => {}, options);
  }

  ngOnInit() {
    this.loadTheme();
    this.addGlobalStyles();
  }

  // Naviguer programmatiquement vers un onglet
  navigateToTab(tabPath: string) {
    this.router.navigate([tabPath], { replaceUrl: true });
  }

  private loadTheme() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === 'true';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode = prefersDark.matches;
    }
    document.body.classList.toggle('dark', this.isDarkMode);
  }

  private addGlobalStyles() {
    // S'assurer que les styles existent pour que les contenus ne soient pas cachés par la tab bar
    const style = document.createElement('style');
    style.innerHTML = `
      ion-content { --padding-bottom: 72px; }
      .footer-content { margin-bottom: 72px; }
      .ion-page { margin-bottom: 0 !important; }
    `;
    document.head.appendChild(style);
  }
}
