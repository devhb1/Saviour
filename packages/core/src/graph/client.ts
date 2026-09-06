import { requireEnv } from "../config/env";

export type GraphQueryResult<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

/** POST a GraphQL query to The Graph Network gateway. */
export async function querySubgraph<T>(
  subgraphId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = requireEnv("GRAPH_API_KEY");
  const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await res.json()) as GraphQueryResult<T>;
  if (!res.ok) {
    throw new Error(`Graph HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  if (body.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  }
  if (!body.data) {
    throw new Error("Graph response missing data");
  }
  return body.data;
}
