const idMaker = (() => {
  const g = (function* () {
    // a value for initial, call g.next() immediately to initial the id
    let id: number = (yield -1) ?? 1;
    while (true) {
      id = (yield id++) ?? id;
    }
  })();
  g.next(); // initialize generator, so we can indicate the id when firstly call idMake.next(id);
  return g;
})();

/**
 * @param id the value the generator will restart from.
 * @return an auto increment id, the start value is 1 if the *id* parameter is not set
 */
export const nextId = (id?: number): number => idMaker.next(id!).value;
