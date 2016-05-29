import {
  ary,
  assign,
  chain,
  forEach,
  isEmpty,
  isUndefined,
  maxBy,
  negate,
  padEnd,
  size,
  times
} from 'lodash';
import decode from 'decode-keypress';
import { clearLine, cursorTo } from 'readline';
import { Observable } from 'rxjs';
import {
  black,
  inverse,
  red
} from 'chalk';
import { stripIndent } from 'common-tags';
import { copy } from 'copy-paste';
import getBuffer from './buffer.js';
import { stdin, stdout } from './tty.js';
import setBlocking from '../setBlocking.js';
import getCommands from './commands.js';
import getComputedJson from './compute.js';
import getOutput from './output.js';

setBlocking();

const { fromEvent } = Observable;

export default function interactive(data, args, cb) {

  clearScreen();

  const keypresses = fromEvent(stdin, 'data').map(ary(decode, 1)).share();
  const commands = getCommands(keypresses);
  const [ scrollCommands, rest ] = commands.partition(({ action }) => action === 'scroll');
  const [ copyCommands, bufferCommands ] = rest.partition(({ action }) => action === 'copy');

  const buffer = getBuffer(bufferCommands, data, args)
  .catch(handleUncaughtException)
  .publish();

  copyCommands
  .withLatestFrom(buffer, (cmd, { input }) => input)
  .subscribe(copy);

  const computedJson = getComputedJson(buffer, data);

  const prompt = buffer.combineLatest(
    computedJson.map(negate(isUndefined)),
    ({ pos, input }, valid) => ({ pos, input, valid})
  );

  prompt.subscribe(({ pos, input, valid }) => {
    hideCursor();
    cursorTo(stdout, 0, 0);
    stdout.write(`> ${valid ? input : red(input)}`);
    clearLine(stdout, 1);
    cursorTo(stdout, pos + 2, 0);
    showCursor();
  });

  const output = getOutput(computedJson, scrollCommands, data, stdout);

  output
  .combineLatest(buffer, assign)
  .subscribe(({ output, pos, completions, completionPos, selectedCompletionIndex }) => {
    hideCursor();

    const outputLines = output.split('\n');

    forEach(outputLines, (line, i) => {
      cursorTo(stdout, 0, i + 1);
      clearLine(stdout, 0);
      stdout.write(`${line}`);
      clearLine(stdout, 1);
    });
    // clear lines after end of output
    times(stdout.rows - outputLines.length - 2, () => {
      stdout.write('\n');
      clearLine(stdout, 0);
    });
    printCompletions({ completions, completionPos, selectedCompletionIndex });
    cursorTo(stdout, pos + 2, 0);
    showCursor();
  });

  output
  .takeLast(1)
  .pluck('json')
  .subscribe(json => {
    clearScreen();
    cursorTo(stdout, 0, 0);
    return cb(json);
  });

  buffer.connect();

  keypresses.filter(({ name, ctrl }) => ctrl && name === 'c').subscribe(() => process.exit(0));

}

function formatCompletions(completions=[], selectedCompletionIndex, height) {
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

function handleUncaughtException({ state: { input }, command, stack }) {
  clearScreen();
  cursorTo(stdout, 0, 0);
  setBlocking();
  console.log(stripIndent`
    Uncaught exception
    last input: ${JSON.stringify(input)}
    command: ${JSON.stringify(command)}
    stack:
    ${stack}

    Please make a bug report to: https://github.com/sodiumjoe/lobar/issues with the
    above information and the input JSON that triggered the error. Thanks!
  `);
  showCursor();
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

function printCompletions({ completions, completionPos, selectedCompletionIndex }) {
  const formatted = formatCompletions(completions.slice(1), selectedCompletionIndex - 1, stdout.rows - 1);
  forEach(formatted, (completion, i) => {
    cursorTo(stdout, completionPos + 1, i + 1);
    stdout.write(completion);
  });

}
