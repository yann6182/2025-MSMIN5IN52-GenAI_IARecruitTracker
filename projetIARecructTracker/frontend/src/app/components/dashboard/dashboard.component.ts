import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobApplicationService } from '../../services/job-application.service';
import { CompanyService } from '../../services/company.service';
import { JobOfferService } from '../../services/job-offer.service';
import { EmailService } from '../../services/email.service';

interface DashboardStats {
  totalApplications: number;
  totalCompanies: number;
  totalOffers: number;
  totalEmails: number;
  recentApplications: any[];
  applicationsByStatus: { [key: string]: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  Object = Object; // Pour utiliser Object dans le template
  
  stats: DashboardStats = {
    totalApplications: 0,
    totalCompanies: 0,
    totalOffers: 0,
    totalEmails: 0,
    recentApplications: [],
    applicationsByStatus: {}
  };
  
  loading = true;
  error: string | null = null;

  constructor(
    private jobApplicationService: JobApplicationService,
    private companyService: CompanyService,
    private jobOfferService: JobOfferService,
    private emailService: EmailService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private async loadDashboardData() {
    try {
      this.loading = true;
      
      // Charger les statistiques en parallèle
      const [applications, companies, offers, emails] = await Promise.all([
        this.jobApplicationService.getJobApplications().toPromise(),
        this.companyService.getCompanies().toPromise(),
        this.jobOfferService.getJobOffers().toPromise(),
        this.emailService.getEmails().toPromise()
      ]);

      this.stats = {
        totalApplications: applications?.items?.length || 0,
        totalCompanies: companies?.items?.length || 0,
        totalOffers: offers?.items?.length || 0,
        totalEmails: emails?.items?.length || 0,
        recentApplications: applications?.items?.slice(0, 5) || [],
        applicationsByStatus: this.getApplicationsByStatus(applications?.items || [])
      };

      this.loading = false;
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      this.error = 'Erreur lors du chargement des données';
      this.loading = false;
    }
  }

  private getApplicationsByStatus(applications: any[]): { [key: string]: number } {
    return applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'badge pending',
      'applied': 'badge applied',
      'interview': 'badge interview',
      'rejected': 'badge rejected',
      'accepted': 'badge accepted'
    };
    return statusClasses[status] || 'badge';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
