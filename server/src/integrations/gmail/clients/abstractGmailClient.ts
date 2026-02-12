import { gmail_v1 } from "googleapis";

export default abstract class AbstractGmailClient {
  constructor() {
    if (new.target === AbstractGmailClient) {
      throw new Error("Cannot instantiate AbstractGmailClient directly");
    }
  }

  public abstract sendEmail(request:any): Promise<gmail_v1.Schema$Message>;

  public abstract getEmails(request:any): Promise<gmail_v1.Schema$ListMessagesResponse>;
}
