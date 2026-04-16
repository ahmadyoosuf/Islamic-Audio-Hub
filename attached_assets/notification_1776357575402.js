import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

export async function getUserToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY"
    });

    if (token) {
      console.log("TOKEN:", token);
    } else {
      console.log("No token found");
    }
  } catch (err) {
    console.log("Error:", err);
  }
}