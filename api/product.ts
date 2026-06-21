/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { SEED_PRODUCTS } from "../src/data/products";

// A quick and reliable parser for Firestore REST document fields
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
  const { slug } = req.query;
  const slugStr = typeof slug === "string" ? slug : Array.isArray(slug) ? slug[0] : "";

  let product: any = undefined;

  if (slugStr) {
    try {
      // 1. Fetch live products list directly via firestore REST API
      // Since it's server-to-server and highly optimized, it is faster and doesn't load the Firebase SDK
      const projectId = "abiding-galaxy-9cdv3";
      const databaseId = "ai-studio-81b238ef-76c6-4d2b-8629-d866ad513f5b";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?pageSize=100`;

      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.documents)) {
          const products = data.documents.map((doc: any) => {
            const fields = doc.fields || {};
            const item: any = {};
            for (const key in fields) {
              item[key] = parseFirestoreField(fields[key]);
            }
            const parts = doc.name.split("/");
            item.id = parts[parts.length - 1];
            return item;
          });

          // Search for matching product in Firestore list
          product = products.find((p: any) => p.slug === slugStr || p.id === slugStr);
        }
      }
    } catch (err) {
      console.error("Failed to fetch product from Firestore REST API:", err);
    }

    // 2. Fallback to static SEED_PRODUCTS if not found/error in Firestore
    if (!product) {
      product = SEED_PRODUCTS.find((p) => p.slug === slugStr || p.id === slugStr);
    }
  }

  // 3. Assemble meta tags and HTML body
  const title = product ? `${product.name} — JAF` : "JAF — Just A Friend";
  const descRaw = product
    ? product.subtitle
      ? `${product.subtitle}: ${product.description}`
      : product.description
    : "Rock JAF. Know your status. Streetwear for the situationship era — shipping across Abuja & Lafia.";
  const desc = descRaw.replace(/"/g, "&quot;");
  const image = (product && product.images && product.images[0]) || "https://iili.io/CxhVz4j.jpg";
  const redirectUrl = `/product/${slugStr}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:site_name" content="JAF" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <!-- Redirection Fallback (in case a normal browser ever executes this route) -->
  <script>
    window.location.replace(${JSON.stringify(redirectUrl)});
  </script>
  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #0c0c0e; color: #fff;">
  <div style="text-align: center; max-width: 500px; padding: 20px;">
    <h2>${title}</h2>
    <p>${desc}</p>
    <img src="${image}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 20px;" />
    <p style="font-size: 14px; opacity: 0.6; margin-top: 24px;">Redirecting you to the catalog...</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
