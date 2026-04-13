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

// ─── URI → Blob (XHR method) ──────────────────────────────────────────────────
// fetch() silently fails on local file:// and content:// URIs in React Native.
// XMLHttpRequest with responseType="blob" is the only reliable approach.

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
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    webm: "audio/webm",
  };
  return map[ext] ?? "audio/mpeg";
}

// ─── uploadAudio ──────────────────────────────────────────────────────────────
// Uses uploadBytes (single-request) instead of uploadBytesResumable.
// uploadBytesResumable requires a multi-step resumable protocol that commonly
// fails in React Native with "unknown" errors due to CORS on the resumable
// upload endpoint. uploadBytes does one PUT request and is far more reliable.

export async function uploadAudio(
  uri:        string,
  filename:   string,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  // Step 1 — read local file into a blob via XHR
  let blob: Blob;
  try {
    blob = await uriBlobXHR(uri);
  } catch (e: any) {
    console.error("[Storage] uriBlobXHR failed:", e?.message ?? e);
    throw new Error(`கோப்பு படிக்க முடியவில்லை: ${e?.message ?? "XHR error"}`);
  }

  if (!blob || blob.size === 0) {
    throw new Error("கோப்பு காலியாக உள்ளது (0 bytes) — வேறு கோப்பை தேர்ந்தெடுக்கவும்");
  }

  console.log(`[Storage] blob ready — size: ${blob.size} bytes, uri: ${uri}`);

  // Report 0% immediately so UI shows something
  onProgress?.({ bytesTransferred: 0, totalBytes: blob.size, percent: 0 });

  // Step 2 — upload to Firebase Storage (single-request uploadBytes)
  const mime = mimeFromFilename(filename);
  const storageRef: StorageReference = ref(storage, `audio/${filename}`);

  let snapshot;
  try {
    snapshot = await uploadBytes(storageRef, blob, { contentType: mime });
  } catch (e: any) {
    console.error("[Storage] uploadBytes failed:", e?.code, e?.message, e?.serverResponse);
    throw new Error(`Firebase Storage upload பிழை: ${e?.message ?? e?.code ?? "unknown"}`);
  }

  // Report 100% on success
  onProgress?.({ bytesTransferred: blob.size, totalBytes: blob.size, percent: 100 });
  console.log(`[Storage] upload complete — path: ${snapshot.ref.fullPath}`);

  // Step 3 — get the public download URL
  let url: string;
  try {
    url = await getDownloadURL(snapshot.ref);
  } catch (e: any) {
    console.error("[Storage] getDownloadURL failed:", e?.code, e?.message);
    throw new Error(`Download URL பெற முடியவில்லை: ${e?.message ?? e?.code}`);
  }

  console.log(`[Storage] download URL: ${url.substring(0, 80)}...`);
  return url;
}

// ─── deleteAudio ──────────────────────────────────────────────────────────────
// Accepts a full https:// download URL or a gs:// storage path.

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
// Get the download URL for a given storage path, e.g. "audio/my-file.mp3"

export async function getAudioUrl(path: string): Promise<string> {
  const fileRef = ref(storage, path);
  return await getDownloadURL(fileRef);
}
