# node-express-php-client

Php Client for the ExpressJS

## Usage

```js
const express = require('express');
const PhpClient = require('node-express-php-client');

const app = express();

app.use((req, res, next) => {
    req.state = {};
    req.phpClient = performPhpClient();
    return next();
});

// Pass all requests to the php service:
app.use('/', (req, res) => req.phpClient.useLocation().pass(req, res));

// Pass `/slow` prefixed requests to the slow php service:
app.use('/slow', (req, res) => req.phpClient.useLocation('slow').pass(req, res));


function performPhpClient() {
    // Create an instance with a default location:
    const phpClient = new PhpClient('common', {
        location: 'http://127.0.0.1:8380'
    });

    // Add a `slow` location:
    phpClient.addLocation('slow', {
        location: 'http://127.0.0.1:8381'
    });

    return phpClient;
}

```
