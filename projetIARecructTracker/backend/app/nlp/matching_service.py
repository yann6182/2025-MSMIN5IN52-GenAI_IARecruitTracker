from typing import List, Tuple, Optional, Dict, Any
from pydantic import BaseModel
from app.core.mistral_client import mistral_client
from app.core.config import settings
from app.models.models import Application, Email
from sqlalchemy.orm import Session
from loguru import logger
import re

def cosine_similarity_simple(a, b):
    """Simple cosine similarity calculation"""
    # Mock implementation for now
    return [[0.75]]  # Return mock similarity score


class MatchingResult(BaseModel):
    """Résultat du matching entre email et candidature"""
    application_id: str
    similarity_score: float
    confidence: float
    matching_reasons: List[str]
    company_match: bool = False
    job_title_match: bool = False
    semantic_match: bool = False


class EmailMatchingService:
    """Service de rapprochement sémantique email ↔ candidature"""
    
    def __init__(self, db: Session):
        self.db = db
        self.similarity_threshold = settings.SIMILARITY_THRESHOLD
    
    async def find_matching_applications(
        self, 
        email_subject: str,
        email_body: str,
        sender_email: str,
        sender_domain: str = None
    ) -> List[MatchingResult]:
        """
        Trouver les candidatures correspondant à un email
        
        Args:
            email_subject: Sujet de l'email
            email_body: Corps de l'email  
            sender_email: Email de l'expéditeur
            sender_domain: Domaine de l'expéditeur
            
        Returns:
            Liste des candidatures correspondantes triées par score
        """
        # Récupérer toutes les candidatures actives
        applications = self.db.query(Application).filter(
            Application.status.in_(['APPLIED', 'ACKNOWLEDGED', 'SCREENING', 'INTERVIEW'])
        ).all()
        
        if not applications:
            return []
        
        results = []
        
        for app in applications:
            # Matching par règles simples d'abord
            rule_match = self._match_with_rules(
                app, email_subject, email_body, sender_email, sender_domain
            )
            
            # Si le matching par règles est faible, essayer le matching sémantique
            if rule_match.confidence < 0.7:
                semantic_match = await self._match_with_embeddings(
                    app, email_subject, email_body
                )
                
                if semantic_match and semantic_match.similarity_score > rule_match.similarity_score:
                    semantic_match.semantic_match = True
                    results.append(semantic_match)
                else:
                    results.append(rule_match)
            else:
                results.append(rule_match)
        
        # Trier par score de similarité décroissant
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # Filtrer par seuil minimum
        return [r for r in results if r.similarity_score >= self.similarity_threshold]
    
    def _match_with_rules(
        self,
        application: Application,
        email_subject: str,
        email_body: str, 
        sender_email: str,
        sender_domain: str = None
    ) -> MatchingResult:
        """
        Matching basé sur des règles simples
        """
        score = 0.0
        reasons = []
        company_match = False
        job_title_match = False
        
        email_text = f"{email_subject} {email_body}".lower()
        sender_domain = sender_domain or (sender_email.split('@')[-1] if '@' in sender_email else "")
        
        # 1. Correspondance nom d'entreprise
        if application.company_name:
            company_lower = application.company_name.lower()
            
            # Correspondance exacte dans le texte
            if company_lower in email_text:
                score += 0.4
                reasons.append(f"Company name '{application.company_name}' found in email")
                company_match = True
            
            # Correspondance dans le domaine de l'expéditeur
            elif sender_domain and self._company_domain_match(company_lower, sender_domain):
                score += 0.3
                reasons.append(f"Company domain match: {sender_domain}")
                company_match = True
        
        # 2. Correspondance intitulé de poste
        if application.job_title:
            job_words = self._extract_keywords(application.job_title.lower())
            email_words = self._extract_keywords(email_text)
            
            matching_words = set(job_words) & set(email_words)
            if matching_words:
                word_score = len(matching_words) / len(job_words) * 0.3
                score += word_score
                reasons.append(f"Job title keywords match: {matching_words}")
                job_title_match = True
        
        # 3. Correspondance localisation
        if application.location:
            location_lower = application.location.lower()
            if location_lower in email_text:
                score += 0.1
                reasons.append(f"Location '{application.location}' mentioned")
        
        # 4. Bonus pour candidatures récentes
        if application.created_at:
            from datetime import datetime, timedelta
            if datetime.utcnow() - application.created_at <= timedelta(days=30):
                score += 0.1
                reasons.append("Recent application (within 30 days)")
        
        confidence = min(score, 1.0)
        
        return MatchingResult(
            application_id=str(application.id),
            similarity_score=score,
            confidence=confidence,
            matching_reasons=reasons,
            company_match=company_match,
            job_title_match=job_title_match
        )
    
    async def _match_with_embeddings(
        self,
        application: Application,
        email_subject: str,
        email_body: str
    ) -> Optional[MatchingResult]:
        """
        Matching sémantique avec Mistral Embed
        """
        if not mistral_client.is_available():
            return None
        
        try:
            # Créer les textes à comparer
            app_text = f"{application.company_name} {application.job_title} {application.location or ''}"
            email_text = f"{email_subject} {email_body[:500]}"  # Limiter la taille
            
            # Obtenir les embeddings
            embeddings = await mistral_client.get_embeddings([app_text, email_text])
            
            if not embeddings or len(embeddings) != 2:
                return None
            
            # Calculer la similarité cosine
            similarity = cosine_similarity_simple([embeddings[0]], [embeddings[1]])[0][0]
            
            # Convertir en score plus lisible
            score = float(similarity)
            confidence = score if score > 0.5 else score * 0.8  # Pénaliser les scores faibles
            
            reasons = [f"Semantic similarity: {score:.3f}"]
            
            return MatchingResult(
                application_id=str(application.id),
                similarity_score=score,
                confidence=confidence,
                matching_reasons=reasons,
                semantic_match=True
            )
            
        except Exception as e:
            logger.error(f"Error in semantic matching: {e}")
            return None
    
    def _company_domain_match(self, company_name: str, domain: str) -> bool:
        """
        Vérifier si un domaine correspond au nom d'entreprise
        """
        # Nettoyer le nom d'entreprise (enlever espaces, caractères spéciaux)
        clean_company = re.sub(r'[^a-zA-Z0-9]', '', company_name).lower()
        clean_domain = domain.lower().split('.')[0]  # Prendre seulement la partie avant le TLD
        
        # Correspondances possibles
        matches = [
            clean_company == clean_domain,
            clean_company in clean_domain,
            clean_domain in clean_company,
            # Acronymes
            len(clean_company) <= 4 and clean_company == clean_domain[:len(clean_company)]
        ]
        
        return any(matches)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """
        Extraire les mots-clés pertinents d'un texte
        """
        # Mots vides à ignorer
        stop_words = {
            'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'pour', 'dans',
            'the', 'a', 'an', 'and', 'or', 'for', 'in', 'at', 'to', 'of', 'with'
        }
        
        # Extraire les mots (minimum 3 caractères)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Filtrer les mots vides
        keywords = [w for w in words if w not in stop_words]
        
        return keywords
    
    async def auto_link_email(
        self, 
        email: Email,
        min_confidence: float = 0.8
    ) -> Optional[str]:
        """
        Lier automatiquement un email à une candidature si la confiance est élevée
        
        Args:
            email: Email à traiter
            min_confidence: Seuil minimum de confiance pour le linking automatique
            
        Returns:
            ID de l'application liée ou None
        """
        if email.application_id:  # Déjà lié
            return str(email.application_id)
        
        matches = await self.find_matching_applications(
            email.subject or "",
            email.snippet or email.raw_body or "",
            email.sender or "",
        )
        
        if matches and matches[0].confidence >= min_confidence:
            best_match = matches[0]
            
            # Lier l'email à l'application
            email.application_id = best_match.application_id
            self.db.commit()
            
            logger.info(f"Auto-linked email {email.id} to application {best_match.application_id} "
                       f"with confidence {best_match.confidence}")
            
            return best_match.application_id
        
        return None
