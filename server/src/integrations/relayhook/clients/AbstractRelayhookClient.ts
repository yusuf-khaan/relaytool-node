export default abstract class AbstractRelayhookClient {
  constructor() {
    if (new.target === AbstractRelayhookClient) {
      throw new Error("Cannot instantiate AbstractRelayhookClient directly");
    }
  }
}
