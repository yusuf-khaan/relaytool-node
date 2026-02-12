import { ProviderMetadata } from "../../../interface/providerInterface.js";
import JiraClient from "../clients/jiraClient.js";

class JiraProvider {
  private static _instance: JiraClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  /** Lazy singleton client */
  static getClient(): JiraClient {
    if (!this._instance) this._instance = new JiraClient();
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

  /** Provider metadata */
  static metadata(): ProviderMetadata {
    return {
      name: "Jira",
      description: "Issue Tracking Provider",
      authType: "ApiToken",
      actions: this.getActions(),
    };
  }
}

export default JiraProvider;
