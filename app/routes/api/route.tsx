import {  ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { saveFrameUrl } from "~/lib/db";
import { isValidUrl, wrapUrl } from "~/lib/utils";

const actionRequest = async ({ request, context }: ActionFunctionArgs) => {
  const kv = context.cloudflare.env.MY_KV;
  const { HOST_URL } = context.cloudflare.env;

  const url = new URL(request.url);
  
  const frameUrl = decodeURIComponent(url.searchParams.get("frameUrl") ?? "");
  const apiKey = url.searchParams.get("apiKey");
  const euRegion = url.searchParams.get("euRegion");

  if (!frameUrl || !apiKey) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidUrl(frameUrl)) {
    return json({ error: "Invalid URL" }, { status: 400 });
  }

  const region = euRegion === "true" ? "eu" : "us";
  const id = await saveFrameUrl(kv, frameUrl, apiKey, region);
  const newUrl = wrapUrl(HOST_URL, id);

  console.log("New URL created for", frameUrl, newUrl.toString());

  return json({
    url: newUrl.toString(),
  });
};

export const action = actionRequest;
