import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonRouterLink,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { UserService } from '../../services/user.service';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonRouterLink,
    IonSpinner,
    CustomInputComponent
  ]
})
export class LoginPage {
  loginForm!: FormGroup;
  isLoading = false;
  formSubmitted = false;
  
  // Messages d'erreur pour la validation
  validationMessages = {
    email: {
      required: 'L\'email est requis',
      email: 'Veuillez entrer une adresse email valide'
    },
    password: {
      required: 'Le mot de passe est requis',
      minlength: 'Le mot de passe doit contenir au moins 6 caractères'
    }
  };

  constructor(
    private userService: UserService,
    private toastController: ToastController,
    private formBuilder: FormBuilder
  ) {
    this.createForm();
  }

  createForm() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Getter pour faciliter l'accès aux champs du formulaire
  get f() { 
    return this.loginForm.controls; 
  }

  // Renvoie un message d'erreur en fonction de l'état du contrôle
  getErrorMessage(controlName: string): string {
    const control = this.f[controlName];
    
    if (!control || !(control.touched || this.formSubmitted) || !control.errors) {
      return '';
    }
    
    const messages = this.validationMessages[controlName as keyof typeof this.validationMessages];
    for (const errorName in control.errors) {
      if (control.errors[errorName] && messages[errorName as keyof typeof messages]) {
        return messages[errorName as keyof typeof messages];
      }
    }
    
    return 'Champ invalide';
  }

  async onLogin() {
    this.formSubmitted = true;
    
    if (this.loginForm.invalid) {
      return;
    }
    
    const { email, password } = this.loginForm.value;
    
    this.isLoading = true;
    try {
      await this.userService.login(email, password);
    } catch (error: any) {
      let errorMessage = 'Identifiants incorrects';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte ne correspond à cette adresse email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format d\'email invalide';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives de connexion, veuillez réessayer plus tard';
      }
      
      console.error('Erreur de connexion:', error);
      await this.showError(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
} 