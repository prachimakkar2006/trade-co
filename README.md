# tread&co

Premium Indian footwear storefront built with React, Express, and MongoDB Atlas. The customer website includes authentication, catalogue, cart/wishlist, coupons, saved delivery addresses, PIN lookup, Razorpay checkout, and account order management. Store operations are available through authorization-protected backend APIs; the customer website has no admin dashboard.

## Backend setup

Requirements: Node.js 20 or newer and npm. On PowerShell, use `npm.cmd` if script execution blocks `npm`.

1. Copy `backend/.env.example` to `backend/.env` and fill in the required values locally. Never commit `.env`.
2. From `ecommerce/backend`, install and run:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

3. Seed the database in a second terminal:

   ```powershell
   npm.cmd run seed
   ```

The database URI must point to a MongoDB replica set because checkout uses transactions in later phases. Health is available at `http://localhost:5000/api/v1/health` and reports MongoDB connection state.

## Frontend setup

From `ecommerce/frontend`, install and run the Vite app:

```powershell
npm.cmd install
npm.cmd run dev
```

Copy `frontend/.env.example` to `frontend/.env`. Set `VITE_GOOGLE_CLIENT_ID` to the same Google Web Client ID as the backend `GOOGLE_CLIENT_ID`; set the local Google OAuth JavaScript origin to `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:5000/api/v1`.

## Authentication (Phase 2)

The auth API is mounted at `/api/v1/auth`: register, login, Google ID-token login, refresh, logout, current user, forgot password, and reset password. Access tokens stay in frontend memory. Refresh tokens are stored as hashes and rotated in the database; the browser receives them only in an HttpOnly cookie. Refresh and logout also require the double-submit CSRF token. Password reset mail uses the configured SMTP settings.

Start the backend and frontend in separate terminals. Register at `http://localhost:5173/register`; existing users can sign in at `/login`. The Google button appears when the frontend Client ID is configured. The development account recovery email uses the configured SMTP server.

## Environment variables

Backend settings are listed in `backend/.env.example`. `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required by the current backend configuration. To use payment checkout, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to matching **test-mode** credentials. Set `RAZORPAY_WEBHOOK_SECRET` to the secret configured for the test webhook in the Razorpay Dashboard. Those values stay in `backend/.env`; never put the secret in frontend variables or commit it.

The JWT secrets should be different, random strings of at least 32 characters. Store all credentials in `.env` or the deployment provider's secret manager. Never expose server secrets in browser code. The payment API returns only Razorpay's public Key ID to the browser.

## Cart, shipping, and test payment flow (Phases 4–5)

1. Run the seed script once if the `shoestore` database does not already contain products and coupons.
2. Sign in, add a product and size to the bag, then open the bag and continue to delivery.
3. Save or select a shipping address. The server rechecks catalog prices, stock, discounts, shipping, and total when creating checkout.
4. Select **Pay securely with Razorpay**. Test-mode transactions are simulated and do not charge real money. Payment confirmation is recorded only after the server verifies the Razorpay response or a signed webhook.

For webhook testing, expose the backend through a temporary HTTPS tunnel such as ngrok, then configure the Razorpay **Test Mode** webhook URL as `https://<your-tunnel>/api/v1/payments/webhook`. Use the same webhook secret in the dashboard and `RAZORPAY_WEBHOOK_SECRET`; subscribe to `payment.captured`, `payment.failed`, `order.paid`, and `refund.processed`. The signed checkout verification endpoint is the local fallback when Razorpay cannot reach a backend running only on localhost.

## Seed behavior

The seed script upserts 6 categories, 50 catalogue products, 5 coupons, an admin user, and 6 **inactive preview slides**. Preview slides are inactive so sample names and copy cannot be mistaken for real customer testimonials. Add only customer stories and images collected with consent before activating them.

Product images use Unsplash image URLs as development stock imagery. Replace or verify commercial usage rights for production assets.

## Architecture

```text
HTTP request
  -> Express middleware (security, CORS, rate limit, parsing)
  -> versioned route (added in later phases)
  -> controller -> service -> repository/model
  -> centralized error handler -> JSON response
```

The backend uses the app/server split, validated environment settings, MongoDB Atlas transactions, layered routes/controllers/services, Winston logging, validated APIs, and a centralized error handler.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Process and database health |
| POST | `/api/v1/orders` | Create an internal order and Razorpay order; requires `Idempotency-Key` and a saved `addressId` |
| GET | `/api/v1/orders` | List the signed-in customer's orders |
| GET | `/api/v1/orders/:orderId` | Fetch an order owned by the signed-in customer |
| POST | `/api/v1/orders/:orderId/cancel` | Submit a cancellation request (unpaid created orders cancel immediately) |
| POST | `/api/v1/orders/:orderId/return` | Request a return within seven days of delivery |
| PATCH | `/api/v1/auth/profile` | Update account name and Indian mobile number |
| GET | `/api/v1/products/:slug/reviews` | List public, moderated reviews for a product |
| POST | `/api/v1/products/:productId/reviews` | Submit a review after a verified delivery |
| GET | `/api/v1/admin/dashboard` | Admin dashboard counts and recent orders |
| `/api/v1/admin/products` | Product and stock management for administrators |
| `/api/v1/admin/orders` | Fulfilment, tracking, and refunds for administrators |
| `/api/v1/admin/reviews` | Review moderation for administrators |

Customer registration and sign-in are available at `/register` and `/login`. Store operation APIs remain restricted to authorized administrators; customer registration does not grant admin access. Refund actions require configured Razorpay credentials and send the refund request to the configured Razorpay environment.
| POST | `/api/v1/payments/verify` | Verify a Razorpay checkout signature and captured payment |
| POST | `/api/v1/payments/webhook` | Receive signed Razorpay test/live webhook events |

## Checks

- Terminal logs show `MongoDB connected` and `Server running`.
- `GET http://localhost:5000/api/v1/health` returns `success: true` when the database is connected.
- After seeding, MongoDB Compass shows 50 products, 6 categories, 5 coupons, 6 inactive hero slides, and the configured admin user.
- A test payment creates a paid order only after signature or webhook verification, decrements inventory transactionally, and removes the purchased quantities from the cart.

## License and customer content

Use only imagery with suitable rights and customer photos/stories with written consent. Do not publish the sample slides as testimonials.
