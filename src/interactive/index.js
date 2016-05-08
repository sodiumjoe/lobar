import decode from 'decode-keypress';
import readline from 'readline';
import { Observable } from 'rxjs';
import { red } from 'chalk';
import buffer, { stringify } from './buffer.js';
import { stdin, stdout } from './tty.js';

const { fromEvent } = Observable;

export default function interactive(data, args, cb) {

  const keypresses = fromEvent(stdin, 'data').map(data => decode(data)).share();

  buffer(data, args, stdout.rows - 1, stdout.columns, keypresses)
  .subscribe(({ action, pos, input, json, scroll, valid, key }) => {
    if (key === 'enter') {
      return cb(json);
    }
    if (valid || action && action === 'scroll') {
      // clear screen
      stdout.write('\u001b[2J');
    } else {
      // clear line
      readline.clearLine(stdout, 0);
    }
    // hide cursor
    stdout.write('\x1b[?25l');
    readline.cursorTo(stdout, 0, 0);
    stdout.write(`${valid ? input : red(input)}\n`);
    stdout.write(`${getVisible(stringify(json, stdout.columns), scroll)}`);
    // move cursor to current pos
    readline.cursorTo(stdout, pos, 0);
    stdout.write('\x1b[?25h');
  });

  keypresses.filter(({ name, ctrl }) => ctrl && name === 'c').subscribe(() => process.exit(0));

}

function getVisible(str, n = 0) {
  const lines = str.split('\n');
  return lines.slice(n, n + stdout.rows - 1).join('\n');
}
