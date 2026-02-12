export default abstract class AbstractTwilioClient {
  constructor() {
    if (new.target === AbstractTwilioClient) {
      throw new Error("Cannot instantiate AbstractTwilioClient directly");
    }
  }

  public abstract sendSMS(request: any): Promise<any>;
  public abstract makeCall(request: any): Promise<any>;
  public abstract getMessageDetails(request: any): Promise<any>;
  public abstract listMessages(request: any): Promise<any>;
}
