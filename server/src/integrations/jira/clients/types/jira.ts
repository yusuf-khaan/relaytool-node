// types/jira.ts
export type JiraSearchResult = {
  startAt: number;
  maxResults: number;
  total: number;
  issues: any[];
};

export type JiraIssueCreatePayload = {
  fields: {
    project: { key?: string; id?: string };
    summary: string;
    issuetype: { id?: string; name?: string };
    description?: string;
    [k: string]: any;
  };
};