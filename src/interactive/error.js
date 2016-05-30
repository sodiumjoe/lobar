import { assign } from 'lodash';
import { stripIndent } from 'common-tags';
import setBlocking from '../setBlocking.js';
import {
  screen,
  cursor,
  write
} from './term.js';


export function handleBufferError({ state: { input }, command, stack }) {
  screen.clear();
  cursor.to(0, 0);
  setBlocking();
  write(stripIndent`
    Uncaught exception
    last input: ${JSON.stringify(input)}
    command: ${JSON.stringify(command)}
    stack:
    ${stack}

    Please make a bug report to: https://github.com/sodiumjoe/lobar/issues with the
    above information and the input JSON that triggered the error. Thanks!
  `);
  cursor.show();
  process.exit(1);
}

export function BufferError(error, { state, command }) {
  this.name = 'BufferError';
  this.message = error.message;
  this.stack = error.stack;
  assign(this, { state, command });
}
BufferError.prototype = Object.create(Error.prototype);
BufferError.prototype.constructor = BufferError;
