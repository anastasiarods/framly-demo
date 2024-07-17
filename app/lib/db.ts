import { nanoid } from "nanoid";

export async function saveFrameUrl(
  kv: KVNamespace,
  url: string,
  apiKey: string,
  region: string
) {
  const id = nanoid(8);
  const api = apiKey + ":" + (region === "us" ? "us" : "eu");
  await kv.put(id + ":apiKey", api);
  await kv.put(id, url);

  return id;
}
export async function saveUrl(kv: KVNamespace, url: string) {
  const id = nanoid(8);
  await kv.put(id, url);
  return id;
}

export async function getFrameUrlId(kv: KVNamespace, url: string) {
  let id;
  id = await kv.get(url);

  if (!id) {
    id = nanoid(8);
    await kv.put(id, url);
    await kv.put(url, id);
  }

  return id;
}
