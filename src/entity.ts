import { parseISO } from "date-fns";

export class PullRequest {
  public timeToMergeSeconds: number;
  public timeToFirstReviewSeconds: number | undefined;
  public timeToMergeFromFirstReviewSeconds: number | undefined;

  constructor(
    public id: number,

    public additions: number,
    public assignees: number,
    public changedFiles: number,
    public comments: number,
    public commits: number,
    public deletions: number,
    public labels: number,
    public participants: number,
    public reactions: number,
    public retests: number,
    public reviewRequests: number,
    public reviews: number,
    public reviewThreads: number,

    public autoMergeEnabledAt: string | undefined,
    public createdAt: string,
    public firstReviewedAt: string | undefined,
    public lastEditedAt: string,
    public mergedAt: string,
    public publishedAt: string,
    public updatedAt: string,

    public isCrossRepository: boolean
  ) {
    const publishedAtMillis = parseISO(this.publishedAt).getTime();
    const mergedAtMillis = parseISO(this.mergedAt).getTime();
    const firstReviewedMillis = this.firstReviewedAt ? parseISO(this.firstReviewedAt).getTime() : undefined;
    this.timeToFirstReviewSeconds = firstReviewedMillis ? (firstReviewedMillis - publishedAtMillis) / 1000 : undefined;
    this.timeToMergeSeconds = (mergedAtMillis - parseISO(this.createdAt).getTime()) / 1000;
    this.timeToMergeFromFirstReviewSeconds = this.firstReviewedAt
      ? (mergedAtMillis - parseISO(this.firstReviewedAt).getTime()) / 1000
      : undefined;
  }
}
