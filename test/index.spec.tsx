import React, { ReactElement } from 'react'
import {cleanup, fireEvent, render} from '@testing-library/react'
import { useGenRate } from "../src";

const TestLayout = ({ test = '' }) => (
  <div>
    <span></span>
  </div>
)

const TestOutput = ({ test = '1', sample = '' }) => (
  <div>
    <span>{test}</span>
    <span>{sample}</span>
  </div>
)

const TestInput = () => (
  <div>
    <input type="text" name="test" />
    <button type="submit">submit</button>
    <TestOutput />
  </div>
)

const TestInputProp = ({ input = <input type="text" name="test" /> }) => (
  <div>
    {input}
  </div>
)

const TestComponent = ({ test = 1 }) => {
  const { view } = useGenRate()

  return view(TestLayout, { 'div span': () => ({ test }) }) as ReactElement
}

const TestModelPass = () => {
  const { view, model, pass, set } = useGenRate({ sample: 'sample', test: '' })

  return view(TestInput, {
    'input[type=text][name]': model(),
    'button[type][type~=submit]': ({ test }) => ({
      onClick: () => set('sample', `s${test}`)
    }),
    TestOutput: pass('test')
  }) as ReactElement
}

const TestModelProp = () => {
  const { view, model } = useGenRate()

  return view(() => <TestInputProp input={<input type="text" name="test" />} />, {
    'TestInputProp': model(['input']),
    'TestInputProp[input=test]': model(['input']),
  }) as ReactElement
}

const TestOverride = () => {
  const { view, attach } = useGenRate({ gtype: null })

  return view(TestLayout, {
    div: attach(TestComponent, { test: 2 }) 
  }) as ReactElement
}

const TestModelSelector = () => {
  const { view, model, pass } = useGenRate()

  return view(TestInput, {
    'input[name=sample]': model(),
    TestOutput: pass(true, ['test'])
  }) as ReactElement
}

afterEach(cleanup)

describe('index', () => {
  describe('useGenrate', () => {
    it('should render the component', () => {

      const screen = render(<TestComponent />)

      expect(screen.container.querySelector('span[test]')).toBeTruthy();
    });

    it('should render the model data', () => {

      const { container } = render(<TestModelPass />)

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: '222'}})

      const button = container.querySelector('button');
      if (button) fireEvent.click(button);

      expect(container.querySelector('span')).toHaveTextContent('222');
    });

    it('should render the override the component', () => {

      const { container } = render(<TestOverride />)

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', "2");
    });

    it('should render and apply model on input prop', () => {

      const { container } = render(<TestModelProp />)

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: '3'}})

      expect(container.querySelector('input')).toHaveValue('3');
    });

    it('should render and apply model selector ~', () => {

      const { container } = render(<TestModelSelector />)

      expect(container.querySelector('input[value]')).toBeFalsy()
    });
  });
});
