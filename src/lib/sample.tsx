import * as W from "./widgets";
import * as A from "./attributes";
import * as React from "react";
import * as I from "fp-ts/lib/IO";
import * as RR from "./react/renderer";
import { pipe } from "fp-ts/lib/pipeable";

type Model = string[];

let spamTest: string[] = [];
for (let i = 0; i < 1000; i++) {
  spamTest.push("" + i);
}

function render(model: Model) {
  return (update: (newModel: Model) => I.IO<void>) =>
    W.container(
      spamTest.map((_, i) =>
        pipe(
          W.container([
            pipe(
              W.text(W.tr`Counter ${"" + i}:`),
              A.id("label" + i)
            ),
            pipe(
              W.string(
                model[i],
                name =>
                  update(
                    model
                      .slice(0, i)
                      .concat([name])
                      .concat(model.slice(i + 1))
                  ),
                true
              ),
              A.id("name" + i)
            )
          ]),
          A.id("div" + i)
        )
      )
    );
}

let appModel: Model = spamTest;

export function App() {
  return (
    <RR.AppRunner
      getApp={() => {
        return render(appModel)(newValue => {
          console.log("STATE UPDATE", newValue);
          return () => {
            console.log("STATE UPDATED", newValue);
            appModel = newValue;
          };
        });
      }}
    />
  );
}
