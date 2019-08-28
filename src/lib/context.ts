import * as hlist from "./data/hlist";
import * as O from "fp-ts/lib/Option";


export type ID = hlist.HList<string>;

export interface WidgetBuilderState {
  currentId: ID;
}
export const initialWidgetBuilderState: WidgetBuilderState = {
  currentId: hlist.nil
};

export interface WidgetState {
  pressedId: O.Option<ID>   // ID of the widget being pressed
  focusedId: O.Option<ID>   // ID of the widget which has currently focus, may be different from the active one.
  activeId: O.Option<ID>    // ID of the widget which is currently active, meaning that edit can occur
  inputBuffer: O.Option<string> // editing value of a text input
  inputBufferState: "dirty" | "valid" | "invalid"
  focusTrap: boolean;
}
export const initialWidgetState: WidgetState = {
  activeId: O.none,
  pressedId: O.none,
  focusedId: O.none,
  inputBuffer: O.none,
  inputBufferState: "dirty",
  focusTrap: false
};

export const pushId: (id: string) => (ctx: WidgetBuilderState) => WidgetBuilderState = id => ctx => ({...ctx, currentId: hlist.cons(id, ctx.currentId)})
export const popId: () => (ctx: WidgetBuilderState) => WidgetBuilderState = () => ctx => ({...ctx, currentId: hlist.pop(ctx.currentId)})


export function setActiveId(activeId: O.Option<ID>): (state: WidgetState) => WidgetState {
  return state => ({...state, activeId })
}

export function setFocusedId(focusedId: O.Option<ID>): (state: WidgetState) => WidgetState {
  return state => ({...state, focusedId })
}

export function setInputBuffer(inputBuffer: O.Option<string>): (state: WidgetState) => WidgetState {
  return state => ({...state, inputBuffer, inputBufferState: "dirty" })
}
export function setInputBufferState(inputBufferState: WidgetState["inputBufferState"]): (state: WidgetState) => WidgetState {
  return state => ({...state, inputBufferState })
}

const optionHList = O.getEq(hlist)

export function isCurrentlyActive(ctx: WidgetBuilderState, state: WidgetState): boolean {
  return optionHList.equals(O.some(ctx.currentId), state.activeId)
}

export function isCurrentlyPressed(ctx: WidgetBuilderState, state: WidgetState): boolean {
  return optionHList.equals(O.some(ctx.currentId), state.pressedId)
}

export function isCurrentlyFocused(ctx: WidgetBuilderState, state: WidgetState): boolean {
  return optionHList.equals(O.some(ctx.currentId), state.focusedId)
}

export function canActivate(ctx: WidgetBuilderState, state: WidgetState): boolean {
  return !state.focusTrap && O.isNone(state.activeId) && !isCurrentlyActive(ctx, state)
}
export function canDeactivate(ctx: WidgetBuilderState, state: WidgetState): boolean {
  return !state.focusTrap && isCurrentlyActive(ctx, state)
}