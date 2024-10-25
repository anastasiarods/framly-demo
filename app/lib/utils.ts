import { Frame } from "frames.js";
import { getFrameUrlId } from "./db";

export function isValidUrl(url: string) {
  const urlPattern = /^https:\/\/([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  return urlPattern.test(url);
}

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
  const ids: string[] = [];

  if (newFrame.postUrl) {
    const nextId = await getFrameUrlId(kv, newFrame.postUrl);
    newFrame.postUrl = wrapUrl(host, id, nextId);
    ids.push(nextId);
  }

  for (const button of newFrame.buttons ?? []) {
    if (button.target && ["post", "tx"].includes(button.action)) {
      const buttonId = await getFrameUrlId(kv, button.target);
      button.target = wrapUrl(host, id, buttonId);
      ids.push(buttonId);
    }
  }

  return { newFrame, ids };
}
