export default abstract class AbstractTeamsClient {
  constructor() {
    if (new.target === AbstractTeamsClient) {
      throw new Error("Cannot instantiate AbstractTeamsClient directly");
    }
  }

  public abstract sendMessage(request: any): Promise<any>;
  public abstract replyToMessage(request: any): Promise<any>;
  public abstract listJoinedTeams(request: any): Promise<any>;
  public abstract getTeam(request: any): Promise<any>;
  public abstract listChannels(request: any): Promise<any>;
  public abstract getChannel(request: any): Promise<any>;
  public abstract createChannel(request: any): Promise<any>;
  public abstract listChannelMessages(request: any): Promise<any>;
  public abstract createChat(request: any): Promise<any>;
  public abstract sendChatMessage(request: any): Promise<any>;
  public abstract listChatMessages(request: any): Promise<any>;
  public abstract createOnlineMeeting(request: any): Promise<any>;
  public abstract getOnlineMeeting(request: any): Promise<any>;
  public abstract listOnlineMeetings(request: any): Promise<any>;
  public abstract createCalendarEventMeeting(request: any): Promise<any>;
  public abstract listCalendarEvents(request: any): Promise<any>;
  public abstract listUsers(request: any): Promise<any>;
  public abstract sendRawPayload(request: any): Promise<any>;
}
