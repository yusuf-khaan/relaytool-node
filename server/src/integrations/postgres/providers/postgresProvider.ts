import { ProviderMetadata } from "../../../interface/providerInterface.js";
import PostgresClient from "../clients/postgresClient.js";

class PostgresProvider {
  private static _instance: PostgresClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  /** Lazy singleton client */
  static getClient(): PostgresClient {
    if (!this._instance) this._instance = new PostgresClient();
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
      name: "Postgres",
      description: "PostgreSQL Provider",
      authType: "Oauth",
      actions: this.getActions(),
    };
  }
}

export default PostgresProvider;
