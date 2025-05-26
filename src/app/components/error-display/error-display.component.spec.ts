import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ErrorDisplayComponent } from './error-display.component';
import { ErrorType, ErrorSeverity, StandardError } from '../../interfaces/error-handling.interface';

describe('ErrorDisplayComponent', () => {
  let component: ErrorDisplayComponent;
  let fixture: ComponentFixture<ErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorDisplayComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error message', () => {
    const testError: StandardError = {
      id: '1',
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Network error',
      timestamp: new Date(),
      userMessage: 'Problème de connexion réseau',
      retryable: true
    };

    component.error = testError;
    component.showError = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.error-message').textContent).toContain('Problème de connexion réseau');
  });

  it('should show retry button for retryable errors', () => {
    const retryableError: StandardError = {
      id: '1',
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Network timeout',
      timestamp: new Date(),
      userMessage: 'Timeout de connexion',
      retryable: true
    };

    component.error = retryableError;
    component.showError = true;
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.retry-button');
    expect(retryButton).toBeTruthy();
  });

  it('should not show retry button for non-retryable errors', () => {
    const nonRetryableError: StandardError = {
      id: '1',
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: 'auth/user-not-found',
      timestamp: new Date(),
      userMessage: 'Utilisateur non trouvé',
      retryable: false
    };

    component.error = nonRetryableError;
    component.showError = true;
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.retry-button');
    expect(retryButton).toBeFalsy();
  });

  it('should emit retry event when retry button is clicked', () => {
    const retryableError: StandardError = {
      id: '1',
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Network error',
      timestamp: new Date(),
      userMessage: 'Erreur réseau',
      retryable: true
    };

    component.error = retryableError;
    component.showError = true;
    fixture.detectChanges();

    spyOn(component.retryClicked, 'emit');

    const retryButton = fixture.nativeElement.querySelector('.retry-button');
    retryButton.click();

    expect(component.retryClicked.emit).toHaveBeenCalled();
  });

  it('should emit dismiss event when close button is clicked', () => {
    const testError: StandardError = {
      id: '1',
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.LOW,
      message: 'Test error',
      timestamp: new Date(),
      userMessage: 'Erreur de test',
      retryable: false
    };

    component.error = testError;
    component.showError = true;
    fixture.detectChanges();

    spyOn(component.dismissed, 'emit');

    const closeButton = fixture.nativeElement.querySelector('.close-button');
    closeButton.click();

    expect(component.dismissed.emit).toHaveBeenCalled();
  });

  it('should apply correct CSS class based on error severity', () => {
    const highSeverityError: StandardError = {
      id: '1',
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: 'Auth error',
      timestamp: new Date(),
      userMessage: 'Erreur d\'authentification',
      retryable: false
    };

    component.error = highSeverityError;
    component.showError = true;
    fixture.detectChanges();

    const errorContainer = fixture.nativeElement.querySelector('.error-container');
    expect(errorContainer.classList.contains('severity-high')).toBeTruthy();
  });
}); 