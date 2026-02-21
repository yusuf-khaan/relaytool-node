import { ProviderMetadata } from "../../../interface/providerInterface.js";
import TelegramClient from "../clients/telegramClient.js";

class TelegramProvider {
  private static _instance: TelegramClient | null = null;
  private static _actionsCache: any[] | null = null;
  private constructor() {}

  static getClient(): TelegramClient {
    if (!this._instance) this._instance = new TelegramClient();
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
      name: "telegram",
      description: "Telegram Bot API integration",
      authType: "ApiKey",
      actions: this.getActions(),
    };
  }
}

export default TelegramProvider;
