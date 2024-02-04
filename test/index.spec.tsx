import React, { ChangeEvent, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useConnector } from '../src';

const TestLayout = () => (
  <div>
    <span></span>
    {[<span key={1}>1</span>, <span key={2}>2</span>]}
  </div>
);

const TestOutput = ({ test = '1', sample = '' }) => (
  <div>
    {[
      <span key={1} id="1">
        {test}
      </span>,
      <span key={2} id="2">
        {sample}
      </span>,
    ]}
  </div>
);

const TestOutput2 = () => {
  const [num, setNum] = useState(0);

  return (
    <div title={`${num}`}>
      <TestOutput />
      <button onClick={() => setNum(1)}></button>
    </div>
  );
};

const TestInput = ({ list = [1, 2] }) => (
  <div>
    <input type="text" name="test" />
    <button type="submit">submit</button>
    <TestOutput />
    <ul>{list?.map((a, i) => <li key={i}>{a}</li>)}</ul>
  </div>
);

const TestOutput3 = ({ input = [] }) => {
  return (
    <div>
      <TestInput />
      <span id="3">{JSON.stringify(input)}</span>
    </div>
  );
};

const TestInputProp = ({ input = <input type="text" name="test" /> }) => <div>{input}</div>;

const TestComponent = ({ test = 1 }) => {
  const { view } = useConnector();

  return view(TestLayout, { 'div span': () => () => ({ test }) });
};

const TestModelPass = () => {
  const { view, model, pass, set } = useConnector({
    state: { sample: 'sample', test: '', list: [1, 2] },
  });

  return view(TestInput, {
    input: model('test2'),
    'input[type=text][name]': model('test'),
    'button[type][type~=submit]':
      ({ test }) =>
      () => ({
        onClick: () => set('sample', `s${test}`),
      }),
    TestOutput: pass('test'),
  });
};

const TestModelPass2 = () => {
  const { view, model, pass, set } = useConnector();

  return view(TestInput, {
    'input[type=text][name]': model(),
    'button[type~=submit]': () => () => ({
      onClick: () => set('sample', `PASS`),
    }),
    TestOutput: pass(true, ['test']),
  });
};

const TestFailedPass = () => {
  const { view, pass } = useConnector({
    state: { test: '1' },
  });

  return view(TestInput, {
    TestOutput: pass(),
  });
};

const TestModelProp = () => {
  const { view, model } = useConnector();

  return view(() => <TestInputProp input={<input type="text" name="test" />} />, {
    TestInputProp: model(['input']),
    'TestInputProp[input=test]': model(['input']),
  });
};

const TestFailedModelProp = () => {
  const { view, model } = useConnector();

  return view(() => <TestInputProp input={<input type="text" name="test" />} />, {
    '[input]': model(['name']),
  });
};

const TestOverride = () => {
  const { view, attach } = useConnector();

  return view(TestLayout, {
    div: attach(TestComponent, { test: 2 }),
  });
};

const TestOverride2 = () => {
  const { view } = useConnector({ state: { test: 2 } });

  return view(TestLayout, {
    div: <TestComponent test={222} />,
  });
};

const TestOverride3 = () => {
  const { view, attach } = useConnector({ state: { test: 2 } });

  return view(TestLayout, {
    div: attach(TestComponent, ['test']),
  });
};

const Div = <div />;

const TestFailedAttach = () => {
  const { view, attach } = useConnector({ state: { test: 2 } });

  return view(TestLayout, {
    div: attach(Div.type, ['test']),
  });
};

const TestModelSelector = () => {
  const { view, model, pass } = useConnector({ state: { sample: 'test' } });

  return view(TestInput, {
    'div input[name="sample"]': model(),
    'div input[name*="sample"]': model(),
    'div input[name^="sample"]': model(),
    'div input[name$="sample"]': model(),
    "input[sample='']": model(),
    'input[sample=]': model(),
    'input[sample=|]': model(),
    'input[sample]': model(),
    TestOutput: pass(true),
  });
};

const TestQuery = () => {
  const { view, query } = useConnector();

  return view(TestInput, {
    TestOutput: query({
      'span[key=2]': false,
      span: () => () => ({ test: 'Query' }),
    }),
  });
};

const TestEach = () => {
  const { view, each, query } = useConnector({ state: { data: [1, 2, 3] } });

  return view(TestOutput2, {
    TestOutput: each(
      ({ data }) =>
        () =>
          data.map((d) =>
            d == 2
              ? query({
                  'span[key=2]': false,
                  span: () => () => ({ test: 'Query' }),
                })
              : { test: 'each', sample: d }
          )
    ),
  });
};

const TestEachModel = () => {
  const { view, each, model } = useConnector({ state: { data: [1, 2, 3], input: [] } });

  return view(TestInput, {
    input: each(
      ({ data }) =>
        () =>
          data.map((_d, i) => model(`input.${i}`))
    ),
    TestOutput:
      ({ input }) =>
      () => ({ test: JSON.stringify(input) }),
  });
};

const TestEachQueryModel = () => {
  const { view, each, query, model } = useConnector({ state: { data: [1, 2, 3], input: [] } });

  return view(TestOutput3, {
    TestInput: each(
      ({ data }) =>
        () =>
          data.map((_d, i) =>
            query({
              input: model(`input.${i}`),
            })
          )
    ),
  });
};

const TestConditionalModel = () => {
  const { view, model } = useConnector();

  return view(TestInput, {
    input: ({ input }) => (input == 'yes' ? model('input1') : model('input')),
    TestOutput:
      ({ input, input1 }) =>
      () => ({ test: `${input}${input1 || ''}` }),
  });
};

