import * as O from "fp-ts/lib/Option";

// HList implementation
interface Nil {
  type: "nil";
  length: 0;
}
export const nil: Nil = { type: "nil", length: 0 };
interface Cons<A> {
  type: "cons";
  value: A;
  length: number;
  prev: HList<A>;
}
export type HList<A> = Cons<A> | Nil;
export const cons: <A>(value: A, prev: HList<A>) => HList<A> = (
  value,
  prev
) => ({ type: "cons", value, prev, length: prev.length + 1 });
export const pop: <A>(list: HList<A>) => HList<A> = list =>
  list.type === "nil" ? list : list.prev;

export function equals<A>(a: HList<A>, b: HList<A>) {
  let currA = a;
  let currB = b;
  while (true) {
    switch (currA.type) {
      case "nil":
        return currB.type === "nil";
      case "cons":
        if (currB.type === "cons" && currA.value === currB.value) {
          currA = currA.prev;
          currB = currB.prev;
        } else {
          return false;
        }
    }
  }
}

export const getLast: <A>(fa: HList<A>) => O.Option<A> = fa =>
  fa.type === "nil" ? O.none : O.some(fa.value);

export const toArray = <A>(list: HList<A>): Array<A> => {
  const len = list.length;
  const r: Array<A> = new Array(len);
  let l: HList<A> = list;
  let i = 1;
  while (l.type !== "nil") {
    r[len - i] = l.value;
    i++;
    l = l.prev;
  }
  return r;
};
