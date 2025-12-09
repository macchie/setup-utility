import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'scheduled-tasks',
    loadComponent: () => import('./pages/scheduled-tasks/scheduled-tasks.page').then( m => m.ScheduledTasksPage)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
