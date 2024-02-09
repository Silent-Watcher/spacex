import axios from 'axios';
import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import responseTime from 'response-time';
import {env} from 'node:process';
dotenv.config();

const app = express();
const port = env.SERVER_PORT;

app.use(responseTime(), compression(), helmet());

app.get('/', (req, res) => {
  res.send('cache using redis db');
});

const redisClient = new Redis(env.REDIS_PORT);

app.get('/rockets', async (req, res, next) => {
  try {
    let redisData = await redisClient.get('rockets');
    if (redisData) {
      console.log('get cached data ..');
      return res.send(JSON.parse(redisData));
    }
    let response = await axios.get('https://api.spacexdata.com/v3/rockets');
    redisClient.set('rockets', JSON.stringify(response.data), 'EX', 5);
    return res.send(response.data);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status).json({
    code: res.statusCode,
    error: {
      message: err.message,
      ...err,
    },
  });
});

redisClient.on('connect', () => {
  app.listen(port, console.log(`running on port ${port}`));
});

redisClient.on('error', () => {
  console.error('failed to connect to redis');
  process.exit();
});
