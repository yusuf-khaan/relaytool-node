import InstagramClient from "../clients/instagramClient.js";
import { ProviderMetadata } from "../../../interface/providerInterface.js";

class InstagramProvider {
  private static _instance: InstagramClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  /** Lazy singleton client */
  static getClient(): InstagramClient {
    if (!this._instance) this._instance = new InstagramClient();
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
      name: "instagram",
      description: "Instagram Graph API integration",
      authType: "oauth2",
      actions: this.getActions(),
    };
  }
}

export default InstagramProvider;
