/**
 * DeclareLang Playground
 * Interactive DSL editor and visualizer
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { render } from 'solid-js/web';
import { createSignal, type JSX } from 'solid-js';

function App(): JSX.Element {
  const [code, setCode] = createSignal('');

  return (
    <div style={{ padding: '20px', 'font-family': 'system-ui' }}>
      <h1>DeclareLang Playground</h1>
      <p>Coming soon in v1.0.0</p>
      <textarea
        value={code()}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLTextAreaElement;
          setCode(target.value);
        }}
        placeholder="Enter your DSL code here..."
        style={{
          width: '100%',
          height: '300px',
          'font-family': 'monospace',
          padding: '10px',
        }}
      />
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render((): JSX.Element => <App />, root);
}
