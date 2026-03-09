import cv2
import numpy as np
from PIL import Image


def _load_image(file_path: str) -> np.ndarray:
    ext = file_path.lower().rsplit(".", 1)[-1]

    if ext in ("jpg", "jpeg", "png", "tiff", "tif", "bmp"):
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError(f"Could not read image: {file_path}")
        return image

    pil_image = Image.open(file_path)
    pil_image.load()
    return cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)


def _deskew(image: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(image < 127))

    if coords.size == 0:
        return image

    angle = cv2.minAreaRect(coords)[-1]

    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.5:
        return image

    (h, w) = image.shape[:2]
    centre = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(centre, angle, scale=1.0)

    return cv2.warpAffine(
        image, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def preprocess(file_path: str) -> Image.Image:
    # Stage 1: Grayscale
    raw = _load_image(file_path)
    gray = cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY)

    # Stage 2: Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # Stage 3: Adaptive threshold
    binary = cv2.adaptiveThreshold(
        denoised,
        maxValue=255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        thresholdType=cv2.THRESH_BINARY,
        blockSize=11,
        C=2,
    )

    # Stage 4: Deskew
    clean = _deskew(binary)

    return Image.fromarray(clean)
