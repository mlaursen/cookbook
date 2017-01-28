# cookbook-api
This is the restful api server for the cookbook application. The api server will be behind an Auth0 SSO solution
with JWT auth. All auth can be disabled for debugging. See below for more details.

## Getting Started
To handle the environment variables, copy over the example env to `.env` and then update the variables accordingly.

```bash
$ cp .env.example .env
```

Once it has been copied, make sure to update the `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` with
your values. If you do not want to use auth at all, set `NO_AUTH` to any value.

## CRUD
Since the purpose of CRUD is for single id lookups, deletes, and updates,
_most_ routes can use the utility funtions found in `src/utils/routes.js`.

If you want the default behavior, a new route can be created with `createCRUDRoute`. Example:

```js
app.use('/users', createCRUDRoute('User', createSchema({ username: 'TEXT' })));
```

You can now do the following requests:

```bash
# Get all users
$ curl -iX GET 'http://localhost:3001/users'

# Get a single user
$ curl -iX GET 'http://localhost:3001/users/32'

# Conditionally get a user
$ curl -iX GET 'http://localhost:3001/users/32' \ 
  -H 'If-None-Match: "jfkdsajfla_fdasfj"'

# Update a user (if etags match)
$ curl -iX PUT 'http://localhost:3001/users/32' \ 
  -H 'If-Match: "jfkadsklfj_jfijsd"' \ 
  -H 'Content-Type: application/json' \ 
  -d '{ "id": 32, "username": "fredflinstone" }'

# Create a user
$ curl -iX POST 'http://localhost:3001/users' \ 
  -H 'Content-Type: application/json' \ 
  -d '{ "username": "wubbawubba" }'

# Delete a user (if etags match)
$ curl -iX DELETE 'http://localhost:3001/users/32' \ 
  -H 'If-Match: "jfkadsklfj_jfijsd"'
```

There are some additional options for `createCRUDRoute` that allow for more validation for creates and updates.
