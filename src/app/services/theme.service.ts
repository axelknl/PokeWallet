import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkMode.asObservable();

  constructor() {
    this.loadTheme();
  }

  private loadTheme() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      this.setDarkMode(savedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.setDarkMode(prefersDark.matches);
      
      // Écouter les changements de préférence système
      prefersDark.addEventListener('change', (e) => {
        this.setDarkMode(e.matches);
      });
    }
  }

  setDarkMode(isDark: boolean) {
    this.darkMode.next(isDark);
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark.toString());
  }

  toggleDarkMode() {
    this.setDarkMode(!this.darkMode.value);
  }

  isDarkMode(): boolean {
    return this.darkMode.value;
  }
} 