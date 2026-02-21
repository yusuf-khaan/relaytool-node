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
        } else if (integrationSlug === "facebook") {
            const FB_CLIENT_ID = auth.facebook.client_id;
            const FB_CLIENT_SECRET = auth.facebook.client_secret;
            const REDIRECT_URI = auth.facebook.redirect_uri;
            if (!REDIRECT_URI) {
                throw new Error("FACEBOOK redirect URI is not configured");
            }
            const shortTokenRes = await fetch(
                `https://graph.facebook.com/v19.0/oauth/access_token` +
                `?client_id=${FB_CLIENT_ID}` +
                `&client_secret=${FB_CLIENT_SECRET}` +
                `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                `&code=${code}`
            );
            if (!shortTokenRes.ok) {
                const err = await shortTokenRes.text();
                throw new Error(`FB short token error: ${err}`);
            }
            const shortTokenData = await shortTokenRes.json();
            const shortLivedToken = shortTokenData.access_token;
            const longTokenRes = await fetch(
                `https://graph.facebook.com/v19.0/oauth/access_token` +
                `?grant_type=fb_exchange_token` +
                `&client_id=${FB_CLIENT_ID}` +
                `&client_secret=${FB_CLIENT_SECRET}` +
                `&fb_exchange_token=${shortLivedToken}`
            );
            if (!longTokenRes.ok) {
                const err = await longTokenRes.text();
                throw new Error(`FB long token error: ${err}`);
            }
            const longTokenData = await longTokenRes.json();
            const longLivedToken = longTokenData.access_token;
            const payload = {
                slug: "facebook",
                credential: {
                    access_token: longLivedToken,
                    expires_in: longTokenData.expires_in
                },
                userId: userId
            };
            console.log("Facebook payload:", payload);
            await this.integrationDetailService.storeIntegrationCredential(payload);
        }
        else {
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

    facebookConsent(res: any, state: any) {
        const FB_CLIENT_ID = auth.facebook.client_id;
        const REDIRECT_URI = auth.facebook.redirect_uri;
        console.log("FB_CLIENT_ID:", FB_CLIENT_ID);
        console.log("REDIRECT_URI:", REDIRECT_URI);


        if (!REDIRECT_URI) {
            throw new Error("FACEBOOK redirect URI is not configured");
        }

        const scope = [
            // ===== FACEBOOK PAGE =====
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_metadata",
            // "pages_manage_posts",
            // "pages_manage_engagement",
            // "pages_read_user_content",

            // ===== INSTAGRAM BASIC =====
            "instagram_basic",
            "instagram_manage_comments",
            "instagram_manage_messages",
            // "instagram_manage_insights",
            "instagram_content_publish",

            // ===== MESSAGING (if needed) =====
            "pages_messaging",
            // "pages_messaging_subscriptions",

            // ===== BUSINESS MANAGEMENT =====
            "business_management",

            // ===== OPTIONAL (if running ads later) =====
            "ads_read",
            "ads_management",

        ].join(",");

        const url =
            `https://www.facebook.com/v19.0/dialog/oauth` +
            `?client_id=${FB_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${scope}` +
            `&state=${state}`;

        return res.redirect(url);
    }

}

export default AuthService;