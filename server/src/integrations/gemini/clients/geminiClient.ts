import IntegrationDetailService from "../../../services/IntegrationDetailService.js";
import Utility from "../../../services/Utility.js";
import AbstractGemini from "./abstractGemini.js";

export interface GeminiCredentials {
  apiKey: string;
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

class GeminiClient extends AbstractGemini {
  private static apiKeyMap = new Map<string, string>();
  private static modelCacheByVersion = new Map<string, string[]>();
  private apiKey: string | null = null;
  private utilityService = new Utility();
  private integrationDetailService = new IntegrationDetailService();
  private readonly baseUrl = "https://generativelanguage.googleapis.com";
  private readonly apiVersion = process.env.GEMINI_API_VERSION || "v1beta";

  constructor() {
    super();
  }

  private async ensureInitWithDefaults(request: any) {
    const userId = request?.data?.userId || request?.userId;
    if (!userId) throw new Error("userId missing");

    if (GeminiClient.apiKeyMap.has(userId)) {
      this.apiKey = GeminiClient.apiKeyMap.get(userId)!;
      return;
    }

    const auth = await this.getIntegrationDetails(userId);
    this.apiKey = auth.apiKey;
    GeminiClient.apiKeyMap.set(userId, auth.apiKey);
  }

  private async getIntegrationDetails(
    userId: string,
  ): Promise<GeminiCredentials> {
    const credential =
      await this.integrationDetailService.getIntegrationCredential({
        userId,
        slug: "gemini",
      });

    if (!credential?.auth_detail?.api_key) {
      throw new Error("Gemini integration not configured for this user");
    }

    return {
      apiKey: credential.auth_detail.api_key,
    };
  }

  private async listGenerateContentModels(): Promise<string[]> {
    if (!this.apiKey) return [];

    if (GeminiClient.modelCacheByVersion.has(this.apiVersion)) {
      return GeminiClient.modelCacheByVersion.get(this.apiVersion)!;
    }

    const response = await fetch(`${this.baseUrl}/${this.apiVersion}/models`, {
      method: "GET",
      headers: {
        "x-goog-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json().catch(() => ({} as any));
    const models =
      payload?.models
        ?.filter((m: any) =>
          Array.isArray(m?.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent"),
        )
        ?.map((m: any) => String(m?.name || "").replace(/^models\//, ""))
        ?.filter(Boolean) || [];

    GeminiClient.modelCacheByVersion.set(this.apiVersion, models);
    return models;
  }

  private async resolveFallbackModel(preferredModel: string): Promise<string> {
    const models = await this.listGenerateContentModels();
    if (!models.length) return preferredModel;
    if (models.includes(preferredModel)) return preferredModel;

    const prioritized = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-flash-latest",
      "gemini-pro-latest",
    ];

    for (const candidate of prioritized) {
      if (models.includes(candidate)) return candidate;
    }

    const flashModel = models.find((m) => m.includes("flash"));
    return flashModel || models[0] || preferredModel;
  }

  private async generateContent(model: string, parts: GeminiPart[]) {
    if (!this.apiKey) {
      throw new Error("Gemini API key not initialized");
    }

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error?.message || "Gemini API error");
    }

    return response.json();
  }

  private async sendGenerateContentRequest(model: string, parts: GeminiPart[]) {
    try {
      return await this.generateContent(model, parts);
    } catch (error: any) {
      const message = error?.message || "";
      const shouldRetryWithFallback =
        message.includes("not found for API version") ||
        message.includes("not supported for generateContent");

      if (!shouldRetryWithFallback) throw error;

      const fallbackModel = await this.resolveFallbackModel(model);
      if (fallbackModel === model) throw error;
      return await this.generateContent(fallbackModel, parts);
    }
  }

  private async getImageInlineData(imageUrl: string) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Unable to fetch image: ${imageResponse.status}`);
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    const bytes = await imageResponse.arrayBuffer();
    const data = Buffer.from(bytes).toString("base64");

    return {
      mime_type: contentType,
      data,
    };
  }

  async sendResponseToModel(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);

    const schemaData = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schemaData,
      this.buildTextModelPayload(),
    );
    console.log("Model request payload:\n", JSON.stringify(payload, null, 2));
    console.log("requestdata and schema data:\n", JSON.stringify({ requestData: request?.data, schemaData }, null, 2));

    let res = await this.sendGenerateContentRequest(
      payload.model || process.env.GEMINI_MODEL || "gemini-2.5-flash",
      [
      { text: payload.text || "" },
      ],
    );
  console.log("Model raw response:\n", JSON.stringify(res, null, 2));
    return res;
  }

  async sendImageToModel(request: any): Promise<any> {
    await this.ensureInitWithDefaults(request);

    const schemaData = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schemaData,
      this.buildImageModelPayload(),
    );

    if (!payload.imageUrl) {
      throw new Error("imageUrl is required");
    }

    const inlineData = await this.getImageInlineData(payload.imageUrl);

    return this.sendGenerateContentRequest(
      payload.model || process.env.GEMINI_MODEL || "gemini-2.5-flash",
      [{ text: payload.text || "" }, { inline_data: inlineData }],
    );
  }

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

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendResponseToModel",
        description:
          "Send a text prompt to a Gemini model and receive a generated response.",
        defaultPayload: this.buildTextModelPayload(),
      },
      {
        action: "sendImageToModel",
        description:
          "Send text plus an image URL to a Gemini multimodal model.",
        defaultPayload: this.buildImageModelPayload(),
      },
    ];
  }
}

export default GeminiClient;
