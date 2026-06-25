/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { SEED_PRODUCTS } from "../src/data/products";

function parseFirestoreField(field: any): any {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.arrayValue && field.arrayValue.values) {
    return field.arrayValue.values.map((v: any) => parseFirestoreField(v));
  }
  if (field.mapValue && field.mapValue.fields) {
    const obj: any = {};
    for (const key in field.mapValue.fields) {
      obj[key] = parseFirestoreField(field.mapValue.fields[key]);
    }
    return obj;
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let products: any[] = [];
  try {
    const projectId = "justafriend-5bdb3";
    const databaseId = "justafriend";
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?pageSize=100`;

    const response = await fetch(firestoreUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.documents)) {
        products = data.documents.map((doc: any) => {
          const fields = doc.fields || {};
          const item: any = {};
          for (const key in fields) {
            item[key] = parseFirestoreField(fields[key]);
          }
          const parts = doc.name.split("/");
          item.id = parts[parts.length - 1];
          return item;
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch products for sitemap from Firestore:", err);
  }

  // Fallback if empty
  if (!products || products.length === 0) {
    products = SEED_PRODUCTS;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://justafriend.com.ng/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://justafriend.com.ng/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://justafriend.com.ng/about</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://justafriend.com.ng/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://justafriend.com.ng/faq</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://justafriend.com.ng/track</loc>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>`;

  products.forEach((p) => {
    if (p && p.slug) {
      const imgLoc = p.images && p.images[0] ? p.images[0] : "https://iili.io/CxhVz4j.jpg";
      const pTitleClean = p.name ? p.name.replace(/[<>&'"]/g, "") : "Streetwear";
      const pSubClean = p.subtitle ? p.subtitle.replace(/[<>&'"]/g, "") : "JAF";
      const pDescClean = p.description
        ? p.description.replace(/[<>&'"]/g, "").slice(0, 200)
        : "JAF Streetwear clothing, hoodies, caps, shirts";
      xml += `
  <url>
    <loc>https://justafriend.com.ng/product/${p.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${imgLoc}</image:loc>
      <image:title>${pTitleClean} - ${pSubClean}</image:title>
      <image:caption>${pDescClean}</image:caption>
    </image:image>
  </url>`;
    }
  });

  xml += `
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(xml);
}
