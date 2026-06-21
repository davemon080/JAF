/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // 1. Intercept product details page requests for crawlers/social sharing bots
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "product" && pathParts[1]) {
        const userAgent = request.headers.get("user-agent") || "";
        const isBot = /(facebookexternalhit|twitterbot|whatsapp|telegrambot|slackbot|discord|linkedinbot|embedly|googlebot|bingbot|applebot)/i.test(userAgent);

        if (isBot) {
          const slugStr = pathParts[1];
          let product: any = undefined;

          try {
            // Fetch live products list directly via firestore REST API
            const projectId = "abiding-galaxy-9cdv3";
            const databaseId = "ai-studio-81b238ef-76c6-4d2b-8629-d866ad513f5b";
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?pageSize=100`;

            const res = await fetch(firestoreUrl);
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.documents)) {
                const parseField = (field: any): any => {
                  if (!field) return undefined;
                  if (field.stringValue !== undefined) return field.stringValue;
                  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
                  if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
                  if (field.booleanValue !== undefined) return field.booleanValue;
                  if (field.arrayValue && field.arrayValue.values) {
                    return field.arrayValue.values.map((v: any) => parseField(v));
                  }
                  if (field.mapValue && field.mapValue.fields) {
                    const obj: any = {};
                    for (const key in field.mapValue.fields) {
                      obj[key] = parseField(field.mapValue.fields[key]);
                    }
                    return obj;
                  }
                  return undefined;
                };

                const products = data.documents.map((doc: any) => {
                  const fields = doc.fields || {};
                  const item: any = {};
                  for (const key in fields) {
                    item[key] = parseField(fields[key]);
                  }
                  const parts = doc.name.split("/");
                  item.id = parts[parts.length - 1];
                  return item;
                });

                product = products.find((p: any) => p.slug === slugStr || p.id === slugStr);
              }
            }
          } catch (err) {
            console.error("Failed to fetch product for bot in server.ts:", err);
          }

          // Fallback to static SEED_PRODUCTS
          if (!product) {
            try {
              const { SEED_PRODUCTS } = await import("./data/products");
              product = SEED_PRODUCTS.find((p: any) => p.slug === slugStr || p.id === slugStr);
            } catch (err) {
              console.error("Failed to import SEED_PRODUCTS in server.ts:", err);
            }
          }

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
            "name": product ? product.name : "Streetwear Clothing",
            "image": product && product.images ? product.images : [image],
            "description": descRaw,
            "sku": product ? product.id : "jaf-streetwear",
            "mpn": product ? product.id : "jaf-streetwear",
            "brand": {
              "@type": "Brand",
              "name": "JAF"
            },
            "category": product ? product.category : "clothing",
            "offers": {
              "@type": "Offer",
              "url": `https://justafriend.com.ng/product/${slugStr}`,
              "priceCurrency": "NGN",
              "price": product ? product.price : 20000,
              "priceValidUntil": "2027-12-31",
              "itemCondition": "https://schema.org/NewCondition",
              "availability": product && product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "seller": {
                "@type": "Organization",
                "name": "JAF — Just A Friend"
              }
            }
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

  <!-- Redirection Fallback -->
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

          return new Response(html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }

      if (url.pathname === "/sitemap.xml" || url.pathname === "/sitemap") {
        try {
          const { fetchProductsFromFirestore } = await import("./lib/firebase");
          const products = await fetchProductsFromFirestore();

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

          if (Array.isArray(products)) {
            products.forEach((p) => {
              if (p && p.slug) {
                const imgLoc = p.images && p.images[0] ? p.images[0] : "https://iili.io/CxhVz4j.jpg";
                const pTitleClean = p.name ? p.name.replace(/[<>&'"]/g, "") : "Streetwear";
                const pSubClean = p.subtitle ? p.subtitle.replace(/[<>&'"]/g, "") : "JAF";
                const pDescClean = p.description ? p.description.replace(/[<>&'"]/g, "").slice(0, 200) : "JAF Streetwear clothing, hoodies, caps, shirts";
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
          }

          xml += `
</urlset>`;

          return new Response(xml, {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
          });
        } catch (sitemapErr) {
          console.error("Failed to generate dynamic sitemap, serving fallback:", sitemapErr);
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
