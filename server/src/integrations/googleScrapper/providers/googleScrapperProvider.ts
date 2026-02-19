import { ProviderMetadata } from "../../../interface/providerInterface.js";
import googleCustomSearchClient from "../clients/googleCustomSearchClient.js";

class googleCustomSearch {
  private static _instance: googleCustomSearchClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  /** Lazy singleton client */
  static getClient(): googleCustomSearchClient {
    if (!this._instance) this._instance = new googleCustomSearchClient();
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
      name: "google-scrapper",
      description: "Google Scrapper Provider",
      authType: null,
      actions: this.getActions(),
    };
  }
}

export default googleCustomSearch;
