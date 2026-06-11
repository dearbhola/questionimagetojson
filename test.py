import pytesseract

pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

print("Version:", pytesseract.get_tesseract_version())
print("Languages:", pytesseract.get_languages(config=""))