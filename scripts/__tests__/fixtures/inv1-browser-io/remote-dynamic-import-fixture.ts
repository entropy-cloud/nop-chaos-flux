export async function loadRemoteModule() {
  return await import('https://cdn.example.com/mod.js');
}
