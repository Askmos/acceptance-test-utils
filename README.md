# Serverless tests

Class and funtions useful to run integration tests in serverless.

## Installation

```shell
npm install --save Askmos/serverless-tests
```

or

```shell
yarn add Askmos/serverless-tests
```

## Usage

```javascript
const { User } = require('serverless-tests');
const API = require('aws-signed-api');

const baseUrl = 'https://api-staging.mos.com'
let api;

const user = new User();
const authenticationPromise = user.authenticatePromise();
authenticationPromise
  .then((credentials) => {
    api = new API(baseUrl, credentials, user.config.region)
    return api.get('');
  })
  .then(response => console.log(response));
```
