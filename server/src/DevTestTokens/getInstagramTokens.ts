// server/DevTestTokens/getInstagramTokens.ts
import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import path from "path";
import readline from "readline";
import axios from "axios";

const TOKEN_PATH = path.join(process.cwd(), "server/DevTestTokens/InstagramTokens.json");

// Replace these with your values or load from your project's config/env
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID || "YOUR_IG_APP_ID";
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || "YOUR_IG_APP_SECRET";
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:5000/auth/instagram/callback";

/**
 * NOTE on scopes:
 * The exact scope strings may vary depending on how you configured your FB/IG app.
 * For publish capabilities you typically need the `instagram_content_publish` and app review for it.
 * Adjust scopes in the auth URL per your app configuration.
 */
function generateAuthUrl() {
  const scope = [
    // you may need to tweak these scopes in Facebook developer console and during review
    "instagram_graph_user_profile",
    "instagram_graph_user_media",
    "instagram_content_publish",
    "pages_show_list"
  ].join(",");

  // Instagram Graph uses facebook login dialog URL for Graph API auth flows for business accounts.
  // But for simplicity here we point users to the Facebook OAuth dialog for IG Graph usage.
  // If your app uses different flow, adapt accordingly.
  return (
    `https://www.facebook.com/v17.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(INSTAGRAM_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code`
  );
}

type FacebookTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

/**
 * Exchange the authorization code for a short-lived access token,
 * then exchange the short-lived token for a long-lived token.
 */
async function exchangeCodeForLongLivedToken(code: string) {
  const tokenUrl = "https://graph.facebook.com/v17.0/oauth/access_token";

  const shortRes = await axios.get<FacebookTokenResponse>(tokenUrl, {
    params: {
      client_id: INSTAGRAM_CLIENT_ID,
      client_secret: INSTAGRAM_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    },
  });

  if (!shortRes?.data?.access_token) {
    throw new Error("Failed to get short-lived token: " + JSON.stringify(shortRes?.data));
  }

  const shortLivedToken = shortRes.data.access_token;

  const exchangeUrl = "https://graph.facebook.com/v17.0/oauth/access_token";

  const longRes = await axios.get<FacebookTokenResponse>(exchangeUrl, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: INSTAGRAM_CLIENT_ID,
      client_secret: INSTAGRAM_CLIENT_SECRET,
      fb_exchange_token: shortLivedToken,
    },
  });

  if (!longRes?.data?.access_token) {
    throw new Error("Failed to get long-lived token: " + JSON.stringify(longRes?.data));
  }

  const now = Math.floor(Date.now() / 1000);

  const tokenRecord = {
    access_token: longRes.data.access_token,
    expires_in: longRes.data.expires_in || 5184000,
    obtained_at: now,
  };

  return tokenRecord;
}

async function saveTokenToFile(tokenObj: any) {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokenObj, null, 2), "utf-8");
  console.log("Saved token to", TOKEN_PATH);
}

async function promptUser(promptText: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n=== Instagram token generator ===\n");

  if (INSTAGRAM_CLIENT_ID === "YOUR_IG_APP_ID" || INSTAGRAM_CLIENT_SECRET === "YOUR_IG_APP_SECRET") {
    console.warn("WARNING: Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in env or edit this script.");
  }

  const authUrl = generateAuthUrl();
  console.log("Open this URL in your browser to authorize the app:\n");
  console.log(authUrl);
  console.log("\nOnce you are redirected to your redirect URI, copy the `code` query parameter value and paste it below.\n");

  const code = await promptUser("Paste authorization code here: ");

  if (!code) {
    console.error("No code provided. Exiting.");
    process.exit(1);
  }

  try {
    const tokenRecord = await exchangeCodeForLongLivedToken(code);
    await saveTokenToFile(tokenRecord);
    console.log("Done. Long-lived token saved. Token will typically be valid for ~60 days.");
  } catch (err: any) {
    console.error("Error exchanging code:", err?.response?.data || err.message || err);
  }
}

  main();
