export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const REQUIRED_FIELDS: Array<keyof Pick<FirebaseClientConfig, 'apiKey' | 'authDomain' | 'projectId' | 'appId'>> = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
];

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized.includes('your_') ||
    normalized.includes('your-') ||
    normalized.includes('placeholder') ||
    normalized.includes('change_me') ||
    normalized.startsWith('<') ||
    normalized.endsWith('>') ||
    normalized === 'undefined' ||
    normalized === 'null'
  );
}

function pickNonEmpty(overrideVal: string | undefined, baseVal: string | undefined): string | undefined {
  if (typeof overrideVal === 'string' && overrideVal.trim() !== '') {
    return overrideVal.trim();
  }
  if (typeof baseVal === 'string' && baseVal.trim() !== '') {
    return baseVal.trim();
  }
  return undefined;
}

/**
 * Merges optional VITE_FIREBASE_* overrides on top of the committed applet config
 * and fails loudly if any required Firebase client setting is missing or looks like a placeholder.
 */
export function resolveAndValidateFirebaseConfig(
  baseConfig: Partial<FirebaseClientConfig>,
  envOverrides: Record<string, string | undefined> = {}
): FirebaseClientConfig {
  const merged: Partial<FirebaseClientConfig> = {
    apiKey: pickNonEmpty(envOverrides.VITE_FIREBASE_API_KEY, baseConfig.apiKey),
    authDomain: pickNonEmpty(envOverrides.VITE_FIREBASE_AUTH_DOMAIN, baseConfig.authDomain),
    projectId: pickNonEmpty(envOverrides.VITE_FIREBASE_PROJECT_ID, baseConfig.projectId),
    storageBucket: pickNonEmpty(envOverrides.VITE_FIREBASE_STORAGE_BUCKET, baseConfig.storageBucket),
    messagingSenderId: pickNonEmpty(envOverrides.VITE_FIREBASE_MESSAGING_SENDER_ID, baseConfig.messagingSenderId),
    appId: pickNonEmpty(envOverrides.VITE_FIREBASE_APP_ID, baseConfig.appId),
    measurementId: pickNonEmpty(envOverrides.VITE_FIREBASE_MEASUREMENT_ID, baseConfig.measurementId),
    firestoreDatabaseId: pickNonEmpty(
      envOverrides.VITE_FIREBASE_DATABASE_ID,
      baseConfig.firestoreDatabaseId
    ),
  };

  const invalidFields: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const val = merged[field];
    if (!val || isPlaceholderValue(val)) {
      invalidFields.push(field);
    }
  }

  if (invalidFields.length > 0) {
    throw new Error(
      `[Firebase Config Error] Missing or invalid required Firebase client field(s): ${invalidFields.join(
        ', '
      )}. Check firebase-applet-config.json or VITE_FIREBASE_* environment variables.`
    );
  }

  return merged as FirebaseClientConfig;
}
