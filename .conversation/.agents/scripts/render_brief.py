from pathlib import Path
import fitz

pdf_path = Path("attached_assets/Brief_Website_Kirimmobil_com_Tim_IT_1792799669936.pdf")
out_dir = Path(".agents/outputs/brief_pages")
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False)
    output = out_dir / f"page-{index + 1:02}.png"
    pix.save(output)
    print(output)

asset_dir = Path(".agents/outputs/brief_assets")
asset_dir.mkdir(parents=True, exist_ok=True)
for page_index, page in enumerate(doc):
    for image_index, image in enumerate(page.get_images(full=True)):
        extracted = doc.extract_image(image[0])
        output = asset_dir / f"page-{page_index + 1:02}-image-{image_index + 1:02}.{extracted['ext']}"
        output.write_bytes(extracted["image"])
        print(output)
