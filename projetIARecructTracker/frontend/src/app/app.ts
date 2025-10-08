import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { User } from './models/auth.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('AI Recruit Tracker');
  
  currentUser: User | null = null;
  isAuthenticated = false;
  
  menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/job-applications', icon: '📋', label: 'Candidatures' },
    { path: '/companies', icon: '🏢', label: 'Entreprises' },
    { path: '/job-offers', icon: '💼', label: 'Offres d\'Emploi' },
    { path: '/emails', icon: '📧', label: 'Emails' },
    { path: '/gmail-connection', icon: '📬', label: 'Gmail OAuth' },
    { path: '/nlp', icon: '🧠', label: 'IA Dashboard' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements d'état d'authentification
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout(): void {
    this.authService.logout();
  }

  getUserDisplayName(): string {
    return this.currentUser?.full_name || this.currentUser?.email || 'Utilisateur';
  }
}
