import { app } from 'electron';
import { DBConnection } from './db';
import { registerIpc } from './ipc';
import { createServices } from './services';

let database: DBConnection | undefined;

async function initialize() {
  database = await DBConnection.connect(app.getPath('userData'));
  registerIpc(createServices(database));
}

void app
  .whenReady()
  .then(initialize)
  .catch((error: unknown) => {
    console.error('Failed to initialize the main process.', error);
    app.quit();
  });

app.on('will-quit', () => {
  database?.close();
  database = undefined;
});
