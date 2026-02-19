// src/integrations/instagram/InstagramClient.ts

import AbstractInstagramClient from "./abstractInstagram.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

/* =======================
   Client
======================= */

export default class InstagramClient extends AbstractInstagramClient {
  private baseUrl = "https://graph.instagram.com";
  private facebookUrl = "https://graph.facebook.com/v17.0";
  private timeoutMs = 15_000;
  private accessToken!: string;
  private utilityService!: Utility;
  private integrationService = new IntegrationDetailService();
  private pageId: string = "";
  private pageAccessToken: string = "";

  constructor() { super(); }

  /* =======================
     Init
  ======================= */

  async init(request: any): Promise<void> {
    this.utilityService = new Utility();

    const userId = request?.data?.userId || request?.userId;
    if (!userId) throw new Error("userId is required for Instagram init");

    const token = await this.fetchTokenFromDB(userId);
    console.log("Fetched token from DB:", token);
    if (!token?.access_token) {
      throw new Error("No Instagram access token found in DB");
    }

    this.accessToken = token.access_token;
  }

  private async fetchTokenFromDB(
    userId: string
  ): Promise<any | null> {
    const integration =
      await this.integrationService.getIntegrationCredential({
        userId,
        slug: "facebook",
      });

    if (!integration?.auth_detail?.access_token) return null;

    return integration.auth_detail;
  }

  /* =======================
     Request Helper
  ======================= */

  private async sendRequest<T = any>(config: any): Promise<T> {
    if (config.from === "facebook") {
      this.baseUrl = this.facebookUrl;
    }

    const params = { ...(config.params ?? {}) };
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const url = `${this.baseUrl.replace(/\/$/, "")}/${config.url.replace(/^\//, "")}?${query}`;

    try {
      const res = await fetch(url, { method: config.method || "GET" });
      const contentType = res.headers.get("content-type") ?? "";
      const responseData = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          responseData?.error?.message || responseData?.error || responseData || `${res.status} ${res.statusText}`;
        throw new Error(String(message));
      }

      return responseData as T;
    } catch (err: any) {
      throw new Error(err?.message || err);
    }
  }


  private async ensureInit(request?: any) {
    if (!this.accessToken) {
      await this.init(request);
    }
  }

  /* =======================
     Actions
  ======================= */

  async getUserProfile(request: any): Promise<any> {
    await this.ensureInit(request);

    return this.sendRequest({
      method: "GET",
      url: "/me",
      params: { fields: "id,username" },
    });
  }

  async getFacebookProfile(request: any): Promise<any> {
    await this.ensureInit(request);

    let res = await this.sendRequest({
      method: "GET",
      url: "/me/accounts",
      params: { access_token: this.accessToken },
      from: "facebook",
    });

    this.pageAccessToken = res.data[0].access_token;
    this.pageId = res.data[0].id;

    const instagramBusinessAccount = await this.sendRequest({
      method: "GET",
      url: `/${this.pageId}`,
      params: {
        fields: `
      id,
      name,
      category,
      category_list,
      fan_count,
      link,
      picture,
      instagram_business_account
    `,
        access_token: this.pageAccessToken,
      },
      from: "facebook",
    });
    console.log("Instagram Business Account response:", instagramBusinessAccount);
    return instagramBusinessAccount;
    // let instagramBusinessAccountId = instagramBusinessAccount?.id;
  }
  
  async getInstagramAccountMedia(request: any): Promise<any> {
    await this.ensureInit(request);

    return this.sendRequest({
      method: "GET",
      url: `/${this.pageId}`,
      params: { fields: "id,caption,media_type,media_url,timestamp", access_token: this.accessToken },
      from: "facebook",
    });
  }

  async getUserMedia(request: any) {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildUserMediaPayload()
    );

    return this.sendRequest({
      method: "GET",
      url: "/me/media",
      params: {
        fields:
          payload.fields ||
          "id,caption,media_url,permalink,media_type",
      },
    });
  }

  async postComment(request: any) {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildPostCommentPayload()
    );

    return this.sendRequest({
      method: "POST",
      url: `/${payload.mediaId}/comments`,
      params: { message: payload.message },
    });
  }

  async replyToComment(request: any) {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildReplyCommentPayload()
    );

    return this.sendRequest({
      method: "POST",
      url: `/${payload.commentId}/replies`,
      params: { message: payload.message },
    });
  }

  async likeMedia(request: any) {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildLikeMediaPayload()
    );

    return this.sendRequest({
      method: "POST",
      url: `/${payload.mediaId}/likes`,
    });
  }

  async createMedia(request: any): Promise<string> {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildCreateMediaPayload()
    );

    const params: any = { caption: payload.caption };

    if (payload.type === "IMAGE") params.image_url = payload.mediaUrl;
    if (payload.type === "VIDEO") params.video_url = payload.mediaUrl;

    const data = await this.sendRequest({
      method: "POST",
      url: "/me/media",
      params,
    });

    return data.id;
  }

  async publishMediaContainer(request: any) {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildPublishMediaPayload()
    );

    return this.sendRequest({
      method: "POST",
      url: "/me/media_publish",
      params: { creation_id: payload.containerId },
    });
  }

  async createCarouselContainer(request: any): Promise<string> {
    await this.ensureInit(request);

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildCarouselPayload()
    );

    const data = await this.sendRequest({
      method: "POST",
      url: "/me/media",
      params: {
        caption: payload.caption,
        media_type: "CAROUSEL",
        children: payload.mediaIds?.join(","),
      },
    });

    return data.id;
  }

  /* =======================
     Payload Builders
  ======================= */

  private buildUserMediaPayload() {
    return { fields: null };
  }

  private buildPostCommentPayload() {
    return { mediaId: null, message: null };
  }

  private buildReplyCommentPayload() {
    return { commentId: null, message: null };
  }

  private buildLikeMediaPayload() {
    return { mediaId: null };
  }

  private buildCreateMediaPayload() {
    return {
      mediaUrl: null,
      caption: null,
      type: null as "IMAGE" | "VIDEO" | null,
    };
  }

  private buildPublishMediaPayload() {
    return { containerId: null };
  }

  private buildCarouselPayload() {
    return { mediaIds: null as string[] | null, caption: null };
  }

  private buildFacebookProfilePayload() {
    return {
      access_token: null,
    };
  }

  /* =======================
     Automation Metadata
  ======================= */

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "getUserProfile",
        description: "Fetch Instagram user profile",
        defaultPayload: {},
      },
      {
        action: "getUserMedia",
        description: "Fetch Instagram user media",
        defaultPayload: this.buildUserMediaPayload(),
      },
      {
        action: "postComment",
        description: "Post a comment on media",
        defaultPayload: this.buildPostCommentPayload(),
      },
      {
        action: "replyToComment",
        description: "Reply to a comment",
        defaultPayload: this.buildReplyCommentPayload(),
      },
      {
        action: "likeMedia",
        description: "Like a media item",
        defaultPayload: this.buildLikeMediaPayload(),
      },
      {
        action: "createMedia",
        description: "Create media container",
        defaultPayload: this.buildCreateMediaPayload(),
      },
      {
        action: "publishMediaContainer",
        description: "Publish media container",
        defaultPayload: this.buildPublishMediaPayload(),
      },
      {
        action: "createCarouselContainer",
        description: "Create carousel container",
        defaultPayload: this.buildCarouselPayload(),
      },
      {
        action: "getFacebookProfile",
        description: "Get Facebook profile",
        defaultPayload: this.buildFacebookProfilePayload(),
      },
    ];
  }
}
