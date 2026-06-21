/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import { SEED_PRODUCTS } from "../src/data/products";
import { fetchProductsFromFirestore } from "../src/lib/firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  const slugStr = typeof slug === "string" ? slug : Array.isArray(slug) ? slug[0] : "";

  let product: any = undefined;

  if (slugStr) {
    try {
      // 1. Try to fetch from Firestore first
      const products = await fetchProductsFromFirestore();
      product = products.find((p) => p.slug === slugStr || p.id === slugStr);
    } catch (err) {
      console.error("Failed to fetch product from Firestore in Vercel API:", err);
    }

    // 2. Fallback to static SEED_PRODUCTS if not found in Firestore
    if (!product) {
      product = SEED_PRODUCTS.find((p) => p.slug === slugStr || p.id === slugStr);
    }
  }

  // 3. Read built index.html from dist/
  let html = "";
  try {
    const indexPath = path.join(process.cwd(), "dist", "index.html");
    html = fs.readFileSync(indexPath, "utf8");
  } catch (err) {
    console.error("Failed to read dist/index.html:", err);
    // Extreme fallback static shell
    html = `<!DOCTYPE html><html><head><title>JAF — Just A Friend</title></head><body><div id="root"></div></body></html>`;
  }

  // 4. Inject specific Open Graph & Twitter Card meta tags
  if (product) {
    const title = `${product.name} — JAF`;
    const desc = product.subtitle
      ? `${product.subtitle}: ${product.description}`
      : product.description;
    const image = product.images?.[0] || "https://iili.io/CxhVz4j.jpg";

    const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${desc.replace(/"/g, "&quot;")}" />
    <meta property="og:site_name" content="JAF" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta property="og:description" content="${desc.replace(/"/g, "&quot;")}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta name="twitter:description" content="${desc.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image" content="${image}" />
    `;

    // Replace default title or inject in head
    if (html.includes("<title>JAF — Just A Friend</title>")) {
      html = html.replace("<title>JAF — Just A Friend</title>", metaTags);
    } else {
      html = html.replace("<head>", `<head>${metaTags}`);
    }
  } else {
    // If no product found, inject generic website fallback tags
    const title = "JAF — Just A Friend";
    const desc =
      "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia.";
    const image = "https://iili.io/CxhVz4j.jpg";

    const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:site_name" content="JAF" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${image}" />
    `;

    if (html.includes("<title>JAF — Just A Friend</title>")) {
      html = html.replace("<title>JAF — Just A Friend</title>", metaTags);
    } else {
      html = html.replace("<head>", `<head>${metaTags}`);
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
