import fs from "fs";
import { PullRequest } from "./entity";
import { median as _median } from "mathjs";
import { fetchAllMergedPullRequests } from "./github";

interface StatCommandOptions {
  input: string | undefined;
  start: string | undefined;
  end: string | undefined;
  query: string | undefined;
}
export async function statCommand(options: StatCommandOptions): Promise<void> {
  let prs: PullRequest[] = [];

  if (options.query) {
    prs = await fetchAllMergedPullRequests(options.query, options.start, options.end);
  } else if (options.input) {
    prs = createPullRequestsByLog(options.input);
  } else {
    console.error("You must specify either --query or --input");
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(createStat(prs), undefined, 2));
}

interface PullRequestStat {
  count: number;
  additionsAverage: number;
  additionsMedian: number;
  deletionsAverage: number;
  deletionsMedian: number;
  timeToMergeSecondsAverage: number;
  timeToMergeSecondsMedian: number;
  timeToMergeFromFirstReviewSecondsAverage: number;
  timeToMergeFromFirstReviewSecondsMedian: number;
}
export function createStat(prs: PullRequest[]): PullRequestStat {
  const timeToMerges = prs.map((pr) => pr.timeToMergeSeconds);
  const timeToMergeFromFirstReviews = prs
    .map((pr) => pr.timeToMergeFromFirstReviewSeconds)
    .filter((x): x is number => x !== undefined);

  return {
    count: prs.length,
    additionsAverage: average(prs.map((pr) => pr.additions)),
    additionsMedian: median(prs.map((pr) => pr.additions)),
    deletionsAverage: average(prs.map((pr) => pr.deletions)),
    deletionsMedian: median(prs.map((pr) => pr.deletions)),
    timeToMergeSecondsAverage: Math.floor(average(timeToMerges)),
    timeToMergeSecondsMedian: Math.floor(median(timeToMerges)),
    timeToMergeFromFirstReviewSecondsAverage: Math.floor(average(timeToMergeFromFirstReviews)),
    timeToMergeFromFirstReviewSecondsMedian: Math.floor(median(timeToMergeFromFirstReviews)),
  };
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((prev, current) => prev + current) / numbers.length;
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return _median(numbers);
}

interface comment {
  bodyText: string;
}

export function createPullRequestsByLog(path: string): PullRequest[] {
  const logs = JSON.parse(fs.readFileSync(path, "utf8"));
  return logs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) =>
      new PullRequest(
        p.number,
        p.additions,
        p.assignees.totalCount,
        p.changedFiles,
        p.comments.totalCount,
        p.commits.totalCount,
        p.deletions,
        p.labels.totalCount,
        p.participants.totalCount,
        p.reactions.totalCount,
        p.comments.nodes.filter((n: comment) => n.bodyText.startsWith("/retest")).length,
        p.reviewRequests.totalCount,
        p.reviews.totalCount,
        p.reviewThreads.totalCount,
        p.autoMergeRequest.enabledAt,
        p.createdAt,
        p.reviews.nodes[0] ? p.reviews.nodes[0].createdAt : undefined,
        p.lastEditedAt,
        p.mergedAt,
        p.publishedAt,
        p.updatedAt,
        p.isCrossRepository
      )
  );
}
