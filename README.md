# GenRate React

[![npm package][npm-img]][npm-url] [![Build Status][build-img]][build-url] [![Downloads][downloads-img]][downloads-url] [![Issues][issues-img]][issues-url] [![codecov][codecov-img]][codecov-url] [![Commitizen Friendly][commitizen-img]][commitizen-url] [![Semantic Release][semantic-release-img]][semantic-release-url]

> GenRate React package aims to organize, expand, add more plexibility on building react web application 

## Install

```bash
npm install @genrate/react
```

## Usage

### Design
```tsx
/**
 * Output
 */
const Output ({  
  // overriden test data
  user = {
    email: 'test@test.com', 
    password: 'passsword'
  }
}) => (
  user && <Box>
    {email} {password}
  </Box>
)

/**
 * Input
 */
const Input () => (
  <Box>
    <Typography>
      Sign in 
    </Typography>
    <Box>
      <TextField required label="Email Address" name="email" />
      <TextField label="Password" type="password" id="password" />
      <FormControlLabel
        control={<Checkbox name="remember" value="remember" color="primary" />}
        label="Remember me"
      />
      <Button type="submit" >
        Sign In
      </Button>
    </Box>
    <Output />
  </Box>
)

/**
 * Layout
 */
export const Main = () => (
  <Box>
    <Avatar>
      <LockOutlinedIcon />
    </Avatar>
    <Typography component="h1" variant="h5">
      Sign in
    </Typography>
    <Input />
    <Output />
  </Box>
)

```
### Add Functionality

```ts
import { useConnector } from '@genrate/react';

interface Data {
  email: string;
  password: string;
};

/**
 * Input Component
 */
export const SignIn = ({
  onSubmit = (data: Data) => console.log('test', data)
}) => {

  const { view, model, pass, attach } = useConnector<Data>();

  // render only once

  return view(Input, {
    // Select components to manipulate 
    'TextField[required]': model(), // dynamic auto binding of input
    'Box TextField[name=password]': model('password'), // auto binding of input

    // prop level model auto binding
    'FormControlLabel[control]': model(['control'], (e) => e.target.checked),

    // dynamic auto binding base state data
    TextField: ({ input }) => input == 'yes' ? model('input2') : model('input'), 

    // Add on click event to button
    'Button[type=submit]':
      // subscribe to specific data
      ({ email, password }) => 
      () => ({ 
        onClick: () => {
          onSubmit({ email, password, remember })
        }
      }),
  })
}

/**
 * Main Component
 */
export default function () {
  const { view, attach, set, pass, query, each } = useConnector({ list: [1,2,3], input: [] });

  return view(Main, {
    // Attach othe component and set prop 
    Input: attach(SignIn, { 
            // receive data from other component
            onSubmit: (data) => set('user', data)
          }),

    // search inside an element and apply data changes
    Input: query({
      TextField: model(),
      Button: 
        ({ email }) => 
        () => ({ 
          onClick: () => console.log('email') 
        })
    }),

    // Iterator
    Input: each(
      ({ list }) => 
      () => list.map((l, i) => {

        if (l == 1) {
          // query iterated element
          return query({
            // array model value
            TextField: model(`input.${i}`)
          })
        } 

        // iterated element props 
        return ({ test: 'value' })
      })
    ),


    // pass data to other component 
    Test: pass('user', 'input')
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
[codecov-img]: https://codecov.io/gh/GenRate/genrate-react/branch/master/graph/badge.svg?token=A0V6BNMPRY
[codecov-url]: https://codecov.io/gh/GenRate/genrate-react
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
