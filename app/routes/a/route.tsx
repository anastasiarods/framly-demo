/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import {
  Frame,
  FrameActionPayload,
  getFrame,
  getFrameHtml,
  validateFrameMessage,
} from "frames.js";
import { wrapLinksInFrame } from "~/lib/utils";
import { fetchHubContext } from "~/lib/frameUtils.server";
import { captureEvent, identifyUser } from "./posthog";
import {
  getFirstFrame,
  getUserSession,
  upsertFirstFrame,
  upsertUserSession,
} from "~/lib/db";

interface TrackParams {
  kv: KVNamespace;
  db: D1Database;
  body: FrameActionPayload;
  id: string;
  nextId: string | null;
  redirectUrl: string;
  newFrame?: Frame;
  link?: string;
}

async function identify({
  body,
  apiKey,
  region,
}: {
  body: FrameActionPayload;
  apiKey: string;
  region: string;
}) {
  const { isValid, message } = await validateFrameMessage(body);
  const fid = message?.data.fid;
  const cast = message?.data.frameActionBody.castId;

  if (!isValid || !fid) {
    return;
  }

  if (message?.data.fid && cast) {
    const hubContext = await fetchHubContext(fid, cast);

    await identifyUser({
      region,
      apiKey,
      distinctId: fid.toString(),
      userProperties: {
        verifiedAddresses: JSON.stringify(
          hubContext.requesterVerifiedAddresses
        ),
        warpcastUrl: hubContext?.requesterUserData?.username
          ? `https://warpcast.com/${hubContext.requesterUserData.username}`
          : "",
        custodyAddress: hubContext.requesterCustodyAddress
          ? hubContext.requesterCustodyAddress?.toString()
          : "",
        verifiedAddress:
          hubContext.requesterVerifiedAddresses.length === 1
            ? hubContext.requesterVerifiedAddresses[0]
            : "",
        ...hubContext.requesterUserData,
      },
    });

    return hubContext;
  }
}

async function track({
  kv,
  db,
  body,
  id,
  nextId,
  redirectUrl,
  link,
  newFrame,
}: TrackParams) {
  const api = await kv.get(`${id}:apiKey`);
  const [apiKey, region] = api?.split(":") || [];
  const frameUrl = await kv.get(`${id}`);
  const firstFrame = await getFirstFrame(db, id);

  const { message, isValid } = await validateFrameMessage(body);
  const data = message?.data;

  if (!region || !apiKey || !isValid || !data || !data.fid) {
    return;
  }

  const { fid } = data;
  const { castId, buttonIndex, inputText, network, address, transactionId } =
    body.untrustedData;
  const castUrl = `https://warpcast.com/~/conversations/${castId.hash}`;

  console.log("Tracking action for: ", id, frameUrl);

  try {
    const userData = await kv.get(`${fid}:data`);

    if (!userData) {
      await identify({ body, apiKey, region });
      await kv.put(`${fid}:data`, Date.now().toString());
    }
  } catch (error) {
    console.error("Error identifying user", error);
  }

  let prevButtons;

  // if it is request from the first frame
  if (firstFrame?.value?.ids?.includes(nextId || "")) {
    prevButtons = firstFrame?.value?.buttons;
  } else {
    prevButtons = (await getUserSession(db, id, fid.toString()))?.value;
  }

  const button = prevButtons ? prevButtons[buttonIndex - 1] : null;

  if (newFrame && newFrame.buttons)
    await upsertUserSession(
      db,
      id,
      fid.toString(),
      JSON.stringify(newFrame.buttons)
    );

  if (link) {
    const resp = await captureEvent({
      region,
      apiKey,
      distinctId: fid.toString(),
      eventName: "frame_redirect",
      properties: {
        castHash: castId.hash,
        buttonIndex: buttonIndex.toString(),
        buttonLabel: button?.label,
        pageUrl: redirectUrl,
        castUrl,
        frameUrl,
        redirectUrl: link,
        inputText,
      },
    });

    if (!resp?.status) console.error("Error tracking external link", id);
  } else if (newFrame) {
    const resp = await captureEvent({
      region,
      apiKey,
      distinctId: fid.toString(),
      eventName: "frame_click",
      properties: {
        castHash: castId.hash,
        buttonIndex: buttonIndex.toString(),
        buttonLabel: button?.label,
        pageUrl: redirectUrl,
        castUrl,
        inputText,
        frameUrl,
      },
    });

    console.log("resp", resp);

    if (!resp?.status) console.error("Error tracking frame action", id);
  } else if (data.frameActionBody.address) {
    await captureEvent({
      region,
      apiKey,
      distinctId: fid.toString(),
      eventName: "frame_tx",
      properties: {
        castHash: castId.hash,
        buttonIndex: buttonIndex.toString(),
        buttonLabel: button?.label,
        pageUrl: redirectUrl,
        castUrl,
        inputText,
        network,
        address,
        frameUrl,
        transactionId,
      },
    });
  }
}

