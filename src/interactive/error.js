import { stripIndent } from 'common-tags';
import setBlocking from '../setBlocking.js';
import {
  screen,
  cursor,
  write
} from './term.js';

export function handleError({ message, stack }) {
  screen.clear();
  cursor.to(0, 0);
  setBlocking();
  write(stripIndent`
    ${message}
    ${stack}

    Please make a bug report to: https://github.com/sodiumjoe/lobar/issues with the
    above information and the input JSON that triggered the error. Thanks!
  `);
  cursor.show();
  process.exit(1);
}

export function BufferError({ stack, message }, { state: { input }, command }) {
  this.name = 'BufferError';
  this.message = stripIndent`
    ${message}
    last input: ${JSON.stringify(input)}
    command: ${JSON.stringify(command)}
  `;
  this.stack = stack;
}
BufferError.prototype = Object.create(Error.prototype);
BufferError.prototype.constructor = BufferError;
