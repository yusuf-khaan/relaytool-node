import { ProviderMetadata } from "../../../interface/providerInterface.js";
import DriveClient from "../clients/driveClient.js";

class DriveProvider {
  private static _instance: DriveClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  static getClient(): DriveClient {
    if (!this._instance) this._instance = new DriveClient();
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
      name: "Drive",
      description: "Google Drive Provider",
      authType: "Oauth",
      actions: this.getActions(),
    };
  }
}

export default DriveProvider;
