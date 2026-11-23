This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Cloudflare Turnstile

Create a Turnstile widget in Cloudflare with **Managed** mode and add the domains
where this app will run. Configure these variables in Vercel under
**Project Settings > Environment Variables**:

| Variable | Value | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key | Public |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key | Server only |

Set both variables for every Vercel environment where the app should work
(Production, Preview, and Development as applicable). For local development,
put the same variables in `.env.local`. The secret key must never use the
`NEXT_PUBLIC_` prefix.

## Email verification

New accounts must verify their email before signing in. To send verification
messages through Gmail, configure these server-side environment variables in
`.env.local` for local development and in the deployment environment:

| Variable | Value |
| --- | --- |
| `GMAIL_USER` | Gmail address used to send messages |
| `GMAIL_APP_PASSWORD` | Google App Password for that account (not the Gmail login password) |
| `GMAIL_FROM` | Optional sender name/address; defaults to `Classroom <GMAIL_USER>` |
| `NEXTAUTH_URL` | Public base URL of the application |

Enable 2-Step Verification on the Gmail account and create an App Password in
its Google Account security settings. Never commit the App Password or expose it
with a `NEXT_PUBLIC_` variable. Existing accounts are kept verified by the
database migration; new registrations require email verification.
