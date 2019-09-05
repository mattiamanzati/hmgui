import * as I from "fp-ts/lib/IO";
import { URIS, Kind } from "fp-ts/lib/HKT";

export type Next<U extends URIS, A> =
  | { type: "halt"}
  | { type: "continue"; state: A }
  | { type: "suspendAndResume"; effect: Kind<U, A> };

export const halt: <U extends URIS, A>() => Next<U, A> = () => ({
  type: "halt"
});
export const cont: <U extends URIS, A>(state: A) => Next<U, A> = state => ({
  type: "continue",
  state
});
export const suspendAndResume: <U extends URIS, A>(
  effect: Kind<U, A>
) => Next<U, A> = effect => ({ type: "suspendAndResume", effect });

export const fold: <U extends URIS, A, B>(
    onContinue: (state: A) => B,
    onSuspendAndResume: (effect: Kind<U, A>) => B,
    onHalt: () => B
) => (fa: Next<U, A>) => B = (onContinue, onResumeAndContinue, onHalt) => fa => {
    switch (fa.type) {
      case "continue":
        return onContinue(fa.state);
      case "suspendAndResume":
        return onResumeAndContinue(fa.effect);
      case "halt":
        return onHalt()
    }
}

export const reduce: <U extends URIS, A>(items: ((state: A) => Next<U, A>)[]) => (initialState: A) => Next<U, A> = 
    transforms => initialState => {
      let currentState = initialState
      let currentIndex = 0
      while(transforms.length > currentIndex){
        const proposedState = transforms[currentIndex](currentState)
        switch(proposedState.type){
          case "halt":
            break
          case "continue":
            currentState = proposedState.state
            break
          case "suspendAndResume":
            return proposedState
        }
        currentIndex++
      }
      return currentState !== initialState ? cont(currentState) : halt()
    }