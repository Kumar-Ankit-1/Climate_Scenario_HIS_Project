"""
Bot Module - Contains helper utilities for the chatbot backend
"""

from datetime import datetime


def format_timestamp():
    """Get current timestamp"""
    return datetime.now().isoformat()


def validate_input(text: str, min_length: int = 1, max_length: int = 5000) -> bool:
    """Validate user input"""
    if not text or not isinstance(text, str):
        return False
    if len(text.strip()) < min_length or len(text) > max_length:
        return False
    return True
