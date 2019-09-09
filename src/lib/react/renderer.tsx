import * as React from "react";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as CW from "../core/widget";
import * as hlist from "../data/hlist";
import * as N from "../data/next";
import * as rxOp from "rxjs/operators";
import * as RR from "./renderer";
import { TextInput, Text, Button } from "react-native";
import * as RX from "rxjs";
import { pipe } from "fp-ts/lib/pipeable";

const StateContext = React.createContext(RX.of(C.initialWidgetState));

type ComponentProps = {
  dsl: D.DSL;
  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
  update: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
};

function render(props: ComponentProps): JSX.Element {
  switch (props.dsl.type) {
    case "input":
      return <RenderInput {...props} key={hlist.toString(props.dsl.id)} />;
    case "container":
      return <RenderContainer {...props} key={hlist.toString(props.dsl.id)} />;
    case "text":
      return <RenderText {...props} key={hlist.toString(props.dsl.id)} />;
    case "button":
      return <RenderButton {...props} key={hlist.toString(props.dsl.id)} />;
  }
  return <React.Fragment>{JSON.stringify(props.dsl)}</React.Fragment>;
}

function translate(t: D.TranslableString): string {
  // TODO: this is just a stub, needs to handle number and date formatting in a localized way.
  return t.strings.map((s, i) => s + (t.values[i] || "")).join("");
}

function useObservable<T>(observable$: RX.Observable<T>): T | undefined;
function useObservable<T>(observable$: RX.Observable<T>, initialValue: T): T;
function useObservable<T>(
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

export const RenderInput = React.memo(function InputRenderer(
  props: ComponentProps
) {
  const state$ = React.useContext(StateContext);
  const { dispatch, update } = props;
  const { id } = props.dsl;
  const value = (props.dsl as any).value || "";
  const idSerialized = hlist.toString(id);
  const onChangeText = React.useMemo(
    () => (newText: string) => update(C.setInputBuffer(O.some(newText)))(),
    [update]
  );
  const onFocus = React.useMemo(
    () => dispatch(C.setFocusedId(O.some(id))),
    [dispatch, idSerialized]
  );
  const onBlur = React.useMemo(() => dispatch(C.setFocusedId(O.none)), [
    dispatch,
    idSerialized
  ]);
  const ref = React.useRef<TextInput>();

  const isActive$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isActive(id, state))),
    [state$, idSerialized]
  );
  const isFocused$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isFocused(id, state))),
    [state$, idSerialized]
  );
  const rawValue$ = React.useMemo(
    () =>
      state$.pipe(
        rxOp.map(state =>
          C.isActive(id, state)
            ? O.getOrElse(() => value)(state.inputBuffer)
            : value
        )
      ),
    [state$, idSerialized, value]
  );

  const isActive = useObservable(isActive$, false);
  const isFocused = useObservable(isFocused$, false);
  const rawValue = useObservable(rawValue$, value);

  React.useLayoutEffect(() => {
    if (isFocused && ref.current && !ref.current.isFocused()) {
      ref.current.focus();
      console.log("forced focus to", idSerialized);
    }
  });

  if (props.dsl.type !== "input") return null;

  return (
      <TextInput
        ref={ref as any}
        editable={isActive}
        value={rawValue}
        onChangeText={isActive ? onChangeText : undefined}
        onFocus={!isFocused ? onFocus : undefined}
        onBlur={isFocused ? onBlur : undefined}
        autoCapitalize="none"
      />
  );
});
RenderInput.displayName = 'DSL(Input)'

export const RenderText = React.memo(function TextRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "text") return null;
  return <Text>{translate(props.dsl.text)}</Text>;
});
RenderText.displayName = 'DSL(Text)'

export const RenderButton = React.memo(function ButtonRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "button") return null;
  return (
    <Button
      onPress={() => {
        props.dispatch(C.setPressedId(O.some(props.dsl.id)))();
        props.dispatch(C.setPressedId(O.none))();
      }}
      title={translate(props.dsl.text)}
    />
  );
});
RenderButton.displayName = 'DSL(Button)'

export const RenderContainer = React.memo(function ContainerRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "container") return null;
  return (
    <React.Fragment key={hlist.toString(props.dsl.id)}>
      {props.dsl.children.map((dsl, i) => render({ ...props, dsl }))}
    </React.Fragment>
  );
});
RenderContainer.displayName = 'DSL(Container)'

export const RenderDsl = React.memo(function DslRenderer(
  props: ComponentProps
) {
  return render(props);
});

export class AppRunner<A> extends React.Component<
  { getApp: I.IO<CW.WidgetBuilder> },
  C.WidgetState
> {
  state = C.initialWidgetState;
  state$ = new RX.BehaviorSubject(this.state);
  app: CW.Widget;

  constructor(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    super(props);
    this.app = this.getApp(props);
  }

  getApp(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    const startedAt = new Date().getTime()
    const builtApp = props.getApp()
    const timeTaken = new Date().getTime() - startedAt
    console.log("generating DSL took " + timeTaken + "ms")

    const startedAt2 = new Date().getTime()
    const app = builtApp(C.initialWidgetBuilderState)
    const timeTaken2 = new Date().getTime() - startedAt2
    console.log("building DSL took " + timeTaken2 + "ms")

    return app;
  }

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = initialState => {
    // time tracking
    const startedAt = new Date().getTime()

    // each frame, we debate if the active element is actually alive
    let currentState = C.newFrame(initialState);
    let keepAlive = true;
    let frameProcessed = 0;
    let stateList: C.WidgetState[] = [];
    while (keepAlive) {
      // calculate next
      const requestedState = this.app.tick(this.app.ui)(currentState);
      // get next state by optionally perform side effects
      currentState = pipe(
        requestedState,
        N.fold(
          // nothing to do, continue with the new one
          newState => newState,
          // we perform the side effect, and then update the app definition
          runEffect => {
            const state = runEffect()
            this.app = this.getApp(this.props)
            return state
          },
          // we halt and use the current state
          () => {
            keepAlive = false
            return currentState
          }
        )
      )
      // do not loop without end!
      if(keepAlive && frameProcessed >= 20){
        stateList.push(currentState)
        throw new Error("Error while converging! Last application states are reported in console.")
      }
      frameProcessed++
      // did we requested to halt?
      if(!keepAlive){
        // we have been asked to stop processing events, but is the activeId requested still alive?
        // what we do is attempt to process another frame and forcefully clear the activeId
        // we do this only on activeIds because we assume that 
        if(C.isActiveIdStale(currentState)){
          currentState = C.setActiveId(O.none)(currentState)
          stateList.push(currentState)
          keepAlive = true
        }
      }
    }
    // render
    const timeTaken = new Date().getTime() - startedAt
    console.log("event loop took " + timeTaken + "ms")

    // logs processed frames
    console.log(frameProcessed + " frames processed")
    return currentState;
  };

  componentWillMount() {
    this.setState(state => this.eventLoop(state));
  }

  dispatch: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () =>
    this.setState(state => {
      const newState = this.eventLoop(f(state));
      this.state$.next(newState);
      return newState;
    });

  update: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () =>
    this.setState(state => {
      const newState = f(state);
      this.state$.next(newState);
      return newState;
    });

  render() {
    return (
      <StateContext.Provider value={this.state$}>
        <RR.RenderDsl
          dsl={this.app.ui}
          dispatch={this.dispatch}
          update={this.update}
        />
      </StateContext.Provider>
    );
  }
}
