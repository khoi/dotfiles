# CasePaths Glossary

## Table of Contents

* [case path](#case-path)
* [case-pathable](#case-pathable)
* [`CaseKeyPath`](#casekeypath)
* [`PartialCaseKeyPath`](#partialcasekeypath)
* [`AnyCasePath`](#anycasepath)
* [`Case`](#case)

## case path

A "case path" refers to a key path-like object for an enum case.

Swift does not have built-in support for enum case key paths, so the CasePaths library adds this feature to the language using the `@CasePathable` macro.

## case-pathable

An enum is "case-pathable" if it conforms to the `CasePathable` protocol (usually _via_ the `@CasePathable` macro).

## `CaseKeyPath`

The `CaseKeyPath<Root, Value>` type _is_ a Swift key path that refers to an enum case on a case-pathable enum. It is literally a type alias to a key path that wraps the `Root` enum type and associated `Value` in the library's `Case` type:

```swift
typealias CaseKeyPath<Root, Value> = KeyPath<Case<Root>, Case<Value>>
```

Case key paths are constructible using key path literals from `Root.Cases`:

```swift
\Root.Cases.caseName
```

If an API takes case key path and the root type can be inferred, you can use abbreviated syntax:

## `PartialCaseKeyPath`

A partially-erased `CaseKeyPath` that, like `PartialKeyPath`, preserves the `Root` generic:

```swift
typealias PartialCaseKeyPath<Root> = PartialKeyPath<Case<Root>>
```

Library users are most likely to encounter this type _via_ the `allCasePaths` static property on a case-pathable enum.

## `AnyCasePath`

A "case path" that is not part of Swift's key path hierarchy. An `AnyCasePath` can be constructed by providing an `embed`/`extract` pair of closures, and is what the `@CasePathable` macro uses to generate case _key_ paths:

```swift
@CasePathable
enum Foo {
  case bar(Int)
}

// Macro generates:
extension Foo: CasePathable {
  struct AllCasePaths {
    let bar = AnyCasePath<Foo, Int> { value in
      Foo.bar(value)
    } extract: { root in
      guard case .bar(let value) = root else { return nil }
      return value
    }
  }
  ...
}
```

Library users can extend case-pathable enums with their own `AnyCasePath` objects to provide custom, computed case key paths. For example, one could define a case key path subscript that indexes into an enum case by an associated value:

```swift
@CasePathable
enum Identified<ID: Hashable, Value> {
  case value(ID, Value)
}

extension Identified.AllCasePaths {
  subscript(id id: ID) -> AnyCasePath<Identified, Value> {
    AnyCasePath { value in
      Identified.value(id, value)
    } extract: { root in
      guard case .value(id, let value) = root else { return nil }
      return value
    }
  }
}

// Enables the following syntax:
let _: CaseKeyPath<Identified<Int, User>, User> = \.[id: 1]
```

## `Case`

The library type responsible for building case key paths. This type is mostly an implementation detail and is not likely to be used by library users, and users should prefer other public CasePaths APIs over `Case` unless necessary.

`Case` is only potentially necessary in two cases:

* When a library user wants to provide an API that takes a case key-path but does not want to constrain the root generic to `CasePathable`. This is generally only necessary if the generic can refer to a non-case-pathable type in certain contexts.
    
    In this case, one can use the following APIs to embed and extract a value using the case key path:
    
    ```swift
    Case(caseKeyPath)._embed(value)  // Any?

    Case(caseKeyPath)._extract(from: root)  // Value?
    ```
    
* When you want to add a case key path to a type that is otherwise not case-pathable, _e.g._ an existential, which cannot conform to protocols itself.
    
    ```swift
    @CasePathable
    enum Foo {
      case bar(any Bar)
    }
    
    extension Case<any Bar> {
      subscript<B: Bar>(as barType: B.Type) -> Case<B> {
        Case<C> {
          self._embed($0)
        } extract: {
          self._extract(from: $0) as? B
        }
      }
    }
    
    // Enables the following syntax:
    let _: CaseKeyPath<Foo, MyBar> = \.bar[as: MyBar]
    ```
