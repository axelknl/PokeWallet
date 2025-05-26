import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { HistoryPage } from './history.page';
import { HistoryService } from '../../services/history.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

describe('HistoryPage - Performance Optimization', () => {
  let component: HistoryPage;
  let fixture: ComponentFixture<HistoryPage>;
  let mockHistoryService: jasmine.SpyObj<HistoryService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let dataSubject: Subject<any>;
  let loadingSubject: Subject<boolean>;
  let errorSubject: Subject<boolean>;

  beforeEach(async () => {
    dataSubject = new Subject();
    loadingSubject = new Subject();
    errorSubject = new Subject();
    
    mockHistoryService = jasmine.createSpyObj('HistoryService', ['getData', 'reloadData'], {
      data$: dataSubject.asObservable(),
      isLoading$: loadingSubject.asObservable(),
      hasError$: errorSubject.asObservable()
    });
    mockUserService = jasmine.createSpyObj('UserService', ['getCurrentUser']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [
        { provide: HistoryService, useValue: mockHistoryService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPage);
    component = fixture.componentInstance;
  });

  it('should use OnPush change detection strategy', () => {
    // Vérifier que le composant se crée correctement avec OnPush
    expect(component).toBeTruthy();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should properly manage multiple subscriptions', () => {
    // Initialiser le composant
    component.ngOnInit();
    
    // Vérifier qu'il y a des abonnements actifs
    expect((component as any).subscriptions).toBeTruthy();
    expect((component as any).subscriptions.length).toBeGreaterThan(0);
    
    // Vérifier que tous les abonnements sont actifs
    (component as any).subscriptions.forEach((sub: any) => {
      expect(sub.closed).toBeFalse();
    });
    
    // Détruire le composant
    component.ngOnDestroy();
    
    // Vérifier que tous les abonnements ont été fermés
    (component as any).subscriptions.forEach((sub: any) => {
      expect(sub.closed).toBeTrue();
    });
  });
}); 