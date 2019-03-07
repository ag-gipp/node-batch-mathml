import { ProcessFolder , ProcessFile} from '../src/converter';
import { expect } from 'chai';
import 'mocha';

describe('Convert', () => {
  it('reads a file', () => {
    ProcessFile(__dirname + '/data/file1.ann','/tmp/file1.ann');
  });
  it('converts and saves',
    () => ProcessFolder(__dirname + '/data/', '/tmp/data/'));
});

