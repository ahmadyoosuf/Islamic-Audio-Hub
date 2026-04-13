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

// ─── Pick audio file on web ───────────────────────────────────────────────────
// On web, expo-document-picker returns an object URL that XHR cannot read.
// A hidden <input type="file"> gives us the actual File object (already a Blob).

export function pickAudioFileWeb(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = "audio/*";
    input.style.display = "none";

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };

    input.addEventListener("cancel", () => {
      document.body.removeChild(input);
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}

// ─── uploadAudio ──────────────────────────────────────────────────────────────
// source: string  → local file URI from expo-document-picker (native/mobile)
// source: Blob    → File object from <input type="file"> (web)
//
// Storage path: songs/<filename>
//
// NOTE: Firebase Storage security rules must allow writes, e.g.:
//   match /{allPaths=**} { allow read, write: if true; }

export async function uploadAudio(
  source:      string | Blob,
  fileName:    string,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  try {
    const storageRef: StorageReference = ref(storage, "songs/" + fileName);

    // ── Get blob ─────────────────────────────────────────────────────────────
    let blob: Blob | undefined;

    if (typeof source === "string") {
      // 👉 Mobile case (URI → Blob via XHR)
      // fetch() silently returns empty blob on local file:// URIs in React Native.
      // XMLHttpRequest with responseType="blob" is the only reliable method.
      blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 400) resolve(xhr.response as Blob);
          else reject(new Error(`XHR status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("XHR network error"));
        xhr.responseType = "blob";
        xhr.open("GET", source as string, true);
        xhr.send(null);
      });
    } else {
      // 👉 Web case — File IS already a Blob, use directly
      blob = source;
    }

    // ── DEBUG LOGS ────────────────────────────────────────────────────────────
    console.log("FILE:", fileName);
    console.log("BLOB:", blob);
    console.log("SIZE:", blob?.size);

    if (!blob || blob.size === 0) {
      throw new Error("❌ Blob is empty or undefined");
    }

    onProgress?.({ bytesTransferred: 0, totalBytes: blob.size, percent: 0 });

    // ── Upload ────────────────────────────────────────────────────────────────
    const snapshot = await uploadBytes(storageRef, blob);
    console.log("✅ Upload success:", snapshot);

    onProgress?.({ bytesTransferred: blob.size, totalBytes: blob.size, percent: 100 });

    // ── Get download URL ──────────────────────────────────────────────────────
    const url = await getDownloadURL(snapshot.ref);
    console.log("✅ Download URL:", url.substring(0, 80) + "...");
    return url;

  } catch (e: any) {
    console.error("🔥 FULL ERROR:", e);
    console.error("   code:", e?.code);
    console.error("   message:", e?.message);
    console.error("   serverResponse:", e?.serverResponse);
    throw e;
  }
}

// ─── deleteAudio ──────────────────────────────────────────────────────────────

export async function deleteAudio(downloadUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, downloadUrl);
    await deleteObject(fileRef);
  } catch (e: any) {
    console.error("🔥 deleteAudio error:", e);
    throw e;
  }
}

// ─── getAudioUrl ──────────────────────────────────────────────────────────────

export async function getAudioUrl(path: string): Promise<string> {
  const fileRef = ref(storage, path);
  return await getDownloadURL(fileRef);
}
