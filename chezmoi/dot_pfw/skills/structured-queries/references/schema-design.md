# Schema Design

## Custom table name

By default `@Table` lower-camel-cases and pluralizes the type name, _e.g._ `RemindersList` becomes `"remindersLists"`. To override:

```swift
@Table("reminders_lists") struct RemindersList {
  ...
}
```

## Custom column names

By default, column names are equivalent to the struct property name, _e.g._ `var isCompleted: Bool` becomes `"isCompleted"`. To override:

```swift
@Table struct Reminder {
  ...
  @Column("is_completed") var isCompleted = false
}
```

* **DO NOT** use `@Column("name")` when the column name string is identical to the property name

## Column groupings

Bundle multiple columns in a custom `@Selection` type:

```swift
@Selection struct Timestamps {
  let createdAt: Date
  var updatedAt: Date
}

@Table struct Reminder {
  ...
  var timestamps: Timestamps
}
```

## Primary keys

`@Table` infers `id` columns to be primary key automatically (no need to specify with `@Column`). To specify another column:

```swift
@Table struct Tag: Identifiable {
  @Column(primaryKey: true) var name = ""
  var id: String { name }
}
```

If the table has no primary key but _does_ have an `id` column, opt out of primary keyed behavior:

```swift
@Table struct Passport {
  @Column(primaryKey: false) var id: String
}
```

* **DO** prefer UUID primary keys (and `import Foundation` if needed)
* **DO** add `Identifiable` conformances (define computed `id` if column name differs)
  
### Composite keys

Use a column grouping to define a composite primary key:

```swift
@Table struct Employee {
  @Selection struct ID: Hashable {
    let firstName: String
    let lastName: String
  }
  let id: ID
  ...
}
```

* **DO NOT** specify `@Column(primaryKey: true)` multiple times in a `@Table`

## Custom representations

### RawRepresentable structs

Conform to `QueryBindable`:

```swift
struct Priority: Hashable, QueryBindable, RawRepresentable {
  var rawValue: Int
  static let low = Self(rawValue: 1)
  static let medium = Self(rawValue: 2)
  static let high = Self(rawValue: 3)
  static let top = Self(rawValue: 999)
}

@Table struct Reminder {
  ...
  var priority: Priority?
}
```

  * **DO NOT** ever change the value for a `static let` value after it has been used in production.

### RawRepresentable enums

Raw representable enums must be held as optional to maintain backwards compability with devices running an old version of the schema:

```swift
enum Priority: Int, QueryBindable {
  case low = 0
  case medium = 1
  case high = 2
}

@Table struct Reminder {
  ...
  var priority: Priority?
}
```

  * **DO** provide explicit value for each case.
  * **DO NOT** ever change the value for a case after it has been used in production.

### JSON

```swift
struct Note: Codable { ... }

@Table struct Reminder {
  ...
  @Column(as: [Note].JSONRepresentation.self)
  var notes: [Note] = []
}
```

### `QueryRepresentable`

#### Step 1: Define a query representation conformance

```swift
import SwiftUI

extension Color {
  struct HexRepresentation: QueryBindable, QueryDecodable, QueryRepresentable {
    var queryOutput: Color

    init(queryOutput: Color) {
      self.queryOutput = queryOutput
    }

    init(hexValue: Int64) {
      self.init(
        queryOutput: Color(
          red: Double((hexValue >> 24) & 0xFF) / 0xFF,
          green: Double((hexValue >> 16) & 0xFF) / 0xFF,
          blue: Double((hexValue >> 8) & 0xFF) / 0xFF,
          opacity: Double(hexValue & 0xFF) / 0xFF
        )
      )
    }

    var hexValue: Int64? {
      guard let components = UIColor(queryOutput).cgColor.components
      else { return nil }
      let r = Int64(components[0] * 0xFF) << 24
      let g = Int64(components[1] * 0xFF) << 16
      let b = Int64(components[2] * 0xFF) << 8
      let a = Int64((components.indices.contains(3) ? components[3] : 1) * 0xFF)
      return r | g | b | a
    }

    init?(queryBinding: StructuredQueriesCore.QueryBinding) {
      guard case .int(let hexValue) = queryBinding else { return nil }
      self.init(hexValue: hexValue)
    }

    var queryBinding: QueryBinding {
      guard let hexValue else {
        struct InvalidColor: Error {}
        return .invalid(InvalidColor())
      }
      return .int(hexValue)
    }

    init(decoder: inout some QueryDecoder) throws {
      try self.init(hexValue: Int64(decoder: &decoder))
    }
  }
}
```

#### Step 2: Use with `@Column(as:)`

```swift
@Table struct RemindersList {
  ...
  @Column(as: Color.HexRepresentation.self)
  var color: Color
}
```

## Enum column groupings / single table inheritance

Introduce the CasePaths library and enable the `StructuredQueriesCasePaths` package trait to add support for enum column groupings with a column per case to simulate single table inheritance:

```
import CasePaths

@CasePathable
@Selection enum Media {
  case audio(Data)
  case image(Data)
  case text(String)
  case video(Data)
}

@Table struct JournalEntry: Identifiable {
  let id: UUID
  var date = Date()
  var media: Media
  var isHidden = false
}
```

**DO NOT** reuse the same enum column grouping multiple times in a `@Table`: their column names would overlap. Instead, define a dedicated enum per grouping with unique case names
    
Consult the `pfw-case-paths/SKILL.md` skill for more information on case paths.

## Default "scopes"

Override `all` so that all query builders inherit base query logic.

```swift
@Table struct Reminder {
  ...
  var isDeleted = false

  static let all = Self.where { !$0.isDeleted }
}

Reminder.all                            // Non-deleted reminders
Reminder.where(\.isCompleted)           // Non-deleted, completed reminders
Reminder.unscoped                       // All reminders
Reminder.unscoped.where(\.isCompleted)  // Completed reminders
```

Default scopes _must_ be a type that satisfies `some SelectStatement<TableType>`.

## Reusable helpers

Dynamic scopes:

```swift
@Table struct Reminder {
  ...
  static let deleted = Self.where(\.isDeleted)

  static let completed: some SelectStatementOf<Reminder> {
    Self.where(\.isCompleted)
  }
}

Reminder
  .order(by: \.title)
  .deleted
  .completed
```

Computed table columns:

```swift
extension Reminder.TableColumns {
  var isPastDue: some QueryExpression<Bool> {
    self.dueAt < #sql("datetime('now')")
  }
}

Reminder
  .where(\.isPastDue)
```
