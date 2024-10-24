import { useState } from "react";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import {
  ActionFunction,
  json,
  ActionFunctionArgs,
} from "@remix-run/cloudflare";
import { saveFrameUrl } from "~/lib/db";
import { wrapUrl } from "~/lib/utils";

function isValidUrl(url: string) {
  const urlPattern = /^https:\/\/([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  return urlPattern.test(url);
}

export const action: ActionFunction = async ({
  request,
  context,
}: ActionFunctionArgs) => {
  const kv = context.cloudflare.env.MY_KV;
  const { HOST_URL } = context.cloudflare.env;

  const formData = await request.formData();
  const url = formData.get("functionUrl")?.toString();
  const apiKey = formData.get("apiKey")?.toString();
  const checkbox = formData.get("check")?.toString();

  if (!url || !apiKey) {
    return json({ message: "Missing required fields" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return json({ message: "Invalid URL" }, { status: 400 });
  }

  const region = checkbox === "on" ? "eu" : "us";
  const id = await saveFrameUrl(kv, url, apiKey, region);
  const newUrl = wrapUrl(HOST_URL, id);

  console.log("New URL created for", url, newUrl.toString());

  return json({
    url: newUrl.toString(),
  });
};

// eslint-disable-next-line react/prop-types
const LinkButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <button
      className="flex justify-between items-center w-full px-4 bg-white p-4 rounded-md shadow-sm border-lg outline-none focus:outline-blue-500 text-left"
      onClick={onCopy}
    >
      <div className="flex items-center w-full">
        <p className="text-blue-500 text-sm font-medium mr-2 truncate flex-1">
          {text}
        </p>
        <div className="flex items-center">
          {copied && (
            <span className="text-gray-500 text-sm whitespace-nowrap mr-2">
              Copied!
            </span>
          )}
          {copied ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-500"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-500"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};

export default function Index() {
  const actionData = useActionData<{
    url: string;
    message: string | null;
  }>();
  const [inputUrl, setInputUrl] = useState("");
  const [inputApiKey, setInputApiKey] = useState("");
  const [inputChecked, setInputChecked] = useState(false);
  const transition = useNavigation();

  const isSubmitting = transition.state === "submitting";

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-8 bg-white rounded-xl shadow-md p-8 mb-8">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          No-Code Frames Analytics in PostHog.com
        </h1>
        <div className="text-sm text-gray-700 mb-4 space-y-4">
          <p>
            This is an open-source demo project (
            <a
              href="https://github.com/anastasiarods/framly-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              GitHub Repository
            </a>
            ) that you can already use to wrap any Frame link and get analytics
            in the PostHog tool.
          </p>
          <ol className="list-decimal list-inside pl-4">
            <li>Paste a Frame URL.</li>
            <li>Enter your PostHog Project API key.</li>
            <li>Press Submit and share the new URL on warpcast.com.</li>
          </ol>
          <p>
            You’ll receive analytics events when users interact with your Frame
            directly in PostHog. Check out this demo:{" "}
            <a
              href="https://warpcast.com/nastya/0xe2038b924e844a95e0d364bd264553bb2ec318db"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Demo Link
            </a>
            . Contact me on Farcaster with any questions (
            <a
              href="https://warpcast.com/nastya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              @Nastya 
            </a>
            ) or raise a GitHub issue.
          </p>
        </div>
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="functionUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Frame URL
            </label>
            <input
              id="functionUrl"
              type="text"
              name="functionUrl"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter function URL"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700"
            >
              Posthog API Key
            </label>
            <input
              id="apiKey"
              type="text"
              name="apiKey"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="Enter API Key"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="check" className="flex items-center">
              <input
                id="check"
                type="checkbox"
                name="check"
                checked={inputChecked} // Assuming you have a state variable `termsChecked`
                onChange={(e) => setInputChecked(e.target.checked)} // Assuming you have a handler `setTermsChecked`
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                <strong>Posthog project in EU (eu.posthog.com)</strong>{" "}
                Otherwise, will be used US version.
              </span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isSubmitting
                ? "bg-indigo-400"
                : "bg-indigo-600 hover:bg-indigo-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </Form>
      </div>

      {actionData && (
        <div className="w-full max-w-md p-4 bg-gray-50 rounded-md shadow-md">
          <div className="space-y-2 text-sm text-gray-600">
            {actionData.message && (
              // show error
              <p>{actionData.message}</p>
            )}
            {actionData.url && (
              <div className="w-full">
                <LinkButton text={actionData.url} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