const actionRequest = async ({ request, context }: ActionFunctionArgs) => {
  try {
    const kv = context.cloudflare.env.MY_KV;
    const db = context.cloudflare.env.DB;
    const host = context.cloudflare.env.HOST_URL;
    const body: FrameActionPayload = await request.json();
    const requestUrl = new URL(request.url);
    const nextId = requestUrl.searchParams.get("n");
    const id = requestUrl.searchParams.get("r");
    const redirectUrl = await kv.get(nextId ?? "");

    if (!redirectUrl || !id) {
      return new Response("Invalid request", { status: 400 });
    }

    const response = await fetch(redirectUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("Content-Type") || "application/json",
        ...request.headers,
      },
      body: JSON.stringify(body),
    });

    // post_url button
    if (response.redirected) {
      //track redirect
      context.cloudflare.waitUntil(
        track({
          db,
          kv,
          body,
          id,
          nextId,
          redirectUrl,
          link: response.url,
        })
      );

      return new Response("Redirected", {
        status: 302,
        headers: {
          Location: response.url,
        },
      });
    } else if (
      body.untrustedData?.address ||
      body.untrustedData?.transactionId
    ) {
      //tx button
      context.cloudflare.waitUntil(
        track({
          kv,
          body,
          id,
          nextId,
          redirectUrl,
          db,
        })
      );

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/json",
        },
      });
    } else {
      //frame action button
      const html = await response.text();
      const frame = getFrame({ htmlString: html, url: redirectUrl });
      if (!frame || frame.status !== "success" || id === null) {
        return new Response(html, {
          headers: {
            "Content-Type": "text/html",
          },
        });
      }

      const { newFrame } = await wrapLinksInFrame({
        frame: frame.frame,
        host,
        id,
        kv,
      });

      //track action
      context.cloudflare.waitUntil(
        track({
          db,
          kv,
          body,
          id,
          nextId,
          redirectUrl,
          newFrame,
        })
      );

      return new Response(getFrameHtml(newFrame), {
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/json",
        },
      });
    }
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

const loaderRequest = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const kv = context.cloudflare.env.MY_KV;
    const host = context.cloudflare.env.HOST_URL;
    const requestUrl = new URL(request.url);
    const id = requestUrl.searchParams.get("r") || "";

    if (!id) return new Response("Invalid request", { status: 400 });

    const redirectUrl = await kv.get(id);

    if (!redirectUrl) return new Response("Invalid request", { status: 400 });

    const html = await fetch(redirectUrl).then((res) => res.text());
    const respFrame = getFrame({ htmlString: html, url: redirectUrl });

    if (!respFrame || respFrame.status !== "success") {
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    const { newFrame, ids } = await wrapLinksInFrame({
      frame: respFrame.frame,
      host,
      id,
      kv,
    });

    const frameHtml = getFrameHtml(newFrame);
    if (newFrame.postUrl && newFrame.buttons && ids.length > 0) {
      context.cloudflare.waitUntil(
        upsertFirstFrame(
          context.cloudflare.env.DB,
          id,
          JSON.stringify({
            ids: ids,
            buttons: newFrame.buttons,
          })
        )
      );
    }

    const scriptString = `<Script
        id="my-script"
        strategy="beforeInteractive"
      >{typeof window !== "undefined" && window.location.replace("${redirectUrl}")}</Script>`;

    //add script to redirect to the original page after <html> tag
    const frameHtmlWithScript = frameHtml.replace(
      "<html>",
      `<html>${scriptString}`
    );

    return new Response(frameHtmlWithScript, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const action = actionRequest;
export const loader = loaderRequest;
