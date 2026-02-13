const ALGORITHM = "AES-GCM";

// generate the 6 digit delivery code

export function generateSecureCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = (array[0] % 900000) + 100000;
  return num.toString();
}

// hash the delivery code

export async function hashDeliveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// encrypt to show the requester the code

export async function encryptCode(
  text: string,
  secretKey: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey.padEnd(32).slice(0, 32)); // make sure 32 bytes
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12)); // random iv
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text),
  );

  // Store as iv = encrypted

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const dataHex = Array.from(new Uint8Array(encrypted))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ivHex}:${dataHex}`;
}

// decrypt to show again to requester

export async function decryptCode(
  encryptedString: String,
  secretKey: string,
): Promise<string | null> {
  try {
    const [ivHex, dataHex] = encryptedString.split(":");
    const iv = new Uint8Array(
      ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    const data = new Uint8Array(
      dataHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey.padEnd(32).slice(0, 32));
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: ALGORITHM },
      false,
      ["decrypt"],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data,
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed");
    return null;
  }
}
