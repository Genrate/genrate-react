import React, { ReactElement } from 'react'
import {cleanup, fireEvent, render} from '@testing-library/react'
import { useGenRate } from "../src";
import { arrayBuffer } from 'stream/consumers';

const TestLayout = ({ test = '2', sample = '1' }) => (
  <div>
    <span></span>
  </div>
)

const TestOutput = ({ test = '1', sample = '' }) => (
  <div>
    {[
      <span key={1}>{test}</span>,
      <span key={2}>{sample}</span>
    ]}
  </div>
)

const TestInput = ({ list = [1,2] }) => (
  <div>
    <input type="text" name="test" />
    <button type="submit">submit</button>
    <TestOutput />
    <ul>
      {list && list.map((a, i) => 
        <li key={i}>{a}</li>
      )}
    </ul>
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
  const { view, model, pass, set } = useGenRate({ sample: 'sample', test: '', list: [1, 2] })

  return view(TestInput, {
    'input[type=text][name]': model('test'),
    'button[type][type~=submit]': ({ test }) => ({
      onClick: () => set('sample', `s${test}`)
    }),
    TestOutput: pass('test')
  }) as ReactElement
}

const TestModelPass2 = () => {
  const { view, model, pass, set } = useGenRate()

  return view(TestInput, {
    'input[type=text][name]': model(),
    'button[type~=submit]': () => ({
      onClick: () => set('sample', `PASS`)
    }),
    TestOutput: pass(true, ['test'])
  }) as ReactElement
}

const TestFailedPass = () => {
  const { view, pass } = useGenRate({ test: '1' })

  return view(TestInput, {
    TestOutput: pass()
  }) as ReactElement
}

const TestModelProp = () => {
  const { view, model } = useGenRate()

  return view(() => <TestInputProp input={<input type="text" name="test" />} />, {
    'TestInputProp': model(['input']),
    'TestInputProp[input=test]': model(['input']),
  }) as ReactElement
}

const TestFailedModelProp = () => {
  const { view, model } = useGenRate()

  return view(() => <TestInputProp input={<input type="text" name="test" />} />, {
    '[input]': model(['name']),
  }) as ReactElement
}

const TestOverride = () => {
  const { view, attach } = useGenRate()

  return view(TestLayout, {
    div: attach(TestComponent, { test: 2 }) 
  }) as ReactElement
}

const TestOverride2 = () => {
  const { view } = useGenRate({ test: 2 })

  return view(TestLayout, {
    div: <TestComponent test={222} /> 
  }) as ReactElement
}

const TestOverride3 = () => {
  const { view, attach } = useGenRate({ test: 2 })

  return view(TestLayout, {
    div: attach(TestComponent, ['test']) 
  }) as ReactElement
}

const Div = <div />

const TestFailedAttach = () => {
  const { view, attach } = useGenRate({ test: 2 })

  return view(TestLayout, {
    div: attach(Div.type, ['test']) 
  }) as ReactElement
}

const TestModelSelector = () => {
  const { view, model, pass } = useGenRate({ sample: 'test' })

  return view(TestInput, {
    'div input[name="sample"]': model(),
    'div input[name*="sample"]': model(),
    'div input[name^="sample"]': model(),
    'div input[name$="sample"]': model(),
    "input[sample='']": model(),
    "input[sample=]": model(),
    "input[sample=|]": model(),
    'input[sample]': model(),
    TestOutput: pass(true)
  }) as ReactElement
}

const TestQuery = () => {
  const { view, query } = useGenRate()

  return view(TestInput, {
    TestOutput: query({
      'span[key=2]': false,
      span: () => ({ test: 'Query' })
    })
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

    it('should render the pass method with boolean params', () => {

      const { container } = render(<TestModelPass2 />)

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: 'PASS'}})

      const button = container.querySelector('button');
      if (button) fireEvent.click(button);

      expect(container.querySelectorAll('span')[1]).toHaveTextContent('PASS');
    });

    it('should throw error when pass method is empty', () => {
      try {
        const { container } = render(<TestFailedPass />)
      } catch (e) {
        expect((e as Error).message).toBe('No data specified to pass on');
      }
      
    });

    it('should render the override component', () => {

      const { container } = render(<TestOverride />)

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', "2");
    });

    it('should render the override component with array params', () => {

      const { container } = render(<TestOverride2 />)

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', "222");
    });

    it('should render the override component with array params', () => {

      const { container } = render(<TestOverride3 />)

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', "2");
    });

    it('should render failed attach query', () => {

      const { container } = render(<TestFailedAttach />)

      expect(container.querySelector('span[test]')).toBeFalsy();
    });

    it('should render and apply model on input prop', () => {

      const { container } = render(<TestModelProp />)

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: '3'}})

      expect(container.querySelector('input')).toHaveValue('3');
    });

    it('should render failed model on input prop', () => {

      const { container } = render(<TestFailedModelProp />)

      expect(container.querySelector('input[value]')).toBeFalsy();
    });

    it('should render and apply model selector ~', () => {

      const { container } = render(<TestModelSelector />)

      expect(container.querySelector('input[value]')).toBeFalsy()
    });

    it('should render and apply query data', () => {

      const { container } = render(<TestQuery />);

      expect(container.querySelector('span[test="Query"]')).toBeTruthy();
    });
  });
});
