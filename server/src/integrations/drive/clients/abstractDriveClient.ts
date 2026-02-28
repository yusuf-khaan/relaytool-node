import { drive_v3 } from "googleapis";

export default abstract class AbstractDriveClient {
  constructor() {
    if (new.target === AbstractDriveClient) {
      throw new Error("Cannot instantiate AbstractDriveClient directly");
    }
  }

  public abstract listFiles(
    request: any,
  ): Promise<drive_v3.Schema$FileList>;

  public abstract createFolder(
    request: any,
  ): Promise<drive_v3.Schema$File>;

  public abstract uploadTextFile(
    request: any,
  ): Promise<drive_v3.Schema$File>;
}
