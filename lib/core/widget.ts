import * as R from "fp-ts/lib/Reader";
import * as C from "./context";
import * as D from "./dsl";
import * as OR from "fp-ts/lib/Ord";
import * as O from "fp-ts/lib/Option";
import * as H from "../data/hlist";
import * as N from "../data/next";
import { pipe } from "fp-ts/lib/pipeable";

type ID = H.HList<string>;

export interface WidgetEventHandler {
  (dsl: D.DSL): (state: C.WidgetState) => N.Next<"IO", C.WidgetState>;
}

export interface Widget {
  ui: D.DSL;
  tick: WidgetEventHandler;
}

export interface WidgetBuilder extends R.Reader<C.WidgetBuilderState, Widget> {}

export const widget: OR.Ord<Widget> = {
  equals: (a, b) => H.equals(a.ui.id, b.ui.id),
  compare: (a, b) => 0
};


let enableLog = true
export const log: (id: ID, ...args: any) => void = (id, ...args) => enableLog ? console.log(H.toString(id), ...args) : null

let timeLog = { tasks: [], parent: null, start: 0, end: 0, duration: 0}
let currentLog = timeLog
export const timeStart: (name: string) => void = name => {
  const newLog = { parent: currentLog, name, start: new Date().getTime(), end: -1000, duration: 0, tasks: []}
  currentLog.tasks.push(newLog)
  currentLog = newLog
}

export const timeEnd: () => void = () => {
  currentLog.end = new Date().getTime()
  currentLog.duration = currentLog.end - currentLog.start
  currentLog = currentLog.parent
}

const dumpLog: (item: any, indent?: number) => string = (item , indent = 0) => {
  let str = ""
  for(let i = 0; i < indent; i++){
    str += " "
  }
  str += "- " + item.name + " " + item.duration + "ms"
  if(item.tasks.length > 0) str += "\n"
  str += item.tasks.map(t => dumpLog(t, indent + 1)).join("\n")
  return str
}

export const timeDump: () => void = () => {
  console.log(dumpLog(currentLog))
  currentLog.tasks = []
}

export const noEventHandler: (
  dsl: D.DSL
) => (state: C.WidgetState) => N.Next<"IO", C.WidgetState> = _ => _ => N.halt();

export const makeInteractive: (
  id: ID,
  wantsActivate: (state: C.WidgetState) => boolean,
  wantsDeactivate: (state: C.WidgetState) => boolean,
  onActivation: (state: C.WidgetState) => N.Next<"IO", C.WidgetState>,
  whenActive: (state: C.WidgetState) => N.Next<"IO", C.WidgetState>,
  onDeactivation: (state: C.WidgetState) => N.Next<"IO", C.WidgetState>,
  whenNotActive: (state: C.WidgetState) => N.Next<"IO", C.WidgetState>
) => (
  ctx: C.WidgetBuilderState
) => (state: C.WidgetState) => N.Next<"IO", C.WidgetState> = (
  id,
  wantsActivate,
  wantsDeactivate,
  onActivation,
  whenActive,
  onDeactivation,
  whenNotActive
) => ctx => state => {
  timeStart("interaction of " + H.toString(id))
  try{
    const isCurrentlyActive = C.isCurrentlyActive(ctx, state);
    const isEnabled = C.getEnabled(ctx);
  
    // this control requested to focus next
    if (C.hasRequestedFocusNext(ctx, state)) {
      log(ctx.currentId, "hasRequestedFocusNext")
      return N.cont(
        pipe(
          state,
          C.setRequestedFocusNext(O.none),
          C.setAutoFocus(true)
        )
      );
    }
  
    // enabled?
    if (isEnabled) {
      // handles autoFocus
      if (state.autoFocus) {
        log(ctx.currentId, "autoFocus")
        return N.cont(
          pipe(
            state,
            C.setFocusedId(O.some(ctx.currentId)),
            C.setAutoFocus(false)
          )
        );
      }
  
      // isActive?
      if (isCurrentlyActive) {
        const canDeactivate = C.canDeactivate(ctx, state);
  
        // I am active, but I received input to deactivate!
        if (canDeactivate && wantsDeactivate(state)) {
          log(ctx.currentId, "deactivating")
          return onDeactivation(state);
        }
  
        // if active but not marked as alive, mark it as alive! (otherwise next frame will kill me and deactivate)
        // this is basically a "keep alive" definition
        if (O.isNone(state.activeIdIsAlive) && isEnabled) {
          log(id, "keepAlive")
          return N.cont(C.setActiveIdIsAlive(O.some(id))(state));
        }
  
        return whenActive(state);
      } else {
        const canActivate = C.canActivate(ctx, state);
        // isNotActive
  
        // I am not active, but I'd like to be!
        if (canActivate && wantsActivate(state)) {
          log(id, "activating")
          return onActivation(state);
        }
  
        return whenNotActive(state);
      }
    }
  
    return whenNotActive(state);

  }finally{
    timeEnd()
  }
  
};
