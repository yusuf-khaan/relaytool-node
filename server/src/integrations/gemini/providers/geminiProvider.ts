import { ProviderMetadata } from "../../../interface/providerInterface.js";
import GeminiClient from "../clients/geminiClient.js";

class GeminiProvider {
  private static _instance: GeminiClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  static getClient(): GeminiClient {
    if (!this._instance) this._instance = new GeminiClient();
    return this._instance;
  }

  static getActions(): any {
    if (!this._actionsCache) {
      const client = this.getClient();
      this._actionsCache = client.pairingFunctionNameAndPayload();
    }
    return this._actionsCache;
  }

  static metadata(): ProviderMetadata {
    return {
      name: "gemini",
      description: "Google Gemini API integration",
      authType: "oauth2",
      actions: this.getActions(),
    };
  }
}

export default GeminiProvider;
