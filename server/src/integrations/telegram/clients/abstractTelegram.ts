export default abstract class AbstractTelegramClient {
  constructor() {
    if (new.target === AbstractTelegramClient) {
      throw new Error("Cannot instantiate AbstractTelegramClient directly");
    }
  }

  public abstract sendMessage(request: any): Promise<any>;
  public abstract getUpdates(request: any): Promise<any>;
  public abstract getMe(request: any): Promise<any>;
  public abstract getChat(request: any): Promise<any>;
  public abstract sendPhoto(request: any): Promise<any>;
  public abstract sendDocument(request: any): Promise<any>;
}
