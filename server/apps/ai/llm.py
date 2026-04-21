from django.conf import settings
from langchain_groq import ChatGroq


def get_llm(temperature: float = 0.7, max_tokens: int = 1024) -> ChatGroq:
    return ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
        max_retries=2,
    )
