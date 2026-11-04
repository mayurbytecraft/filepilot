# FilePilot

**A free, browser-based file conversion toolkit built with Next.js.**

FilePilot makes it easy to convert, merge, split, and optimize files through a simple web interface.

## ✨ Features

### Image Tools
- Convert PNG, JPG, and WebP images.
- Batch image conversion.
- Adjust image quality.
- Download converted files individually or as a ZIP archive.
- Convert images into PDF documents.
- Choose A4, Letter, or original image dimensions for PDF output.

### PDF Tools
- Convert PDF pages into JPG images.
- Convert PDF pages into PNG images.
- Process multi-page PDFs.
- Download individual page images or all pages as a ZIP.
- Merge multiple PDF files.
- Extract a selected page range from a PDF.
- Basic PDF optimization.
- Strong PDF compression using image-based reconstruction.

**Note:** Strong PDF compression rasterizes pages. Text may no longer be selectable or searchable. Compression results depend on the original document.

## 🛠️ Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- JavaScript
- PDF.js
- pdf-lib
- jsPDF
- JSZip

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/mayurbytecraft/filepilot.git
```

Navigate to the project:

```bash
cd filepilot
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```text
filepilot/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
│   └── pdf.worker.min.mjs
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## 🗺️ Roadmap

- [ ] Additional image formats.
- [ ] More PDF editing and optimization options.
- [ ] Document format conversions.
- [ ] Spreadsheet and data conversions.
- [ ] Audio and video conversions.
- [ ] Archive extraction and creation.
- [ ] Improved conversion performance.
- [ ] Deployment and production optimization.

## 🔒 Privacy

FilePilot is designed with a focus on simple file processing and user privacy. Review the implementation of each tool before relying on it for sensitive documents.

## 🤝 Contributing

Contributions, suggestions, bug reports, and feature requests are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request.

## 📄 License

A license has not yet been selected. Until one is added, the repository remains subject to the default copyright rules.

---

**Built with ❤️ by [Mayur](https://github.com/mayurbytecraft)**

GitHub: https://github.com/mayurbytecraft/filepilot