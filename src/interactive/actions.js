import {
  chain,
  includes
} from 'lodash';

const beginWordPos = (pos, input) => {
  if (pos === 0) {
    return { pos, input };
  }
  const leftPad = chain(input).size() - chain(input).words().join(' ').size();
  if (pos <= leftPad) {
    return { pos: 0, input };
  }
  return chain(input).words().transform((acc, word) => {
    if (acc.pos + word.length + 2 > pos) {
      return false;
    }
    acc.pos = acc.pos + word.length + 1;
    return true;
  }, { pos: leftPad }).value().pos;
};

const nextWordPos = (pos, input) => {
  return chain(input.slice(pos)).words().transform((acc, word) => {
    acc.pos = acc.pos + word.length + 1;
    return acc.pos < pos;
  }, { pos }).value().pos + chain(input.slice(pos)).trim().size() - chain(input.slice(pos)).words().join(' ').size();
};

const endWordPos = (pos, input) => {
  return chain(input.slice(pos)).words().transform((acc, word) => {
    if (word.length === 1) {
      acc.pos = acc.pos + 2;
      return true;
    }
    acc.pos = acc.pos + word.length - 1;
    return acc.pos < pos + 1;
  }, { pos }).value().pos + chain(input.slice(pos)).size() - chain(input.slice(pos)).words().join(' ').size();
};

export function move(pos, input, key) {
  if (key === 'ESCAPE') {
    return { pos: Math.min(pos, input.length - 1), input };
  }
  if (key === 'append') {
    return { pos: pos + 1, input };
  }
  if (includes(['h', 'LEFT'], key)) {
    return { pos: Math.max(pos - 1, 0), input };
  }
  if (includes(['l', 'RIGHT'], key)) {
    return { pos: Math.min(pos + 1, input.length - 1), input };
  }
  if (key === '0') {
    return { pos: 0, input };
  }
  if (key === '$') {
    return { pos: input.length - 1, input };
  }
  if (includes(['w', 'CTRL_RIGHT'], key)) {
    return {
      pos: Math.min(nextWordPos(pos, input), input.length - 1),
      input
    };
  }
  if (key === 'e') {
    return {
      pos: Math.min(endWordPos(pos, input), input.length - 1),
      input
    };
  }
  if (includes(['b', 'CTRL_LEFT'], key)) {
    return {
      pos: Math.max(beginWordPos(pos, input), 0),
      input
    };
  }
}

export function insert(pos, input, key) {
  if (pos === 0) {
    return { pos: key.length, input: key + input };
  }
  return {
    pos: pos + key.length,
    input: input.slice(0, pos) + key + input.slice(pos)
  };
}

export function del(pos, input, key, meta) {
  if (key === 'til') {
    const end = input.slice(pos + 1).indexOf(meta);
    if (end < 0) {
      return { pos, input };
    }
    return {
      pos,
      input: input.slice(0, pos) + input.slice(pos + end + 1)
    };
  }
  if (key === 'word') {
    if(input[pos] === ' ') {
      return del(pos, input, 'l');
    }
    const begin = beginWordPos(pos + 1, input);
    return {
      pos: begin,
      input: input.slice(0, begin) + input.slice(endWordPos(pos - 1, input) + 1)
    };
  }
  if (key === 'h') {
    return del(pos, input);
  }
  if (key === 'l') {
    return {
      pos: Math.min(pos, input.length - 2),
      input: input.slice(0, pos) + input.slice(pos + 1)
    };
  }
  if (key === 'w') {
    return {
      pos,
      input: input.slice(0, pos) + input.slice(nextWordPos(pos, input))
    };
  }
  if (key === 'e') {
    return {
      pos,
      input: input.slice(0, pos) + input.slice(endWordPos(pos, input) + 1)
    };
  }
  if (key === 'b') {
    const begin = beginWordPos(pos, input);
    return {
      pos: Math.max(begin, 0),
      input: input.slice(0, begin) + input.slice(pos)
    };
  }
  if (key === '0') {
    return {
      pos: 0,
      input: input.slice(pos)
    };
  }
  if (key === '$') {
    return {
      pos: Math.max(0, pos - 1),
      input: input.slice(0, pos)
    };
  }
  if (key) {
    return { pos, input };
  }
  if (pos === 0) {
    return { pos, input };
  }
  return { pos: pos - 1, input: input.slice(0, pos - 1) + input.slice(pos) };
};
