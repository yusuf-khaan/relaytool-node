import AbstractTelegramClient from "./abstractTelegram.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

interface TelegramCredentials {
  botToken: string;
  defaultChatId?: string | number;
}

export default class TelegramClient extends AbstractTelegramClient {
  private utilityService!: Utility;
  private integrationDetailService = new IntegrationDetailService();
  private botToken?: string;
  private defaultChatId: string | number | undefined;
  private readonly baseUrl = "https://api.telegram.org";

  constructor() {
    super();
  }

  async init(request: any): Promise<void> {
    if (!this.utilityService) {
      this.utilityService = new Utility();
    }

    const userId = request?.data?.userId || request?.userId;
    if (!userId) {
      throw new Error("userId is required for Telegram init");
    }

    const credentials = await this.getIntegrationDetails(userId);
    this.botToken = credentials.botToken;
    this.defaultChatId = credentials.defaultChatId;
  }

  private async ensureInitWithDefaults(request: any) {
    if (!this.botToken || !this.utilityService) {
      await this.init(request);
    }
  }

  private async getIntegrationDetails(userId: string): Promise<TelegramCredentials> {
    const credential = await this.integrationDetailService.getIntegrationCredential({
      userId,
      slug: "telegram",
    });

    if (!credential?.auth_detail) {
      throw new Error("Telegram integration not configured for this user");
    }

    const auth = credential.auth_detail;
    const botToken = auth.botToken || auth.bot_token || auth.token;
    const defaultChatId = auth.defaultChatId || auth.default_chat_id || auth.chatId || auth.chat_id;

    if (!botToken) {
      throw new Error("Telegram bot token missing in auth_detail");
    }

    return {
      botToken: String(botToken),
      ...(defaultChatId !== undefined ? { defaultChatId } : {}),
    };
  }

  private getMethodUrl(method: string): string {
    if (!this.botToken) {
      throw new Error("Telegram client not initialized");
    }
    return `${this.baseUrl}/bot${this.botToken}/${method}`;
  }

  private async sendRequest(method: string, params: Record<string, any> = {}, request?: any): Promise<any> {
    await this.ensureInitWithDefaults(request);

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        body.append(key, String(value));
      }
    }

    const res = await fetch(this.getMethodUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const responseData = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      throw new Error(typeof responseData === "string" ? responseData : `${res.status} ${res.statusText}`);
    }

    if (typeof responseData === "object" && responseData && responseData.ok === false) {
      throw new Error(responseData.description || "Telegram API request failed");
    }

    return typeof responseData === "object" && responseData ? responseData.result : responseData;
  }

  private withDefaultChatId(payload: Record<string, any>) {
    const withChat = { ...payload };
    if (!withChat.chat_id && this.defaultChatId) {
      withChat.chat_id = this.defaultChatId;
    }
    if (!withChat.chat_id) {
      throw new Error("chat_id is required");
    }
    return withChat;
  }

  buildSendMessagePayload() {
    return {
      chat_id: null,
      text: null,
      parse_mode: null,
      disable_web_page_preview: null,
      disable_notification: null,
      reply_to_message_id: null,
    };
  }

  async sendMessage(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSendMessagePayload()
    );
    const finalPayload = this.withDefaultChatId(payload);
    return this.sendRequest("sendMessage", finalPayload, request);
  }

  buildGetUpdatesPayload() {
    return {
      offset: null,
      limit: null,
      timeout: null,
      allowed_updates: null,
    };
  }

  async getUpdates(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildGetUpdatesPayload()
    );
    if (Array.isArray(payload.allowed_updates)) {
      payload.allowed_updates = JSON.stringify(payload.allowed_updates);
    }
    return this.sendRequest("getUpdates", payload, request);
  }

  async getMe(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    return this.sendRequest("getMe", {}, request);
  }

  buildGetChatPayload() {
    return {
      chat_id: null,
    };
  }

  async getChat(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildGetChatPayload()
    );
    return this.sendRequest("getChat", this.withDefaultChatId(payload), request);
  }

  buildSendPhotoPayload() {
    return {
      chat_id: null,
      photo: null,
      caption: null,
      parse_mode: null,
      disable_notification: null,
    };
  }

  async sendPhoto(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSendPhotoPayload()
    );
    const finalPayload = this.withDefaultChatId(payload);
    return this.sendRequest("sendPhoto", finalPayload, request);
  }

  buildSendDocumentPayload() {
    return {
      chat_id: null,
      document: null,
      caption: null,
      parse_mode: null,
      disable_notification: null,
    };
  }

  async sendDocument(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSendDocumentPayload()
    );
    const finalPayload = this.withDefaultChatId(payload);
    return this.sendRequest("sendDocument", finalPayload, request);
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendMessage",
        description: "Send text message via Telegram Bot API",
        defaultPayload: this.buildSendMessagePayload(),
      },
      {
        action: "getUpdates",
        description: "Fetch updates received by bot",
        defaultPayload: this.buildGetUpdatesPayload(),
      },
      {
        action: "getMe",
        description: "Get bot profile information",
        defaultPayload: {},
      },
      {
        action: "getChat",
        description: "Get chat details by chat_id",
        defaultPayload: this.buildGetChatPayload(),
      },
      {
        action: "sendPhoto",
        description: "Send photo to a chat",
        defaultPayload: this.buildSendPhotoPayload(),
      },
      {
        action: "sendDocument",
        description: "Send document to a chat",
        defaultPayload: this.buildSendDocumentPayload(),
      },
    ];
  }
}
