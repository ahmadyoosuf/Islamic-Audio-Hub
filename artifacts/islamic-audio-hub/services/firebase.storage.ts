import {
  ref,
  uploadBytesResumable,
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

/**
 * Fetch a local file URI as a Blob using XMLHttpRequest.
 * fetch() fails silently on local file:// and content:// URIs in React Native.
 * XMLHttpRequest with responseType="blob" is the only reliable approach.
 */
function uriBlobXHR(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error(`Failed to read file: ${uri}`));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export function uploadAudio(
  uri:        string,
  filename:   string,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Use XHR to convert local file URI → Blob (fetch fails on React Native)
      const blob = await uriBlobXHR(uri);

      if (!blob || blob.size === 0) {
        reject(new Error("கோப்பு படிக்க முடியவில்லை — blob காலியாக உள்ளது"));
        return;
      }

      const storageRef: StorageReference = ref(storage, `audio/${filename}`);
      const task = uploadBytesResumable(storageRef, blob);

      task.on(
        "state_changed",
        snapshot => {
          const { bytesTransferred, totalBytes } = snapshot;
          onProgress?.({
            bytesTransferred,
            totalBytes,
            percent: totalBytes > 0 ? Math.round((bytesTransferred / totalBytes) * 100) : 0,
          });
        },
        err => {
          console.error("[Storage] upload error:", err.code, err.message, err.serverResponse);
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    } catch (e) {
      console.error("[Storage] uploadAudio exception:", e);
      reject(e);
    }
  });
}

/**
 * Delete an audio file from Firebase Storage given its full gs:// or https:// URL.
 */
export async function deleteAudio(downloadUrl: string): Promise<void> {
  const fileRef = ref(storage, downloadUrl);
  await deleteObject(fileRef);
}

/**
 * Get the download URL for a given storage path, e.g. "audio/my-file.mp3"
 */
export async function getAudioUrl(path: string): Promise<string> {
  const fileRef = ref(storage, path);
  return await getDownloadURL(fileRef);
}
