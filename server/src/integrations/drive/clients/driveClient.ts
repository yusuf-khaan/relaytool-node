import { google, drive_v3, Auth } from "googleapis";
import AbstractDriveClient from "./abstractDriveClient.js";
import auth from "../../../config/auth.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export interface DriveToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export default class DriveClient extends AbstractDriveClient {
  private drive?: drive_v3.Drive;
  private oauth2Client?: Auth.OAuth2Client;
  private utilityService?: Utility;
  private integrationService = new IntegrationDetailService();

  constructor() {
    super();
    const { client_id, client_secret, redirect_uri } = auth.drive;
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
        auth.drive.client_id!,
        auth.drive.client_secret!,
        auth.drive.redirect_uri!,
      );
      this.oauth2Client.setCredentials(token);

      this.drive = google.drive({
        version: "v3",
        auth: this.oauth2Client,
      });
      return true;
    } catch (error) {
      console.warn("Drive init failed:", error);
      return false;
    }
  }

  private async fetchTokenFromDB(userId: string): Promise<DriveToken | null> {
    try {
      const integration = await this.integrationService.getIntegrationCredential(
        {
          userId,
          slug: "drive",
        },
      );

      if (!integration?.auth_detail?.access_token) return null;
      return integration.auth_detail as DriveToken;
    } catch (error) {
      console.warn("Fetch Drive token failed:", error);
      return null;
    }
  }

  async listFiles(request: any): Promise<drive_v3.Schema$FileList> {
    if (!this.drive) {
      const ready = await this.init(request);
      if (!ready) return {} as drive_v3.Schema$FileList;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildListFilesPayload(),
      );

      const response = await this.drive!.files.list({
        pageSize: payload.pageSize,
        q: payload.q,
        fields: payload.fields,
      });
      return response.data;
    } catch (error) {
      console.warn("Drive listFiles failed:", error);
      return {} as drive_v3.Schema$FileList;
    }
  }

  async createFolder(request: any): Promise<drive_v3.Schema$File> {
    if (!this.drive) {
      const ready = await this.init(request);
      if (!ready) return {} as drive_v3.Schema$File;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildCreateFolderPayload(),
      );

      const response = await this.drive!.files.create({
        requestBody: {
          name: payload.name,
          mimeType: "application/vnd.google-apps.folder",
          parents: payload.parentId ? [payload.parentId] : null,
        },
        fields: "id,name,mimeType,webViewLink",
      });
      return response.data;
    } catch (error) {
      console.warn("Drive createFolder failed:", error);
      return {} as drive_v3.Schema$File;
    }
  }

  async uploadTextFile(request: any): Promise<drive_v3.Schema$File> {
    if (!this.drive) {
      const ready = await this.init(request);
      if (!ready) return {} as drive_v3.Schema$File;
    }

    try {
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        request?.schemaData ?? [],
        this.buildUploadTextFilePayload(),
      );

      const response = await this.drive!.files.create({
        requestBody: {
          name: payload.name,
          parents: payload.parentId ? [payload.parentId] : null,
        },
        media: {
          mimeType: payload.mimeType,
          body: payload.content ?? "",
        },
        fields: "id,name,mimeType,webViewLink",
      });
      return response.data;
    } catch (error) {
      console.warn("Drive uploadTextFile failed:", error);
      return {} as drive_v3.Schema$File;
    }
  }

  private buildListFilesPayload() {
    return {
      pageSize: 20,
      q: null,
      fields: "files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken",
    };
  }

  private buildCreateFolderPayload() {
    return {
      name: null,
      parentId: null,
    };
  }

  private buildUploadTextFilePayload() {
    return {
      name: null,
      content: null,
      mimeType: "text/plain",
      parentId: null,
    };
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "listFiles",
        description: "List files from Google Drive.",
        defaultPayload: this.buildListFilesPayload(),
      },
      {
        action: "createFolder",
        description: "Create a folder in Google Drive.",
        defaultPayload: this.buildCreateFolderPayload(),
      },
      {
        action: "uploadTextFile",
        description: "Upload a text file to Google Drive.",
        defaultPayload: this.buildUploadTextFilePayload(),
      },
    ];
  }
}
