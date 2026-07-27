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
      const projectId = "justafriend-5bdb3";
      const databaseId = "(default)";

      // 1. Try to fetch the document directly by ID
      try {
        const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products/${slugStr}`;
        const response = await fetch(docUrl);
        if (response.ok) {
          const doc = await response.json();
          if (doc && doc.fields) {
            const item: any = {};
            for (const key in doc.fields) {
              item[key] = parseFirestoreField(doc.fields[key]);
            }
            const parts = doc.name.split("/");
            item.id = parts[parts.length - 1];
            if (item.slug === slugStr || item.id === slugStr) {
              product = item;
            }
          }
        }
      } catch (err) {
        console.error("Direct fetch by ID failed:", err);
      }

      // 2. Try to query the document by its slug field using structuredQuery
      if (!product) {
        try {
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
          const queryResponse = await fetch(queryUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: "products" }],
                where: {
                  fieldFilter: {
                    field: { fieldPath: "slug" },
                    op: "EQUAL",
                    value: { stringValue: slugStr },
                  },
                },
                limit: 1,
              },
            }),
          });
          if (queryResponse.ok) {
            const results = await queryResponse.json();
            if (Array.isArray(results) && results[0] && results[0].document) {
              const doc = results[0].document;
              if (doc.fields) {
                const item: any = {};
                for (const key in doc.fields) {
                  item[key] = parseFirestoreField(doc.fields[key]);
                }
                const parts = doc.name.split("/");
                item.id = parts[parts.length - 1];
                product = item;
              }
            }
          }
        } catch (err) {
          console.error("Structured query by slug failed:", err);
        }
      }

      // 3. Fallback to listing first 100 products and searching in-memory
      if (!product) {
        try {
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
          console.error("List fetch fallback failed:", err);
        }
      }
    } catch (err) {
      console.error("General fetch from Firestore failed:", err);
    }

    // 4. Fallback to static SEED_PRODUCTS if not found/error in Firestore
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

  const schemaJson = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product ? product.name : "Streetwear Clothing",
    image: product && product.images ? product.images : [image],
    description: descRaw,
    sku: product ? product.id : "jaf-streetwear",
    mpn: product ? product.id : "jaf-streetwear",
    brand: {
      "@type": "Brand",
      name: "JAF",
    },
    category: product ? product.category : "clothing",
    offers: {
      "@type": "Offer",
      url: `https://justafriend.com.ng/product/${slugStr}`,
      priceCurrency: "NGN",
      price: product ? product.price : 20000,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product && product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "JAF — Just A Friend",
      },
    },
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="clothes, hoodies, caps, shirts, streetwear, JAF streetwear, Abuja fashion, Lafia shop, heavyweight tees, situationship streetwear, JAF clothing, Nigerian streetwear" />

  <!-- Google Rich Snippets / Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(schemaJson)}
  </script>

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:site_name" content="JAF" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:url" content="https://justafriend.com.ng/product/${slugStr}" />

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
