import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[Server] MindBridge API running on http://localhost:${PORT}`);
  console.log(`[Server] Swagger docs at http://localhost:${PORT}/api/docs`);
});
