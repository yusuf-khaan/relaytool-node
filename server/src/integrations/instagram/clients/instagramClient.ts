// src/integrations/instagram/InstagramClient.ts

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import AbstractInstagramClient from "./abstractInstagram.js";
import Utility from "../../../services/Utility.js";
import auth from "../../../config/auth.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

/* =======================
   Types
======================= */

export interface InstagramToken {
  access_token: string;
  expires_in?: number;
  obtained_at?: number;
}

/* =======================
   Client
======================= */

export default class InstagramClient extends AbstractInstagramClient {
  private accessToken!: string;
  private client!: AxiosInstance;
  private utilityService!: Utility;
  private integrationService = new IntegrationDetailService();

  constructor() {
    super();
    this.client = axios.create({
      baseURL: "https://graph.instagram.com",
      timeout: 15_000,
    });
  }

  /* =======================
     Init
  ======================= */

  async init(request: any): Promise<void> {
    this.utilityService = new Utility();

    const userId = request?.data?.userId || request?.userId;
    if (!userId) throw new Error("userId is required for Instagram init");

    const token = await this.fetchTokenFromDB(userId);
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
        slug: "instagram",
      });

    if (!integration?.auth_detail?.access_token) return null;

    return integration.auth_detail;
  }

  /* =======================
     Request Helper
  ======================= */

  private async sendRequest<T = any>(
    config: AxiosRequestConfig
  ): Promise<T> {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${this.accessToken}`,
    };

    config.params = {
      ...(config.params || {}),
      access_token: this.accessToken,
    };

    try {
      const res = await this.client.request<T>(config);
      return res.data;
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data ||
        err.message ||
        err;
      throw new Error(String(message));
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
      params: { fields: "id,username,account_type" },
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
    ];
  }
}
