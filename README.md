# GenRate React

[![npm package][npm-img]][npm-url] [![Build Status][build-img]][build-url] [![Downloads][downloads-img]][downloads-url] [![Issues][issues-img]][issues-url] [![Code Coverage][codecov-img]][codecov-url] [![Commitizen Friendly][commitizen-img]][commitizen-url] [![Semantic Release][semantic-release-img]][semantic-release-url]

> GenRate React package aims to organize, expand, more plexibility on building and coding web application 

## Install

```bash
npm install @genrate/react
```

## Usage

```ts
import { useGenRate } from '@genrate/react';


/**
 * Display Data
 */
const Display ({ email, password }) => (
  <Box>
    {email} {password}
  </Box>
)

/**
 * Input Data
 */

const Template () => (
  <Box>
    <Typography>
      Sign in 
    </Typography>
    <Box>
      <TextField required label="Email Address" name="email" />
      <TextField label="Password" type="password" id="password" />
      <Button type="submit" >
        Sign In
      </Button>
      <Display />
    </Box>
  </Box>
)


/**
 * Add Functionality
 */
interface Data {
  email: string,
  password: string;
}

export default function (props: Data) {

  const { view, model, pass } = useGenRate<Data>(props);

  // render only once

  return view(SignIn, {
    // Select components to manipulate
    'TextField[name=email][required]': model('email'), // auto binding of input
    'Box TextField[name=password]': model('password'), // auto binding of input

    // retrieve and subscribe to data without rerendering 
    'Button[type=submit]': ({ email, password }) => ({ 
      onClick: () => {
        alert(`${email} ${password}`) 
      }
    }),

    // point out component that re render
    Display: pass('email', 'password') 
  })
}

```
[build-img]: https://github.com/GenRate/genrate-react/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/GenRate/genrate-react/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/@genrate/react
[downloads-url]: https://www.npmtrends.com/@genrate/react
[npm-img]: https://img.shields.io/npm/v/@genrate/react
[npm-url]: https://www.npmjs.com/package/@genrate/react
[issues-img]: https://img.shields.io/github/issues/GenRate/genrate-react
[issues-url]: https://github.com/GenRate/genrate-react/issues
[codecov-img]: https://codecov.io/gh/GenRate/genrate-react/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/GenRate/genrate-react
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
