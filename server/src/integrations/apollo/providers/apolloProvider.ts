import { ProviderMetadata } from "../../../interface/providerInterface.js";
import ApolloClient from "../clients/apolloClient.js";

class ApolloProvider {
  private static _instance: ApolloClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  /** Lazy singleton client */
  static getClient(): ApolloClient {
    if (!this._instance) this._instance = new ApolloClient();
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
      name: "apollo",
      description: "Apollo Provider",
      authType: "Oauth",
      actions: this.getActions(),
    };
  }
}

export default ApolloProvider;
