import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware';
import authRoutes from './routes/auth';
import statsRoutes from './routes/stats';
import bansRoutes from './routes/bans';
import serversRoutes from './routes/servers';
import usersRoutes from './routes/users';
import auditLogRoutes from './routes/audit-logs';
import automodRoutes from './routes/automod';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(authRoutes);
app.use(statsRoutes);
app.use(bansRoutes);
app.use(serversRoutes);
app.use(usersRoutes);
app.use(auditLogRoutes);
app.use(automodRoutes);
app.use(adminRoutes);
app.use(healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Dashboard API running on port ${PORT}`);
});
