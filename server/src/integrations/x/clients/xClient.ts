import crypto from "crypto";
import FormData from "form-data";
import OAuthClass from "oauth-1.0a";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

const OAuth: any = OAuthClass;

interface XToken {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface MediaFile {
  buffer: Buffer;
  type: string;
}

class XClient {
  private baseUrl = "https://api.twitter.com/2";

  private oauth?: any;
  private token?: { key: string; secret: string };

  private consumerKey!: string;
  private consumerSecret!: string;
  private accessToken!: string;
  private accessTokenSecret!: string;

  private utilityService!: Utility;
  private integrationService = new IntegrationDetailService();

  /* =======================
     INIT
  ======================= */

  async init(request: any): Promise<void> {
    this.utilityService = new Utility();

    const userId = request?.data?.userId || request?.userId;
    if (!userId) throw new Error("userId is required for X init");

    const token = await this.fetchTokenFromDB(userId);
    if (!token) throw new Error("X credentials not found");

    this.consumerKey = token.consumerKey;
    this.consumerSecret = token.consumerSecret;
    this.accessToken = token.accessToken;
    this.accessTokenSecret = token.accessTokenSecret;

    this.initOAuth();
  }

  /* =======================
     DB
  ======================= */

  private async fetchTokenFromDB(userId: string): Promise<XToken | null> {
    const integration =
      await this.integrationService.getIntegrationCredential({
        userId,
        slug: "x",
      });

    if (!integration?.auth_detail) return null;

    return integration.auth_detail as XToken;
  }

  /* =======================
     OAUTH
  ======================= */

  private initOAuth() {
    if (!this.oauth) {
      this.oauth = new OAuth({
        consumer: {
          key: this.consumerKey,
          secret: this.consumerSecret,
        },
        signature_method: "HMAC-SHA1",
        hash_function(base: string, key: string) {
          return crypto
            .createHmac("sha1", key)
            .update(base)
            .digest("base64");
        },
      });
    }

    if (!this.token) {
      this.token = {
        key: this.accessToken,
        secret: this.accessTokenSecret,
      };
    }
  }

  /* =======================
     CORE REQUEST
  ======================= */

  private async sendRequest(
    url: string,
    method: string,
    body?: any,
    params?: any
  ) {
    if (!this.oauth) throw new Error("X not initialized");

    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += "?" + qs;
    }

    const res = await fetch(this.baseUrl + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(
        err?.error ?? err?.errors?.[0]?.message ?? "X API Error"
      );
    }

    return res.json();
  }

  /* =======================
     MEDIA UPLOAD (OAuth v1)
  ======================= */

  private async uploadMedia(file: MediaFile) {
    if (!this.oauth || !this.token)
      throw new Error("OAuth credentials required");

    const form = new FormData();
    form.append("media", file.buffer, {
      filename: "file",
      contentType: file.type,
    });

    const requestData = {
      url: "https://upload.twitter.com/1.1/media/upload.json",
      method: "POST",
    };

    const authHeader = this.oauth.toHeader(
      this.oauth.authorize(requestData, this.token)
    );

    const res = await fetch(requestData.url, {
      method: "POST",
      headers: { ...authHeader, ...form.getHeaders() },
      body: form as any,
    });

    if (!res.ok) throw new Error("Media upload failed");

    return (await res.json()).media_id_string;
  }

  /* =======================
     PAYLOAD BUILDERS
  ======================= */

  buildTweetPayload() {
    return { text: null };
  }

  buildTweetWithMediaPayload() {
    return { text: null, mediaFiles: [] };
  }

  buildDmPayload() {
    return { recipientId: null, text: null };
  }

  /* =======================
     ACTIONS
  ======================= */

  async postTweet(request: any) {
    if (!this.oauth) await this.init(request);

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildTweetPayload()
    );

    return this.sendRequest("/tweets", "POST", { text: payload.text });
  }

  async postTweetWithMedia(request: any) {
    if (!this.oauth) await this.init(request);

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildTweetWithMediaPayload()
    );

    const mediaIds = [];
    for (const file of request?.files ?? []) {
      mediaIds.push(await this.uploadMedia(file));
    }

    return this.sendRequest("/tweets", "POST", {
      text: payload.text,
      media: { media_ids: mediaIds },
    });
  }

  async deleteTweet(request: any) {
    if (!this.oauth) await this.init(request);
    return this.sendRequest(`/tweets/${request?.data?.id}`, "DELETE");
  }

  async getTweetById(request: any) {
    if (!this.oauth) await this.init(request);
    return this.sendRequest(`/tweets/${request?.data?.id}`, "GET");
  }

  async sendDirectMessage(request: any) {
    if (!this.oauth) await this.init(request);

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildDmPayload()
    );

    return this.sendRequest(
      "/direct_messages/events/new.json",
      "POST",
      {
        event: {
          type: "message_create",
          message_create: {
            target: { recipient_id: payload.recipientId },
            message_data: { text: payload.text },
          },
        },
      }
    );
  }

  async getDirectMessages(request: any) {
    if (!this.oauth) await this.init(request);
    return this.sendRequest(
      "/direct_messages/events/list.json",
      "GET",
      null,
      { count: request?.data?.count ?? 10 }
    );
  }

  async getUserByUsername(request: any) {
    if (!this.oauth) await this.init(request);
    return this.sendRequest(
      `/users/by/username/${request?.data?.username}`,
      "GET"
    );
  }

  async getMyProfile(request: any) {
    if (!this.oauth) await this.init(request);
    return this.sendRequest("/users/me", "GET");
  }

  /* =======================
     AUTOMATION MAP
  ======================= */

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "postTweet",
        description: "Post a tweet",
        defaultPayload: this.buildTweetPayload(),
      },
      {
        action: "postTweetWithMedia",
        description: "Post a tweet with media",
        defaultPayload: this.buildTweetWithMediaPayload(),
      },
      {
        action: "deleteTweet",
        description: "Delete a tweet",
        defaultPayload: { id: null },
      },
      {
        action: "getTweetById",
        description: "Fetch tweet details",
        defaultPayload: { id: null },
      },
      {
        action: "sendDirectMessage",
        description: "Send direct message",
        defaultPayload: this.buildDmPayload(),
      },
      {
        action: "getDirectMessages",
        description: "Fetch direct messages",
        defaultPayload: { count: 10 },
      },
      {
        action: "getUserByUsername",
        description: "Fetch user by username",
        defaultPayload: { username: null },
      },
      {
        action: "getMyProfile",
        description: "Fetch authenticated profile",
        defaultPayload: {},
      },
    ];
  }
}

export default XClient;
