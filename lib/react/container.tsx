import { ComponentProps, useDslValue, RenderChildProps } from "./common";
import { View } from "native-base"
import * as React from "react";
import * as hlist from "../data/hlist";
import * as D from "../core/dsl";
import * as A from "fp-ts/lib/Array"
import * as EQ from "fp-ts/lib/Eq";

function getContainerChild(id: string): (dsl: D.DSL) => D.DSL {
  return dsl => {
    if (dsl.type !== "container") return dsl;
    return dsl.children.find(i => hlist.toString(i.id) === id);
  };
}

function getChildIds(d: D.DSL): string[] {
    if(d.type !== "container") return []
    return d.children.map(i => hlist.toString(i.id))
}

const arrayStringEq = A.getEq(EQ.eqString)
export const RenderContainer = React.memo(function ContainerRenderer(
  props: ComponentProps & { RenderChild: React.NamedExoticComponent<RenderChildProps>}
) {
  const ids = useDslValue(getChildIds, [], arrayStringEq)
  const { update, dispatch, RenderChild } = props;
  const renderItem = React.useMemo(
    () => 
    function renderChildren(id: string): JSX.Element {
        return <RenderChild key={id} update={update} dispatch={dispatch} id={id} selector={getContainerChild} />
    },
    [update, dispatch]
  );

  return (
    <View>{ids.map(renderItem)}</View>
  );
});
RenderContainer.displayName = "DSL(Container)";
