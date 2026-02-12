import { ProviderMetadata } from "../../../interface/providerInterface.js";
import TwilioClient from "../clients/twilioClient.js";

class TwilioProvider {
  private static _instance: TwilioClient | null = null;
  private static _actionsCache: any[] | null = null;

  private constructor() { }

  static getClient(): TwilioClient {
    if (!this._instance) this._instance = new TwilioClient();
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
      name: "twilio",
      description: "Send SMS, Make Calls, and manage messages via Twilio API",
      authType: "apiKey",
      actions: this.getActions(),
    };
  }
}

export default TwilioProvider;
