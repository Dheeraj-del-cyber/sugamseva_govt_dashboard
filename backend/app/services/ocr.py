"""
OCR service - PaddleOCR document field extraction
---------------------------------------------------
In production, install `paddleocr` + `paddlepaddle` and run the scanned
card image through PPOCR to pull out the ID number / name / DOB fields,
then cross-check them against government verification rules. Those
model weights are large, so this file simulates extraction in DEMO_MODE
to keep the project lightweight; swap in the real call marked below.
"""
import random
import string

from app.config import settings


def extract_text_from_document(image_ref: str, doc_type: str) -> dict:
    if settings.DEMO_MODE:
        fake_id = "".join(random.choices(string.digits, k=10))
        return {"doc_type": doc_type, "id_number": fake_id, "confidence": 0.91}

    # Real implementation, once paddleocr is installed:
    #
    # from paddleocr import PaddleOCR
    # ocr = PaddleOCR(use_angle_cls=True, lang="en")
    # result = ocr.ocr(image_ref, cls=True)
    # text_lines = [line[1][0] for block in result for line in block]
    # id_number = _extract_id_number(text_lines, doc_type)
    # return {"doc_type": doc_type, "id_number": id_number, "confidence": 0.0}
    raise NotImplementedError("Install paddleocr and wire up real extraction.")
