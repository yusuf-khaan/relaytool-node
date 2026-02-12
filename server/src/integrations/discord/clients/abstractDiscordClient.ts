export default abstract class AbstractDiscordClient {
  constructor() {
    if (new.target === AbstractDiscordClient) {
      throw new Error("Cannot instantiate AbstractDiscordClient directly");
    }
  }

  public abstract sendMessage(
    request: any
  ): Promise<{ id: string; channelId: string; content: string }>;

  public abstract sendEmbed(
    request: any
  ): Promise<{ id: string; channelId: string }>;

  public abstract getMessages(request: any): Promise<any[]>;

  public abstract addRole(request: any): Promise<void>;

  public abstract removeRole(request: any): Promise<void>;
}
