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
  .subscribe(({ action, pos, input, output, json, valid }) => {
    if (action === 'enter') {
      // clear screen
      stdout.write('\u001b[2J');
      readline.cursorTo(stdout, 0, 0);
      return cb(json);
    }
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
  });

  keypresses.filter(({ name, ctrl }) => ctrl && name === 'c').subscribe(() => process.exit(0));

}
