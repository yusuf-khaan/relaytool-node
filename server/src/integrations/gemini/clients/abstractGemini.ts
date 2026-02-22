export default abstract class AbstractGemini {
  constructor() {
    if (new.target === AbstractGemini) {
      throw new Error("Cannot instantiate AbstractGemini directly");
    }
  }

  abstract sendResponseToModel(request: any): Promise<any>;
  abstract sendImageToModel(request: any): Promise<any>;
}
