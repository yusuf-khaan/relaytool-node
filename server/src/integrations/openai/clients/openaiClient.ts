import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import AbstractOpenai from "./abstractOpenai.js";
import Utility from "../../../services/Utility.js";
import { Knex } from "knex";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

type ModelResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  output: any;
};
export interface OpenAICredentials {
  apiKey: string;
}

class OpenaiClient extends AbstractOpenai {
  private apiKey: string | null = null;
  private client!: AxiosInstance;
  private utilityService!: Utility;
  private static apiKeyMap = new Map<string, string>();
  private integrationDetailService = new IntegrationDetailService();
  constructor() {
    super();
  }

  async init(credentials: OpenAICredentials): Promise<void> {
    if (!this.utilityService) {
      this.utilityService = new Utility();
    }

    if (!this.client) {
      this.apiKey = credentials.apiKey;

      this.client = axios.create({
        baseURL: "https://api.openai.com/v1",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
    }
  }

  private async ensureInitWithDefaults(request: any) {
    const userId = request?.data?.userId || request?.userId;
    if (!userId) throw new Error("userId missing");
    if (OpenaiClient.apiKeyMap.has(userId)) {
      this.apiKey = OpenaiClient.apiKeyMap.get(userId)!;
      this.reInitilizeClient();
      return;
    }
    const auth = await this.getIntegrationDetails(userId);
    await this.init(auth);
    OpenaiClient.apiKeyMap.set(userId, auth.apiKey);
  }

  private reInitilizeClient() {
    this.client = axios.create({
      baseURL: "https://api.openai.com/v1",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }
  private async getIntegrationDetails(
    userId: string,
  ): Promise<OpenAICredentials> {
    const credential =
      await this.integrationDetailService.getIntegrationCredential({
        userId,
        slug: "openai",
      });
    console.log(credential);
    if (!credential) {
      throw new Error("Postgres integration not configured for this user");
    }
    if (!credential.auth_detail) {
      throw new Error("Postgres auth_detail missing");
    }
    return {
      apiKey: credential.auth_detail.api_key,
    };
  }

  private async sendRequest(url: string, method: string, data?: any) {
    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: data ? JSON.stringify(data) : null,
      };
      const response = await fetch(
        `https://api.openai.com/v1${url}`,
        requestOptions,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error?.message || "OpenAI API Error");
      }
      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || "Unknown fetch error");
    }
  }

  async sendResponseToModel(request: any): Promise<ModelResponse> {
    await this.ensureInitWithDefaults(request);
    console.log("request:", request);
    const schemaData = request?.schemaData ?? {};
    console.log("schemaData:", schemaData);
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data, // jsonPayload
      schemaData, // schemaData
      this.buildTextModelPayload(),
    );
    console.log("Payload:", payload);
    return this.sendRequest("/responses", "POST", {
      model: payload.model || "gpt-4o-mini",
      input: payload.text,
    });
  }

  async sendImageToModel(request: any): Promise<ModelResponse> {
    await this.ensureInitWithDefaults(request);
    const schemaData = request?.schemaData ?? {};
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schemaData,
      this.buildImageModelPayload(),
    );

    return this.sendRequest("/responses", "POST", {
      model: payload.model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: payload.text },
            { type: "input_image", url: payload.imageUrl },
          ],
        },
      ],
    });
  }

  getClient(): AxiosInstance {
    return this.client;
  }

  /*
  SCHEMAS
  */
  private buildTextModelPayload() {
    return {
      model: null,
      text: null,
    };
  }

  private buildImageModelPayload() {
    return {
      model: null,
      text: null,
      imageUrl: null,
    };
  }

  /*
  pairing function + payload
  */
  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendResponseToModel",
        description:
          "Send a text prompt to an OpenAI text model and receive a generated response.",
        defaultPayload: this.buildTextModelPayload(),
      },
      {
        action: "sendImageToModel",
        description:
          "Send both text and an image URL to a multimodal OpenAI model.",
        defaultPayload: this.buildImageModelPayload(),
      },
    ];
  }
}

export default OpenaiClient;
