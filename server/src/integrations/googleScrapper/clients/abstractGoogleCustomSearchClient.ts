export default abstract class AbstractgoogleCustomSearchClient {
  constructor() {
    if (new.target === AbstractgoogleCustomSearchClient) {
      throw new Error("Cannot instantiate AbstractgoogleCustomSearchClient directly");
    }
  }
}