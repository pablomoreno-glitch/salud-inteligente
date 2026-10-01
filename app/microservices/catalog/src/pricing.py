def real_margin_percent(cost: int | None, price: int | None) -> float | None:
    """Profit over the supplier cost, in percent: (sale - cost) / cost."""
    if not cost or not price:
        return None
    return round((price - cost) / cost * 100, 1)
