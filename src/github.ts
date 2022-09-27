import { GraphQLClient, gql } from "graphql-request";
import { PullRequest } from "./entity";
import { parseISO } from "date-fns";
import { time } from "console";

// GitHub.com https://api.github.com/graphql
// GitHub Enterprise https://<HOST>/api/graphql
const GITHUB_GRAPHQL_ENDPOINT = process.env.GITHUB_ENDPOINT || "https://api.github.com/graphql";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export const graphQLClient = new GraphQLClient(GITHUB_GRAPHQL_ENDPOINT, {
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
  },
  timeout: 3600_000,
});

export async function fetchAllMergedPullRequests(
  searchQuery: string,
  startDateString?: string,
  endDateString?: string
): Promise<PullRequest[]> {
  const startDate = startDateString ? parseISO(startDateString).toISOString() : "";
  const endDate = endDateString ? parseISO(endDateString).toISOString() : "";

  let q = `is:pr is:merged ${searchQuery}`;
  if (startDate !== "" || endDate !== "") {
    q += ` merged:${startDate}..${endDate}`;
  }

  return fetchAllPullRequestsByQuery(q);
}

interface PullRequestNode {
  number: number;
  isCrossRepository: boolean;
  createdAt: string;
  mergedAt: string;
  updatedAt: string;
  lastEditedAt: string;
  reviewThreads: {
    totalCount: number;
  };
  changedFiles: number;
  assignees: {
    totalCount: number;
  };
  labels: {
    totalCount: number;
  };
  autoMergeRequest: {
    enabledAt: string;
  } | null;
  reactions: {
    totalCount: number;
  };
  publishedAt: string;
  participants: {
    totalCount: number;
  };
  commits: {
    totalCount: number;
  };
  comments: {
    totalCount: number;
    nodes: {
      bodyText: string;
    }[];
  };
  reviewRequests: {
    totalCount: number;
  };
  additions: number;
  deletions: number;
  reviews: {
    totalCount: number;
    nodes: {
      createdAt: string;
    }[];
  };
}

async function fetchAllPullRequestsByQuery(searchQuery: string): Promise<PullRequest[]> {
  const query = gql`
    query($after: String) {
      search(type: ISSUE, first: 100, query: "${searchQuery}", after: $after) {
        issueCount
        nodes {
          ... on PullRequest {
            number
            isCrossRepository
            updatedAt
            lastEditedAt
            reviewThreads {
              totalCount
            }
            changedFiles
            assignees {
              totalCount
            }
            labels {
              totalCount
            }
            autoMergeRequest {
              enabledAt
            }
            reactions {
              totalCount
            }
            publishedAt
            participants {
              totalCount
            }
            createdAt
            mergedAt
            additions
            deletions
            commits {
              totalCount
            }
            comments(first: 100) {
              totalCount
              nodes {
                bodyText
              }
            }
            reviewRequests {
              totalCount
            }
            reviews(first: 1) {
              totalCount
              nodes {
                ... on PullRequestReview {
                  createdAt
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }
    }
  `;

  let after: string | undefined;
  let prs: PullRequest[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const data = await graphQLClient.request(query, { after });
      prs = prs.concat(
        data.search.nodes.map(
          (p: PullRequestNode) =>
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
              p.comments.nodes.filter((n) => n.bodyText.startsWith("/retest")).length,
              p.reviewRequests.totalCount,
              p.reviews.totalCount,
              p.reviewThreads.totalCount,
              p.autoMergeRequest? p.autoMergeRequest.enabledAt : undefined,
              p.createdAt,
              p.reviews.nodes[0] ? p.reviews.nodes[0].createdAt : undefined,
              p.lastEditedAt,
              p.mergedAt,
              p.publishedAt,
              p.updatedAt,
              p.isCrossRepository
            )
        )
      );
      console.error(data.rateLimit)
      console.error(data.search.issueCount, prs[0].createdAt)
      // var delay = new Date().getTime() - new Date(data.rateLimit.resetAt).getTime()
      // if (delay > 0) {
      //   console.error("Sleep")
      //   await new Promise(resolve => setTimeout(()=>resolve(), delay)).then(()=>console.error("fired"));
      // }
      if (!data.search.pageInfo.hasNextPage) break;
      after = data.search.pageInfo.endCursor;
    } catch (error) {
      console.error(error)
      continue
    }
  }

  return prs;
}

