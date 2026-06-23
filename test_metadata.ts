/* eslint-disable */
async function getAccessToken() {
  const url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  try {
    const res = await fetch(url, {
      headers: {
        "Metadata-Flavor": "Google"
      }
    });
    if (res.ok) {
      const data: any = await res.json();
      console.log("Success! Got access token (truncated):", data.access_token.substring(0, 15) + "...");
      return data.access_token;
    } else {
      console.error("Metadata server returned:", res.status, await res.text());
    }
  } catch (err: any) {
    console.error("No metadata server available:", err.message);
  }
  return null;
}

getAccessToken();
