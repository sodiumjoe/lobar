import { unary } from 'lodash';
import { clearLine, cursorTo } from 'readline';
import decode from 'decode-keypress';
import { Observable } from 'rxjs';
import { stdin, stdout } from './tty.js';

const { fromEvent } = Observable;

export const screen = {
  clear: () => stdout.write('\u001b[2J')
};

export const cursor = {
  to: (...args) => cursorTo(stdout, ...args),
  show: () => stdout.write('\x1b[?25h'),
  hide: () => stdout.write('\x1b[?25l')
};

export const line = {
  clear: (...args) => clearLine(stdout, ...args)
};

export const write = stdout.write.bind(stdout);

export const keypresses = fromEvent(stdin, 'data')
.map(unary(decode))
.share();

export const dimensions = {
  width: stdout.columns,
  height: stdout.rows
};

export const debug = (...args) => {
  console.log(...args);
  process.exit();
};
