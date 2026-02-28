import AbstractTeamsClient from "./abstractTeams.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

interface TeamsCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  defaultTeamId?: string;
  defaultChannelId?: string;
  defaultUserId?: string;
  scope?: string;
}

export default class TeamsClient extends AbstractTeamsClient {
  private utilityService!: Utility;
  private integrationDetailService = new IntegrationDetailService();
  private tenantId: string | undefined;
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private defaultTeamId: string | undefined;
  private defaultChannelId: string | undefined;
  private defaultUserId: string | undefined;
  private scope: string = "https://graph.microsoft.com/.default";
  private accessToken: string | undefined;
  private accessTokenExpiryEpochMs: number = 0;
  private readonly graphBaseUrl = "https://graph.microsoft.com/v1.0";

  constructor() {
    super();
  }

  async init(request: any): Promise<void> {
    if (!this.utilityService) {
      this.utilityService = new Utility();
    }

    const userId = request?.data?.userId || request?.userId;
    if (!userId) {
      throw new Error("userId is required for Microsoft Teams init");
    }

    const credentials = await this.getIntegrationDetails(String(userId));
    this.tenantId = credentials.tenantId;
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.defaultTeamId = credentials.defaultTeamId;
    this.defaultChannelId = credentials.defaultChannelId;
    this.defaultUserId = credentials.defaultUserId;
    this.scope = credentials.scope || "https://graph.microsoft.com/.default";
  }

  private async ensureInit(request: any) {
    if (!this.tenantId || !this.clientId || !this.clientSecret || !this.utilityService) {
      await this.init(request);
    }
  }

  private async getIntegrationDetails(userId: string): Promise<TeamsCredentials> {
    const credential = await this.integrationDetailService.getIntegrationCredential({
      userId,
      slug: "teams",
    });

    if (!credential?.auth_detail) {
      throw new Error("Microsoft Teams integration not configured for this user");
    }

    const auth = credential.auth_detail;
    const tenantId = auth.tenantId || auth.tenant_id;
    const clientId = auth.clientId || auth.client_id;
    const clientSecret = auth.clientSecret || auth.client_secret;
    const defaultTeamId = auth.defaultTeamId || auth.default_team_id || auth.teamId || auth.team_id;
    const defaultChannelId = auth.defaultChannelId || auth.default_channel_id || auth.channelId || auth.channel_id;
    const defaultUserId = auth.defaultUserId || auth.default_user_id || auth.graphUserId || auth.graph_user_id;
    const scope = auth.scope;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Teams credentials missing in auth_detail (tenantId, clientId, clientSecret)");
    }

