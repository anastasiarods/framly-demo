import { nanoid } from "nanoid";

export async function saveFrameUrl(
  kv: KVNamespace,
  url: string,
  apiKey: string,
  region: string
) {
  const id = nanoid(8);
  await kv.put(id, url);
  await kv.put(id + ":apiKey", apiKey);

  if (region === "us") {
    await kv.put(id + ":region", "us");
  } else {
    await kv.put(id + ":region", "eu");
  }

  return id;
}
export async function saveUrl(kv: KVNamespace, url: string) {
  const id = nanoid(8);
  await kv.put(id, url);
  return id;
}
