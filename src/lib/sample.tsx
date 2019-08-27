import * as C from "./core";
import * as dsl from "./dsl";
import * as hlist from "./hlist";
import * as React from "react";
import { Observable, Subject, from, BehaviorSubject } from "rxjs";
import * as rxOp from "rxjs/operators";
import * as I from "fp-ts/lib/IO";
import * as IR from "fp-ts/lib/IORef";
import * as O from "fp-ts/lib/Option";
import * as RR from "./react";
import * as N from "./next";
import { pipe } from "fp-ts/lib/pipeable";

type Model = number;

function render(model: Model) {
  return (update: (newModel: Model) => I.IO<void>) =>
    C.container("main")(
      C.button("minus")(C.tr`Subtract`, () => update(model - 1)),
      C.text("value")(C.tr`Current Value: ${model.toFixed(0)}`),
      C.button("plus")(C.tr`Add`, () => update(model + 1))
    );
}

const model = IR.newIORef(0)();

const app = render(model.read())(model.write);
const [appWidget, finalState] = app(C.initialWidgetBuilderState);

 class AppRunner extends React.Component<{app: C.Widget}, C.WidgetState>{
  state = C.initialWidgetState

  eventLoop: (initialState: C.WidgetState) => C.WidgetState = 
    (initialState) => {
      let lastState = initialState
      let numLoops = 0
      while(numLoops < 10){
        const nextState = this.props.app(lastState)
        switch(nextState.type){
          case "render":
            return lastState
          case "continue":
            lastState = nextState.state
            break
          case "suspendAndResume":
            lastState = nextState.effect()
            console.log("next state is", lastState)
            break
          case "halt":
            lastState = nextState.state
            break
        }
        console.log("tick", nextState)
        numLoops++
      }
      console.log("end of max loop count")
      return lastState
    }

  componentWillMount(){
    this.setState(state => this.eventLoop(state))
  }

  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void> = 
    f => () => this.setState(state => this.eventLoop(f(state)))

  render(){
    const output = this.props.app(this.state)

    return pipe(
      output,
      N.fold(
        dsl => {
          console.log("render", dsl)
          return <RR.RenderDsl dsl={dsl} dispatch={this.dispatch} />
        },
        newState => {
          console.log("continue", newState)
          return <React.Fragment>continuing...</React.Fragment>
        },
        newState => {
          console.log("halt", newState)
          return <React.Fragment>halting...</React.Fragment>
        },
        effect => {
          console.log("effect", effect)
          return <React.Fragment>effect...</React.Fragment>
        }
      )
    );
  }
}

export function App(){
  return <AppRunner app={appWidget} />
}
