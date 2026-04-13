import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type StorageReference,
} from "firebase/storage";
import { storage } from "./firebase.config";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes:       number;
  percent:          number;
}

// ─── URI → Blob via XHR (native only) ────────────────────────────────────────
// On React Native, fetch() silently returns an empty blob for local file:// and
// content:// URIs. XMLHttpRequest with responseType="blob" is the only reliable
// method to read a local device file into memory.

function uriBlobXHR(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`XHR status ${xhr.status} for ${uri}`));
      }
    };
    xhr.onerror = () => reject(new Error(`XHR network error reading: ${uri}`));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

// ─── MIME type from filename ──────────────────────────────────────────────────

function mimeFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3:  "audio/mpeg",
    m4a:  "audio/mp4",
    aac:  "audio/aac",
    ogg:  "audio/ogg",
    wav:  "audio/wav",
    flac: "audio/flac",
    webm: "audio/webm",
  };
  return map[ext] ?? "audio/mpeg";
}

// ─── Pick audio file on web ───────────────────────────────────────────────────
// On web, expo-document-picker returns an object URL that isn't always readable.
// A hidden <input type="file"> gives us the actual File object (already a Blob).

export function pickAudioFileWeb(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type    = "file";
    input.accept  = "audio/*";
    input.style.display = "none";

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };

    // If user closes dialog without picking
    input.addEventListener("cancel", () => {
      document.body.removeChild(input);
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}

// ─── uploadAudio ──────────────────────────────────────────────────────────────
// Accepts either:
//   • source: string  — a local file URI from expo-document-picker (native)
//   • source: Blob    — a File object from <input type="file"> (web)
//
// Uses uploadBytes (single PUT request) instead of uploadBytesResumable.
// uploadBytesResumable's resumable protocol commonly fails in React Native
// with "unknown" errors due to CORS on the resumable upload endpoint.

export async function uploadAudio(
  source:      string | Blob,
  filename:    string,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {

  // ── Step 1: get a Blob ───────────────────────────────────────────────────
  let blob: Blob;

  if (typeof source === "string") {
    // Native: local URI → blob via XHR
    try {
      blob = await uriBlobXHR(source);
    } catch (e: any) {
      console.error("[Storage] uriBlobXHR failed:", e?.message ?? e);
      throw new Error(`கோப்பு படிக்க முடியவில்லை: ${e?.message ?? "XHR error"}`);
    }
  } else {
    // Web: File/Blob already in memory — no conversion needed
    blob = source;
  }

  if (!blob || blob.size === 0) {
    throw new Error("கோப்பு காலியாக உள்ளது (0 bytes) — வேறு கோப்பை தேர்ந்தெடுக்கவும்");
  }

  console.log(`[Storage] blob ready — size: ${blob.size} bytes, name: ${filename}`);
  onProgress?.({ bytesTransferred: 0, totalBytes: blob.size, percent: 0 });

  // ── Step 2: upload ───────────────────────────────────────────────────────
  const mime = (blob as File).type || mimeFromFilename(filename);
  const storageRef: StorageReference = ref(storage, `audio/${filename}`);

  let snapshot;
  try {
    snapshot = await uploadBytes(storageRef, blob, { contentType: mime });
  } catch (e: any) {
    console.error("[Storage] uploadBytes failed:", e?.code, e?.message, e?.serverResponse);
    throw new Error(`Firebase Storage upload பிழை: ${e?.message ?? e?.code ?? "unknown"}`);
  }

  onProgress?.({ bytesTransferred: blob.size, totalBytes: blob.size, percent: 100 });
  console.log(`[Storage] upload complete — path: ${snapshot.ref.fullPath}`);

  // ── Step 3: get download URL ─────────────────────────────────────────────
  let url: string;
  try {
    url = await getDownloadURL(snapshot.ref);
  } catch (e: any) {
    console.error("[Storage] getDownloadURL failed:", e?.code, e?.message);
    throw new Error(`Download URL பெற முடியவில்லை: ${e?.message ?? e?.code}`);
  }

  console.log(`[Storage] download URL obtained ✓`);
  return url;
}

// ─── deleteAudio ──────────────────────────────────────────────────────────────

export async function deleteAudio(downloadUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, downloadUrl);
    await deleteObject(fileRef);
  } catch (e: any) {
    console.error("[Storage] deleteAudio failed:", e?.code, e?.message);
    throw e;
  }
}

// ─── getAudioUrl ──────────────────────────────────────────────────────────────

export async function getAudioUrl(path: string): Promise<string> {
  const fileRef = ref(storage, path);
  return await getDownloadURL(fileRef);
}
