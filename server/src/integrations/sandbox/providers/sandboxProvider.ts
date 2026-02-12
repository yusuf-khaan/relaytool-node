import { ProviderMetadata } from "../../../interface/providerInterface.js";
import SandboxClient from "../clients/sandboxClient.js";

class SandboxProvider {
  private static _instance: SandboxClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() {}

  /** Lazy singleton client */
  static getClient(): SandboxClient {
    if (!this._instance) this._instance = new SandboxClient();
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
      name: "Compiler Sandbox",
      description: "Relayhook Compiler Sandbox Enviroment For Custom Logic Implementation",
      authType: "none",
      actions: this.getActions(),
    };
  }
}

export default SandboxProvider;
