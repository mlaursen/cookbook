import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import jwt from 'express-jwt';

const app = express();
const PORT = process.env.PORT || 3001;
import { name } from '../package.json';
import { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } from './config';

app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

const authenticate = jwt({ secret: AUTH0_CLIENT_SECRET, audience: AUTH0_CLIENT_ID });

app.use('/', authenticate);

app.listen(PORT, err => {
  if (err) {
    throw err;
  }

  console.log(`${name} successfully started and listening on port ${PORT}`);
});
