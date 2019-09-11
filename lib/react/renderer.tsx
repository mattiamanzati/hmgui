import * as React from "react";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as CW from "../core/widget";
import * as hlist from "../data/hlist";
import * as N from "../data/next";
import * as rxOp from "rxjs/operators";
import { Text, Button, View } from "native-base";
import * as RX from "rxjs";
import { pipe } from "fp-ts/lib/pipeable";
import { FlatList, ListRenderItemInfo } from "react-native";
import {
  ComponentProps,
  translate,
  StateContext,
  useWidgetState,
  useDslState
} from "./common";
import { RenderInput } from "./input";
import { RenderText } from "./text";

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

export const RenderButton = React.memo(function ButtonRenderer(
  props: ComponentProps
) {
  const { onPress } = useDslState(props);
  if (props.dsl.type !== "button") return null;
  return (
    <Button onPress={onPress}>
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
    <View key={hlist.toString(props.dsl.id)}>
      {props.dsl.children.map((dsl, i) => render({ ...props, dsl }))}
    </View>
  );
});
RenderContainer.displayName = "DSL(Container)";

const keyExtractor: (d: D.DSL) => string = d => hlist.toString(d.id);
export const RenderList = React.memo(function ListRenderer(
  props: ComponentProps
) {
  const { update, dispatch } = props;
  const renderItem = React.useMemo(
    () => (d: ListRenderItemInfo<D.DSL>) =>
      render({ update, dispatch, dsl: d.item }),
    [update, dispatch]
  );
  if (props.dsl.type !== "list") return null;
  return (
    <FlatList
      data={props.dsl.children}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  );
});
RenderList.displayName = "DSL(List)";

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
    CW.timeStart("generate DSL")
    const builtApp = props.getApp();
    CW.timeEnd()

    CW.timeStart("build DSL")
    const app = builtApp(C.initialWidgetBuilderState);
    CW.timeEnd()
    return app;
  }

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = initialState => {
    CW.timeStart("eventLoop started")

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
            CW.timeStart("runEffect")
            const state = runEffect();
            CW.timeEnd()
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
    CW.timeEnd()
    
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
    CW.timeDump()

    return (
      <StateContext.Provider value={this.state$}>
        {render({
          dsl: this.state.dsl,
          dispatch: this.dispatch,
          update: this.update
        })}
      </StateContext.Provider>
    );
  }
}
