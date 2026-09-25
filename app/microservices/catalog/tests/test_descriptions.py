from src.descriptions import build_description


def test_description_continues_the_sentence_in_lowercase():
    text = build_description("Magnesio", ["Reduce el estrés", "Mejora el sueño"])
    assert text == "Magnesio: reduce el estrés; mejora el sueño."


def test_description_keeps_acronyms_intact():
    text = build_description("Combo 1", ["NAD+ Resveratrol liposomal", "FOS y zinc"])
    assert text == "Combo 1: NAD+ Resveratrol liposomal; FOS y zinc."


def test_description_without_benefits_is_the_name():
    assert build_description("Silimarina", []) == "Silimarina."
