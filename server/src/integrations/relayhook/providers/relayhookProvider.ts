import { RelayhookClient } from "../clients/relayhookClient.js";

class RelayhookProvider {
  private static _instance: RelayhookClient | null = null;
  private constructor() {}

  static getClient(): RelayhookClient {
    if (!this._instance) this._instance = new RelayhookClient();
    return this._instance;
  }
}

export default RelayhookProvider;
