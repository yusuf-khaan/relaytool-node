export interface MediaFile {
  buffer: Buffer;
  type: string; // e.g., 'image/jpeg' or 'video/mp4'
}

export default abstract class AbstractXClient {
  constructor() {
    if (new.target === AbstractXClient) {
      throw new Error("Cannot instantiate AbstractXClient directly");
    }
  }

  abstract postTweet(text: string): Promise<any>;
  abstract postTweetWithMedia(text: string, files: MediaFile[]): Promise<any>;
  abstract getTweetById(id: string): Promise<any>;
  abstract deleteTweet(id: string): Promise<any>;
  abstract retweetTweet(tweetId: string, userId: string): Promise<any>;
  abstract likeTweet(tweetId: string, userId: string): Promise<any>;

  abstract getUserTimeline(userId: string, maxResults?: number): Promise<any>;
  abstract getMentions(userId: string, maxResults?: number): Promise<any>;

  abstract getUserByUsername(username: string): Promise<any>;

  abstract sendDirectMessage(recipientId: string, text: string): Promise<any>;
  abstract getDirectMessages(maxResults?: number): Promise<any>;
  abstract deleteDirectMessage(eventId: string): Promise<any>;

  abstract createList(name: string, description: string, privateList?: boolean): Promise<any>;
  abstract getListById(listId: string): Promise<any>;
  abstract addListMember(listId: string, userId: string): Promise<any>;
  abstract removeListMember(listId: string, userId: string): Promise<any>;
  abstract deleteList(listId: string): Promise<any>;
  abstract getUserLists(userId: string): Promise<any>;

  abstract getSpaceById(id: string): Promise<any>;
  abstract getSpacesByUserId(userId: string): Promise<any>;

  abstract getTrends(woeid?: number): Promise<any>;

  abstract searchTweets(query: string, maxResults?: number): Promise<any>;

}
