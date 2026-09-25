import unicodedata


def normalize(text: str) -> str:
    """Lowercase and strip accents so search works the same on Postgres and SQLite."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return without_accents.lower()
