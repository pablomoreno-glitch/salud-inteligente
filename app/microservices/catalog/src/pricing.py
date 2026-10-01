import math

DEFAULT_MARGIN_PERCENT = 40
ROUND_TO = 500  # pesos: prices end in 000 or 500


def sale_price(cost: int | None, margin_percent: int) -> int | None:
    """Our selling price: supplier cost plus the fixed margin, rounded up to the next $500."""
    if not cost:
        return None
    return int(math.ceil(cost * (1 + margin_percent / 100) / ROUND_TO) * ROUND_TO)


def real_margin_percent(cost: int | None, price: int | None) -> float | None:
    if not cost or not price:
        return None
    return round((price - cost) / cost * 100, 1)
