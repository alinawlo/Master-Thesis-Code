import os
import json
import pandas as pd
from typing import List, Dict, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types
from tavily import TavilyClient

load_dotenv()

class DigitalReformAnalyst:
    """
    Digital Reform Analyst Agent
    Manages the automated pipeline for digital government reform tracking.
    """
    
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        self.master_csv_path = "data/master_reforms.csv"
        self.taxonomy = [
            "Digital Infrastructure",
            "Digital Administration (E-Government)",
            "Data Policy & Privacy",
            "Digital Education & Skills",
            "Cybersecurity",
            "Innovation & Emerging Tech (AI, etc.)",
            "Legal Framework & Regulation"
        ]

    def extract_proposals(self, text: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Step 1: Extract specific reform proposals from ingested document."""
        prompt = f"""
        Extract all explicit digital government reform proposals from the following text.
        For each proposal, provide:
        - quotation: The exact verbatim text from the document.
        - goal: A short summary of the intended outcome.
        - responsible_entity: The organization or body responsible for implementation.
        - page_number: The page where this was found.
        
        Text: {text.get('content', '')}
        """
        
        response = self.client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "proposals": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "quotation": {"type": "STRING"},
                                    "goal": {"type": "STRING"},
                                    "responsible_entity": {"type": "STRING"},
                                    "page_number": {"type": "STRING"}
                                },
                                "required": ["quotation", "goal", "responsible_entity"]
                            }
                        }
                    }
                }
            )
        )
        return json.loads(response.text).get("proposals", [])

    def cross_reference(self, proposals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Step 2: Cross-reference with Master CSV to avoid duplicates."""
        if not os.path.exists(self.master_csv_path):
            return proposals
            
        master_df = pd.read_csv(self.master_csv_path)
        unique_proposals = []
        
        for prop in proposals:
            # Simple fuzzy check: if goal or quotation already exists
            is_duplicate = master_df['goal'].str.contains(prop['goal'], case=False, na=False).any()
            if not is_duplicate:
                unique_proposals.append(prop)
                
        return unique_proposals

    def categorize(self, proposal: Dict[str, Any]) -> str:
        """Step 3: Categorize based on taxonomy."""
        prompt = f"""
        Categorize this reform proposal into exactly one of these categories: {', '.join(self.taxonomy)}.
        Proposal: {proposal['goal']}
        Context: {proposal['quotation']}
        """
        
        response = self.client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Return only the category name from the provided list."
            )
        )
        return response.text.strip()

    def assess_status(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Step 4: Find current implementation status and assign progress score."""
        search_query = f"Status of digital reform in Germany: {proposal['goal']} {proposal['responsible_entity']}"
        search_results = self.tavily.search(query=search_query)
        
        prompt = f"""
        Based on these search results, assess the implementation status of this reform.
        Assign a progress score (0-100%).
        
        Reform: {proposal['goal']}
        Results: {json.dumps(search_results)}
        """
        
        response = self.client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "status": {"type": "STRING", "enum": ["Planned", "In Progress", "Completed", "Unknown"]},
                        "progress_score": {"type": "INTEGER"},
                        "evidence": {"type": "STRING"}
                    },
                    "required": ["status", "progress_score", "evidence"]
                }
            )
        )
        status_data = json.loads(response.text)
        proposal.update(status_data)
        return proposal

    def run_pipeline(self, document_data: Dict[str, Any]) -> str:
        """Main execution loop for n8n integration."""
        # 1. Extract
        proposals = self.extract_proposals(document_data)
        
        # 2. De-duplicate
        unique_proposals = self.cross_reference(proposals)
        
        results = []
        for prop in unique_proposals:
            # 3. Categorize
            prop['category'] = self.categorize(prop)
            
            # 4. Assess Status (Phase 3 trigger)
            prop = self.assess_status(prop)
            results.append(prop)
            
        # Final Output Constraint: Structured JSON
        return json.dumps(results, indent=2)

if __name__ == "__main__":
    # Example usage for n8n Execute Command node
    import sys
    if len(sys.argv) > 1:
        input_json = json.loads(sys.argv[1])
        analyst = DigitalReformAnalyst()
        print(analyst.run_pipeline(input_json))
