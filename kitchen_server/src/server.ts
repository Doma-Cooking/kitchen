import { createServer } from 'http';
import { Dependencies } from './di/dependencies.js';
import httpServer from './server/httpServer.js';
import { setupWsServer } from './server/wsServer.js';

export const dependencies = new Dependencies();

const server = createServer(httpServer);
setupWsServer(server);
server.listen(3000, () => {
  console.log('Kitchen server is running on port 3000');
});