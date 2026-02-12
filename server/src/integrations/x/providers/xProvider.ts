import { ProviderMetadata } from "../../../interface/providerInterface.js";
import XClient from "../clients/xClient.js";

class XProvider {
  private static _instance: XClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() { 
    
  }

  /** Lazy singleton client */
  static getClient(): XClient {
    if (!this._instance) this._instance = new XClient();
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
      name: "X",
      description: "X Formally Twitter",
      authType: "none",
      actions: this.getActions(),
    };
  }
}

export default XProvider;
