import { ComponentProps, translate, useDslValue } from "./common";
import * as React from "react";
import { Text } from "native-base";
import * as D from "../core/dsl";

export const RenderText = React.memo(function TextRenderer(
  props: ComponentProps
) {
  const text = useDslValue(D.lens.text, D.tr``, D.eqTr);
  return <Text>{translate(text)}</Text>;
});
RenderText.displayName = "DSL(Text)";
