import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-job-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-container">
      <h1>💼 Détail de l'Offre</h1>
      <p>Détail d'une offre d'emploi - À développer</p>
      <button class="btn btn-primary" routerLink="/job-offers">← Retour à la liste</button>
    </div>
  `,
  styles: [`
    .page-container { padding: 20px; }
    .btn { padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; text-decoration: none; display: inline-block; }
  `]
})
export class JobOfferDetailComponent {}
