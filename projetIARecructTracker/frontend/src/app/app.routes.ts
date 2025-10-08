import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'job-applications',
    loadComponent: () => import('./components/job-applications/job-applications-list.component').then(m => m.JobApplicationsListComponent)
  },
  {
    path: 'job-applications-advanced',
    loadComponent: () => import('./components/job-applications/job-applications-advanced.component').then(m => m.JobApplicationsAdvancedComponent)
  },
  {
    path: 'intelligent-tracker',
    loadComponent: () => import('./components/intelligent-excel-tracker/intelligent-excel-tracker.component').then(m => m.IntelligentExcelTrackerComponent)
  },
  {
    path: 'companies',
    loadComponent: () => import('./components/companies/companies-list.component').then(m => m.CompaniesListComponent)
  },
  {
    path: 'companies/create',
    loadComponent: () => import('./components/companies/company-create.component').then(m => m.CompanyCreateComponent)
  },
  {
    path: 'job-offers',
    loadComponent: () => import('./components/job-offers/job-offers-list.component').then(m => m.JobOffersListComponent)
  },
  {
    path: 'emails',
    loadComponent: () => import('./components/emails/emails-list.component').then(m => m.EmailsListComponent)
  },
  {
    path: 'emails/:id',
    loadComponent: () => import('./components/emails/email-detail.component').then(m => m.EmailDetailComponent)
  },
  {
    path: 'nlp',
    loadComponent: () => import('./components/nlp/nlp-dashboard.component').then(m => m.NlpDashboardComponent)
  },
  {
    path: 'gmail-connection',
    loadComponent: () => import('./components/gmail-connection/gmail-connection.component').then(m => m.GmailConnectionComponent)
  },
  {
    path: 'oauth/callback',
    loadComponent: () => import('./components/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent)
  }
];
