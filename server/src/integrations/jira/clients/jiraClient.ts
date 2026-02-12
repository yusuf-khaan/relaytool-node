import AbstractJiraClient from "./abstractJiraClient.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export interface JiraCredentials {
  email: string;
  apiToken: string;
  baseUrl: string;
}

export default class JiraClient extends AbstractJiraClient {
  private utilityService: Utility;
  private integrationService = new IntegrationDetailService();
  private baseUrl?: string;
  private email?: string;
  private accessToken?: string;

  constructor() {
    super();
    this.utilityService = new Utility();
  }

  async init(request: any): Promise<void> {

    const userId = request?.data?.userId || request?.userId;
    if (!userId) {
      console.warn("JiraClient init failed: Missing userId");
      return;
    }

    try {
      const integration = await this.integrationService.getIntegrationCredential({
        userId,
        slug: "jira",
      });
      console.log("intefration ", integration);

      if (integration?.auth_detail) {
        const details = integration.auth_detail;
        this.email = details.email;
        this.accessToken = details.accessToken;
        this.baseUrl = details.base_url;
      }
    } catch (err) {
      console.warn("Fetch Jira credentials failed:", err);
    }
  }

  // -----------------------------
  // Centralized request handler
  // -----------------------------
  private async sendRequest(request: any, method: string, url: string, data?: any): Promise<any> {
    if (!this.baseUrl || !this.accessToken) {
      await this.init(request);
    }

    if (!this.baseUrl || !this.accessToken) {
      throw new Error("Jira request failed: Missing credentials");
    }

    const fullUrl = `${this.baseUrl}${url}`;
    console.log("JiraClient.sendRequest - fetch config:", {
      method,
      url,
      fullUrl,
      data,
    });

    const basic = btoa(`${this.email}:${this.accessToken}`);

    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Authorization": `Basic ${basic}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : null,
    });

    console.log("Status:", res.status);

    // READ BODY EXACTLY ONCE
    const responseText = await res.text();
    console.log("Response body:", responseText);

    let json: any = null;
    try {
      json = JSON.parse(responseText);
      console.log("Parsed JSON:", json);
    } catch {
      // not JSON, keep raw text
    }

    // If not OK → throw AppError with Jira payload included
    if (!res.ok) {
      const message =
        json?.errorMessages?.join(", ") ||
          json?.errors ? JSON.stringify(json.errors) :
          res.statusText ||
          "Jira API error";
    }

    return json;
  }


  // -----------------------------
  // Jira actions
  // -----------------------------

  async getProjects(request: any): Promise<any> {
    return this.sendRequest(
      request,
      "GET",
      "/project/search",
    );
  }

  async createIssue(request: any): Promise<any> {
    const schema = request?.schemaData ?? [];

    // Log the incoming request
    console.log('Incoming Request Data:', JSON.stringify(request?.data, null, 2));
    console.log('Schema Data:', JSON.stringify(schema, null, 2));

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildCreateIssuePayload()
    );

    // Log the full Jira payload
    console.log('Jira Payload:', JSON.stringify(payload, null, 2));

    // Log only the description field for easier debugging
    if (payload?.fields?.description) {
      console.log('Mapped Description Field:', JSON.stringify(payload.fields.description, null, 2));
    }

    return this.sendRequest(
      request,
      "POST",
      "/issue",
      payload,
    );
  }


  async searchIssues(request: any): Promise<any> {
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSearchIssuesPayload()
    );

    return this.sendRequest(
      request,
      "POST",
      "/search",
      payload,
    );
  }

  async addComment(request: any): Promise<any> {
    const schema = request?.schemaData ?? [];
    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildAddCommentPayload()
    );

    return this.sendRequest(
      request,
      "POST",
      `/issue/${payload.issueKey}/comment`,
      {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: payload.comment }],
            },
          ],
        },
      });
  }

  // -----------------------------
  // Payload builders (canonical shapes)
  // -----------------------------

  buildCreateIssuePayload() {
    return {
      fields: {
        project: {
          key: null, // mapped later from workflow input
        },
        summary: null, // mapped later
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "" } // mapped later
              ]
            }
          ]
        },
        issuetype: {
          id: null, // mapped later
        },
      },
    };
  }


  buildSearchIssuesPayload() {
    return {
      jql: null,
      maxResults: null,
      startAt: null,
    };
  }

  buildAddCommentPayload() {
    return {
      issueKey: null,
      comment: null,
    };
  }

  // -----------------------------
  // Capability descriptor
  // -----------------------------
  pairingFunctionNameAndPayload() {
    return [
      {
        action: "getProjects",
        description: "Fetch Jira projects",
        defaultPayload: {},
      },
      {
        action: "createIssue",
        description: "Create a Jira issue",
        defaultPayload: this.buildCreateIssuePayload(),
      },
      {
        action: "searchIssues",
        description: "Search Jira issues using JQL",
        defaultPayload: this.buildSearchIssuesPayload(),
      },
      {
        action: "addComment",
        description: "Add a comment to a Jira issue",
        defaultPayload: this.buildAddCommentPayload(),
      },
    ];
  }
}
