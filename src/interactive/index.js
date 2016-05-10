import decode from 'decode-keypress';
import readline from 'readline';
import { Observable } from 'rxjs';
import { red } from 'chalk';
import buffer from './buffer.js';
import { stdin, stdout } from './tty.js';

const { fromEvent } = Observable;

export default function interactive(data, args, cb) {

  // clear screen
  stdout.write('\u001b[2J');

  const keypresses = fromEvent(stdin, 'data').map(data => decode(data)).share();

  buffer(data, args, stdout.columns, stdout.rows - 1, keypresses)
  .do(({ pos, input, output, valid }) => {
    // hide cursor
    stdout.write('\x1b[?25l');
    // clear line
    readline.clearLine(stdout, 0);
    readline.cursorTo(stdout, 0, 0);
    stdout.write(`${valid ? input : red(input)}\n`);
    stdout.write(`${output}`);
    // move cursor to current pos
    readline.cursorTo(stdout, pos, 0);
    // show cursor
    stdout.write('\x1b[?25h');
  })
  .takeLast(1)
  .subscribe(({ json }) => {
    stdout.write('\u001b[2J');
    readline.cursorTo(stdout, 0, 0);
    return cb(json);
  });

  keypresses.filter(({ name, ctrl }) => ctrl && name === 'c').subscribe(() => process.exit(0));

}