    return {
      tenantId: String(tenantId),
      clientId: String(clientId),
      clientSecret: String(clientSecret),
      ...(defaultTeamId ? { defaultTeamId: String(defaultTeamId) } : {}),
      ...(defaultChannelId ? { defaultChannelId: String(defaultChannelId) } : {}),
      ...(defaultUserId ? { defaultUserId: String(defaultUserId) } : {}),
      ...(scope ? { scope: String(scope) } : {}),
    };
  }

  private async fetchAccessToken(request?: any): Promise<void> {
    await this.ensureInit(request);
    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      throw new Error("Teams client credentials not initialized");
    }

    if (this.accessToken && Date.now() < this.accessTokenExpiryEpochMs - 60_000) {
      return;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", this.clientId);
    body.append("client_secret", this.clientSecret);
    body.append("scope", this.scope);

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const raw = await res.text();
    let responseData: any = raw;
    try {
      responseData = JSON.parse(raw);
    } catch {
      responseData = raw;
    }

    if (!res.ok) {
      throw new Error(
        typeof responseData === "string"
          ? responseData
          : responseData.error_description || `${res.status} ${res.statusText}`,
      );
    }

    const accessToken = responseData?.access_token;
    const expiresIn = Number(responseData?.expires_in || 3600);
    if (!accessToken) {
      throw new Error("Failed to get Graph access token");
    }
    this.accessToken = String(accessToken);
    this.accessTokenExpiryEpochMs = Date.now() + expiresIn * 1000;
  }

  private async graphRequest(
    method: string,
    path: string,
    request?: any,
    payload?: Record<string, any>,
  ): Promise<any> {
    await this.fetchAccessToken(request);
    if (!this.accessToken) {
      throw new Error("Graph access token not initialized");
    }

    const url = `${this.graphBaseUrl}${path}`;
    const body = payload ? JSON.stringify(payload) : null;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.status === 204) {
      return { success: true, status: 204 };
    }

    const raw = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const responseData = contentType.includes("application/json")
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        })()
      : raw;

    if (!res.ok) {
      throw new Error(
        typeof responseData === "string"
          ? responseData
          : responseData?.error?.message || `${res.status} ${res.statusText}`,
      );
    }

    return responseData;
  }

  private buildFromSchema(request: any, basePayload: Record<string, any>) {
    const schema = request?.schemaData ?? [];
    return this.utilityService.buildPayloadFromSchema(request?.data, schema, basePayload);
  }

  private resolveUserId(inputUserId: any): string {
    const userId = inputUserId || this.defaultUserId;
    if (!userId) {
      throw new Error("userId (Graph user id/upn) is required");
    }
    return String(userId);
  }

  private resolveTeamAndChannel(payload: Record<string, any>) {
    const teamId = payload.teamId || this.defaultTeamId;
    const channelId = payload.channelId || this.defaultChannelId;
    if (!teamId || !channelId) {
      throw new Error("teamId and channelId are required (or configure defaults in auth_detail)");
    }
    return { teamId: String(teamId), channelId: String(channelId) };
  }

  buildSendMessagePayload() {
    return {
      teamId: null,
      channelId: null,
      text: null,
      contentType: "html",
      subject: null,
    };
  }

  async sendMessage(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildSendMessagePayload());
    const { teamId, channelId } = this.resolveTeamAndChannel(payload);

    if (!payload.text) {
      throw new Error("text is required");
    }
    const contentType = payload.contentType === "text" ? "text" : "html";
    const body: Record<string, any> = {
      body: {
        contentType,
        content: String(payload.text),
      },
    };
    if (payload.subject) {
      body.subject = String(payload.subject);
    }
    return this.graphRequest("POST", `/teams/${teamId}/channels/${channelId}/messages`, request, body);
  }

  buildReplyToMessagePayload() {
    return {
      teamId: null,
      channelId: null,
      messageId: null,
      text: null,
      contentType: "html",
    };
  }

  async replyToMessage(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildReplyToMessagePayload());
    const { teamId, channelId } = this.resolveTeamAndChannel(payload);
    const messageId = payload.messageId;
    if (!messageId || !payload.text) {
      throw new Error("messageId and text are required");
    }
    const contentType = payload.contentType === "text" ? "text" : "html";
    return this.graphRequest(
      "POST",
      `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`,
      request,
      { body: { contentType, content: String(payload.text) } },
    );
  }

  buildListJoinedTeamsPayload() {
    return { graphUserId: null };
  }

  async listJoinedTeams(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListJoinedTeamsPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId || request?.data?.graphUserId);
    return this.graphRequest("GET", `/users/${encodeURIComponent(graphUserId)}/joinedTeams`, request);
  }

  buildGetTeamPayload() {
    return { teamId: null };
  }

  async getTeam(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildGetTeamPayload());
    const teamId = String(payload.teamId || this.defaultTeamId || "");
    if (!teamId) throw new Error("teamId is required");
    return this.graphRequest("GET", `/teams/${teamId}`, request);
  }

  buildListChannelsPayload() {
    return { teamId: null };
  }

  async listChannels(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListChannelsPayload());
    const teamId = String(payload.teamId || this.defaultTeamId || "");
    if (!teamId) throw new Error("teamId is required");
    return this.graphRequest("GET", `/teams/${teamId}/channels`, request);
  }

  buildGetChannelPayload() {
    return {
      teamId: null,
      channelId: null,
    };
  }

  async getChannel(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildGetChannelPayload());
    const { teamId, channelId } = this.resolveTeamAndChannel(payload);
    return this.graphRequest("GET", `/teams/${teamId}/channels/${channelId}`, request);
  }

  buildCreateChannelPayload() {
    return {
      teamId: null,
      displayName: null,
      description: null,
      membershipType: "standard",
    };
  }

  async createChannel(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildCreateChannelPayload());
    const teamId = String(payload.teamId || this.defaultTeamId || "");
    if (!teamId || !payload.displayName) {
      throw new Error("teamId and displayName are required");
    }
    const body = {
      displayName: String(payload.displayName),
      description: payload.description ? String(payload.description) : "",
      membershipType: String(payload.membershipType || "standard"),
    };
    return this.graphRequest("POST", `/teams/${teamId}/channels`, request, body);
  }

  buildListChannelMessagesPayload() {
    return {
      teamId: null,
      channelId: null,
      top: null,
    };
  }

  async listChannelMessages(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListChannelMessagesPayload());
    const { teamId, channelId } = this.resolveTeamAndChannel(payload);
    const top = payload.top ? `?$top=${Number(payload.top)}` : "";
    return this.graphRequest("GET", `/teams/${teamId}/channels/${channelId}/messages${top}`, request);
  }

  buildCreateChatPayload() {
    return {
      chatType: "group",
      topic: null,
      members: [],
    };
  }

  async createChat(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildCreateChatPayload());
    if (!Array.isArray(payload.members) || payload.members.length === 0) {
      throw new Error("members array is required");
    }
    const body: Record<string, any> = {
      chatType: String(payload.chatType || "group"),
      members: payload.members,
    };
    if (payload.topic) {
      body.topic = String(payload.topic);
    }
    return this.graphRequest("POST", "/chats", request, body);
  }

  buildSendChatMessagePayload() {
    return {
      chatId: null,
      text: null,
      contentType: "html",
    };
  }

  async sendChatMessage(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildSendChatMessagePayload());
    if (!payload.chatId || !payload.text) {
      throw new Error("chatId and text are required");
    }
    const contentType = payload.contentType === "text" ? "text" : "html";
    return this.graphRequest(
      "POST",
      `/chats/${payload.chatId}/messages`,
      request,
      { body: { contentType, content: String(payload.text) } },
    );
  }

  buildListChatMessagesPayload() {
    return {
      chatId: null,
      top: null,
    };
  }

  async listChatMessages(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListChatMessagesPayload());
    if (!payload.chatId) {
      throw new Error("chatId is required");
    }
    const top = payload.top ? `?$top=${Number(payload.top)}` : "";
    return this.graphRequest("GET", `/chats/${payload.chatId}/messages${top}`, request);
  }

  buildCreateOnlineMeetingPayload() {
    return {
      graphUserId: null,
      subject: null,
      startDateTime: null,
      endDateTime: null,
      externalId: null,
    };
  }

  async createOnlineMeeting(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildCreateOnlineMeetingPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId);
    if (!payload.startDateTime || !payload.endDateTime) {
      throw new Error("startDateTime and endDateTime are required");
    }
    const body: Record<string, any> = {
      startDateTime: String(payload.startDateTime),
      endDateTime: String(payload.endDateTime),
    };
    if (payload.subject) body.subject = String(payload.subject);
    if (payload.externalId) body.externalId = String(payload.externalId);
    return this.graphRequest(
      "POST",
      `/users/${encodeURIComponent(graphUserId)}/onlineMeetings`,
      request,
      body,
    );
  }

  buildGetOnlineMeetingPayload() {
    return {
      graphUserId: null,
      meetingId: null,
    };
  }

  async getOnlineMeeting(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildGetOnlineMeetingPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId);
    if (!payload.meetingId) {
      throw new Error("meetingId is required");
    }
    return this.graphRequest(
      "GET",
      `/users/${encodeURIComponent(graphUserId)}/onlineMeetings/${payload.meetingId}`,
      request,
    );
  }

  buildListOnlineMeetingsPayload() {
    return {
      graphUserId: null,
      top: null,
    };
  }

  async listOnlineMeetings(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListOnlineMeetingsPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId);
    const top = payload.top ? `?$top=${Number(payload.top)}` : "";
    return this.graphRequest(
      "GET",
      `/users/${encodeURIComponent(graphUserId)}/onlineMeetings${top}`,
      request,
    );
  }

  buildCreateCalendarEventMeetingPayload() {
    return {
      graphUserId: null,
      subject: null,
      bodyContent: null,
      bodyContentType: "HTML",
      timezone: "UTC",
      startDateTime: null,
      endDateTime: null,
      attendees: [],
    };
  }

  async createCalendarEventMeeting(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildCreateCalendarEventMeetingPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId);
    if (!payload.subject || !payload.startDateTime || !payload.endDateTime) {
      throw new Error("subject, startDateTime and endDateTime are required");
    }
    const body: Record<string, any> = {
      subject: String(payload.subject),
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      body: {
        contentType: String(payload.bodyContentType || "HTML"),
        content: String(payload.bodyContent || ""),
      },
      start: {
        dateTime: String(payload.startDateTime),
        timeZone: String(payload.timezone || "UTC"),
      },
      end: {
        dateTime: String(payload.endDateTime),
        timeZone: String(payload.timezone || "UTC"),
      },
    };
    if (Array.isArray(payload.attendees) && payload.attendees.length > 0) {
      body.attendees = payload.attendees;
    }
    return this.graphRequest(
      "POST",
      `/users/${encodeURIComponent(graphUserId)}/events`,
      request,
      body,
    );
  }

  buildListCalendarEventsPayload() {
    return {
      graphUserId: null,
      top: null,
    };
  }

  async listCalendarEvents(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListCalendarEventsPayload());
    const graphUserId = this.resolveUserId(payload.graphUserId);
    const top = payload.top ? `?$top=${Number(payload.top)}` : "";
    return this.graphRequest("GET", `/users/${encodeURIComponent(graphUserId)}/events${top}`, request);
  }

  buildListUsersPayload() {
    return {
      top: null,
      select: null,
      filter: null,
    };
  }

  async listUsers(request: any): Promise<any> {
    await this.ensureInit(request);
    const payload = this.buildFromSchema(request, this.buildListUsersPayload());
    const params: string[] = [];
    if (payload.top) params.push(`$top=${Number(payload.top)}`);
    if (payload.select) params.push(`$select=${encodeURIComponent(String(payload.select))}`);
    if (payload.filter) params.push(`$filter=${encodeURIComponent(String(payload.filter))}`);
    const query = params.length ? `?${params.join("&")}` : "";
    return this.graphRequest("GET", `/users${query}`, request);
  }

  buildSendRawPayload() {
    return {
      endpoint: null,
      method: "POST",
      payload: null,
    };
  }

  async sendRawPayload(request: any): Promise<any> {
    await this.ensureInit(request);
    const mapped = this.buildFromSchema(request, this.buildSendRawPayload());

    const endpoint = mapped.endpoint ?? request?.data?.endpoint;
    if (!endpoint || typeof endpoint !== "string" || !endpoint.startsWith("/")) {
      throw new Error("endpoint must be a string starting with '/'");
    }
    const method = String(mapped.method || request?.data?.method || "POST").toUpperCase();
    const payload = mapped.payload ?? request?.data?.payload;
    if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      throw new Error("Unsupported method");
    }
    if ((method === "POST" || method === "PATCH" || method === "PUT") && (!payload || typeof payload !== "object")) {
      throw new Error("payload object is required for write methods");
    }
    return this.graphRequest(method, endpoint, request, payload);
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendMessage",
        description: "Send channel message via Microsoft Graph API",
        defaultPayload: this.buildSendMessagePayload(),
      },
      {
        action: "replyToMessage",
        description: "Reply to a Teams channel message",
        defaultPayload: this.buildReplyToMessagePayload(),
      },
      {
        action: "listJoinedTeams",
        description: "List teams joined by a user",
        defaultPayload: this.buildListJoinedTeamsPayload(),
      },
      {
        action: "getTeam",
        description: "Get team details by teamId",
        defaultPayload: this.buildGetTeamPayload(),
      },
      {
        action: "listChannels",
        description: "List channels in a team",
        defaultPayload: this.buildListChannelsPayload(),
      },
      {
        action: "getChannel",
        description: "Get a channel by teamId and channelId",
        defaultPayload: this.buildGetChannelPayload(),
      },
      {
        action: "createChannel",
        description: "Create a channel in a team",
        defaultPayload: this.buildCreateChannelPayload(),
      },
      {
        action: "listChannelMessages",
        description: "List messages in a channel",
        defaultPayload: this.buildListChannelMessagesPayload(),
      },
      {
        action: "createChat",
        description: "Create a Teams chat",
        defaultPayload: this.buildCreateChatPayload(),
      },
      {
        action: "sendChatMessage",
        description: "Send a message in a chat",
        defaultPayload: this.buildSendChatMessagePayload(),
      },
      {
        action: "listChatMessages",
        description: "List messages in a chat",
        defaultPayload: this.buildListChatMessagesPayload(),
      },
      {
        action: "createOnlineMeeting",
        description: "Create an online meeting for a user",
        defaultPayload: this.buildCreateOnlineMeetingPayload(),
      },
      {
        action: "getOnlineMeeting",
        description: "Get an online meeting by meetingId",
        defaultPayload: this.buildGetOnlineMeetingPayload(),
      },
      {
        action: "listOnlineMeetings",
        description: "List online meetings for a user",
        defaultPayload: this.buildListOnlineMeetingsPayload(),
      },
      {
        action: "createCalendarEventMeeting",
        description: "Create a calendar event with Teams meeting link",
        defaultPayload: this.buildCreateCalendarEventMeetingPayload(),
      },
      {
        action: "listCalendarEvents",
        description: "List calendar events for a user",
        defaultPayload: this.buildListCalendarEventsPayload(),
      },
      {
        action: "listUsers",
        description: "List tenant users via Microsoft Graph",
        defaultPayload: this.buildListUsersPayload(),
      },
      {
        action: "sendRawPayload",
        description: "Send raw Graph request using endpoint, method, and payload",
        defaultPayload: this.buildSendRawPayload(),
      },
    ];
  }
}
