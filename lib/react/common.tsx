import * as React from "react";
import * as RX from "rxjs";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as H from "../data/hlist";
import * as rxOp from "rxjs/operators";

export const StateContext = React.createContext(RX.of(C.initialWidgetState));

export interface ComponentProps {
  dsl: D.DSL;
  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
  update: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
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

const optionHList = O.getEq(H);
export function useDslState(props: ComponentProps) {
  const state$ = React.useContext(StateContext);
  const { dsl, dispatch, update } = props;
  const { id } = dsl;
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
      dispatch(C.setPressedId(O.some(props.dsl.id)))();
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
