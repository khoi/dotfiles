# Custom inline snapshot testing helper

Domain specific inline snapshot testing helpers can be defined that use `assertInlineSnapshot` under the hood.

* Define free function named "assert{Subject}".
* First argument is subject to snapshot. Use `_` external argument name.
  * **DO NOT** use "Inline" in the function name
  * **PREFER** non-closure arguments and `@autoclosure` arguments.
* Second argument is trailing closure for snapshot.
  * **DO** make trailing closure optional with `nil` default.
* Remaining arguments are `fileID`, `file`, `function`, `line` and `column` with defaults provided by respective macro.
* In body of function perform work to construct string representation of subject.
* Invoke `assertInlineSnapshot` with arguments:
  * `of`: string representation of subject.
  * `as`: always use `.lines`
  * `matches`: The trailing closure provided.
  * `fileID`, `file`, `function`, `line`, `column`: Pass along values.

For example:

```swift
func assertCommand(
  _ command: @autoclosure () throws -> Void,
  stdout: (() -> String)? = nil,
  fileID: StaticString = #fileID,
  file: StaticString = #filePath,
  function: StaticString = #function,
  line: UInt = #line,
  column: UInt = #column
) rethrows {
  let output = try withCapturedStdout { try command() }
  assertInlineSnapshot(
    of: output,
    as: .lines,
    matches: stdout,
    fileID: fileID,
    file: file,
    line: line,
    column: column
  )
}
```

To use this helper:

```swift
@Test func currentVersion() async throws {
  try assertCommand(try Version().run()) {
    """
    0.0.1
    """
  }
}
```
