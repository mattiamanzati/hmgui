import { ComponentProps, useDslValue, RenderChildProps } from "./common";
import { ListRenderItemInfo, FlatList } from "react-native";
import * as React from "react";
import * as hlist from "../data/hlist";
import * as D from "../core/dsl";
import { identity } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array"
import * as EQ from "fp-ts/lib/Eq";

function getListChild(id: string): (dsl: D.DSL) => D.DSL {
  return dsl => {
    if (dsl.type !== "list") return dsl;
    return dsl.children.find(i => hlist.toString(i.id) === id);
  };
}

function getChildIds(d: D.DSL): string[] {
    if(d.type !== "list") return []
    return d.children.map(i => hlist.toString(i.id))
}

const arrayStringEq = A.getEq(EQ.eqString)
export const RenderList = React.memo(function ListRenderer(
  props: ComponentProps  & { RenderChild: React.NamedExoticComponent<RenderChildProps>}
) {
  const ids = useDslValue(getChildIds, [], arrayStringEq)
  const { update, dispatch, RenderChild } = props;
  const renderItem = React.useMemo(
    () => 
    function renderChildren(data: ListRenderItemInfo<string>): JSX.Element {
        return <RenderChild update={update} dispatch={dispatch} id={data.item} selector={getListChild} />
    },
    [update, dispatch]
  );

  return (
    <FlatList
      data={ids}
      keyExtractor={identity}
      renderItem={renderItem}
    />
  );
});
RenderList.displayName = "DSL(List)";
