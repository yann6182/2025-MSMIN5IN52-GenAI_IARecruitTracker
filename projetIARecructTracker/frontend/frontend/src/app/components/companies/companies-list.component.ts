import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import { Company } from '../../models/company.model';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Liste des Entreprises</h2>
        <button class="btn btn-primary" [routerLink]="['/companies/create']">
          ➕ Nouvelle Entreprise
        </button>
      </div>

      <!-- Filtres -->
      <div class="row mb-3">
        <div class="col-md-6">
          <input
            type="text"
            class="form-control"
            placeholder="Rechercher une entreprise..."
            [(ngModel)]="searchTerm"
            (input)="applyFilters()">
        </div>
      </div>

      <!-- Liste des entreprises -->
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5>Entreprises ({{ filteredCompanies.length }})</h5>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Secteur</th>
                      <th>Localisation</th>
                      <th>Site Web</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let company of filteredCompanies">
                      <td>{{ company.name }}</td>
                      <td>{{ company.industry || 'Non spécifié' }}</td>
                      <td>{{ company.location || 'Non spécifiée' }}</td>
                      <td>
                        <a *ngIf="company.website" [href]="company.website" target="_blank" class="text-decoration-none">
                          🔗 Visiter
                        </a>
                        <span *ngIf="!company.website" class="text-muted">Non renseigné</span>
                      </td>
                      <td>
                        <button 
                          class="btn btn-sm btn-outline-primary me-2"
                          [routerLink]="['/companies', company.id]">
                          👁️ Voir
                        </button>
                        <button 
                          class="btn btn-sm btn-outline-warning"
                          [routerLink]="['/companies', company.id, 'edit']">
                          ✏️ Modifier
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <div *ngIf="filteredCompanies.length === 0" class="text-center py-4">
                  <p class="text-muted">Aucune entreprise trouvée</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./companies-list.component.scss']
})
export class CompaniesListComponent implements OnInit {
  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  searchTerm = '';
  loading = false;
  error = '';

  constructor(private companyService: CompanyService) {}

  ngOnInit() {
    this.loadCompanies();
  }

  private async loadCompanies() {
    try {
      this.loading = true;
      const response = await this.companyService.getCompanies().toPromise();
      this.companies = response?.items || [];
      this.applyFilters();
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
      this.error = 'Erreur lors du chargement des entreprises';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    let filtered = this.companies;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(company =>
        company.name?.toLowerCase().includes(term) ||
        company.industry?.toLowerCase().includes(term) ||
        company.location?.toLowerCase().includes(term)
      );
    }

    this.filteredCompanies = filtered;
  }
}
