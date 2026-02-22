import ApolloProvider from "../integrations/apollo/providers/apolloProvider.js";
import DiscordProvider from "../integrations/discord/providers/discordProvider.js";
import GeminiProvider from "../integrations/gemini/providers/geminiProvider.js";
import GmailProvider from "../integrations/gmail/providers/gmailProvider.js";
import InstagramProvider from "../integrations/instagram/providers/instagramProvider.js";
import JiraProvider from "../integrations/jira/providers/jiraProvider.js";
import OpenaiProvider from "../integrations/openai/providers/openaiProvider.js";
import PostgresProvider from "../integrations/postgres/providers/postgresProvider.js";
import SandboxProvider from "../integrations/sandbox/providers/sandboxProvider.js";
import TeamsProvider from "../integrations/teams/providers/teamsProvider.js";
import TelegramProvider from "../integrations/telegram/providers/telegramProvider.js";
import TwilioProvider from "../integrations/twilio/providers/twilioProvider.js";
import XProvider from "../integrations/x/providers/xProvider.js";

export const ProviderRepository = {
  gmail: GmailProvider,
  gemini: GeminiProvider,
  x: XProvider,
  discord: DiscordProvider,
  instagram: InstagramProvider,
  jira: JiraProvider,
  openai: OpenaiProvider,
  postgres: PostgresProvider,
  sandbox: SandboxProvider,
  teams: TeamsProvider,
  telegram: TelegramProvider,
  twilio: TwilioProvider,
  apollo: ApolloProvider,
} as const;

export type ProviderName = keyof typeof ProviderRepository;
