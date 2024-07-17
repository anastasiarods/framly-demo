// / <reference types="@remix-run/dev" />
// / <reference types="@remix-run/cloudflare" />
// / <reference types="@cloudflare/workers-types" />

import "@remix-run/dev";
import "@remix-run/cloudflare";
import "@cloudflare/workers-types";

interface Env {
  HOST_URL: string;
  MY_KV: KVNamespace;
  DB: D1Database;
}

declare module "@remix-run/cloudflare" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      waitUntil(promise: Promise<void>): void;
    };
  }
}
