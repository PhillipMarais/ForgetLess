import { Share } from 'react-native';

import type { Note } from '@/db/notes';

type SharedNote = Pick<Note, 'title' | 'body'>;

/** A note as plain text: the title, a blank line, then the text. */
export function noteAsText(note: SharedNote) {
  const title = note.title.trim();
  const body = note.body.trim();
  return [title, body].filter(Boolean).join('\n\n');
}

/** Several notes as one message, with a line between each. */
export function notesAsText(notes: readonly SharedNote[]) {
  return notes.map(noteAsText).filter(Boolean).join('\n\n———\n\n');
}

/**
 * Opens the phone's share sheet (WhatsApp, email, …) with the notes' text. Pictures and PDFs
 * aren't sent along.
 */
export async function shareNotes(notes: readonly SharedNote[]) {
  const message = notesAsText(notes);
  if (!message) return;
  const title = notes.length === 1 ? notes[0].title.trim() || 'Note' : `${notes.length} notes`;
  await Share.share({ message, title }, { dialogTitle: `Share ${title}` }).catch(() => {});
}
