import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "node:fs";
import { config } from '../config/environment';
import { config } from '../config/environment';

function setupFirebase() {
  if (config.database.emulatorHost) {
    initializeApp({ projectId: "dev" })
  }
  // production, use firebase with SA credentials passed from environment or a file
  else if (config.database.serviceAccountFile) {
    const serviceAccount = JSON.parse(readFileSync(config.database.serviceAccountFile, 'utf8'))
    initializeApp({
      credential: cert(serviceAccount)
    })
  } else if (config.database.serviceAccount) {
    const serviceAccount = JSON.parse(config.database.serviceAccount)
    initializeApp({
      credential: cert(serviceAccount)
    })
  }
  // dev, use firebase emulator
  else {
    throw new Error("Firestore emulator is not running!")
  }
  return getFirestore()
}
const db = setupFirebase()
export default db
