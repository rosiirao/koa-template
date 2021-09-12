export type Element<T> = T extends (infer U)[] | Set<infer U>
  ? U
  : T extends Record<keyof T, infer V | (infer V)[] | Set<infer V>>
  ? V
  : never;
