import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

export const authGuard = async () => {
  const userService = inject(UserService);
  const router = inject(Router);

  await userService.waitForAuthCheck();

  if (userService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login'); // ✅ Retourne un UrlTree
};

export const loginGuard = async () => {
  const userService = inject(UserService);
  const router = inject(Router);

  await userService.waitForAuthCheck();

  if (userService.isAuthenticated()) {
    return router.parseUrl('/home'); // ✅ redirection propre
  }

  return true;
};