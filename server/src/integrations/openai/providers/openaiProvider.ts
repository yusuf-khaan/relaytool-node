import OpenaiClient from "../clients/openaiClient.js";
import { ProviderMetadata } from "../../../interface/providerInterface.js";

class OpenaiProvider {
  private static _instance: OpenaiClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  /** Lazy singleton client */
  static getClient(): OpenaiClient {
    if (!this._instance) this._instance = new OpenaiClient();
    return this._instance;
  }

  /** Lazy actions inspection */
  static getActions(): any {
    if (!this._actionsCache) {
      const client = this.getClient();
      this._actionsCache = client.pairingFunctionNameAndPayload();
    }
    return this._actionsCache;
  }

  /** Metadata only computes actions on demand */
  static metadata(): ProviderMetadata {
    return {
      name: "openai",
      description: "Open AI API integration",
      authType: "oauth2",
      actions: this.getActions(),
    };
  }
}

export default OpenaiProvider;
