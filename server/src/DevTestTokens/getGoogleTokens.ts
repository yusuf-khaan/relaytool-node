// server/DevTestTokens/getGoogleTokens.ts
import fs from "fs";
import path from "path";
import readline from "readline";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// Scopes needed for Gmail
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly"
];

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // can be http://localhost:5000/auth/callback
);

// Step 1: Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // gets refresh token
  scope: SCOPES,
  prompt: "consent"
});

console.log("\nAuthorize this app by visiting this URL:\n");
console.log(authUrl);

// Step 2: Get code from user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("\nEnter the code from that page here: ", async (code) => {
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code.trim());
    oauth2Client.setCredentials(tokens);

    // Save tokens to token.json
    const tokenPath = path.join(process.cwd(), "server/src/DevTestTokens/DevTestTokenstoken.json");
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    console.log("\n✅ Token retrieved and saved successfully!");
    console.log(`Saved to: ${tokenPath}`);
  } catch (err) {
    console.error("❌ Error retrieving token:", err);
  } finally {
    rl.close();
  }
});
// node --loader ts-node/esm server/src/DevTestTokens/getGoogleTokens.ts
