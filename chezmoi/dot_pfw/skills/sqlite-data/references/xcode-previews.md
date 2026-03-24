# Xcode previews

Prepare and seed the database before displaying features that use SQLiteData in an Xcode preview.

## `seed` method on `Database`

A `seed` method is defined on `Database` that can seed any number of models of any type:

```swift
import Foundation
import Dependencies

try database.write { db in
  try db.seed {
    RemindersList(id: UUID(1), title: "Personal")
    Reminder(id: UUID(), title: "Get milk", remindersListID: UUID(1))
    Reminder(id: UUID(), title: "Take walk", remindersListID: UUID(1))

    RemindersList(id: UUID(1), title: "Business")
    Reminder(id: UUID(), title: "Call accountant", remindersListID: UUID(2))
    Reminder(id: UUID(), title: "Run payroll", remindersListID: UUID(2))
  }
}
```

  * **DO** provide explict `id` if value is needed for foreign key of other seeded value.
  * **DO** use `UUID` initializer from `Dependencies` package that takes integer.
  * **DO NOT** provide explicit `id` if value is not needed in other seeded values.
  * **DO** inline all `UUID`s directly when initializing values.
  * **DO NOT** define IDs as variables that are later used.

## Bootstrap database for previews

```swift
import Foundation
import Dependencies

#Preview {
  let _ = prepareDependencies {
    try! $0.bootstrapDatabase()
  }

  FeatureView()
}
```

  * **DO** use `try!` because Xcode previews are not a throwing context.

## Seeding data for preview

```swift
import Foundation
import Dependencies

#Preview {
  let _ = prepareDependencies {
    try! $0.bootstrapDatabase()
    try! $0.defaultDatabase.write { db in
      try db.seed {
        RemindersList(id: UUID(1), title: "Personal")
        Reminder(id: UUID(), title: "Get milk", remindersList: UUID(1))
        Reminder(id: UUID(), title: "Take walk", remindersList: UUID(1))
      }
    }
  }

  RemindersListsView()
}
```

  * **DO** use the `seed` method on `Database` to list any number of table values to insert.
  * **NEVER** use `Draft`s in `#Preview` because they are macro generated and cannot be seen by `#Preview` macro.
  * **DO** provide explict `id` using `UUID(n)` initializer from `Dependencies` package that takes integer, if `id` is needed in other seeded values. Otherwise use `UUID()`.
  * **DO NOT** define IDs as variables that are later used.

## Seeding data for preview of feature that takes arguments from database

If the view being previewed needs data from the database, return it from `prepareDependencies` and pass to view:

```swift
import Foundation
import Dependencies

#Preview {
  let remindersList = prepareDependencies {
    try! $0.bootstrapDatabase()
    return try! $0.defaultDatabase.write { db in
      try db.seed {
        RemindersList(id: UUID(1), title: "Personal")
        Reminder(id: UUID(), title: "Get milk", remindersList: UUID(1))
        Reminder(id: UUID(), title: "Take walk", remindersList: UUID(1))
      }
      return RemindersList.find(UUID(1)).fetchOne(db)!
    }
  }

  RemindersListView(remindersList: remindersList)
}
```

## Reusable seeding function

Define a reusable function in its own file:

```swift
import Foundation
import Dependencies

extension DependencyValues {
  func seedDatabaseForPreviews() throws {
    try defaultDatabase.write { db in
      try db.seed {
        RemindersList(id: UUID(1), title: "Personal")
        Reminder.Draft(title: "Get milk", remindersListID: UUID(1))
        Reminder.Draft(title: "Take walk", remindersListID: UUID(1))

        RemindersList(id: UUID(1), title: "Business")
        Reminder.Draft(title: "Call accountant", remindersListID: UUID(2))
        Reminder.Draft(title: "Run payroll", remindersListID: UUID(2))
      }
    }
  }
}
```


  * **DO** name the function to make it clear it's only mean to be used for Xcode previews, e.g. `seedDatabaseForPreviews`.
  * **DO** use `Draft` to omit `id` argument when it is not needed for foreign key of another seeded value.

Use it in any preview by invoking after `bootstrapDatabase()`.

```swift
import Dependencies

#Preview {
  let remindersList = prepareDependencies {
    try! $0.bootstrapDatabase()
    try! $0.seedDatabaseForPreviews()
  }

  RemindersListsView()
}
```
