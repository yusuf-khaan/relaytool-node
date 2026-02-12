// AbstractJiraClient.ts
import { AxiosInstance } from "axios";
import { JiraIssueCreatePayload, JiraSearchResult } from "./types/jira.js";

export default abstract class AbstractJiraClient {
  constructor() {
    if (new.target === AbstractJiraClient) {
      throw new Error("Cannot instantiate AbstractJiraClient directly");
    }
  }

  // Lifecycle
  abstract init(request: any): Promise<void>;

  // Core actions (match JiraClient implementation)
  abstract getProjects(request: any): Promise<any>;
  abstract createIssue(request: any): Promise<any>;
  abstract searchIssues(request: any): Promise<any>;
  abstract addComment(request: any): Promise<any>;

  // Capability descriptor
  abstract pairingFunctionNameAndPayload(): any;
}