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

const tilChar = (pos, input, ch) => {
  const begin = input.slice(pos + 1).indexOf(ch);
  return begin < 0 ? null : begin + pos;
};

const tilCharBack = (pos, input, ch) => {
  const end = input.slice(0, pos).lastIndexOf(ch) + 1;
  return end < 0 ? null : end;
};

export function move({ pos, input, key, meta }) {
  if (key === 'for') {
    const begin = tilChar(pos, input, meta);
    return {
      pos: begin ? begin + 1 : pos,
      input
    };
  }
  if (key === 'For') {
    const end = tilCharBack(pos, input, meta);
    return {
      pos: end ? end - 1 : pos,
      input
    };
  }
  if (key === 'til') {
    return {
      pos: tilChar(pos, input, meta) || pos,
      input
    };
  }
  if (key === 'Til') {
    return {
      pos: tilCharBack(pos, input, meta) || pos,
      input
    };
  }
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

  return { pos, input };
}

export function insert({ pos, input, key }) {
  if (pos === 0) {
    return { pos: key.length, input: key + input };
  }
  return {
    pos: pos + key.length,
    input: input.slice(0, pos) + key + input.slice(pos)
  };
}

export function del({ pos, input, key, meta }) {
  if (key === 'til') {
    const end = tilChar(pos, input, meta);
    return {
      pos,
      input: end ? input.slice(0, pos) + input.slice(pos + end + 1) : input
    };
  }
  if (key === 'Til') {
    const begin = tilCharBack(pos, input, meta);
    if (begin) {
      return {
        pos: begin,
        input: input.slice(0, begin) + input.slice(pos)
      };
    }
    return { pos, input };
  }
  if (key === 'for') {
    const end = tilChar(pos, input, meta);
    return {
      pos,
      input: end ? input.slice(0, pos) + input.slice(pos + end + 2) : input
    };
  }
  if (key === 'For') {
    const begin = tilCharBack(pos, input, meta);
    if (begin) {
      return {
        pos: begin - 1,
        input: input.slice(0, begin - 1) + input.slice(pos)
      };
    }
    return { pos, input };
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
