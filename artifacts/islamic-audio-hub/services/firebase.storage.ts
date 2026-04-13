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
 * Upload an audio file to Firebase Storage under `audio/<filename>`.
 * Returns a promise that resolves with the public download URL.
 * Calls `onProgress` with live progress updates.
 */
export function uploadAudio(
  uri:        string,
  filename:   string,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(uri);
      const blob     = await response.blob();

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
        err => reject(err),
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
