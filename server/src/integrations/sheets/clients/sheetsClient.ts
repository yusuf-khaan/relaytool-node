import { google, sheets_v4, Auth } from "googleapis";
import AbstractSheetsClient from "./abstractSheetsClient.js";
import auth from "../../../config/auth.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export interface SheetsToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export default class SheetsClient extends AbstractSheetsClient {
  private sheets?: sheets_v4.Sheets;
  private oauth2Client?: Auth.OAuth2Client;
  private utilityService?: Utility;
  private integrationService = new IntegrationDetailService();

  constructor() {
    super();
    const { client_id, client_secret, redirect_uri } = auth.sheets;
    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri,
    );
  }

  async init(request: any): Promise<boolean> {
    try {
      this.utilityService = new Utility();
      const userId = request?.data?.userId || request?.userId;
      if (!userId) return false;

      const token = await this.fetchTokenFromDB(userId);
      if (!token) return false;

      this.oauth2Client = new google.auth.OAuth2(
        auth.sheets.client_id!,
        auth.sheets.client_secret!,
        auth.sheets.redirect_uri!,
      );
      this.oauth2Client.setCredentials(token);

      this.sheets = google.sheets({
        version: "v4",
        auth: this.oauth2Client,
      });
      return true;
    } catch (error) {
      console.warn("Sheets init failed:", error);
      return false;
    }
  }

  private async fetchTokenFromDB(userId: string): Promise<SheetsToken | null> {
    try {
      let integration = await this.integrationService.getIntegrationCredential({
        userId,
        slug: "sheets",
      });

      if (!integration?.auth_detail?.access_token) {
        integration = await this.integrationService.getIntegrationCredential({
          userId,
          slug: "sheet",
        });
      }

      if (!integration?.auth_detail?.access_token) return null;
      return integration.auth_detail as SheetsToken;
    } catch (error) {
      console.warn("Fetch Sheets token failed:", error);
      return null;
    }
  }

  async createSheet(request: any): Promise<sheets_v4.Schema$Spreadsheet> {
    if (!this.sheets) {
      const ready = await this.init(request);
      if (!ready) return {} as sheets_v4.Schema$Spreadsheet;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildCreateSheetPayload(),
      );
      const response = await this.sheets!.spreadsheets.create({
        requestBody: {
          properties: { title: payload.title },
        },
        fields: "spreadsheetId,properties.title,spreadsheetUrl",
      });
      return response.data;
    } catch (error) {
      console.warn("Sheets createSheet failed:", error);
      return {} as sheets_v4.Schema$Spreadsheet;
    }
  }

  async readData(request: any): Promise<sheets_v4.Schema$ValueRange> {
    if (!this.sheets) {
      const ready = await this.init(request);
      if (!ready) return {} as sheets_v4.Schema$ValueRange;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildReadPayload(),
      );
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: payload.spreadsheetId,
        range: payload.range,
      });
      return response.data;
    } catch (error) {
      console.warn("Sheets readData failed:", error);
      return {} as sheets_v4.Schema$ValueRange;
    }
  }

  async appendData(
    request: any,
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    if (!this.sheets) {
      const ready = await this.init(request);
      if (!ready) return {} as sheets_v4.Schema$AppendValuesResponse;
    }
  console.log("sheet data:\n", JSON.stringify(request?.data, null, 2));
  console.log("sheet schema:\n", JSON.stringify(request?.schemaData, null, 2));
    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildWritePayload(),
      );
      console.log("AppendData payload:", payload); // Debug log
      if (typeof payload.values === "string") {
        payload.values = JSON.parse(payload.values);
      }
      if (payload.values && !Array.isArray(payload.values[0])) {
        payload.values = [payload.values];
      }
      const response = await this.sheets!.spreadsheets.values.append({
        spreadsheetId: payload.spreadsheetId,
        range: payload.range,
        valueInputOption: payload.valueInputOption,
        requestBody: { values: payload.values },
      });
        console.log("sheet response:\n", JSON.stringify(response, null, 2));

      return response.data;
    } catch (error) {
      console.warn("Sheets appendData failed:", error);
      return {} as sheets_v4.Schema$AppendValuesResponse;
    }
  }

  async writeData(
    request: any,
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    if (!this.sheets) {
      const ready = await this.init(request);
      if (!ready) return {} as sheets_v4.Schema$UpdateValuesResponse;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildWritePayload(),
      );
      const response = await this.sheets!.spreadsheets.values.update({
        spreadsheetId: payload.spreadsheetId,
        range: payload.range,
        valueInputOption: payload.valueInputOption,
        requestBody: { values: payload.values },
      });
      return response.data;
    } catch (error) {
      console.warn("Sheets writeData failed:", error);
      return {} as sheets_v4.Schema$UpdateValuesResponse;
    }
  }

  private buildCreateSheetPayload() {
    return {
      title: null,
    };
  }

  private buildReadPayload() {
    return {
      spreadsheetId: null,
      range: "Sheet1!A1:Z1000",
    };
  }

  private buildWritePayload() {
    return {
      spreadsheetId: null,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      values: null,
    };
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "createSheet",
        description: "Create a new Google Sheet.",
        defaultPayload: this.buildCreateSheetPayload(),
      },
      {
        action: "readData",
        description: "Read values from a Google Sheet range.",
        defaultPayload: this.buildReadPayload(),
      },
      {
        action: "appendData",
        description: "Append rows into a Google Sheet range.",
        defaultPayload: this.buildWritePayload(),
      },
      {
        action: "writeData",
        description: "Overwrite values in a Google Sheet range.",
        defaultPayload: this.buildWritePayload(),
      },
    ];
  }
}
