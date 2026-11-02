// Browsers have no app file storage, so on web the PDF is kept in the database row as a
// data: URI. This is for the web preview only; phones store files.

export async function storeDocument(uri: string, _id: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
