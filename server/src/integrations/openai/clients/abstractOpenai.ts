export default abstract class AbstractOpenai {
  constructor() {
    if (new.target === AbstractOpenai) {
      throw new Error("Cannot instantiate AbstractOpenai directly");
    }
  }

  /**
   * Send a text prompt to the model
   * @param model Model name (e.g., "gpt-4.1")
   * @param input Text input
   */
  abstract sendResponseToModel(model: string, input: string): Promise<any>;

  /**
   * Send a prompt with an image (local file)
   * @param model Model name
   * @param inputText Text prompt
   * @param filePath Path to local image file
   */
  abstract sendImageToModel(
    model: string,
    text: string,
    url: string,
  ): Promise<any>;
}
