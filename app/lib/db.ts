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

export async function getLastUserButtons(
  db: D1Database,
  id: string,
  fid: string
) {
  const sessionId = `${id}:${fid}`;
  //@ts-expect-error - db is used
  const { value } = await db
    .prepare(`select value from sessions where id = ?1;`)
    .bind(sessionId)
    .first();

  if (!value) return undefined;

  return JSON.parse(value);
}

export async function updateUserSession(
  db: D1Database,
  id: string,
  fid: string,
  buttons: string
) {
  const sessionId = `${id}:${fid}`;

  await db
    .prepare(
      `insert into sessions (id, value) values (?1, ?2) 
        on conflict(id) do update set value = excluded.value;`
    )
    .bind(sessionId, buttons)
    .run();
}

export async function getFirstFrame(db: D1Database, id: string) {
  //@ts-expect-error - db is used
  const { value } = await db
    .prepare(`select value from sessions where id = ?1;`)
    .bind(id)
    .first();

  if (!value) return undefined;

  return JSON.parse(value);
}

export async function saveFirstFrame(
  db: D1Database,
  id: string,
  frame: string
) {
  await db
    .prepare(
      `insert into sessions (id, value) values (?1, ?2) 
        on conflict(id) do update set value = excluded.value;`
    )
    .bind(id, frame)
    .run();
}
