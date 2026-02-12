import { google } from 'googleapis';
import path from 'path';
import SheetClient from './clients/sheetsClient.js';
import auth from '../../../config/auth.js';

const KEY_FILE = path.join(process.cwd(), 'server/config/google-service-account.json');

export function createSheetClientWithRefreshToken(refreshToken) {
  const oAuth2Client = new google.auth.OAuth2(
    auth.gmail.client_id,
    auth.gmail.client_secret
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return new SheetClient(oAuth2Client);
}

export async function createSheetClientServiceAccount() {
  const gAuth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await gAuth.getClient();
  return new SheetClient(client);     
}