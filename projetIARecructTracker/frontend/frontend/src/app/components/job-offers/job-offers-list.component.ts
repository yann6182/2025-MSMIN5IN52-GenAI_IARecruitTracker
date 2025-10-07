import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-job-offers-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <h1>💼 Offres d'Emploi</h1>
      <p>Liste des offres d'emploi - À développer</p>
      <button class="btn btn-primary" routerLink="/dashboard">← Retour au Dashboard</button>
    </div>
  `,
  styles: [`
    .page-container { padding: 20px; }
    .btn { padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; text-decoration: none; display: inline-block; }
  `]
})
export class JobOffersListComponent {}
