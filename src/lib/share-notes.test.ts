import { noteAsText, notesAsText } from './share-notes';

describe('sharing notes as text', () => {
  it('puts the title above the text, leaving out what is empty', () => {
    expect(noteAsText({ title: ' Shopping ', body: 'Milk\nBread\n' })).toBe('Shopping\n\nMilk\nBread');
    expect(noteAsText({ title: '', body: 'Just text' })).toBe('Just text');
    expect(noteAsText({ title: 'Just a title', body: '  ' })).toBe('Just a title');
  });

  it('separates several notes and skips empty ones', () => {
    expect(
      notesAsText([
        { title: 'A', body: 'one' },
        { title: '', body: '' },
        { title: 'B', body: '' },
      ]),
    ).toBe('A\n\none\n\n———\n\nB');
  });
});
