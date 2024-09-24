# No-Code Frames Analytics with PostHog

- Track all interactions from any Frame, together with Farcaster user context
- Create advanced charts in Posthog
- Works great with no-code Frame creation tools like [neynar](https://neynar.com/)

Try it here 👉 [framly.pages.dev](https://framly.pages.dev/)

# Demo

Example Posthog dashboard: 
![image](https://github.com/user-attachments/assets/9f701687-4877-4d0e-87f5-c2f68b0998fd)


https://github.com/user-attachments/assets/cc94cbba-2a33-4762-97bf-f0b5945300f7




## Development

You will be utilizing Wrangler for local development to emulate the Cloudflare runtime. This is already wired up in your package.json as the `dev` script:

```sh
# start the remix dev server and wrangler
npm run dev
```

Open up [http://127.0.0.1:8788](http://127.0.0.1:8788) and you should be ready to go!

## Deployment

Cloudflare Pages are currently only deployable through their Git provider integrations.

If you don't already have an account, then [create a Cloudflare account here](https://dash.cloudflare.com/sign-up/pages) and after verifying your email address with Cloudflare, go to your dashboard and follow the [Cloudflare Pages deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything).

Configure the "Build command" should be set to `npm run build`, and the "Build output directory" should be set to `public`.

## Feedback

Contact me for any feedback or questions [here](https://warpcast.com/nastya).
