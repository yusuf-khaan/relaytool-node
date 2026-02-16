import auth from "../config/auth.js";
import { google } from "googleapis";
import IntegrationDetailService from "./IntegrationDetailService.js";

class AuthService {

    private integrationDetailService = new IntegrationDetailService();

    constructor() {

    }

    async encodeDecode(state: any, doEncode: boolean) {
        let result = null;
        if (doEncode) {
            result = Buffer.from(JSON.stringify(state)).toString("base64");
        } else {
            result = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        }
        return result;
    }

    async oauthLoginsCallback(body: any) {
        const code = body?.code;
        const state = body?.state;
        console.log("OAuth Callback Body:", body);
        if (!state || !code) {
        }
        const decoded = await this.encodeDecode(state, false);
        const integrationSlug = decoded?.integrationSlug;
        const userId = decoded?.userId ?? 1;

        if (integrationSlug === "gmail") {
            const GOOGLE_CLIENT_ID = auth.gmail.client_id;
            const GOOGLE_CLIENT_SECRET = auth.gmail.client_secret;
            const REDIRECT_URI = auth.gmail.redirect_uri;
            const googleOauthClient = new google.auth.OAuth2(
                GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET,
                REDIRECT_URI
            );
            const { tokens } = await googleOauthClient.getToken(code);
            const payload = {
                slug: "gmail",
                credential: tokens,
                userId: userId
            }
            console.log("payload ", payload);
            this.integrationDetailService.storeIntegrationCredential(payload);
        } else {
            throw new Error(`${state} not found`);

        }
    }

    gmailConsent(res: any, state: any) {
        const GOOGLE_CLIENT_ID = auth.gmail.client_id;
        const GOOGLE_CLIENT_SECRET = auth.gmail.client_secret;
        const REDIRECT_URI = auth.gmail.redirect_uri;
        if (!REDIRECT_URI) {
            throw new Error("GOOGLE redirect URI is not configured");
        }
        const client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );
        const url = client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send'
            ],
            redirect_uri: REDIRECT_URI,
            state
        });
        return res.redirect(url);
    }
}

export default AuthService;