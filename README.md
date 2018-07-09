# AWS Signed Api for Mos services

## Installation

```shell
npm install --save Askmos/acceptance-test-utils
```

or

```shell
yarn add Askmos/acceptance-test-utils
```

## Usage

```javascript
const { User } = require('acceptance-test-utils');
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
