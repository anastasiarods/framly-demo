import { Frame } from "frames.js";
import { saveUrl } from "./db";

export function wrapUrl(analyticsDomain: string, id: string, nextId?: string) {
  if (nextId) return `${analyticsDomain}/a/?r=${id}&n=${nextId}`;

  return `${analyticsDomain}/a/?r=${id}`;
}

export async function wrapLinksInFrame({
  frame,
  host,
  id,
  kv,
}: {
  frame: Frame;
  host: string;
  id: string;
  kv: KVNamespace;
}) {
  const newFrame = { ...frame };
  let nextId;

  if (newFrame.postUrl) {
    nextId = await saveUrl(kv, newFrame.postUrl);
    newFrame.postUrl = wrapUrl(host, id, nextId);
  }
  return { newFrame, nextId };
}
