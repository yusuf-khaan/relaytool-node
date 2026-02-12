import { ProviderMetadata } from "../../../interface/providerInterface.js";
import DiscordClient from "../clients/discordClient.js";

class DiscordProvider {
    private static _instance: DiscordClient | null = null;
    private static _actionsCache: any[] | null = null;

    private constructor() { }

    static getClient(): DiscordClient {
        if (!this._instance) {
            this._instance = new DiscordClient();
        }
        return this._instance;
    }

    static getActions(): any[] {
        if (!this._actionsCache) {
            const client = this.getClient();
            this._actionsCache = client.pairingFunctionNameAndPayload();
        }
        return this._actionsCache;
    }

    static metadata(): ProviderMetadata {
        return {
            name: "Discord",
            description: "Discord Bot Provider",
            authType: "BotToken",
            actions: this.getActions(),
        };
    }
}

export default DiscordProvider;
