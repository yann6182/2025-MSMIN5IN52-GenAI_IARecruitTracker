from app.core.config import settings
from typing import Dict, Any, List, Optional
from loguru import logger
import json


class MistralAIClient:
    """Client pour interagir avec l'API Mistral AI"""
    
    def __init__(self):
        if settings.MISTRAL_API_KEY and settings.MISTRAL_API_KEY != "your-mistral-api-key":
            try:
                from mistralai import Mistral
                self.client = Mistral(api_key=settings.MISTRAL_API_KEY)
                logger.info("Mistral AI client initialized successfully")
            except ImportError as e:
                logger.error(f"Failed to import Mistral: {e}")
                self.client = None
            except Exception as e:
                logger.error(f"Failed to initialize Mistral AI client: {e}")
                self.client = None
        else:
            logger.warning("Mistral AI API key not configured - using mock responses")
            self.client = None
    
    def is_available(self) -> bool:
        """Vérifier si le client Mistral est disponible"""
        return self.client is not None
    
    async def extract_structured_data(
        self, 
        text: str, 
        extraction_schema: Dict[str, Any],
        model: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Extraire des données structurées d'un texte avec Mistral en mode JSON
        
        Args:
            text: Texte à analyser
            extraction_schema: Schéma JSON définissant les données à extraire
            model: Modèle à utiliser (défaut: mistral-small-latest)
            
        Returns:
            Dictionnaire avec les données extraites ou None si erreur
        """
        if not self.is_available():
            logger.warning("Mistral client not available, using mock data")
            return {
                "sender": "example@company.com",
                "company": "Example Company",
                "subject": "Job Opportunity",
                "job_title": "Software Engineer",
                "status": "nouvelle_candidature"
            }
        
        try:
            model_name = model or settings.MISTRAL_EXTRACTION_MODEL
            
            # Construire le prompt pour l'extraction structurée
            schema_str = json.dumps(extraction_schema, indent=2)
            prompt = f"""
Analysez le texte suivant et extrayez les informations selon le schéma JSON fourni.
Répondez uniquement avec un JSON valide, sans texte explicatif.

Schéma de réponse attendu:
{schema_str}

Texte à analyser:
{text}

JSON:"""

            from mistralai import Mistral
            from mistralai.models import ChatMessage
            
            response = self.client.chat.complete(
                model=model_name,
                messages=[ChatMessage(role="user", content=prompt)],
                temperature=settings.MISTRAL_TEMPERATURE,
                max_tokens=settings.MISTRAL_MAX_TOKENS
            )
            
            content = response.choices[0].message.content.strip()
            
            # Nettoyer la réponse pour extraire le JSON
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Parser le JSON
            extracted_data = json.loads(content)
            logger.info(f"Successfully extracted data with Mistral: {extracted_data}")
            return extracted_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Mistral response: {e}")
            logger.error(f"Raw response: {content}")
            return None
        except Exception as e:
            logger.error(f"Error in Mistral extraction: {e}")
            return None
    
    async def classify_text(
        self, 
        text: str, 
        categories: List[str],
        context: str = "",
        model: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Classifier un texte dans des catégories prédéfinies
        
        Args:
            text: Texte à classifier
            categories: Liste des catégories possibles
            context: Contexte additionnel pour la classification
            model: Modèle à utiliser
            
        Returns:
            Dictionnaire avec la classification et le score de confiance
        """
        if not self.is_available():
            logger.warning("Mistral client not available, using mock classification")
            return {
                "category": categories[0] if categories else "unknown",
                "confidence": 0.85,
                "reasoning": "Mock classification result"
            }
        
        try:
            model_name = model or settings.MISTRAL_EXTRACTION_MODEL
            categories_str = ", ".join(categories)
            
            prompt = f"""
Classifiez le texte suivant dans l'une des catégories données.
Répondez uniquement avec un JSON valide contenant les champs suivants:
- "category": la catégorie choisie (doit être exactement l'une des catégories listées)
- "confidence": score de confiance entre 0 et 1
- "reasoning": explication courte du choix

Contexte: {context if context else "Email de recrutement"}

Catégories possibles: {categories_str}

Texte à classifier:
{text}

JSON:"""

            from mistralai.models import ChatMessage
            
            response = self.client.chat.complete(
                model=model_name,
                messages=[ChatMessage(role="user", content=prompt)],
                temperature=0.1,  # Plus déterministe pour la classification
                max_tokens=200
            )
            
            content = response.choices[0].message.content.strip()
            
            # Nettoyer la réponse pour extraire le JSON
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # Parser le JSON
            classification_result = json.loads(content)
            
            # Valider que la catégorie est dans la liste
            if classification_result.get("category") not in categories:
                logger.warning(f"Invalid category returned: {classification_result.get('category')}")
                classification_result["category"] = categories[0]
                classification_result["confidence"] = 0.5
            
            logger.info(f"Successfully classified with Mistral: {classification_result}")
            return classification_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Mistral classification: {e}")
            logger.error(f"Raw response: {content}")
            return {
                "category": categories[0] if categories else "unknown",
                "confidence": 0.5,
                "reasoning": "Failed to parse AI response"
            }
        except Exception as e:
            logger.error(f"Error calling Mistral AI for classification: {e}")
            return {
                "category": categories[0] if categories else "unknown",
                "confidence": 0.5,
                "reasoning": f"Error: {str(e)}"
            }
    
    async def get_embeddings(self, texts: List[str]) -> Optional[List[List[float]]]:
        """
        Obtenir les embeddings pour une liste de textes
        
        Args:
            texts: Liste des textes à vectoriser
            
        Returns:
            Liste d'embeddings ou None si erreur
        """
        if not self.is_available():
            return None
            
        try:
            response = self.client.embeddings(
                model=settings.MISTRAL_EMBED_MODEL,
                input=texts
            )
            
            return [data.embedding for data in response.data]
            
        except Exception as e:
            logger.error(f"Error getting embeddings from Mistral: {e}")
            return None


# Instance globale du client
mistral_client = MistralAIClient()
