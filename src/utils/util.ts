const idMaker = (function* (id = 1) {
  while (true) {
    id = (yield id++) || id;
  }
})();
export const nextId = (id?: number): number => idMaker.next(id!).value;
