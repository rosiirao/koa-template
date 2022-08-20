import dotenv from 'dotenv';
if (process.env.NODE_ENV === 'production') {
  dotenv.config();
}
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
