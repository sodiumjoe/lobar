import {
  chain,
  forEach,
  identity,
  isEmpty,
  maxBy,
  padEnd,
  size
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

const { fromEvent } = Observable;

export default function interactive(data, args, cb) {

  clearScreen(stdout);

  const keypresses = fromEvent(stdin, 'data').map(data => decode(data)).share();

  buffer(data, args, stdout.columns, stdout.rows - 1, keypresses)
  .catch(identity)
  .scan((acc, e) => {
    if (e instanceof Error) {
      handleUncaughtException(stdout, acc, e);
    }
    return e;
  })
  .do(({ pos, input, output, valid, completions, completionPos, selectedCompletionIndex }) => {
    // hide cursor
    stdout.write('\x1b[?25l');
    readline.clearLine(stdout, 0);
    readline.cursorTo(stdout, 0, 0);
    stdout.write(`${valid ? input : red(input)}\n`);
    stdout.write(`${output}`);
    forEach(formatCompletions(completions, selectedCompletionIndex, stdout.rows - 1), (completion, i) => {
      readline.cursorTo(stdout, completionPos, i + 1);
      stdout.write(completion);
    });
    readline.cursorTo(stdout, pos, 0);
    // show cursor
    stdout.write('\x1b[?25h');
  })
  .takeLast(1)
  .subscribe(({ json }) => {
    clearScreen(stdout);
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
  .map(line => `${padEnd(line, width)} `)
  .map((line, i) => i === selectedCompletionIndex ? inverse(line) : black.bgWhite(line))
  .slice(scrollPos, scrollPos + height)
  .value();
}

function handleUncaughtException(stdout, state, e) {
  clearScreen(stdout);
  console.log(stripIndent`
    Uncaught exception
    last state:
      ${JSON.stringify(state)}
    stack: ${e.stack}

    Please make a bug report to: https://github.com/sodiumjoe/lobar/issues
    with the above information and the action that triggered the error. Thanks!
  `);
  process.exit(1);
}

function clearScreen(stdout) {
  stdout.write('\u001b[2J');
}
