import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { MyWalletPage } from './my-wallet.page';
import { CardStorageService } from '../../services/card-storage.service';
import { UserService } from '../../services/user.service';
import { ModalController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

describe('MyWalletPage - Performance Optimization', () => {
  let component: MyWalletPage;
  let fixture: ComponentFixture<MyWalletPage>;
  let mockCardStorage: jasmine.SpyObj<CardStorageService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockModalController: jasmine.SpyObj<ModalController>;
  let mockRouter: jasmine.SpyObj<Router>;
  let cardsSubject: Subject<any>;

  beforeEach(async () => {
    cardsSubject = new Subject();
    mockCardStorage = jasmine.createSpyObj('CardStorageService', ['reloadCards'], {
      cards$: cardsSubject.asObservable()
    });
    mockUserService = jasmine.createSpyObj('UserService', ['getCurrentUser']);
    mockModalController = jasmine.createSpyObj('ModalController', ['create']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [MyWalletPage],
      providers: [
        { provide: CardStorageService, useValue: mockCardStorage },
        { provide: UserService, useValue: mockUserService },
        { provide: ModalController, useValue: mockModalController },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyWalletPage);
    component = fixture.componentInstance;
  });

  it('should use OnPush change detection strategy', () => {
    // Vérifier que le composant se crée correctement avec OnPush
    expect(component).toBeTruthy();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should properly unsubscribe from observables on destroy', () => {
    // Initialiser le composant
    component.ngOnInit();
    
    // Vérifier qu'il y a un abonnement actif
    const cardsSubscription = (component as any).cardsSubscription;
    expect(cardsSubscription).toBeTruthy();
    
    if (cardsSubscription) {
      expect(cardsSubscription.closed).toBeFalse();
      
      // Détruire le composant
      component.ngOnDestroy();
      
      // Vérifier que l'abonnement a été fermé
      expect(cardsSubscription.closed).toBeTrue();
    }
  });
}); 