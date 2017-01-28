import winston from 'winston';
import db, { createSchema, createTable } from '../db';
import createCRUDRoute from '../utils/routes';

const SCHEMA = createSchema({ name: 'TEXT' });

createTable('Ingredient', SCHEMA)
  .then(() => Promise.all([
    db.none('insert into Ingredient(name) values (\'ground beef\')'),
    db.none('insert into Ingredient(name) values (\'pork\')'),
    db.none('insert into Ingredient(name) values (\'ham\')'),
    db.none('insert into Ingredient(name) values (\'brocolli\')'),
    db.none('insert into Ingredient(name) values (\'carrot\')'),
    db.none('insert into Ingredient(name) values (\'lettuce\')'),
    db.none('insert into Ingredient(name) values (\'spaghetti\')'),
    db.none('insert into Ingredient(name) values (\'salt\')'),
    db.none('insert into Ingredient(name) values (\'pepper\')'),
    db.none('insert into Ingredient(name) values (\'oregano\')'),
    db.none('insert into Ingredient(name) values (\'ricotta cheese\')'),
    db.none('insert into Ingredient(name) values (\'cottage cheese\')'),
    db.none('insert into Ingredient(name) values (\'sharp cheddar cheese\')'),
    db.none('insert into Ingredient(name) values (\'chicken breast\')'),
    db.none('insert into Ingredient(name) values (\'bacon\')'),
  ]))
  .catch(err => {
    winston.debug(err);
  });


export default createCRUDRoute('Ingredient', SCHEMA);
