import { ProviderMetadata } from "../../../interface/providerInterface.js";
import TeamsClient from "../clients/teamsClient.js";

class TeamsProvider {
  private static _instance: TeamsClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  static getClient(): TeamsClient {
    if (!this._instance) this._instance = new TeamsClient();
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
      name: "teams",
      description: "Microsoft Teams integration via Microsoft Graph API",
      authType: "OAuth2ClientCredentials",
      actions: this.getActions(),
    };
  }
}

export default TeamsProvider;
