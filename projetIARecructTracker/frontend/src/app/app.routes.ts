import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/auth/gmail-auth-welcome/gmail-auth-welcome.component').then(m => m.GmailAuthWelcomeComponent)
  },
  
  // Page d'accueil Gmail Auth
  {
    path: 'welcome',
    loadComponent: () => import('./components/auth/gmail-auth-welcome/gmail-auth-welcome.component').then(m => m.GmailAuthWelcomeComponent)
  },
  
  // Routes d'authentification (accessibles uniquement aux utilisateurs non connectés)
  {
    path: 'auth',
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./components/auth/register.component').then(m => m.RegisterComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Routes protégées (accessibles uniquement aux utilisateurs connectés)
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'job-applications',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/job-applications/job-applications-list.component').then(m => m.JobApplicationsListComponent)
  },
  {
    path: 'job-applications-advanced',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/job-applications/job-applications-advanced.component').then(m => m.JobApplicationsAdvancedComponent)
  },
  {
    path: 'intelligent-tracker',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/intelligent-excel-tracker/intelligent-excel-tracker.component').then(m => m.IntelligentExcelTrackerComponent)
  },
  {
    path: 'companies',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/companies/companies-list.component').then(m => m.CompaniesListComponent)
  },
  {
    path: 'companies/create',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/companies/company-create.component').then(m => m.CompanyCreateComponent)
  },
  {
    path: 'job-offers',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/job-offers/job-offers-list.component').then(m => m.JobOffersListComponent)
  },
  {
    path: 'emails',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/emails/emails-list.component').then(m => m.EmailsListComponent)
  },
  {
    path: 'emails/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/emails/email-detail.component').then(m => m.EmailDetailComponent)
  },
  {
    path: 'nlp',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/nlp/nlp-dashboard.component').then(m => m.NlpDashboardComponent)
  },
  {
    path: 'gmail-connection',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/gmail-connection/gmail-connection.component').then(m => m.GmailConnectionComponent)
  },
  
  // Route OAuth callback (pas de garde nécessaire)
  {
    path: 'oauth/callback',
    loadComponent: () => import('./components/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent)
  },

  // Route wildcard pour les pages non trouvées
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
