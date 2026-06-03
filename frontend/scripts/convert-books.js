// Render Cron Job script — calls the convert-books API endpoint.
// Render runs this every 5 minutes (configured in render.yaml).
// Required env vars: APP_URL, CRON_SECRET (optional)

const url = `${process.env.APP_URL}/api/admin/convert-books`;
const secret = process.env.CRON_SECRET;

fetch(url, {
  method: 'GET',
  headers: secret ? { Authorization: `Bearer ${secret}` } : {},
})
  .then((r) => r.json())
  .then((data) => {
    console.log('[cron] convert-books result:', JSON.stringify(data));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[cron] convert-books failed:', err.message);
    process.exit(1);
  });
