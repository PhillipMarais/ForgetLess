import { MAX_PHOTO_EDGE, resizeToFit } from './photo-compress';

describe('resizeToFit', () => {
  it('leaves pictures that already fit alone', () => {
    expect(resizeToFit(1200, 800)).toBeNull();
    expect(resizeToFit(MAX_PHOTO_EDGE, MAX_PHOTO_EDGE)).toBeNull();
  });

  it('caps the width of landscape pictures', () => {
    expect(resizeToFit(4032, 3024)).toEqual({ width: MAX_PHOTO_EDGE });
  });

  it('caps the height of portrait pictures', () => {
    expect(resizeToFit(3024, 4032)).toEqual({ height: MAX_PHOTO_EDGE });
  });
});
