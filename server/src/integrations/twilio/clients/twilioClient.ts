import twilio from "twilio";
import AbstractTwilioClient from "./abstractTwilio.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export default class TwilioClient extends AbstractTwilioClient {
  private client!: ReturnType<typeof twilio>;
  private utilityService!: Utility;
  private integrationDetailService = new IntegrationDetailService();
  private static connectionMap = new Map<string, ReturnType<typeof twilio>>();

  constructor() {
    super();
  }

  async init(accountSid: string, authToken: string): Promise<void> {

    if (!this.utilityService) {
      this.utilityService = new Utility();
    }
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials (account_sid & auth_token) are required");
    }
    this.client = twilio(accountSid, authToken);
  }

  private async ensureInitWithDefaults(request: any) {
    const userId = request?.data?.userId || request?.userId;
    if (!userId) {
      throw new Error("userId missing");
    }

    const auth = await this.getIntegrationDetails(userId);
    const key = `${auth.accountSid}:${auth.authToken}`;

    if (TwilioClient.connectionMap.has(key)) {
      this.client = TwilioClient.connectionMap.get(key)!;
      return;
    }

    await this.init(auth.accountSid, auth.authToken);
    TwilioClient.connectionMap.set(key, this.client);
  }

  private async getIntegrationDetails(userId: string) {
    if (!userId) {
      throw new Error("userId is required to fetch integration credentials");
    }
    const credential =
      await this.integrationDetailService.getIntegrationCredential({
        userId,
        slug: "twilio",
      });

    if (!credential) {
      throw new Error("Twilio integration not configured for this user");
    }

    const auth = credential.auth_detail;
    if (!auth) {
      throw new Error("Twilio auth_detail missing");
    }

    return {
      accountSid: auth.accountSid,
      authToken: auth.authToken,
    };
  }

  async sendSMS(request: any) {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(request?.data, schema || [], this.buildSMSPayload());
    const msg = await this.client.messages.create(payload);
    return msg;
  }

  buildSMSPayload() {
    return {
      to: null,
      from: null,
      body: null
    }
  }

  async makeCall(request: any) {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(request?.data, schema || [], this.buildCallPayload());
    const call = await this.client.calls.create(payload);
    return call;
  }

  buildCallPayload() {
    return {
      to: null,
      from: null,
      url: null
    }
  }

  buildMessageIdPayload() {
    return { messageSid: null };
  }


  async getMessageDetails(request: any) {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(request?.data, schema || [], this.buildMessageIdPayload());

    if (!payload.messageSid) throw new Error("messageSid is required");

    const message = await this.client.messages(payload.messageSid).fetch();
    return message;
  }

  buildListMessagesPayload(){
    return {limit: null};
  }

  async listMessages(request: any) {
    await this.ensureInitWithDefaults(request);
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(request?.data, schema || [], this.buildListMessagesPayload());
    const messages = await this.client.messages.list({ limit: payload.limit });
    return messages;
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendSMS",
        description: "Send an SMS using Twilio API",
        defaultPayload: this.buildSMSPayload(),
      },
      {
        action: "makeCall",
        description: "Make a call using Twilio API",
        defaultPayload: this.buildCallPayload(),
      },
      {
        action: "getMessageDetails",
        description: "Get details of a message",
        defaultPayload: this.buildMessageIdPayload(),
      },
      {
        action: "listMessages",
        description: "List messages",
        defaultPayload: this.buildListMessagesPayload(),
      }
    ];
  }

}
