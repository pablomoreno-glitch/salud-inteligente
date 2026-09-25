def build_description(name: str, benefits: list[str]) -> str:
    """Build a plain sentence from the product name and benefits.

    Used only when the admin has not written a custom description. Never adds
    any claim beyond what is already listed in ``benefits``.
    """
    clean_benefits = [b.strip() for b in benefits if b and b.strip()]
    if not clean_benefits:
        return f"{name}."

    return f"{name}: {'; '.join(_lower_first(b) for b in clean_benefits)}."


def _lower_first(text: str) -> str:
    """Lowercase the first letter to continue the sentence, but keep acronyms such as NAD+ or FOS."""
    first_word = text.split()[0]
    if len(first_word) > 1 and first_word[1].isupper():
        return text
    return text[0].lower() + text[1:]
