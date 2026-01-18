import { Dependencies } from './di/dependencies.js';
import app from './server/app.js';

export const dependencies = new Dependencies();

app.listen(3000, () => {
  console.log('Kitchen server is running on port 3000');
});