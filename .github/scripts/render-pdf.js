#!/usr/bin/env node
/**
 * Renders the built /print page to a PDF using Chromium's own print engine.
 *
 * Why not html2pdf.js / html2canvas: those paint the DOM onto a <canvas> and
 * wrap the resulting bitmap in a PDF. The output looks identical to a human
 * and is completely empty to a machine — no text layer, so every applicant
 * tracking system scores it as a blank document. Chromium's print pipeline
 * keeps real, selectable, searchable text.
 */

const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");
const { chromium } = require("playwright");

const SITE_DIR = path.resolve(__dirname, "../../_site");
const OUT_FILE = path.join(SITE_DIR, "Sukanth_Gunda_Resume.pdf");
const PORT = 8099;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const candidates = [
    path.join(SITE_DIR, clean),
    path.join(SITE_DIR, `${clean}.html`),
    path.join(SITE_DIR, clean, "index.html"),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(SITE_DIR + path.sep)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url === "/" ? "index.html" : req.url);
  if (!file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  if (!fs.existsSync(SITE_DIR)) {
    throw new Error(`Build output not found at ${SITE_DIR}. Run "jekyll build" first.`);
  }

  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // The print stylesheet forces Arial, so the Google Fonts request cannot
    // affect the PDF — it only makes `networkidle` depend on an external host.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    // page.pdf() already forces print emulation; this makes the same rules
    // apply to any debug screenshot taken from this page too.
    await page.emulateMedia({ media: "print" });

    const response = await page.goto(`http://127.0.0.1:${PORT}/print`, {
      waitUntil: "networkidle",
    });
    if (!response || !response.ok()) {
      throw new Error(`Could not load /print (status ${response && response.status()})`);
    }

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    // Page size and margins come from `@page` in _sass/_print.scss, which
    // `preferCSSPageSize` makes authoritative. Setting `format` or `margin`
    // here as well would be silently ignored, so they are deliberately absent:
    // there is exactly one place to change the paper size.
    await page.pdf({
      path: OUT_FILE,
      printBackground: true,
      preferCSSPageSize: true,
    });

    const { size } = fs.statSync(OUT_FILE);
    console.log(`Wrote ${OUT_FILE} (${Math.round(size / 1024)} KB)`);
  } finally {
    await browser.close();
    // close() alone leaves idle keep-alive sockets holding the event loop open.
    server.closeAllConnections?.();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
