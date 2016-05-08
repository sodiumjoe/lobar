import { openSync } from 'fs';
import { ReadStream, WriteStream, isatty } from 'tty';
import assert from 'assert';

const read = openSync('/dev/tty', 'r');
assert(isatty(read));

export const stdin = new ReadStream(read);

stdin.setRawMode(true);

const write = openSync('/dev/tty', 'w');
assert(isatty(write));

export const stdout = new WriteStream(write);

// Update the "columns" and "rows" properties on the stdout stream
// whenever the console window gets resized.
stdout._refreshSize && process.on('SIGWINCH', () => stdout._refreshSize());
