import dotenv from 'dotenv';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import jwt from 'express-jwt';
import cors from 'cors';
import winston from 'winston';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
import { name } from '../package.json';
import ingredients from './routes/ingredients';

app.disable('etag');
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

if (!process.env.NO_AUTH) {
  const { AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = process.env;
  const authenticate = jwt({ secret: AUTH0_CLIENT_SECRET, audience: AUTH0_CLIENT_ID });

  app.use('/', authenticate);
}

app.use('/ingredients', ingredients);


app.listen(PORT, err => {
  if (err) {
    throw err;
  }

  winston.info(`${name} successfully started and listening on port ${PORT}.`);
});
