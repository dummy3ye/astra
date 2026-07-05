import { createApp } from './app.js';

const PORT = Number(process.env.DASHBOARD_PORT) || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
