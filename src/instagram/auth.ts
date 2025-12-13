import { IgApiClient, IgLoginRequiredError } from 'instagram-private-api';
import { loadSession, saveSession, sessionExists, setupSessionPersistence } from './session.js';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

const CREDENTIALS_PATH = './data/credentials.json';

interface Credentials {
  username: string;
  password: string;
}

async function loadCredentials(): Promise<Credentials> {
  try {
    await access(CREDENTIALS_PATH, constants.F_OK);
  } catch {
    throw new Error(
      `Credentials file not found at ${CREDENTIALS_PATH}. ` +
      `Please copy config/credentials.example.json to data/credentials.json and fill in your Instagram credentials.`
    );
  }

  const data = await readFile(CREDENTIALS_PATH, 'utf-8');
  const credentials = JSON.parse(data) as Credentials;

  if (!credentials.username || !credentials.password) {
    throw new Error('Invalid credentials file. Both username and password are required.');
  }

  if (credentials.username === 'YOUR_INSTAGRAM_USERNAME') {
    throw new Error('Please update data/credentials.json with your actual Instagram credentials.');
  }

  return credentials;
}

export async function authenticateClient(ig: IgApiClient): Promise<void> {
  const credentials = await loadCredentials();

  // Generate device ID (deterministic based on username for consistency)
  ig.state.generateDevice(credentials.username);

  // Try to restore existing session first
  if (await sessionExists()) {
    const restored = await loadSession(ig);
    if (restored) {
      try {
        // Verify session is still valid by making a test request
        await ig.account.currentUser();
        setupSessionPersistence(ig);
        console.error('Session restored successfully');
        return;
      } catch (error) {
        if (error instanceof IgLoginRequiredError) {
          console.error('Session expired, performing fresh login...');
        } else {
          console.error('Session validation failed:', error);
        }
      }
    }
  }

  // Perform fresh login
  console.error('Performing fresh login...');

  // Simulate pre-login behavior to avoid detection
  await ig.simulate.preLoginFlow();

  // Login
  const loggedInUser = await ig.account.login(credentials.username, credentials.password);
  console.error(`Logged in as: ${loggedInUser.username}`);

  // Simulate post-login behavior
  process.nextTick(async () => {
    try {
      await ig.simulate.postLoginFlow();
    } catch (error) {
      // Post-login flow errors are not critical
      console.error('Post-login simulation warning:', error);
    }
  });

  // Save session and setup auto-persistence
  await saveSession(ig);
  setupSessionPersistence(ig);
}
