import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StandardError, ErrorSeverity } from '../../interfaces/error-handling.interface';

/**
 * Composant pour afficher les erreurs de manière standardisée
 */
@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './error-display.component.html',
  styleUrls: ['./error-display.component.scss']
})
export class ErrorDisplayComponent {
  /**
   * Erreur à afficher
   */
  @Input() error: StandardError | null = null;
  
  /**
   * Contrôle la visibilité du composant
   */
  @Input() showError: boolean = false;
  
  /**
   * Événement émis quand l'utilisateur clique sur "Réessayer"
   */
  @Output() retryClicked = new EventEmitter<void>();
  
  /**
   * Événement émis quand l'utilisateur ferme l'erreur
   */
  @Output() dismissed = new EventEmitter<void>();

  /**
   * Gère le clic sur le bouton réessayer
   */
  onRetryClick(): void {
    this.retryClicked.emit();
  }

  /**
   * Gère le clic sur le bouton fermer
   */
  onDismiss(): void {
    this.dismissed.emit();
  }

  /**
   * Retourne la classe CSS pour la sévérité
   */
  getSeverityClass(): string {
    if (!this.error) return '';
    
    switch (this.error.severity) {
      case ErrorSeverity.LOW:
        return 'severity-low';
      case ErrorSeverity.MEDIUM:
        return 'severity-medium';
      case ErrorSeverity.HIGH:
        return 'severity-high';
      case ErrorSeverity.CRITICAL:
        return 'severity-critical';
      default:
        return 'severity-medium';
    }
  }

  /**
   * Retourne l'icône à afficher selon le type d'erreur
   */
  getErrorIcon(): string {
    if (!this.error) return 'alert-circle';
    
    switch (this.error.type) {
      case 'NETWORK':
        return 'wifi-off';
      case 'AUTHENTICATION':
        return 'person-circle';
      case 'FIREBASE':
        return 'server';
      case 'CACHE':
        return 'refresh-circle';
      case 'VALIDATION':
        return 'checkmark-circle';
      default:
        return 'alert-circle';
    }
  }
} 