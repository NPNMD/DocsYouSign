import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "docsyousign";

/**
 * Initialize the Admin SDK with Application Default Credentials.
 * - On Firebase App Hosting, the compute service account supplies ADC automatically.
 * - For local `next dev`, run `gcloud auth application-default login` (or set
 *   GOOGLE_APPLICATION_CREDENTIALS) so server route handlers can reach Firestore.
 */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];
  return initializeApp({ projectId: PROJECT_ID });
}

const adminApp = getAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
