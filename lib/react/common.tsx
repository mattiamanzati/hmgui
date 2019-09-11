import * as React from "react";
import * as RX from "rxjs";
import * as I from "fp-ts/lib/IO";
import * as EQ from "fp-ts/lib/Eq";
import * as O from "fp-ts/lib/Option";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as H from "../data/hlist";
import * as rxOp from "rxjs/operators";

export const StateContext = React.createContext(RX.of(C.initialWidgetState));
export const DslContext = React.createContext(RX.of(D.container(H.nil, [])));

export interface ComponentProps {
  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
  update: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
}

export interface RenderChildProps extends ComponentProps {
  id: string;
  selector: (id: string) => (dsl: D.DSL) => D.DSL;
}

export function translate(t: D.TranslableString): string {
  // TODO: this is just a stub, needs to handle number and date formatting in a localized way.
  return t.strings.map((s, i) => s + (t.values[i] || "")).join("");
}

export function useObservable<T>(observable$: RX.Observable<T>): T | undefined;
export function useObservable<T>(
  observable$: RX.Observable<T>,
  initialValue: T
): T;
export function useObservable<T>(
  observable$: RX.Observable<T>,
  initialValue?: T
): T | undefined {
  const [value, update] = React.useState<T | undefined>(initialValue);

  React.useLayoutEffect(() => {
    const s = observable$.subscribe(update);
    return () => s.unsubscribe();
  }, [observable$]);

  return value;
}

export function useWidgetState(): RX.Observable<C.WidgetState> {
  return React.useContext(StateContext);
}

const shallowEqDsl: (a: D.DSL, b: D.DSL) => boolean = (a, b) => {
  if (a === b) return true;
  return Object.keys(a).every(key => {
    if (key === "id") return H.equals(a.id, b.id);
    if (key === "children")
      return (
        JSON.stringify(a[key].map(v => v.id)) ===
        JSON.stringify(b[key].map(v => v.id))
      );
    if (a[key] !== b[key]) {
      if (JSON.stringify(a) === JSON.stringify(b)) return true;
      console.log(key, a, b);
      return false;
    }

    return true;
  });
};

// export function useDsl() {
//   const dsl$ = React.useContext(DslContext);
//   const dslD$ = React.useMemo(
//     () =>
//       dsl$.pipe(
//         rxOp.distinctUntilChanged((a, b) => a === b),
//         rxOp.distinctUntilChanged(shallowEqDsl)
//       ),
//     [dsl$]
//   );
//   const dsl = useObservable(dslD$, D.container(H.nil, []));
//   return dsl;
// }

export function useDslValue<A>(
  fn: (a: D.DSL) => A,
  initialValue: A,
  eq?: EQ.Eq<A>
): A {
  const dsl$ = React.useContext(DslContext);
  const value$ = React.useMemo(
    () =>
      dsl$.pipe(
        rxOp.map(fn),
        eq ? rxOp.distinctUntilChanged(eq.equals) : rxOp.distinctUntilChanged()
      ),
    [dsl$]
  );
  return useObservable(value$, initialValue);
}

const optionHList = O.getEq(H);
export function useDslState(props: ComponentProps) {
  const id = useDslValue<D.ID>(D.lens.id, H.nil, H);
  const state$ = React.useContext(StateContext);
  const { dispatch, update } = props;
  const idSerialized = H.toString(id);

  const isActive$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isActive(id, state))),
    [state$, idSerialized]
  );
  const isFocused$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isFocused(id, state))),
    [state$, idSerialized]
  );

  const inputBufferState$ = React.useMemo(
    () =>
      state$.pipe(
        rxOp.map(state =>
          C.isActive(id, state) ? state.inputBufferState : "valid"
        )
      ),
    [state$, idSerialized]
  );

  const isActive = useObservable(isActive$, false);
  const isFocused = useObservable(isFocused$, false);
  const inputBufferState = useObservable(inputBufferState$, "valid");

  const onFocus = React.useMemo(() => dispatch(C.doFocus(id)), [
    dispatch,
    idSerialized,
    isFocused
  ]);
  const onBlur = React.useMemo(() => dispatch(C.doBlur(id)), [
    dispatch,
    idSerialized,
    isFocused
  ]);

  const onChangeText = React.useMemo(
    () => (newText: string) =>
      update(C.doUpdateInputBuffer(id, O.some(newText)))(),
    [idSerialized, update, isActive]
  );

  const onTabNext = React.useMemo(
    () => dispatch(C.setRequestedFocusNext(O.some(id))),
    [idSerialized, update, isFocused]
  );

  const onPress = React.useMemo(
    () => () => {
      dispatch(C.setPressedId(O.some(id)))();
      dispatch(C.setPressedId(O.none))();
    },
    [idSerialized, dispatch]
  );

  return {
    isActive,
    isFocused,
    onFocus,
    onBlur,
    onChangeText,
    onTabNext,
    inputBufferState,
    onPress
  };
}
