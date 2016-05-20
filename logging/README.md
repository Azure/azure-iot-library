# @azure-iot/logging

A wrapper aroung the [Bunyan](https://github.com/trentm/node-bunyan) logging library that can be run either in a browser or on a Node.JS server.

## Development

Clone and run `npm install`.

## Installation

`npm install --save @azure-iot/logging`

## Usage

This package exposes two different versions of the same interface, one for
browser (client) and one for server.

**Client Module** - '@azure-iot/logging/client'

**Server Module** - '@azure-iot/logging/server'

The server version can be imported using ES6 or AMD(Node.JS) syntax, such as:

```js
import {BunyanLogger} from '@azure-iot/logging/server';
```

The client package is bundled using SystemJS syntax and can be included using the
following script import:

```html
<script src="node_modules/@azure-iot/logging/client/client.js"></script>
```

From there, you can import into your SystemJS modules or using ES6 syntax in TypeScript
with the `module` compiler flag set to `system`.

### Loggers

To use either package, you need to import the `BunyanLogger` class and whichever
events you want to be able to log. The `BunyanLogger` class accepts the same
object with its constructor as
[`bunyan.createLogger()`](https://github.com/trentm/node-bunyan#constructor-api).
See below for an example.

```js
import {BunyanLogger, PageView} from '@azure-iot/logging/server';

let logger = new BunyanLogger({
  name: 'my-app',
  streams: [{
    level: 'trace',
    stream: process.stdout
  }]
});

logger.informational(new PageView(/* Params */));
```

### Middleware (server only)

The server variant of the module also provides middleware for Express applications
that can be used to automatically log IncomingServiceRequest and Exception events
for server routes. You can access this functionality with the `ExpressMiddleware`
class using the following methods:

```js
ExpressMiddleware.logISR(logger, operationName, operationVersion);
```

Applied as middleware on each route you want to log. Accepts the logger to use,
as well as the name and version of the operation to be used for logging

```js
ExpressMiddleware.logExceptions(logger);
```

Applied as error handling middleware at the end of the application, logging all
uncaught exceptions. It should be applied on the application after all other
middleware and routes but potentially before other error handling middleware.

**Example**

```js
import {BunyanLogger, ExpressMiddleware} from '@azure-iot/logging/server';
import * as express from 'express';

let logger = new BunyanLogger({
  name: 'my-app',
  streams: [{
    level: 'trace',
    stream: process.stdout
  }]
});

let app = express();
app.get('/users', ExpressMiddleware.logISR(logger, 'GetUsers', '1.0'));

// IMPORTANT: This must be declared after other middleware and routes
app.use(ExpressMiddleware.logExceptions(logger));
app.listen(3000, () => {
    console.log('App is running');
});
```
