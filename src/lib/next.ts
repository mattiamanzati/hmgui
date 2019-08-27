import * as I from "fp-ts/lib/IO";

// TODO: maybe use a generic monad M extends URIS instead of IO?
export type Next<S, A> =
  | { type: "render"; dsl: A }
  | { type: "continue"; state: S }
  | { type: "halt"; state: S }
  | { type: "suspendAndResume"; effect: I.IO<S> };

export const render: <A, S>(dsl: A) => Next<S, A> = dsl => ({
  type: "render",
  dsl
});
export const halt: <A, S>(state: S) => Next<S, A> = state => ({
  type: "halt",
  state
});
export const cont: <A, S>(state: S) => Next<S, A> = state => ({
  type: "continue",
  state
});
export const suspendAndResume: <A, S>(
  effect: I.IO<S>
) => Next<S, A> = effect => ({ type: "suspendAndResume", effect });

export const fold: <S, A, B>(
    onRender: (dsl: A) => B,
    onContinue: (state: S) => B,
    onHalt: (state: S) => B,
    onSuspendAndResume: (effect: I.IO<void>) => B
) => (fa: Next<S, A>) => B = (onRender, onContinue, onHalt, onResumeAndContinue) => fa => {
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
export function reduce<L, A>(
    initialState: L,
    fas: ((l: L) => Next<L, A>)[],
    agglomerate: (a: A[]) => A
  ): Next<L, A> {
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
  