import { ProviderMetadata } from "../../../interface/providerInterface.js";
import NodesClient from "../clients/nodesClient.js";

class NodesProvider {
  private static _instance: NodesClient | null = null;
  private static _actionsCache: string[] | null = null;

  private constructor() {}

  static getClient(): NodesClient {
    if (!this._instance) this._instance = new NodesClient();
    return this._instance;
  }

  static getActions(): string[] {
    if (!this._actionsCache) {
      const client = this.getClient();
      const proto = Object.getPrototypeOf(client);
      this._actionsCache = Object.getOwnPropertyNames(proto).filter(
        (name) =>
          typeof (client as any)[name] === "function" && name !== "constructor"
      );
    }
    return this._actionsCache;
  }

  static metadata(): ProviderMetadata {
    return {
      name: "nodes",
      description: "nodes",
      authType: "none",
      actions: this.getActions(),
    };
  }
}

export default NodesProvider;
