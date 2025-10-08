import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('AI Recruit Tracker');
  
  menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/job-applications', icon: '📋', label: 'Candidatures' },
    { path: '/companies', icon: '🏢', label: 'Entreprises' },
    { path: '/job-offers', icon: '💼', label: 'Offres d\'Emploi' },
    { path: '/emails', icon: '📧', label: 'Emails' },
    { path: '/gmail-connection', icon: '📬', label: 'Gmail OAuth' },
    { path: '/nlp', icon: '🧠', label: 'IA Dashboard' }
  ];
}
