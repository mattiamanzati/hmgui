import * as React from "react";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as CW from "../core/widget";
import * as hlist from "../data/hlist";
import * as N from "../data/next";
import * as rxOp from "rxjs/operators";
import {
  Text,
  Button,
  Input,
  Container,
  Content,
  Item,
  Icon,
  View
} from "native-base";
import * as RX from "rxjs";
import { pipe } from "fp-ts/lib/pipeable";
import { TextInput, KeyboardAvoidingView, FlatList, TouchableWithoutFeedback, TouchableOpacity } from "react-native";

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
    case "list":
      return <RenderList {...props} key={hlist.toString(props.dsl.id)} />;
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

const noop = () => I.of(undefined);
const optionHList = O.getEq(hlist);
function useDslState(props: ComponentProps) {
  const state$ = React.useContext(StateContext);
  const { dsl, dispatch, update } = props;
  const { id } = dsl;
  const idSerialized = hlist.toString(id);

  const isActive$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isActive(id, state))),
    [state$, idSerialized]
  );
  const isFocused$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isFocused(id, state))),
    [state$, idSerialized]
  );

  const inputBufferState$ = React.useMemo(
    () => state$.pipe(rxOp.map(state => C.isActive(id, state) ? state.inputBufferState : "valid")),
    [state$, idSerialized]
  )

  const isActive = useObservable(isActive$, false);
  const isFocused = useObservable(isFocused$, false);
  const inputBufferState = useObservable(inputBufferState$, "valid")

  const onFocus = React.useMemo(() => dispatch(C.doFocus(id)), [
    dispatch,
    idSerialized,
    isFocused
  ]);
  const onBlur = React.useMemo(
    () => () => {
      console.log("ABOUT TO BLUR ", idSerialized);
      return dispatch(C.doBlur(id))();
    },
    [dispatch, idSerialized, isFocused]
  );

  const onChangeText = React.useMemo(
    () => (newText: string) =>
      update(C.doUpdateInputBuffer(id, O.some(newText)))(),
    [idSerialized, update, isActive]
  );

  const onTabNext = React.useMemo(
    () => (isFocused ? dispatch(C.setRequestedFocusNext(O.some(id))) : noop),
    [idSerialized, update, isFocused]
  );

  return {
    isActive,
    isFocused,
    onFocus,
    onBlur,
    onChangeText,
    onTabNext,
    inputBufferState
  };
}

export const RenderInput = React.memo(function InputRenderer(
  props: ComponentProps
) {
  const {
    isFocused,
    isActive,
    onFocus,
    onBlur,
    onChangeText,
    onTabNext,
    inputBufferState
  } = useDslState(props);
  const state$ = React.useContext(StateContext);
  const { id } = props.dsl;
  const value = (props.dsl as any).value || "";
  const idSerialized = hlist.toString(id);

  const ref = React.useRef<TextInput>();

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

  const rawValue = useObservable(rawValue$, value);

  React.useEffect(() => {
    if(ref.current && isFocused && !ref.current.isFocused()){
      ref.current.focus()
    }else if(ref.current && !isFocused && ref.current.isFocused()){
      ref.current.blur()
    }
  });

  if (props.dsl.type !== "input") return null;

  return (
    <Item underline error={inputBufferState === "invalid"} onPress={onFocus}>
      <Input
        ref={c => {
          ref.current = c ? (c as any)._root : null;
        }}
        editable={isActive && isFocused}
        value={rawValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize="none"
        selectTextOnFocus={true}
        onSubmitEditing={onTabNext}
        blurOnSubmit={false}
        pointerEvents="none"
      />
      {isActive ? <Icon name="create" onPress={onFocus} /> : null}
      {isFocused ? <Icon name="arrow-dropleft" /> : null}
    </Item>
  );
});

RenderInput.displayName = "DSL(Input)";

export const RenderText = React.memo(function TextRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "text") return null;
  return <Text>{translate(props.dsl.text)}</Text>;
});
RenderText.displayName = "DSL(Text)";

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
    >
      <Text>{translate(props.dsl.text)}</Text>
    </Button>
  );
});
RenderButton.displayName = "DSL(Button)";

export const RenderContainer = React.memo(function ContainerRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "container") return null;
  return (
    <View key={hlist.toString(props.dsl.id)} style={{flex: 1}}>
      {props.dsl.children.map((dsl, i) => render({ ...props, dsl }))}
    </View>
  );
});
RenderContainer.displayName = "DSL(Container)";

export const RenderList = React.memo(function ListRenderer(
  props: ComponentProps
) {
  if (props.dsl.type !== "list") return null;
  return (
    <FlatList
      data={props.dsl.children}
      keyExtractor={d => hlist.toString(d.id)}
      renderItem={d => render({ ...props, dsl: d.item })}
      style={{flex: 1}}
    />
  );
});
RenderList.displayName = "DSL(List)";

export const RenderDsl = React.memo(function DslRenderer(
  props: ComponentProps
) {
  return render(props);
});

export class AppRunner<A> extends React.Component<
  { getApp: I.IO<CW.WidgetBuilder> },
  { dsl: D.DSL }
> {
  state$ = new RX.BehaviorSubject(C.initialWidgetState);
  app: CW.Widget;

  constructor(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    super(props);
    this.app = this.getApp(props);
    const newState = this.eventLoop(this.state$.value);
    this.state$.next(newState);
    this.state = { dsl: this.app.ui };
  }

  getApp(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    const startedAt = new Date().getTime();
    const builtApp = props.getApp();
    const timeTaken = new Date().getTime() - startedAt;
    console.log("-> generating DSL took " + timeTaken + "ms");

    const startedAt2 = new Date().getTime();
    const app = builtApp(C.initialWidgetBuilderState);
    const timeTaken2 = new Date().getTime() - startedAt2;
    console.log("-> building DSL took " + timeTaken2 + "ms");

    return app;
  }

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = initialState => {
    // time tracking
    const startedAt = new Date().getTime();

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
            const state = runEffect();
            this.app = this.getApp(this.props);
            return state;
          },
          // we halt and use the current state
          () => {
            keepAlive = false;
            return currentState;
          }
        )
      );
      // do not loop without end!
      if (keepAlive && frameProcessed >= 20) {
        stateList.push(currentState);
        throw new Error(
          "Error while converging! Last application states are reported in console."
        );
      }
      frameProcessed++;
      // did we requested to halt?
      if (!keepAlive) {
        // we have been asked to stop processing events, but is the activeId requested still alive?
        // what we do is attempt to process another frame and forcefully clear the activeId
        // we do this only on activeIds because we assume that
        if (C.isActiveIdStale(currentState)) {
          currentState = C.setActiveId(O.none)(currentState);
          stateList.push(currentState);
          keepAlive = true;
        }
      }
    }
    // render
    const timeTaken = new Date().getTime() - startedAt;
    console.log("-> event loop took " + timeTaken + "ms");

    // logs processed frames
    console.log("-> " + frameProcessed + " frames processed");
    return currentState;
  };

  dispatch: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () => {
    const newState = this.eventLoop(f(this.state$.value));
    this.state$.next(newState);
    this.setState({ dsl: this.app.ui });
    this.forceUpdate();
  };

  update: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () => {
    const newState = f(this.state$.value);
    this.state$.next(newState);
    this.setState({ dsl: this.app.ui });
  };

  componentWillMount() {
    this.dispatch(a => a);
  }

  render() {
    return (
      <StateContext.Provider value={this.state$}>
              <RenderDsl
                dsl={this.state.dsl}
                dispatch={this.dispatch}
                update={this.update}
              />
      </StateContext.Provider>
    );
  }
}
