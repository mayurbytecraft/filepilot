# FilePilot — Project Status

Last updated: 10 November 2026

## Project overview

FilePilot is a browser-based file conversion toolkit built with Next.js, React, TypeScript and Tailwind CSS. The project is developed locally on Linux Mint and version-controlled on GitHub.

Repository: https://github.com/mayurbytecraft/filepilot

## Development environment

- Next.js 16.4.3
- React / TypeScript
- Tailwind CSS
- Local development command: `npm run dev`
- Local URL: http://localhost:3000

## Dependencies currently used

- `jszip` — ZIP downloads
- `jspdf` — PDF creation
- `pdfjs-dist` — PDF page rendering and image conversion
- `pdf-lib` — PDF merging, splitting and basic optimization

Check `package.json` before adding or removing dependencies.

## Implemented features

The user has tested and confirmed these features working.

### Image tools
- PNG, JPG and WebP conversion
- Batch image conversion
- Image quality control
- Individual downloads and ZIP download
- Images to PDF
- A4, Letter and original image dimensions

### PDF tools
- PDF pages to JPG
- PDF pages to PNG
- Multi-page PDF processing
- Individual page downloads and ZIP download
- Merge multiple PDFs
- Split every page into individual PDFs
- Extract a selected page range into one PDF
- Basic PDF optimization
- Strong, image-based PDF compression with an adaptive retry

## PDF compression limitations

- Basic optimization uses `pdf-lib` object streams. It preserves page content in ordinary cases but may not reduce file size.
- Strong compression renders pages to JPEG images and rebuilds the PDF. It can remove selectable/searchable text and may reduce quality.
- Adaptive retry attempts a lower-resolution/lower-quality render if the first output is not smaller.
- The app keeps the original file if no generated output is smaller.
- This is not true embedded-image optimization. Do not describe it as lossless or as preserving all text in strong mode.

## Privacy and processing

The current image and PDF processing paths run in the browser. The page's About section states that implemented image and PDF tools process files locally rather than uploading them to a conversion server. Re-check this statement if server-side processing is introduced.

## Current source

- Main application: `app/page.tsx`
- PDF.js worker: `public/pdf.worker.min.mjs`
- Project metadata and dependencies: `package.json`

The latest `app/page.tsx` was updated with adaptive PDF compression and the user confirmed it works locally. The latest update's GitHub commit/push status has not yet been confirmed.

## Git workflow

Project directory:

```bash
cd ~/Projects/filepilot
```

Check working tree:

```bash
git status
```

After a feature is tested:

```bash
git add .
git commit -m "Describe the completed feature"
git push
```

Do not overwrite the user's working source without first using their latest `app/page.tsx`.

## Next development milestones

1. Create and test a document-conversion module.
2. Add spreadsheet/data conversions (XLSX, CSV, JSON) with clear format and fidelity limitations.
3. Add ZIP archive creation and extraction.
4. Evaluate browser-compatible audio conversion.
5. Evaluate browser-compatible video conversion; consider WebAssembly/FFmpeg and performance constraints.
6. Improve validation, error handling, accessibility and responsive UI.
7. Add real application screenshots and update README.
8. Run production build and tests; deploy when ready.

## Immediate next task: document conversions

Start with small, realistic browser-side conversions and test each independently.

Suggested first tasks:
- DOCX to TXT: extract document text in the browser.
- TXT to PDF: create a PDF from plain text.
- DOCX to PDF: investigate a browser-side rendering approach and clearly document layout limitations.
- PDF to DOCX: treat as a later, best-effort conversion because PDF layout reconstruction is not reliably lossless.

Before implementation:
- Inspect the latest `app/page.tsx` and `package.json`.
- Agree on supported input/output formats and user-facing limitations.
- Add one conversion at a time.
- Preserve all existing image and PDF features.
- Test with several real files before marking a feature complete.

## Working rules

- Do not claim a format is supported until it is implemented and tested.
- Do not silently rasterize documents when users expect editable text.
- Never overwrite the original file when a conversion or compression result is larger or invalid.
- Prefer small changes over rewriting the whole application.
- Update this document when features, dependencies or known limitations change.
