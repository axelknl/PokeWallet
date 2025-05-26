import { TestBed } from '@angular/core/testing';
import { PerformanceOptimizationService, SubscriptionManager } from './performance-optimization.service';
import { of, Subject } from 'rxjs';

describe('PerformanceOptimizationService', () => {
  let service: PerformanceOptimizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceOptimizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create subscription manager', () => {
    const manager = service.createSubscriptionManager();
    expect(manager).toBeInstanceOf(SubscriptionManager);
  });

  it('should optimize observable', () => {
    const testObservable = of('test');
    const optimized = service.optimizeObservable(testObservable);
    expect(optimized).toBeTruthy();
  });

  it('should measure performance of synchronous operations', () => {
    spyOn(console, 'log');
    
    const result = service.measurePerformance(() => {
      return 'test result';
    }, 'test operation');
    
    expect(result).toBe('test result');
    expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching(/\[PERFORMANCE\] test operation: \d+(\.\d+)?ms/));
  });

  it('should measure performance of asynchronous operations', async () => {
    spyOn(console, 'log');
    
    const result = await service.measurePerformance(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async result';
    }, 'async operation');
    
    expect(result).toBe('async result');
    expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching(/\[PERFORMANCE\] async operation: \d+(\.\d+)?ms/));
  });
});

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let subject1: Subject<string>;
  let subject2: Subject<number>;

  beforeEach(() => {
    manager = new SubscriptionManager();
    subject1 = new Subject<string>();
    subject2 = new Subject<number>();
  });

  afterEach(() => {
    subject1.complete();
    subject2.complete();
  });

  it('should be created', () => {
    expect(manager).toBeTruthy();
  });

  it('should add subscriptions', () => {
    const sub1 = subject1.subscribe();
    const sub2 = subject2.subscribe();
    
    manager.add(sub1);
    manager.add(sub2);
    
    expect(manager.getTotalCount()).toBe(2);
    expect(manager.getActiveCount()).toBe(2);
  });

  it('should unsubscribe all subscriptions', () => {
    const sub1 = subject1.subscribe();
    const sub2 = subject2.subscribe();
    
    manager.add(sub1);
    manager.add(sub2);
    
    expect(manager.getActiveCount()).toBe(2);
    
    manager.unsubscribeAll();
    
    expect(manager.getActiveCount()).toBe(0);
    expect(manager.getTotalCount()).toBe(0);
    expect(sub1.closed).toBeTrue();
    expect(sub2.closed).toBeTrue();
  });

  it('should handle already closed subscriptions', () => {
    const sub1 = subject1.subscribe();
    const sub2 = subject2.subscribe();
    
    manager.add(sub1);
    manager.add(sub2);
    
    // Fermer manuellement un abonnement
    sub1.unsubscribe();
    
    expect(manager.getActiveCount()).toBe(1);
    expect(manager.getTotalCount()).toBe(2);
    
    // Unsubscribe all ne doit pas lever d'erreur
    expect(() => manager.unsubscribeAll()).not.toThrow();
    
    expect(manager.getActiveCount()).toBe(0);
    expect(manager.getTotalCount()).toBe(0);
  });

  it('should handle null subscriptions gracefully', () => {
    const sub1 = subject1.subscribe();
    
    manager.add(sub1);
    manager.add(null as any);
    
    expect(manager.getTotalCount()).toBe(2);
    expect(manager.getActiveCount()).toBe(1);
    
    expect(() => manager.unsubscribeAll()).not.toThrow();
    
    expect(manager.getActiveCount()).toBe(0);
    expect(manager.getTotalCount()).toBe(0);
  });
}); 