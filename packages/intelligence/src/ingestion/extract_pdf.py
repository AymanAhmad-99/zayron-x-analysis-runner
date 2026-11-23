#!/usr/bin/env python3
"""
PDF page extractor for the universal book ingestion pipeline.

Invoked by extractFromPdf() in universal_book_pipeline.ts:
    python extract_pdf.py <file.pdf>
Outputs a JSON array on stdout: [{"page": <1-based page number>, "text": "<page text>"}]
Requires: pypdf
"""

import json
import sys


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: extract_pdf.py <file.pdf>", file=sys.stderr)
        sys.exit(2)

    pdf_path = sys.argv[1]
    try:
        from pypdf import PdfReader
    except ImportError:
        print("error: pypdf is required (pip install pypdf)", file=sys.stderr)
        sys.exit(1)

    reader = PdfReader(pdf_path)
    pages = []
    for index, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception:  # noqa: BLE001 - a corrupt page must not abort extraction
            text = ""
        pages.append({"page": index + 1, "text": text})

    json.dump(pages, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
