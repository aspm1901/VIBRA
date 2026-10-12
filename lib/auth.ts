export const ADMIN_COOKIE_NAME = "vibra_admin";

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || "vibra_default_fallback_secret_key_change_in_prod";
}

// Convertir string a ArrayBuffer
function str2buffer(str: string): ArrayBuffer {
  const enc = new TextEncoder();
  const uint8 = enc.encode(str);
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

// Convertir ArrayBuffer a hex string
function ab2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Firma un token de sesión de admin con Web Crypto (compatible con Edge y Node)
 */
export async function signAdminToken(expiresInHours = 8): Promise<string> {
  const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = `admin:${expiresAt}`;

  const keyBuffer = str2buffer(getSecretKey());
  const payloadBuffer = str2buffer(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, payloadBuffer);
  const signatureHex = ab2hex(signature);

  return `${payload}.${signatureHex}`;
}

/**
 * Verifica la firma y expiración del token con Web Crypto
 */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    if (!token || !token.includes(".")) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signatureHex] = parts;
    const [role, expiresAtStr] = payload.split(":");
    if (role !== "admin") return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Token expirado
    }

    const keyBuffer = str2buffer(getSecretKey());
    const payloadBuffer = str2buffer(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSig = await crypto.subtle.sign("HMAC", key, payloadBuffer);
    const expectedSigHex = ab2hex(expectedSig);

    return signatureHex === expectedSigHex;
  } catch {
    return false;
  }
}
