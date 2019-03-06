import { Converter , ProcessFile} from '../src/converter';
import { expect } from 'chai';
import 'mocha';

describe('Convert', () => {
  it('reads a file', () => {
    ProcessFile(__dirname + '/data/file1.ann','/tmp');
  });
  it('converts and saves',
    () => Converter(__dirname + '/data/', '/tmp/data/'));
});

