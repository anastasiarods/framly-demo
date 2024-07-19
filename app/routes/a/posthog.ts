/* eslint-disable @typescript-eslint/no-explicit-any */
const euEndpoint = "https://eu.i.posthog.com";
const usEndpoint = "https://us.i.posthog.com";

export async function captureEvent({
  distinctId,
  eventName,
  properties,
  apiKey,
  region,
}: {
  distinctId: string;
  eventName: string;
  properties: Record<string, any>;
  apiKey: string;
  region: string;
}): Promise<{ status: string }> {
  const url = `${region === "us" ? usEndpoint : euEndpoint}/capture/`;
  const body = {
    api_key: apiKey,
    event: eventName,
    distinct_id: distinctId,
    properties: properties,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

export async function identifyUser({
  distinctId,
  userProperties,
  apiKey,
  region,
}: {
  distinctId: string;
  userProperties: Record<string, any>;
  apiKey: string;
  region: string;
}) {
  const url = `${region === "us" ? usEndpoint : euEndpoint}/capture/`;

  console.log("url", url);

  const body = {
    api_key: apiKey,
    event: "$identify",
    distinct_id: distinctId,
    properties: {
      $set: userProperties,
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

export async function margeIds({
  distinctId,
  newDistinctId,
  apiKey,
  region,
}: {
  distinctId: string;
  newDistinctId: string;
  apiKey: string;
  region: string;
}) {
  const url = `${region === "us" ? usEndpoint : euEndpoint}/capture/`;
  const body = {
    api_key: apiKey,
    event: "$create_alias",
    distinct_id: distinctId,
    properties: {
      alias: newDistinctId,
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
