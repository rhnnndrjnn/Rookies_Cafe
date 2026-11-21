# Email verification for review vouchers (no database change)

The Feedback page now emails a one-time code to confirm the customer owns the address.
It uses Supabase's built-in email login codes, so the only thing to do is a dashboard setting:

1. Supabase > Authentication > Email Templates.
2. Open **Confirm signup** and **Magic Link** and make sure each email body shows the code, e.g.
   `<h2>Your Rookies Cafe code</h2><p>Enter this code on our Feedback page: <b>{{ .Token }}</b></p>`
   (The default templates only contain a link, which will NOT work here.)
3. Recommended: Authentication > SMTP Settings > set your own SMTP (Resend, Brevo, Gmail...).
   Supabase's built-in sender allows only a few emails per hour.
4. Authentication > Providers > Email must be enabled.

Customers who verify appear under Authentication > Users; they have no staff access.
