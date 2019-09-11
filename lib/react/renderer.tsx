import * as React from "react";
import * as D from "../core/dsl";
import * as C from "../core/context";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as CW from "../core/widget";
import * as hlist from "../data/hlist";
import * as N from "../data/next";
import * as rxOp from "rxjs/operators";
import { Text } from "native-base";
import * as RX from "rxjs";
import { pipe } from "fp-ts/lib/pipeable";
import { FlatList, ListRenderItemInfo } from "react-native";
import {
  ComponentProps,
  translate,
  StateContext,
  useWidgetState,
  useDslState,
  DslContext,
  useDslValue,
  RenderChildProps
} from "./common";
import { RenderInput } from "./input";
import { RenderText } from "./text";
import { RenderList } from "./list";
import { RenderButton } from "./button";
import { RenderContainer } from "./container";

const RenderDsl = React.memo(function RenderDsl(
  props: ComponentProps
): JSX.Element {
  const type = useDslValue(D.lens.type, "unknown");
  const id = useDslValue<D.ID>(D.lens.id, hlist.nil, hlist)
  switch (type) {
    case "input":
      return <RenderInput {...props} key={hlist.toString(id)} />;
    case "text":
      return <RenderText {...props} key={hlist.toString(id)} />;
    case "button":
      return <RenderButton {...props} key={hlist.toString(id)} />;
      case "container":
        return <RenderContainer {...props} key={hlist.toString(id)} RenderChild={RenderChild} />;
      case "list":
        return <RenderList {...props} key={hlist.toString(id)} RenderChild={RenderChild} />;
  }
  return <React.Fragment><Text>{JSON.stringify("unknown " + type)}</Text></React.Fragment>;
});


export const RenderChild = React.memo(function NarrowDsl(props: RenderChildProps) {
  const dsl$ = React.useContext(DslContext);
  const { id, selector } = props;
  const child$ = React.useMemo(
    () => dsl$.pipe(rxOp.map(v => {
        const result = selector(id)(v)
        //console.log("narrowing", v, " with ", id, "returns", result)
        return result
    }), rxOp.distinctUntilChanged()),
    [id, selector]
  );
  return (
    <DslContext.Provider value={child$}><RenderDsl {...props} /></DslContext.Provider>
  );
});



export class AppRunner<A> extends React.Component<
  { getApp: I.IO<CW.WidgetBuilder> },
  unknown
> {
  state$ = new RX.BehaviorSubject(C.initialWidgetState);
  dsl$ = new RX.BehaviorSubject(D.container(hlist.nil, []));
  app: CW.Widget;

  constructor(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    super(props);
    this.app = this.getApp(props);
    const newState = this.eventLoop(this.state$.value);
    this.state$.next(newState);
    this.dsl$.next(this.app.ui);
  }

  getApp(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    const builtApp = props.getApp();
    const app = builtApp(C.initialWidgetBuilderState);
    return app;
  }

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = initialState => {
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
    return currentState;
  };

  dispatch: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () => {
    const newState = this.eventLoop(f(this.state$.value));
    this.state$.next(newState);
    this.dsl$.next(this.app.ui);
    this.forceUpdate();
  };

  update: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () => {
    const newState = f(this.state$.value);
    this.state$.next(newState);
    this.dsl$.next(this.app.ui);
  };

  componentWillMount() {
    this.dispatch(a => a);
  }

  render() {
    return (
      <DslContext.Provider value={this.dsl$}>
        <StateContext.Provider value={this.state$}>
          <RenderDsl dispatch={this.dispatch} update={this.update} />
        </StateContext.Provider>
      </DslContext.Provider>
    );
  }
}
