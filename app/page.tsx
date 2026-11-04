
"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

const categories = [
  { icon: "🖼️", name: "Image", formats: "JPG, PNG, WebP, SVG" },
  { icon: "📄", name: "PDF & Documents", formats: "PDF, DOCX, TXT" },
  { icon: "🎵", name: "Audio", formats: "MP3, WAV, FLAC, AAC" },
  { icon: "🎬", name: "Video", formats: "MP4, MOV, WebM, AVI" },
  { icon: "📊", name: "Spreadsheets", formats: "XLSX, CSV, JSON" },
  { icon: "📦", name: "Archives", formats: "ZIP, TAR, 7Z" },
];

const formats = [
  "PDF", "DOCX", "TXT", "JPG", "PNG", "WEBP",
  "SVG", "MP3", "WAV", "MP4", "WEBM", "XLSX",
  "CSV", "JSON", "XML", "ZIP",
];

const imageFormats = ["PNG", "JPG", "WEBP"];

const mimeTypes: Record<string, string> = {
  PNG: "image/png",
  JPG: "image/jpeg",
  WEBP: "image/webp",
};

const supportedImageTypes = Object.values(mimeTypes);
const supportedPdfType = "application/pdf";

function isPdfFile(file: File) {
  return file.type === supportedPdfType || file.name.toLowerCase().endsWith(".pdf");
}

type ConversionResult = {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  size: number;
};

function ImagePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100">
        🖼️
      </div>
    );
  }

  return (
    <img
      src={preview}
      alt={file.name}
      className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
    />
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("JPG");
  const [quality, setQuality] = useState(92);
  const [pageSize, setPageSize] = useState("a4");
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zipDownloading, setZipDownloading] = useState(false);
  const [splitMode, setSplitMode] = useState("each");
  const [startPageInput, setStartPageInput] = useState("1");
  const [endPageInput, setEndPageInput] = useState("1");
  const [compressionMode, setCompressionMode] = useState("basic");
  const [compressionQuality, setCompressionQuality] = useState(60);

  const isPdfInput = files.length > 0 && isPdfFile(files[0]);
  const availableFormats = files.length > 0
    ? isPdfInput ? ["JPG", "PNG"] : ["PDF", ...imageFormats]
    : formats;

  useEffect(() => {
    return () => {
      results.forEach((result) => URL.revokeObjectURL(result.url));
    };
  }, [results]);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function addFiles(selectedFiles: FileList | File[]) {
    const incoming = Array.from(selectedFiles);
    const validFiles = incoming.filter(
      (file) => supportedImageTypes.includes(file.type) || isPdfFile(file)
    );
    const invalidCount = incoming.length - validFiles.length;

    if (invalidCount > 0) {
      setError(`${invalidCount} unsupported file(s) skipped. Select PNG, JPG, WebP or PDF files.`);
    } else {
      setError("");
    }

    if (validFiles.length === 0) return;

    const incomingIsPdf = isPdfFile(validFiles[0]);
    const mixedIncoming = validFiles.some((file) => isPdfFile(file) !== incomingIsPdf);
    const existingIsPdf = files.length > 0 && isPdfFile(files[0]);

    if (mixedIncoming || (files.length > 0 && existingIsPdf !== incomingIsPdf)) {
      setError("Please add PDFs and images in separate batches. Clear the current files before switching file types.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFiles((previous) => {
      const combined = [...previous];
      validFiles.forEach((file) => {
        const duplicate = combined.some(
          (existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified
        );
        if (!duplicate) combined.push(file);
      });
      return combined;
    });

    setFormat(incomingIsPdf ? "JPG" : "JPG");
    setResults([]);
    setSuccess("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((previous) => previous.filter((_, i) => i !== index));
    setResults([]);
    setSuccess("");
  }

  function moveFile(index: number, direction: number) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= files.length) return;

    setFiles((previous) => {
      const updated = [...previous];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });

    setResults([]);
    setSuccess("");
    setError("");
  }

  function clearFiles() {
    setFiles([]);
    setResults([]);
    setError("");
    setSuccess("");
    setProgress(0);

    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function convertSingleImage(
    file: File,
    outputFormat: string
  ): Promise<ConversionResult> {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) throw new Error("Could not create image canvas.");

      if (outputFormat === "JPG") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Image conversion failed."));
          },
          mimeTypes[outputFormat],
          quality / 100
        );
      });

      if (blob.type !== mimeTypes[outputFormat]) {
        throw new Error("Unsupported output format in this browser.");
      }

      const originalName = file.name.replace(/\.[^/.]+$/, "");
      const extension = outputFormat.toLowerCase();

      return {
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        name: `${originalName}.${extension}`,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
      };
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function convertImages() {
    if (files.length === 0) return;

    if (!mimeTypes[format]) {
      setError("Please select a supported image output format.");
      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    const converted: ConversionResult[] = [];
    const failed: string[] = [];

    for (let index = 0; index < files.length; index++) {
      try {
        converted.push(
          await convertSingleImage(files[index], format)
        );
      } catch {
        failed.push(files[index].name);
      }

      setProgress(Math.round(((index + 1) / files.length) * 100));
    }

    setResults(converted);
    setConverting(false);

    if (converted.length > 0 && failed.length === 0) {
      setSuccess(`Successfully converted all ${converted.length} images!`);
    } else if (converted.length > 0) {
      setSuccess(`Converted ${converted.length} images. ${failed.length} failed.`);
      setError(`Failed files: ${failed.join(", ")}`);
    } else {
      setError("All conversions failed. Please try different images.");
    }
  }

  async function convertPdfToImages() {
    if (files.length === 0) return;
    if (format !== "JPG" && format !== "PNG") {
      setError("Please select JPG or PNG as the output format.");
      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    const converted: ConversionResult[] = [];
    const failed: string[] = [];
    let completedPages = 0;
    let totalPages = 0;

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const documents = [];
      for (const file of files) {
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const pdf = await pdfjsLib.getDocument({ data }).promise;
          documents.push({ file, pdf });
          totalPages += pdf.numPages;
        } catch {
          failed.push(file.name);
        }
      }

      if (totalPages === 0) {
        throw new Error("No readable PDF pages were found. Check that your PDF files are valid and not password-protected.");
      }

      for (const documentItem of documents) {
        const baseName = documentItem.file.name.replace(/\.pdf$/i, "");

        for (let pageNumber = 1; pageNumber <= documentItem.pdf.numPages; pageNumber++) {
          try {
            const page = await documentItem.pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Could not create a canvas for PDF rendering.");

            await page.render({
  canvas,
  canvasContext: context,
  viewport,
}).promise;

            const blob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (result) => result ? resolve(result) : reject(new Error("Could not create the image file.")),
                mimeTypes[format],
                quality / 100
              );
            });

            const extension = format.toLowerCase();
            const name = `${baseName}-page-${pageNumber}.${extension}`;
            converted.push({
              id: `${documentItem.file.name}-${pageNumber}-${Date.now()}`,
              name,
              blob,
              url: URL.createObjectURL(blob),
              size: blob.size,
            });
            page.cleanup();
          } catch {
            failed.push(`${documentItem.file.name} (page ${pageNumber})`);
          }

          completedPages++;
          setProgress(Math.round((completedPages / totalPages) * 100));
        }
        await documentItem.pdf.cleanup();
      }

      setResults(converted);
      if (converted.length > 0 && failed.length === 0) {
        setSuccess(`Successfully converted ${converted.length} PDF page(s) to ${format}!`);
      } else if (converted.length > 0) {
        setSuccess(`Converted ${converted.length} page(s). ${failed.length} file(s) or page(s) could not be processed.`);
        setError(`Could not process: ${failed.join(", ")}`);
      } else {
        setError(`PDF conversion failed. ${failed.length ? `Could not process: ${failed.join(", ")}` : "Please try another PDF."}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF conversion failed.");
    } finally {
      setConverting(false);
    }
  }

  async function mergePdfFiles() {
    if (!isPdfInput || files.length < 2) {
      setError("Please select at least two PDF files to merge.");
      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const sourcePdf = await PDFDocument.load(await file.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

        copiedPages.forEach((page) => mergedPdf.addPage(page));
        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      if (mergedPdf.getPageCount() === 0) {
        throw new Error("No pages were found in the selected PDF files.");
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const result: ConversionResult = {
        id: `merged-pdf-${Date.now()}`,
        name: "filepilot-merged.pdf",
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
      };

      setResults([result]);
      setSuccess(`Successfully merged ${files.length} PDF files into one document containing ${mergedPdf.getPageCount()} pages!`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Password-protected PDFs may need to be unlocked first.`
          : "PDF merging failed. Please check your files."
      );
    } finally {
      setConverting(false);
    }
  }

  async function splitPdfFile() {
    if (!isPdfInput || files.length !== 1) {
      setError("Please select exactly one PDF file to split.");
      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    const createdResults: ConversionResult[] = [];

    try {
      const sourceBytes = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const totalPages = sourcePdf.getPageCount();

      if (totalPages === 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      const baseName = files[0].name.replace(/\.pdf$/i, "");

      if (splitMode === "range") {
        const startPage = Number(startPageInput);
        const endPage = Number(endPageInput);

        if (
          startPageInput.trim() === "" ||
          endPageInput.trim() === "" ||
          !Number.isInteger(startPage) ||
          !Number.isInteger(endPage)
        ) {
          throw new Error("Enter a whole number for both the first and last page.");
        }

        if (
          !Number.isInteger(startPage) ||
          !Number.isInteger(endPage) ||
          startPage < 1 ||
          endPage > totalPages ||
          startPage > endPage
        ) {
          throw new Error(`Enter a valid range between page 1 and page ${totalPages}.`);
        }

        const outputPdf = await PDFDocument.create();
        const pageIndices = Array.from(
          { length: endPage - startPage + 1 },
          (_, index) => startPage - 1 + index
        );
        const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => outputPdf.addPage(page));

        const bytes = await outputPdf.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], {
          type: "application/pdf",
        });

        createdResults.push({
          id: `split-range-${Date.now()}`,
          name: `${baseName}-pages-${startPage}-to-${endPage}.pdf`,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
        setProgress(100);
        setSuccess(`Successfully extracted pages ${startPage}–${endPage} into a new PDF.`);
      } else {
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const outputPdf = await PDFDocument.create();
          const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageIndex]);
          outputPdf.addPage(copiedPage);

          const bytes = await outputPdf.save();
          const blob = new Blob([bytes.buffer as ArrayBuffer], {
            type: "application/pdf",
          });

          createdResults.push({
            id: `split-page-${pageIndex + 1}-${Date.now()}`,
            name: `${baseName}-page-${pageIndex + 1}.pdf`,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
          });

          setProgress(Math.round(((pageIndex + 1) / totalPages) * 100));
        }
        setSuccess(`Successfully split the PDF into ${totalPages} individual PDF files.`);
      }

      setResults(createdResults);
    } catch (err) {
      createdResults.forEach((result) => URL.revokeObjectURL(result.url));
      setError(
        err instanceof Error
          ? err.message
          : "PDF splitting failed. Please check that the file is a valid, unlocked PDF."
      );
    } finally {
      setConverting(false);
    }
  }

  async function compressPdfFile() {
    if (!isPdfInput || files.length !== 1) {
      setError("Please select exactly one PDF file to compress.");
      return;
    }

    const sourceFile = files[0];
    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    try {
      let compressedBlob: Blob;
      const baseName = sourceFile.name.replace(/\.pdf$/i, "");

      if (compressionMode === "basic") {
        const sourcePdf = await PDFDocument.load(await sourceFile.arrayBuffer());
        const compressedBytes = await sourcePdf.save({ useObjectStreams: true });
        const compressedBuffer = compressedBytes.buffer.slice(
          compressedBytes.byteOffset,
          compressedBytes.byteOffset + compressedBytes.byteLength
        ) as ArrayBuffer;
        compressedBlob = new Blob([compressedBuffer], { type: "application/pdf" });
        setProgress(100);
      } else {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = new Uint8Array(await sourceFile.arrayBuffer());
        const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
        const compressedPdf = new jsPDF({ unit: "mm", format: "a4", compress: true });

        try {
          for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
            const page = await pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.35 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Could not create a canvas for PDF compression.");

            await page.render({ canvas, canvasContext: context, viewport }).promise;
            const imageData = canvas.toDataURL("image/jpeg", compressionQuality / 100);
            const pageWidthMm = (viewport.width / 1.35) * 25.4 / 72;
            const pageHeightMm = (viewport.height / 1.35) * 25.4 / 72;

            if (pageNumber > 1) {
              compressedPdf.addPage([pageWidthMm, pageHeightMm], pageWidthMm > pageHeightMm ? "landscape" : "portrait");
            } else {
              compressedPdf.deletePage(1);
              compressedPdf.addPage([pageWidthMm, pageHeightMm], pageWidthMm > pageHeightMm ? "landscape" : "portrait");
            }

            compressedPdf.addImage(imageData, "JPEG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
            page.cleanup();
            setProgress(Math.round((pageNumber / pdfDocument.numPages) * 100));
            canvas.width = 0;
            canvas.height = 0;
          }
        } finally {
          await pdfDocument.cleanup();
        }

        compressedBlob = compressedPdf.output("blob");
      }

      // Never present a larger (or same-sized) file as a successful compression.
      // Keep the original PDF whenever the generated version does not save space.
      const achievedReduction = sourceFile.size > 0
        ? (1 - compressedBlob.size / sourceFile.size) * 100
        : 0;
      const savedSpace = compressedBlob.size < sourceFile.size;

      const outputBlob = savedSpace ? compressedBlob : sourceFile;
      const outputName = savedSpace
        ? `${baseName}-compressed.pdf`
        : sourceFile.name;

      const result: ConversionResult = {
        id: `compressed-pdf-${Date.now()}`,
        name: outputName,
        blob: outputBlob,
        url: URL.createObjectURL(outputBlob),
        size: outputBlob.size,
      };
      setResults([result]);

      if (savedSpace) {
        const reduction = Math.round(achievedReduction);
        setSuccess(
          `Compression reduced the file by ${reduction}% (${formatSize(sourceFile.size)} → ${formatSize(compressedBlob.size)}).` +
          (compressionMode === "strong"
            ? " This version uses page images, so text is no longer selectable or searchable."
            : " Text and page structure are preserved.")
        );
      } else {
        const reason = compressedBlob.size > sourceFile.size
          ? `The attempted output was larger (${formatSize(compressedBlob.size)} vs ${formatSize(sourceFile.size)}).`
          : "The attempted output was the same size as the original.";
        setSuccess(
          `No useful size reduction was possible. ${reason} FilePilot kept your original PDF instead, so you won't download a larger file.` +
          (compressionMode === "strong"
            ? " Strong compression converts pages to images and may not suit text-based PDFs."
            : " Basic optimization preserves text but cannot always reduce an already-optimized PDF.")
        );
      }
    } catch (err) {
      setError(err instanceof Error ? `${err.message} The PDF may be damaged or password-protected.` : "PDF compression failed. Please try another PDF.");
    } finally {
      setConverting(false);
    }
  }

  async function convertImagesToPDF() {
    if (files.length === 0) return;

    setConverting(true);
    setError("");
    setSuccess("");
    setProgress(0);
    setResults([]);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: pageSize === "original" ? "a4" : pageSize,
        compress: true,
      });

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const imageUrl = URL.createObjectURL(file);

        try {
          const image = new Image();
          image.src = imageUrl;
          await image.decode();

          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;

          const context = canvas.getContext("2d");
          if (!context) throw new Error("Image processing failed.");

          context.drawImage(image, 0, 0);

          const imageData = canvas.toDataURL("image/jpeg", 0.95);

          if (pageSize === "original") {
            const width = (image.naturalWidth / 96) * 25.4;
            const height = (image.naturalHeight / 96) * 25.4;

            const customPdf = new jsPDF({
              orientation: width > height ? "landscape" : "portrait",
              unit: "mm",
              format: [width, height],
              compress: true,
            });

            customPdf.addImage(
              imageData,
              "JPEG",
              0,
              0,
              width,
              height
            );

            if (index === 0) {
              const firstPage = customPdf.output("arraybuffer");
              const combined = new jsPDF({
                orientation: width > height ? "landscape" : "portrait",
                unit: "mm",
                format: [width, height],
                compress: true,
              });

              combined.addImage(imageData, "JPEG", 0, 0, width, height);
              pdfPages.push({
                data: firstPage,
                width,
                height,
              });
            } else {
              pdfPages.push({
                data: customPdf.output("arraybuffer"),
                width,
                height,
              });
            }
          } else {
            if (index > 0) pdf.addPage();

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 8;

            const availableWidth = pageWidth - margin * 2;
            const availableHeight = pageHeight - margin * 2;

            const ratio = Math.min(
              availableWidth / image.naturalWidth,
              availableHeight / image.naturalHeight
            );

            const drawWidth = image.naturalWidth * ratio;
            const drawHeight = image.naturalHeight * ratio;

            const x = (pageWidth - drawWidth) / 2;
            const y = (pageHeight - drawHeight) / 2;

            pdf.addImage(
              imageData,
              "JPEG",
              x,
              y,
              drawWidth,
              drawHeight
            );
          }
        } finally {
          URL.revokeObjectURL(imageUrl);
        }

        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      if (pageSize === "original") {
        const originalPdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        pdfPages.forEach((page, index) => {
          if (index > 0) {
            originalPdf.addPage(
              [page.width, page.height],
              page.width > page.height ? "landscape" : "portrait"
            );
          } else {
            originalPdf.deletePage(1);
            originalPdf.addPage(
              [page.width, page.height],
              page.width > page.height ? "landscape" : "portrait"
            );
          }

          originalPdf.addImage(
            new Uint8Array(page.data),
            "JPEG",
            0,
            0,
            page.width,
            page.height
          );
        });

        const blob = originalPdf.output("blob");
        const url = URL.createObjectURL(blob);

        setResults([{
          id: "pdf-original",
          name: "filepilot-images.pdf",
          blob,
          url,
          size: blob.size,
        }]);
      } else {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);

        setResults([{
          id: "pdf-combined",
          name: "filepilot-images.pdf",
          blob,
          url,
          size: blob.size,
        }]);
      }

      setSuccess(
        `Successfully created a PDF containing ${files.length} image(s)!`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "PDF creation failed."
      );
    } finally {
      setConverting(false);
    }
  }

  const pdfPages: {
    data: ArrayBuffer;
    width: number;
    height: number;
  }[] = [];

  function downloadFile(result: ConversionResult) {
    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function downloadZip() {
    if (results.length === 0) return;

    setZipDownloading(true);

    try {
      const zip = new JSZip();

      results.forEach((result) => {
        zip.file(result.name, result.blob);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "filepilot-downloads.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Unable to create ZIP file.");
    } finally {
      setZipDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">F</div>
            <span className="text-2xl font-bold tracking-tight">
              File<span className="text-blue-600">Pilot</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#tools" className="hover:text-blue-600">All Tools</a>
            <a href="#how-it-works" className="hover:text-blue-600">How It Works</a>
            <a href="#about" className="hover:text-blue-600">About</a>
          </div>

          <a href="#converter" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Convert Files
          </a>
        </div>
      </nav>

      <section className="bg-gradient-to-b from-blue-50 to-white px-6 pb-16 pt-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700">
            ✨ Your all-in-one file conversion platform
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
            Convert files.
            <br />
            <span className="text-blue-600">Simplify everything.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Convert images, documents, PDFs, audio, video and more.
            Everything you need, all in one place.
          </p>
        </div>

        <div id="converter" className="mx-auto mt-12 max-w-3xl">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 transition sm:p-14 ${
              dragging ? "border-blue-600 bg-blue-50" : "border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
              }}
            />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">📁</div>

            <h2 className="mt-5 text-xl font-bold">
              {dragging ? "Drop your files here" : "Drop your files here"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Or click to browse files from your device
            </p>

            <span className="mt-6 inline-block rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white">
              Choose Files
            </span>

            <p className="mt-5 text-xs text-slate-400">
              PDF · PNG · JPG · WebP · Multiple files supported
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Selected {isPdfInput ? "PDFs" : "Images"} ({files.length})</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatSize(files.reduce((total, file) => total + file.size, 0))} total
                  </p>
                </div>

                <button onClick={clearFiles} disabled={converting} className="text-sm font-medium text-red-500">
                  Clear All
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    {isPdfFile(file) ? (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-red-50 text-3xl">📄</div>
                    ) : <ImagePreview file={file} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatSize(file.size)}</p>
                    </div>
                    {isPdfInput && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveFile(index, -1)}
                          disabled={converting || index === 0}
                          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                          title="Move up"
                          aria-label={`Move ${file.name} up`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveFile(index, 1)}
                          disabled={converting || index === files.length - 1}
                          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                          title="Move down"
                          aria-label={`Move ${file.name} down`}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <button onClick={() => removeFile(index)} disabled={converting} className="px-2 text-sm font-medium text-red-500">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold">Convert to</label>
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value);
                    setResults([]);
                    setSuccess("");
                    setError("");
                  }}
                  disabled={converting}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  {availableFormats.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              {format === "PDF" && (
                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">PDF Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(event.target.value)}
                    disabled={converting}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="original">Original image dimensions</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Each image will be placed on a separate PDF page in upload order.
                  </p>
                </div>
              )}

              {(format === "JPG" || format === "WEBP") && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Image Quality</label>
                    <span className="text-sm font-bold text-blue-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(event) => {
                      setQuality(Number(event.target.value));
                      setResults([]);
                      setSuccess("");
                    }}
                    disabled={converting}
                    className="mt-3 w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Smaller file</span>
                    <span>Higher quality</span>
                  </div>
                </div>
              )}

              <button
                onClick={isPdfInput ? convertPdfToImages : format === "PDF" ? convertImagesToPDF : convertImages}
                disabled={converting}
                className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {converting
                  ? `Converting ${progress}%...`
                  : isPdfInput
                    ? `Convert PDF${files.length > 1 ? "s" : ""} to ${format}`
                    : format === "PDF"
                      ? `Create PDF (${files.length} image${files.length > 1 ? "s" : ""})`
                      : `Convert ${files.length} Image(s)`}
              </button>

              {isPdfInput && files.length >= 2 && (
                <button
                  onClick={mergePdfFiles}
                  disabled={converting}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {converting ? `Merging ${progress}%...` : `Merge ${files.length} PDF Files`}
                </button>
              )}

              {isPdfInput && files.length === 1 && (
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">Split PDF</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a separate PDF for every page, or extract a selected page range.
                  </p>
                  <label className="mt-4 block text-sm font-medium">Split option</label>
                  <select
                    value={splitMode}
                    onChange={(event) => {
                      setSplitMode(event.target.value);
                      setResults([]);
                      setSuccess("");
                      setError("");
                    }}
                    disabled={converting}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="each">Every page into a separate PDF</option>
                    <option value="range">Extract a page range into one PDF</option>
                  </select>

                  {splitMode === "range" && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="split-start-page" className="block text-sm font-medium">From page</label>
                          <input
                            id="split-start-page"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={startPageInput}
                            onChange={(event) => {
                              setStartPageInput(event.target.value);
                              setResults([]);
                              setSuccess("");
                              setError("");
                            }}
                            disabled={converting}
                            className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="split-end-page" className="block text-sm font-medium">To page</label>
                          <input
                            id="split-end-page"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={endPageInput}
                            onChange={(event) => {
                              setEndPageInput(event.target.value);
                              setResults([]);
                              setSuccess("");
                              setError("");
                            }}
                            disabled={converting}
                            className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Example: From page 1 to page 3 creates one PDF containing pages 1, 2 and 3.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={splitPdfFile}
                    disabled={converting}
                    className="mt-4 w-full rounded-lg border border-blue-600 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {converting
                      ? `Splitting ${progress}%...`
                      : splitMode === "each"
                        ? "Split into Individual PDFs"
                        : "Extract Page Range"}
                  </button>
                </div>
              )}

              {isPdfInput && files.length === 1 && (
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">Compress PDF</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Reduce the PDF file size. Choose whether to preserve selectable text or prioritize a smaller file.
                  </p>
                  <label className="mt-4 block text-sm font-medium">Compression method</label>
                  <select
                    value={compressionMode}
                    onChange={(event) => {
                      setCompressionMode(event.target.value);
                      setResults([]);
                      setSuccess("");
                      setError("");
                    }}
                    disabled={converting}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="basic">Basic optimization (preserve text)</option>
                    <option value="strong">Strong compression (image-based PDF)</option>
                  </select>
                  {compressionMode === "basic" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Keeps selectable text and original page content. Size reduction may be small or there may be no reduction.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Image quality</label>
                        <span className="text-sm font-semibold text-blue-600">{compressionQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="85"
                        step="5"
                        value={compressionQuality}
                        onChange={(event) => {
                          setCompressionQuality(Number(event.target.value));
                          setResults([]);
                          setSuccess("");
                        }}
                        disabled={converting}
                        className="mt-3 w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Smaller file</span>
                        <span>Higher quality</span>
                      </div>
                      <p className="mt-2 text-xs text-amber-700">
                        Warning: pages become images. Text selection, search and some accessibility features will be lost.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={compressPdfFile}
                    disabled={converting}
                    className="mt-4 w-full rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {converting ? `Compressing ${progress}%...` : "Compress PDF"}
                  </button>
                </div>
              )}

              {converting && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}

              {error && <p className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
              {success && <p className="mt-4 text-sm font-medium text-green-600">{success}</p>}

              {results.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="font-bold">Converted Files</h3>

                  <div className="mt-4 space-y-3">
                    {results.map((result) => (
                      <div key={result.id} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/50 p-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-2xl">
                          📄
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{result.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatSize(result.size)}</p>
                        </div>
                        <button onClick={() => downloadFile(result)} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>

                  {results.length > 1 && (
                    <button
                      onClick={downloadZip}
                      disabled={zipDownloading}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {zipDownloading ? "Creating ZIP..." : "Download All as ZIP"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to convert</h2>
          <p className="mt-3 text-slate-500">One platform. Multiple file formats. Endless possibilities.</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.name} className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
              <div className="text-3xl">{category.icon}</div>
              <h3 className="mt-5 text-lg font-bold">{category.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{category.formats}</p>
              <a href="#converter" className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800">
                Explore conversions →
              </a>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold">Simple as 1, 2, 3</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              { number: "01", title: "Upload", desc: "Choose one or multiple files." },
              { number: "02", title: "Choose format", desc: "Select the format you need." },
              { number: "03", title: "Download", desc: "Get your converted files." },
            ].map((step) => (
              <div key={step.number}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">{step.number}</div>
                <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="text-3xl">🔒</div>
          <h2 className="mt-4 text-2xl font-bold">Your files deserve privacy</h2>
          <p className="mt-3 leading-7 text-slate-500">
Image conversions, PDF conversion, merging, splitting and compression currently happen locally in your browser without uploading your files to a conversion server.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>Copyright 2026 FilePilot. Open-source project.</p>
          <p>Convert files. Simplify everything.</p>
        </div>
      </footer>
    </main>
  );
}