const TestHooks = () => {
  const { view } = useConnector({
    hooks: {
      'input|setInput': () => useState(''),
    },
  });

  return view(TestInput, {
    input:
      ({ input, setInput }) =>
      () => {
        console.log('render');
        return ({
          value: input,
          onChange: (e: ChangeEvent<{ value: string }>) => setInput(e.target.value),
        })
      },
    TestOutput:
      ({ input }) =>
      () => ({ test: input }),
  });
};

afterEach(cleanup);

describe('index', () => {
  describe('useGenrate', () => {
    it('should render the component', () => {
      const screen = render(<TestComponent />);

      expect(screen.container.querySelector('span[test]')).toBeTruthy();
    });

    it('should render the model data', () => {
      const { container } = render(<TestModelPass />);

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: '222' } });

      const button = container.querySelector('button');
      if (button) fireEvent.click(button);

      expect(container.querySelector('span')).toHaveTextContent('222');
    });

    it('should render the pass method with boolean params', () => {
      const { container } = render(<TestModelPass2 />);

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: 'PASS' } });

      const button = container.querySelector('button');
      if (button) fireEvent.click(button);

      expect(container.querySelectorAll('span')[1]).toHaveTextContent('PASS');
    });

    it('should throw error when pass method is empty', () => {
      try {
        render(<TestFailedPass />);
      } catch (e) {
        expect((e as Error).message).toBe('No data specified to pass on');
      }
    });

    it('should render the override component', () => {
      const { container } = render(<TestOverride />);

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', '2');
    });

    it('should render the override component with array params', () => {
      const { container } = render(<TestOverride2 />);

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', '222');
    });

    it('should render the override component with array params', () => {
      const { container } = render(<TestOverride3 />);

      expect(container.querySelector('span[test]')).toBeTruthy();
      expect(container.querySelector('span')).toHaveAttribute('test', '2');
    });

    it('should render failed attach query', () => {
      const { container } = render(<TestFailedAttach />);

      expect(container.querySelector('span[test]')).toBeFalsy();
    });

    it('should render and apply model on input prop', () => {
      const { container } = render(<TestModelProp />);

      expect(container.querySelector('input[value]')).toBeTruthy();

      const input = container.querySelector('input');

      if (input) fireEvent.change(input, { target: { value: '3' } });

      expect(container.querySelector('input')).toHaveValue('3');
    });

    it('should render failed model on input prop', () => {
      const { container } = render(<TestFailedModelProp />);

      expect(container.querySelector('input[value]')).toBeFalsy();
    });

    it('should render and apply model selector ~', () => {
      const { container } = render(<TestModelSelector />);

      expect(container.querySelector('input[value]')).toBeFalsy();
    });

    it('should render and apply query data', () => {
      const { container } = render(<TestQuery />);

      expect(container.querySelector('span[test="Query"]')).toBeTruthy();
      expect(container.querySelector('span[id="2"]')).toBeFalsy();
    });

    it('should render and apply each data', () => {
      const { container } = render(<TestEach />);

      const button = container.querySelector('button');
      if (button) fireEvent.click(button);

      expect(container.querySelector('div[title]')).toHaveAttribute('title', '1');
      expect(container.querySelector('span')).toHaveTextContent('each');
      expect(container.querySelector('span[test="Query"]')).toBeTruthy();
    });

    it('should render and apply each model', () => {
      const { container } = render(<TestEachModel />);

      const input = container.querySelector('input[name="input.0"');
      const input1 = container.querySelector('input[name="input.1"');
      const input2 = container.querySelector('input[name="input.2"');

      if (input) fireEvent.change(input, { target: { value: 'Y' } });
      if (input1) fireEvent.change(input1, { target: { value: 'E' } });
      if (input2) fireEvent.change(input2, { target: { value: 'S' } });

      expect(container.querySelector('span[id="1"]')).toHaveTextContent('["Y","E","S"]');
    });

    it('should render and apply each query model', () => {
      const { container } = render(<TestEachQueryModel />);

      const input = container.querySelector('input[name="input.0"');
      const input1 = container.querySelector('input[name="input.1"');
      const input2 = container.querySelector('input[name="input.2"');

      if (input) fireEvent.change(input, { target: { value: 'Y' } });
      if (input1) fireEvent.change(input1, { target: { value: 'E' } });
      if (input2) fireEvent.change(input2, { target: { value: 'S' } });

      expect(container.querySelector('span[id="3"]')).toHaveTextContent('["Y","E","S"]');
    });

    it('should render and apply conditional model', () => {
      const { container } = render(<TestConditionalModel />);

      const input = container.querySelector('input[name="input"]');

      if (input) fireEvent.change(input, { target: { value: 'yes' } });

      expect(container.querySelector('span[id="1"]')).toHaveTextContent('yes');

      const input1 = container.querySelector('input[name="input1"]');

      if (input1) fireEvent.change(input1, { target: { value: 'no' } });

      expect(container.querySelector('span[id="1"]')).toHaveTextContent('yesno');
    });

    it('should render and apply hooks', () => {
      const { container } = render(<TestHooks />);

      const input = container.querySelector('input');
      expect(container.querySelector('span')).toHaveTextContent('');

      if (input) fireEvent.change(input, { target: { value: 'hello' } });

      expect(container.querySelector('span')).toHaveTextContent('hello');
    });
  });
});
