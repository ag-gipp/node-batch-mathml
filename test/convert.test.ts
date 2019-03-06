import { Converter } from '../src/converter';
import { expect } from 'chai';
import 'mocha';

describe('Convert', () => {
  it('converts and saves',
    () => expect(Converter(__dirname + '/data/export.csv', '/tmp/converted.csv')).eq('/tmp/converted.csv')
  );
});

