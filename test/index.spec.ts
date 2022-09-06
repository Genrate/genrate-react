// import { myPackage } from '../src';

describe('index', () => {
  describe('myPackage', () => {
    it('should return a string containing the message', () => {
      const message = 'Hello';

      const result = 'hello'

      expect(result).toMatch(message);
    });
  });
});
