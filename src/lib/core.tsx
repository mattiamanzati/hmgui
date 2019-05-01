import * as React from 'react'
import {State, state} from 'fp-ts/lib/State'
import { sequenceT } from 'fp-ts/lib/Apply';
import { Option, none } from 'fp-ts/lib/Option';
import ReactDOM from 'react-dom';


interface Builder {
    nextId: number
}

export type Context = {
    eventType: 'none'
    hotId: Option<number> // TODO: use a { id, index } object with a monoid instead
    activeId: Option<number>
}

export type DSL = 
    | { type: 'none', id: number}
    | { type: 'container', id: number, childrens: DSL[] }
    | { type: 'text', id: number, text: string }
    | { type: 'input-text', id: number, value: string }

export type GUI<V> = State<Builder, State<Context, State<V, DSL>>>

const getId: State<Builder, number> = (builder) => [builder.nextId + 1, {...builder, nextId: builder.nextId + 1}]

const sequenceState: <L, A>(...states: State<L, A>[]) => State<L, A[]> = sequenceT(state) as any

export const text: <V>(lens: (value: V) => string) => GUI<V> = 
    lens =>
        state.map(getId, 
            id => context => [value => [{ type: 'text', id, text: lens(value)}, value], context]
        )


export const button: <V>(lens: (value: V) => string) => GUI<V> = 
lens =>
    state.map(getId, 
        id => context => [value => [{ type: 'text', id, text: lens(value)}, value], context]
    )

export const showIf: <V>(lens: (value: V) => boolean) => (builder: GUI<V>) => GUI<V> = 
lens => builder =>
    state.chain(getId, 
        id => state.map(
            builder,
            instance => 
                state.map(
                    instance,
                    f => value => lens(value) ? f(value) : [{ type: 'none', id}, value]
                )
        )
    )

export const container: <V, T extends Array<GUI<V>>>(...builders: T & { 0: GUI<V>}) => GUI<V> =
    (...builders) =>
        state.chain(
            getId,
            id => 
                state.map(
                    sequenceState(...builders),
                    controls => 
                        state.map(
                            sequenceState(...controls),
                            dsls => state.map(
                                    sequenceState(...dsls),
                                    childrens => ({ type: 'container', id, childrens})
                                )
                        )
                )
        )

export const initialBuilder: Builder = { nextId: 0}
export const defaultContext: Context = { eventType: 'none', hotId: none, activeId: none}

// sample
interface User {
    age: number
    name: string
}

const guiDefinition: GUI<User> = container(
    container(
        text(v => "Hello " + v.name + "!"),
        text(() => "Welcome on board!")
    ),
    container(
        showIf<User>(v => v.age >= 18)(text(() => "Wanna see some beers?")),
        text(() => "We also have things to buy here!")
    )
)

const guiIstance = guiDefinition(initialBuilder)[0]
const executedFrame = guiIstance(defaultContext)[0]
const ast = executedFrame({ age: 16, name: "Mattia" })[0]
console.log(ast)

const guiIstance2 = guiDefinition(initialBuilder)[0]
const executedFrame2 = guiIstance2(defaultContext)[0]
const ast2 = executedFrame2({ age: 25, name: "Giulio" })[0]
console.log(ast2)

function RenderDSL<V>(props: DSL){
    switch(props.type){
        case "none":
            return null
        case "text":
            return props.text
        case "container":
            return React.createElement(
                React.Fragment, 
                { key: props.id }, 
                ...props.childrens.map(child => React.createElement(RenderDSL as any, { key: child.id, ...child}))
            )
    }
    return null
}


ReactDOM.render(<div>{React.createElement(RenderDSL as any, ast2)}</div>, document.getElementById('root'));