import pytesseract
from PIL import Image

TESSERACT_CONFIG = "--oem 3 --psm 6"


def run_ocr(image: Image.Image) -> str:
    text = pytesseract.image_to_string(image, config=TESSERACT_CONFIG)
    return text.strip()
