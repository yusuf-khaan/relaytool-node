import { ProviderMetadata } from "../../../interface/providerInterface.js";
import SheetsClient from "../clients/sheetsClient.js";

class SheetsProvider {
  private static _instance: SheetsClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  static getClient(): SheetsClient {
    if (!this._instance) this._instance = new SheetsClient();
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
      name: "Sheets",
      description: "Google Sheets Provider",
      authType: "Oauth",
      actions: this.getActions(),
    };
  }
}

export default SheetsProvider;
