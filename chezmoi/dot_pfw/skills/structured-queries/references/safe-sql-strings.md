# Safe SQL Strings

Employ the `#sql` macro to write schema-safe queries and fragments in type-safe queries for when the query cannot be written with builder syntax.

## Embed safe SQL strings in a type-safe query

```swift
BlogPost.where {
  $0.publishedAt.gt(#sql("datetime('now')"))
}
```

* Use the `as` argument to specify the query value if it cannot be inferred from the context.
* Use `#sql` macro with SQL strings in localized areas for parts of the query that are not easily constructed with the query builder. For example:
  ```swift
  .where { $0.publishedAt.gt(#sql("datetime('now', '-7 days', 'subsec')")) }
  .select { #sql("max(\($0.createdAt, $0.updatedAt))", as: Date.self) }
  ```

## Write schema-safe SQL queries

```swift
let isCompleted = false
#sql(
  """
  SELECT \(Reminder.columns) FROM \(Reminder.self)
  WHERE \(Reminder.isCompleted) = \(isCompleted)
  """,
  as: Reminder.self
)
```

* Interpolate `Table.columns` to select all columns from the table.
* Interpolate `Table.self` instead of hard coding the table name.
* Interpolate `Table.{columnName}` instead of hard code a column name.
* Interplate bindings by using regular interpolation syntax.
* Use `as` argument to specify query value if it cannot be inferred from context.

## Column order matters in SQL strings

This is correct because `title` comes before `isCompleted` in `Row`:

```swift
@Selection
struct Row {
  let title: String
  let isCompleted: Bool
}
#sql(
  """
  SELECT \(Reminder.title), \(Reminder.isCompleted)
  FROM \(Reminder.self)
  """,
  as: Row.self
)
```
