"""
LLM Service for AI-powered insights using Groq API
"""
import os
from groq import Groq
from typing import Dict, Any
from prompts.insights import get_prompt, SYSTEM_PROMPT


class LLMService:
    """Service for generating AI insights using Groq API"""

    def __init__(self):
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key or api_key.startswith('gsk_') == False:
            print("Warning: GROQ_API_KEY not found or invalid. AI insights will be disabled.")
            self.client = None
        else:
            self.client = Groq(api_key=api_key)
            print("GROQ API key loaded successfully. AI insights enabled.")

    def generate_insight(
        self,
        prompt_type: str,
        context: Dict[str, Any],
        model: str = "llama-3.3-70b-versatile"
    ) -> str:
        """
        Generate an AI insight based on the prompt type and context.

        Args:
            prompt_type: Type of insight to generate
            context: Data context for the prompt
            model: Groq model to use

        Returns:
            Generated insight text
        """
        if not self.client:
            return "AI insights are not available. Please configure GROQ_API_KEY."

        try:
            prompt = get_prompt(prompt_type, **context)

            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1024
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating insight: {str(e)}"


# Global LLM service instance
_llm_service: LLMService = None


def get_llm_service() -> LLMService:
    """Get or create global LLM service instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
