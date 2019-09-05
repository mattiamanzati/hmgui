import * as React from "react";
import * as D from "./core/dsl";
import * as C from "./core/context";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as W from "./widgets";
import * as CW from "./core/widget";
import * as dsl from "./core/dsl";
import * as hlist from "./data/hlist";
import { Observable, Subject, from, BehaviorSubject } from "rxjs";
import * as rxOp from "rxjs/operators";
import * as IR from "fp-ts/lib/IORef";
import * as RR from "./react";
import * as N from "./data/next";
import { pipe } from "fp-ts/lib/pipeable";

const StateContext = React.createContext(C.initialWidgetState);

type ComponentProps = {
  dsl: D.DSL;
  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
};

function translate(t: D.TranslableString): string {
  // TODO: this is just a stub, needs to handle number and date formatting in a localized way.
  return t.strings.map((s, i) => s + (t.values[i] || "")).join("");
}

export const RenderInput = React.memo((props: ComponentProps) => {
  const ref = React.useRef<HTMLInputElement>();
  // React.useEffect(() => {
  //   if (
  //     ref.current &&
  //     props.dsl.type === "input" &&
  //     props.dsl.focused &&
  //     ref.current !== document.activeElement
  //   ) {
  //     ref.current.focus();
  //   }
  // });
  const state = React.useContext(StateContext);
  if (props.dsl.type !== "input") return null;
  const { value } = props.dsl;
  const isActive = C.isActive(props.dsl.id, state)
  const rawValue = isActive ? O.getOrElse(() => value)(state.inputBuffer) : value

  return (
    <input
      ref={ref as any}
      type="text"
      disabled={!props.dsl.enabled}
      value={rawValue}
      onChange={isActive ? e => props.dispatch(C.setInputBuffer(O.some(e.target.value)))() : undefined}
      onFocus={props.dispatch(C.setFocusedId(O.some(props.dsl.id)))}
      onBlur={props.dispatch(C.setFocusedId(O.none))}
      style={isActive ? { border: "3px solid red"} : {}}
    />
  );
});

export const RenderText = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "text") return null;
  return <React.Fragment>{translate(props.dsl.text)}</React.Fragment>;
});

export const RenderButton = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "button") return null;
  return <button onClick={() => {
    props.dispatch(C.setPressedId(O.some(props.dsl.id)))()
    props.dispatch(C.setPressedId(O.none))()
  }}>{translate(props.dsl.text)}</button>;
});

export const RenderContainer = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "container") return null;
  return (
    <React.Fragment>
      {props.dsl.children.map((child, i) => (
        <RenderDsl {...props} key={i} dsl={child} />
      ))}
    </React.Fragment>
  );
});

export const RenderDsl = React.memo((props: ComponentProps) => {
  switch (props.dsl.type) {
    case "input":
      return <RenderInput {...props} />;
    case "container":
      return <RenderContainer {...props} />;
    case "text":
      return <RenderText {...props} />;
    case "button":
      return <RenderButton {...props} />;
  }
  return <React.Fragment>{JSON.stringify(props.dsl)}</React.Fragment>;
});

export class AppRunner<A> extends React.Component<
  { getApp: I.IO<CW.WidgetBuilder> },
  C.WidgetState
> {
  state = C.initialWidgetState;
  app: CW.Widget;

  constructor(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    super(props);
    this.app = this.getApp(props);
  }

  getApp(props: { getApp: I.IO<CW.WidgetBuilder> }) {
    return props.getApp()(C.initialWidgetBuilderState)[0];
  }

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = initialState => {
    let lastState = initialState;
    let numLoops = 0;
    while (numLoops < 10) {
      console.log(lastState)
      const nextState = this.app.tick(this.app.ui)(lastState);
      console.log(nextState);
      switch (nextState.type) {
        case "halt":
          return lastState;
        case "continue":
          lastState = nextState.state;
          break;
        case "suspendAndResume":
          lastState = nextState.effect();
          this.app = this.getApp(this.props);
          break;
      }
      numLoops++;
    }
    console.warn("end of max loop count");
    return lastState;
  };

  componentWillMount() {
    this.setState(state => this.eventLoop(state));
  }

  dispatch: (
    f: (state: C.WidgetState) => C.WidgetState
  ) => I.IO<void> = f => () => this.setState(state => this.eventLoop(f(state)));

  render() {
    return (
      <StateContext.Provider value={this.state}>
        <RR.RenderDsl dsl={this.app.ui} dispatch={this.dispatch} />
      </StateContext.Provider>
    );
  }
}
