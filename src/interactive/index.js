import {
  chain,
  forEach,
  isEmpty,
  maxBy,
  padEnd,
  size,
  times
} from 'lodash';
import decode from 'decode-keypress';
import readline from 'readline';
import { Observable } from 'rxjs';
import {
  black,
  inverse,
  red
} from 'chalk';
import { stripIndent } from 'common-tags';
import buffer from './buffer.js';
import { stdin, stdout } from './tty.js';
import setBlocking from '../setBlocking.js';

const { fromEvent } = Observable;

export default function interactive(data, args, cb) {

  clearScreen();

  const keypresses = fromEvent(stdin, 'data').map(data => decode(data)).share();

  buffer(data, args, stdout.columns, stdout.rows - 1, keypresses)
  .map(state => {
    state.error && handleUncaughtException(state);
    return state;
  })
  .do(({ mode, pos, input, output, valid, completions, completionPos, selectedCompletionIndex }) => {
    hideCursor();
    readline.cursorTo(stdout, 0, 0);
    stdout.write(`> ${valid ? input : red(input)}`);
    readline.clearLine(stdout, 1);
    const outputLines = output.split('\n');
    forEach(outputLines, line => {
      stdout.write('\n');
      readline.clearLine(stdout, 0);
      stdout.write(`${line}`);
      readline.clearLine(stdout, 1);
    });
    // clear lines after end of output
    times(stdout.rows - outputLines.length - 2, () => {
      stdout.write('\n');
      readline.clearLine(stdout, 0);
    });
    if (mode === 'insert') {
      forEach(formatCompletions(completions, selectedCompletionIndex, stdout.rows - 1), (completion, i) => {
        readline.cursorTo(stdout, completionPos + 1, i + 1);
        stdout.write(completion);
      });
    }
    readline.cursorTo(stdout, pos + 2, 0);
    showCursor();
  })
  .takeLast(1)
  .subscribe(({ json }) => {
    clearScreen();
    readline.cursorTo(stdout, 0, 0);
    return cb(json);
  });

  keypresses.filter(({ name, ctrl }) => ctrl && name === 'c').subscribe(() => process.exit(0));

}

function formatCompletions(completions, selectedCompletionIndex, height) {
  if (isEmpty(completions)) {
    return [];
  }

  const scrollPos = Math.max(selectedCompletionIndex - height + 1, 0);
  const width = maxBy(completions, size).length;
  return chain(completions)
  .map(line => ` ${padEnd(line, width)} `)
  .map((line, i) => i === selectedCompletionIndex ? inverse(line) : black.bgWhite(line))
  .slice(scrollPos, scrollPos + height)
  .value();
}

function handleUncaughtException({ state: { input }, command, error }) {
  clearScreen();
  readline.cursorTo(stdout, 0, 0);
  console.log(stripIndent`
    Uncaught exception
    last input: ${JSON.stringify(input)}
    command: ${JSON.stringify(command)}
    stack:
    ${error.stack}

    Please make a bug report to: https://github.com/sodiumjoe/lobar/issues with the
    above information and the input JSON that triggered the error. Thanks!
  `);
  showCursor();
  setBlocking();
  process.exit(1);
}

function clearScreen() {
  stdout.write('\u001b[2J');
}

function hideCursor() {
  stdout.write('\x1b[?25l');
}

function showCursor() {
  stdout.write('\x1b[?25h');
}
