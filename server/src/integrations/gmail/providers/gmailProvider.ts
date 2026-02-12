import { ProviderMetadata } from "../../../interface/providerInterface.js";
import GmailClient from "../clients/gmailClient.js";

class GmailProvider {
  private static _instance: GmailClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  /** Lazy singleton client */
  static getClient(): GmailClient {
    if (!this._instance) this._instance = new GmailClient();
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
      name: "Gmail",
      description: "Email Provider",
      authType: "Oauth",
      actions: this.getActions(),
    };
  }
}

export default GmailProvider;
