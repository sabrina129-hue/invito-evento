from pathlib import Path

from PIL import Image
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "cartoncino-qr-foto-sfondo-invito.pdf"
BACKGROUND_FILE = ROOT / "public" / "images" / "sfondo-stelle-natale-beige-sfoltito.png"

PHOTO_URL = "https://invito-gina-angelo.vercel.app/#/foto"

PAGE_SIZE = 120 * mm
BLEED_SAFE = 7 * mm

MAROON = colors.HexColor("#7f171f")
GOLD = colors.HexColor("#c79a3b")
CREAM = colors.HexColor("#fff8f1")
WARM_TEXT = colors.HexColor("#4b0d14")
MUTED_GOLD = colors.HexColor("#97681f")


def draw_centered_text(pdf, text, y, font_name, font_size, color, max_width=None):
    pdf.setFillColor(color)
    pdf.setFont(font_name, font_size)
    if max_width is not None:
        while pdf.stringWidth(text, font_name, font_size) > max_width and font_size > 6:
            font_size -= 0.5
            pdf.setFont(font_name, font_size)
    pdf.drawCentredString(PAGE_SIZE / 2, y, text)


def draw_wrapped_centered_text(pdf, lines, y, font_name, font_size, color, leading):
    pdf.setFillColor(color)
    pdf.setFont(font_name, font_size)
    for index, line in enumerate(lines):
        pdf.drawCentredString(PAGE_SIZE / 2, y - index * leading, line)


def background_reader():
    image = Image.open(BACKGROUND_FILE).convert("RGB")
    width, height = image.size
    crop_size = min(width, height)
    left = (width - crop_size) // 2
    top = height - crop_size
    square = image.crop((left, top, left + crop_size, top + crop_size)).resize((1800, 1800), Image.LANCZOS)
    cream_overlay = Image.new("RGB", square.size, (255, 248, 241))
    square = Image.blend(square, cream_overlay, 0.04)
    return ImageReader(square)


def draw_qr(pdf, value, x, y, size):
    qr = QrCodeWidget(value)
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)


def draw_corner_flourish(pdf, x, y, sx=1, sy=1):
    pdf.saveState()
    pdf.translate(x, y)
    pdf.scale(sx, sy)
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.8)
    pdf.bezier(0, 0, 6 * mm, 2 * mm, 7 * mm, 7 * mm, 10 * mm, 10 * mm)
    pdf.bezier(3 * mm, 1 * mm, 7 * mm, 0, 10 * mm, 3 * mm, 13 * mm, 5 * mm)
    pdf.setFillColor(MAROON)
    pdf.circle(10 * mm, 10 * mm, 1.1 * mm, stroke=0, fill=1)
    pdf.setFillColor(GOLD)
    pdf.circle(13 * mm, 5 * mm, 0.8 * mm, stroke=0, fill=1)
    pdf.restoreState()


def generate():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(OUTPUT_FILE), pagesize=(PAGE_SIZE, PAGE_SIZE))
    pdf.setTitle("Cartoncino QR foto matrimonio Luigia e Angelo - sfondo invito")
    pdf.setAuthor("Luigia e Angelo")

    pdf.drawImage(background_reader(), 0, 0, width=PAGE_SIZE, height=PAGE_SIZE)

    pdf.setStrokeColor(MAROON)
    pdf.setLineWidth(1.7)
    pdf.rect(3.5 * mm, 3.5 * mm, PAGE_SIZE - 7 * mm, PAGE_SIZE - 7 * mm, stroke=1, fill=0)

    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.75)
    pdf.rect(7.5 * mm, 7.5 * mm, PAGE_SIZE - 15 * mm, PAGE_SIZE - 15 * mm, stroke=1, fill=0)

    draw_centered_text(pdf, "Luigia & Angelo", PAGE_SIZE - 21 * mm, "Times-Roman", 23.5, MAROON, PAGE_SIZE - 30 * mm)
    draw_centered_text(pdf, "20 Dicembre 2026", PAGE_SIZE - 30 * mm, "Times-Bold", 9.5, MUTED_GOLD)

    draw_centered_text(pdf, "Condividi una foto!", PAGE_SIZE - 43 * mm, "Times-Bold", 14.8, WARM_TEXT)
    draw_wrapped_centered_text(
        pdf,
        [
            "Aiutateci a raccogliere ogni sorriso:",
            "scansionate il QR e lasciate agli sposi",
            "una foto, un dettaglio, un ricordo.",
        ],
        PAGE_SIZE - 49 * mm,
        "Helvetica",
        7.6,
        WARM_TEXT,
        4.4 * mm,
    )

    qr_size = 36 * mm
    qr_x = (PAGE_SIZE - qr_size) / 2
    qr_y = 13 * mm

    pdf.setFillColor(colors.white)
    pdf.roundRect(qr_x - 5 * mm, qr_y - 5 * mm, qr_size + 10 * mm, qr_size + 10 * mm, 3.5 * mm, stroke=0, fill=1)
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.8)
    pdf.roundRect(qr_x - 5 * mm, qr_y - 5 * mm, qr_size + 10 * mm, qr_size + 10 * mm, 3.5 * mm, stroke=1, fill=0)
    draw_qr(pdf, PHOTO_URL, qr_x, qr_y, qr_size)

    pdf.showPage()
    pdf.save()
    print(OUTPUT_FILE)


if __name__ == "__main__":
    generate()
