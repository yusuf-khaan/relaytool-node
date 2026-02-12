import { google, gmail_v1, Auth } from "googleapis";
import AbstractGmailClient from "./abstractGmailClient.js";
import auth from "../../../config/auth.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export interface GmailToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export default class GmailClient extends AbstractGmailClient {
  private gmail?: gmail_v1.Gmail;
  private oauth2Client?: Auth.OAuth2Client;
  private utilityService?: Utility;
  private integrationService = new IntegrationDetailService();

  constructor() {
    super();
    const { client_id, client_secret, redirect_uri } = auth.gmail;
    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );
  }

  /* =======================
     Init (SAFE)
  ======================= */

  async init(request: any): Promise<boolean> {
    try {
      this.utilityService = new Utility();

      const userId = request?.data?.userId || request?.userId;
      if (!userId) return false;

      const token = await this.fetchTokenFromDB(userId);
      console.log("token ", token);
      if (!token) return false;

      this.oauth2Client = new google.auth.OAuth2(
        auth.gmail.client_id!,
        auth.gmail.client_secret!,
        auth.gmail.redirect_uri!
      );

      this.oauth2Client.setCredentials(token);

      this.gmail = google.gmail({
        version: "v1",
        auth: this.oauth2Client,
      });

      return true;
    } catch (err) {
      console.warn("Gmail init failed:", err);
      return false;
    }
  }

  /* =======================
     DB
  ======================= */

  private async fetchTokenFromDB(userId: string): Promise<GmailToken | null> {
    try {
      console.log("userId ", userId);
      const integration =
        await this.integrationService.getIntegrationCredential({
          userId,
          slug: "gmail",
        });

      if (!integration?.auth_detail?.access_token) return null;

      return integration.auth_detail as GmailToken;
    } catch (err) {
      console.warn("Fetch Gmail token failed:", err);
      return null;
    }
  }

  /* =======================
     Send Email (SAFE)
  ======================= */

  async sendEmail(request: any): Promise<gmail_v1.Schema$Message> {
    console.log("this is request data 9111", request);
    if (!this.gmail) {
      const ready = await this.init(request);
      if (!ready) return {} as gmail_v1.Schema$Message;
    }
    console.log("heree 96666");

    try {
      const schema = request?.schemaData ?? [];
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        this.buildEmailPayload()
      );
    console.log("payload 10555", payload);


      const encodedMessage = this.buildGmailMime(payload);

      const res = await this.gmail!.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      });
      console.log("response 11444 ", res);

      return res.data;
    } catch (err) {
      console.warn("Gmail sendEmail failed:", err);
      return {} as gmail_v1.Schema$Message;
    }
  }

  buildEmailPayload() {
    return {
      to: null,
      subject: null,
      message: null,
      html: null,
      text: null,
    };
  }

  buildGmailMime(payload: any): string {
    const boundary = "boundary_" + Date.now();

    const raw = [
      `From: me`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject ?? ""}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      payload.text || payload.message || "",
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      payload.html || "",
      `--${boundary}--`,
      ``,
    ].join("\n");

    return Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /* =======================
     Get Emails (SAFE)
  ======================= */

  async getEmails(
    request: any
  ): Promise<gmail_v1.Schema$ListMessagesResponse> {
    if (!this.gmail) {
      const ready = await this.init(request);
      if (!ready) return {} as gmail_v1.Schema$ListMessagesResponse;
    }

    try {
      const schema = request?.schemaData ?? [];

      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        this.buildGmailListPayload()
      );

      const res = await this.gmail!.users.messages.list(payload);
      return res.data;
    } catch (err) {
      console.warn("Gmail getEmails failed:", err);
      return {} as gmail_v1.Schema$ListMessagesResponse;
    }
  }

  buildGmailListPayload() {
    return {
      userId: "me",
      maxResults: null,
      labelIds: null,
      q: null,
      pageToken: null,
      includeSpamTrash: null,
    };
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendEmail",
        description: "Send an email using Gmail API",
        defaultPayload: this.buildEmailPayload(),
      },
      {
        action: "getEmails",
        description: "Fetch list of emails from Gmail inbox",
        defaultPayload: this.buildGmailListPayload(),
      },
    ];
  }
}
