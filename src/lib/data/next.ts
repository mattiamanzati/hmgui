import * as I from "fp-ts/lib/IO";
import { URIS, Kind } from "fp-ts/lib/HKT";

export type Next<U extends URIS, S, A> =
  | { type: "render"; dsl: A }
  | { type: "continue"; state: S }
  | { type: "halt"; state: S }
  | { type: "suspendAndResume"; effect: Kind<U, S> };

export const render: <U extends URIS, A, S>(dsl: A) => Next<U, S, A> = dsl => ({
  type: "render",
  dsl
});
export const halt: <U extends URIS, A, S>(state: S) => Next<U, S, A> = state => ({
  type: "halt",
  state
});
export const cont: <U extends URIS, A, S>(state: S) => Next<U, S, A> = state => ({
  type: "continue",
  state
});
export const suspendAndResume: <U extends URIS, A, S>(
  effect: Kind<U, S>
) => Next<U, S, A> = effect => ({ type: "suspendAndResume", effect });

export const fold: <U extends URIS, S, A, B>(
    onRender: (dsl: A) => B,
    onContinue: (state: S) => B,
    onHalt: (state: S) => B,
    onSuspendAndResume: (effect: Kind<U, S>) => B
) => (fa: Next<U, S, A>) => B = (onRender, onContinue, onHalt, onResumeAndContinue) => fa => {
    switch (fa.type) {
      case "render":
        return onRender(fa.dsl);
      case "continue":
        return onContinue(fa.state);
      case "halt":
        return onHalt(fa.state);
      case "suspendAndResume":
        return onResumeAndContinue(fa.effect);
    }
}

// TODO: I don't know exactly, but this seems like a job a foldable instance would love to do.
export function reduce<U extends URIS, L, A>(
    initialState: L,
    fas: ((l: L) => Next<U, L, A>)[],
    agglomerate: (a: A[]) => A
  ): Next<U, L, A> {
    let currentState = initialState;
    let currentIndex = 0;
    let outDsl: any[] = [];
    while (currentIndex < fas.length) {
      const fa = fas[currentIndex](currentState);
      switch (fa.type) {
        case "render":
          outDsl.push(fa.dsl);
          break;
        case "continue":
          currentState = fa.state;
          break;
        case "halt":
          return fa;
        case "suspendAndResume":
          return fa;
      }
      currentIndex++;
    }
    if (outDsl.length !== fas.length) return cont(currentState);
    return render(agglomerate(outDsl));
  }
  