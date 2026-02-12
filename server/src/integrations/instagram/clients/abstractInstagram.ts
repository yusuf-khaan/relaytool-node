export default abstract class AbstractInstagramClient {
  constructor() {
    if (new.target === AbstractInstagramClient) {
      throw new Error("Cannot instantiate AbstractInstagramClient directly");
    }
  }
  abstract getUserProfile(request?: any):any;
  abstract getUserMedia(request: any): any;
  abstract postComment(mediaId: string, message: string): any;
  abstract replyToComment(commentId: string, message: string):any;
  abstract likeMedia(mediaId: string):any;
  abstract createMedia(mediaUrl: string, caption: string): any;
  abstract createCarouselContainer(mediaIds: string[], caption: string): any;
  abstract publishMediaContainer(containerId: string): any;
  // abstract postReel(videoUrl: string, caption: string): Promise<any>;
}
