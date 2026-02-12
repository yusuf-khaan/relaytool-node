import {
  Client,
  GatewayIntentBits,
  TextChannel,
  DMChannel,
  NewsChannel,
} from "discord.js";
import AbstractDiscordClient from "./abstractDiscordClient.js";
import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export default class DiscordClient extends AbstractDiscordClient {
  private client!: Client;
  private utilityService: Utility;
  private integrationDetailService = new IntegrationDetailService();
  private static connectionMap = new Map<string, Client>();

  constructor() {
    super();
    this.utilityService = new Utility();
  }

  /* ---------- init ---------- */
  // Modified to take a token argument
  private async init(token: string): Promise<void> {
    if (this.client) return;

    if (!token) {
      throw new Error("Discord bot token not found");
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent,
        // GatewayIntentBits.DirectMessages,
        // GatewayIntentBits.GuildMembers,
      ],
    });

    this.client.once("ready", () => {
      console.log(`[Discord] Logged in as ${this.client.user?.tag}`);
    });

    await this.client.login(token);
  }

  private async ensureInitWithDefaults(request: any) {
    const userId = request?.data?.userId || request?.userId;
    if (!userId) {
      throw new Error("userId missing");
    }

    const auth = await this.getIntegrationDetails(userId);
    const key = auth.token;

    if (DiscordClient.connectionMap.has(key)) {
      this.client = DiscordClient.connectionMap.get(key)!;
      return;
    }

    await this.init(auth.token);
    DiscordClient.connectionMap.set(key, this.client);
  }

  private async getIntegrationDetails(userId: string) {
    if (!userId) {
      throw new Error("userId is required to fetch integration credentials");
    }
    const credential =
      await this.integrationDetailService.getIntegrationCredential({
        userId,
        slug: "discord",
      });

    if (!credential) {
      throw new Error("Discord integration not configured for this user");
    }

    const auth = credential.auth_detail;

    if (!auth) {
      throw new Error("Discord token missing in credentials");
    }

    return {
      token: auth?.token,
    };
  }

  buildSendMessagePayload() {
    return { channelId: null, content: null };
  }

  /* ---------- send normal message ---------- */
  async sendMessage(
    request: any
  ): Promise<{ id: string; channelId: string; content: string }> {
    await this.ensureInitWithDefaults(request);
    let schema = request?.schema ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSendMessagePayload()
    );

    const channel = await this.client.channels.fetch(payload.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based");
    }

    const sent = await (
      channel as TextChannel | DMChannel | NewsChannel
    ).send({ content: payload.content });

    return {
      id: sent.id,
      channelId: sent.channelId,
      content: sent.content,
    };
  }

  buildSendEmbedPayload() {
    return {
      channelId: null,
      embed: {
        title: "",
        description: "",
        color: 5763719,
        fields: [],
      },
    };
  }

  /* ---------- send embed ---------- */
  async sendEmbed(
    request: any
  ): Promise<any> {
    await this.ensureInitWithDefaults(request);
    let schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSendEmbedPayload()
    );

    const channel = await this.client.channels.fetch(payload.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based");
    }

    const sent = await (
      channel as TextChannel | DMChannel | NewsChannel
    ).send({
      embeds: [payload.embed],
    });

    return {
      id: sent.id,
      channelId: sent.channelId,
    };
  }

  buildGetMessagesPayload() {
    return { channelId: null, limit: 10 };
  }

  /* ---------- get messages ---------- */
  async getMessages(request: any): Promise<any[]> {
    await this.ensureInitWithDefaults(request);
    let schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildGetMessagesPayload()
    );

    const channel = (await this.client.channels.fetch(
      payload.channelId
    )) as TextChannel;

    if (!channel) {
      throw new Error("Channel not found");
    }

    const messages = await channel.messages.fetch({
      limit: payload.limit,
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
      },
      createdAt: m.createdAt,
    }));
  }

  buildAddRolePayload() {
    return {
      guildId: null,
      userId: null,
      roleId: null,
    };
  }

  /* ---------- add role ---------- */
  async addRole(request: any): Promise<void> {
    await this.ensureInitWithDefaults(request);
    let schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildAddRolePayload()
    );

    const guild = await this.client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.userId);

    await member.roles.add(payload.roleId);
  }

  buildRemoveRolePayload() {
    return { guildId: null, userId: null, roleId: null };
  }

  /* ---------- remove role ---------- */
  async removeRole(request: any): Promise<void> {
    await this.ensureInitWithDefaults(request);
    let schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
this.buildRemoveRolePayload()
    );

    const guild = await this.client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.userId);

    await member.roles.remove(payload.roleId);
  }

  /* ---------- workflow registry ---------- */
  pairingFunctionNameAndPayload() {
    return [
      {
        action: "sendMessage",
        description: "Send a message to a Discord channel",
        defaultPayload: this.buildSendMessagePayload()
      },
      {
        action: "sendEmbed",
        description: "Send an embed message to a Discord channel",
        defaultPayload: this.buildSendEmbedPayload(),
      },
      {
        action: "getMessages",
        description: "Fetch recent messages from a channel",
        defaultPayload: this.buildGetMessagesPayload()
      },
      {
        action: "addRole",
        description: "Add a role to a Discord user",
        defaultPayload: this.buildAddRolePayload(),
      },
      {
        action: "removeRole",
        description: "Remove a role from a Discord user",
        defaultPayload: this.buildRemoveRolePayload()
      },
    ];
  }
}
