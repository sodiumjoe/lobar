import {
  assign,
  chain,
  forEach,
  isEmpty,
  isUndefined,
  matchesProperty,
  maxBy,
  negate,
  padEnd,
  partial,
  partialRight,
  property,
  size,
  times,
  wrap
} from 'lodash';
import {
  black,
  inverse,
  red
} from 'chalk';
import { copy } from 'copy-paste';
import getBuffer from './buffer.js';
import setBlocking from '../setBlocking.js';
import getCommands from './commands.js';
import getComputedJson from './compute.js';
import getOutput from './output.js';
import { getCompletions } from './completion.js';
import {
  screen,
  cursor,
  line,
  write,
  keypresses,
  dimensions
} from './term.js';
import { handleBufferError } from './error.js';

setBlocking();

const hideCursorWrapper = partialRight(wrap, (func, arg) => {
  cursor.hide();
  func(arg);
  cursor.show();
});

const matchesAction = partial(matchesProperty, 'action');

export default function interactive(data, args, cb) {

  screen.clear();

  const commands = getCommands(keypresses);
  const [ scrollCommands, rest ] = commands.partition(matchesAction('scroll'));
  const [ copyCommands, bufferCommands ] = rest.partition(matchesAction('copy'));

  const buffer = getBuffer(data, args, bufferCommands, getCompletions)
  .catch(handleBufferError)
  .publish();

  copyCommands
  .withLatestFrom(buffer, assign)
  .pluck('input')
  .subscribe(copy);

  const computedJson = getComputedJson(data, buffer);

  const prompt = buffer.combineLatest(
    computedJson.map(negate(isUndefined)).map(valid => ({ valid })),
    assign
  );

  const prefix = '> ';
  const { length: prefixLength } = prefix;

  prompt.subscribe(hideCursorWrapper(({ pos, input, valid }) => {
    cursor.to(0, 0);
    write(`${prefix}${valid ? input : red(input)}`);
    line.clear(1);
    cursor.to(pos + prefixLength, 0);
  }));

  const output = getOutput(data, computedJson, scrollCommands, dimensions);

  output
  .combineLatest(buffer, assign)
  .subscribe(hideCursorWrapper(({ mode, output, pos, completions, completionPos, selectedCompletionIndex }) => {

    const outputLines = output.split('\n');
    const lastIndex = outputLines.length - 1;

    cursor.to(0, 1);

    forEach(outputLines, (ln, i) => {
      line.clear(0);
      write(`${ln}`);
      line.clear(1);
      i < lastIndex && write('\n');
    });

    // clear lines after end of output
    times(dimensions.height - outputLines.length - 1, () => {
      write('\n');
      line.clear(0);
    });

    mode === 'insert' && printCompletions({ completions, completionPos, selectedCompletionIndex });

    cursor.to(pos + 2, 0);

  }));

  output
  .takeLast(1)
  .pluck('json')
  .subscribe(json => {
    screen.clear();
    cursor.to(0, 0);
    return cb(json);
  });

  buffer.connect();

  keypresses
  .filter(property('ctrl'))
  .filter(matchesProperty('name', 'c'))
  .subscribe(() => process.exit(0));

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

function printCompletions({ completions, completionPos, selectedCompletionIndex }) {
  const formatted = formatCompletions(completions.slice(1), selectedCompletionIndex - 1, dimensions.height - 1);
  forEach(formatted, (completion, i) => {
    cursor.to(completionPos + 1, i + 1);
    write(completion);
  });
}
