# The Crowd Grid (Next.js Event Photo Sharing)

The Crowd Grid is an event photo sharing app built with **Next.js**. It supports Google sign-in, guest uploads via codes, secure galleries, and Stripe subscriptions.

Demo coming soon.

## Features

### Event Management

- Create, update, and delete events
- Generate unique event codes and guest access codes
- Dashboard for managing events and viewing analytics

### Photo Management

- Upload photos as authenticated users or guests
- Bulk photo upload, download, and deletion
- Photo approval and rejection (moderation queue)
- S3 integration for secure photo storage
- Generate signed upload/download URLs
- Thumbnail generation and management
- Photo limit enforcement per event, with notification toasts when limit is reached

### Guest Access

- Join events via code
- Guest photo upload with optional name/email
- Guest access cookies for streamlined experience

### Gallery & Viewing

- Event-specific galleries for viewing and managing photos
- Gallery views for guests and authenticated users

### Payments & Subscriptions

- Stripe integration for payments and subscriptions
- Pricing page with Stripe Checkout
- Subscription management via Stripe Customer Portal
- Free and paid plans with upload/event limits

### Authentication & Security

- Google SSO authentication
- JWT-based session management
- Middleware for route protection (global and local)
- Role-based access control (admin, organizer, guest)

### Activity & Logging

- Activity logging for user and event actions

### Other Features

- Email notifications (via nodemailer)
- Admin dashboard for user/event/photo management
- API endpoints for events, photos, users, teams, and more
- Notification toasts for success, error, and info events (using Sonner)

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/nextjs/saas-starter
cd saas-starter
pnpm install
```

## Running Locally

[Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

Run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create a placeholder user record for demo purposes. Sign in via Google to create your own account.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

You can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain, e.g. `https://events.danielninetyfour.com`.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.
