import * as React from "react";
import * as D from "./dsl";
import * as C from "./core";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";

type ComponentProps = {
  dsl: D.DSL;
  dispatch: (f: (state: C.WidgetState) => C.WidgetState) => I.IO<void>;
};

const stateSetHover: (
  hoveredId: O.Option<C.ID>
) => (state: C.WidgetState) => C.WidgetState = hoveredId => state => ({
  ...state,
  hoveredId
});
const stateSetPointerDown: (
  pointerDown: boolean
) => (state: C.WidgetState) => C.WidgetState = pointerDown => state => ({
  ...state,
  pointerDown
});

function translate(t: D.TranslableString): string {
  // TODO: this is just a stub, needs to handle number and date formatting in a localized way.
  return t.strings.map((s, i) => s + (t.values[i] || "")).join("");
}

export const RenderButton = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "button") return null;
  return (
    <button
      onMouseOver={props.dispatch(stateSetHover(O.some(props.dsl.id)))}
      onMouseOut={props.dispatch(stateSetHover(O.none))}
      onMouseDown={props.dispatch(stateSetPointerDown(true))}
      onMouseUp={props.dispatch(stateSetPointerDown(false))}
    >
      {translate(props.dsl.text)}
    </button>
  );
});

export const RenderText = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "text") return null;
  return <React.Fragment>{translate(props.dsl.text)}</React.Fragment>;
});

export const RenderContainer = React.memo((props: ComponentProps) => {
  if (props.dsl.type !== "container") return null;
  return <React.Fragment>{props.dsl.children.map((child, i) => <RenderDsl {...props} key={i} dsl={child} />)}</React.Fragment>;
});

export const RenderDsl = React.memo((props: ComponentProps) => {
    switch(props.dsl.type){
        case "button": return <RenderButton {...props} />
        case "container": return <RenderContainer {...props} />
        case "text": return <RenderText {...props} />
    }
    return <React.Fragment>{JSON.stringify(props.dsl)}</React.Fragment>
})