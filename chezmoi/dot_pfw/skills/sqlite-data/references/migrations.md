# Migrations

* **DO** use GRDB's `DatabaseMigrator`
* **DO NOT** use GRDB's migration DSLs, like `create(table:)` or `alter(table:)`. Instead, prefer safe `#sql` strings.

## Creating tables

Given the following table structs:

```swift
import Foundation
import SQLiteData

@Table struct RemindersList: Identifiable {
  let id: UUID
  var title = ""
}
@Table struct Reminder: Identifiable {
  let id: UUID
  var isCompleted = false
  var remindersListID: RemindersList.ID
  var title = ""
}
```

…register a new migration that executes a safe SQL string with a "CREATE TABLE" statement(s):

```swift
migrator.registerMigration("Create 'remindersLists' and 'reminders' tables") { db in
  try #sql("""
    CREATE TABLE "remindersLists" (
      "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())",
      "title" TEXT NOT NULL DEFAULT ''
    ) STRICT
    """)
    .execute(db)

  try #sql("""
    CREATE TABLE "reminders" (
      "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())",
      "isCompleted" INTEGER NOT NULL DEFAULT 0,
      "remindersListID" TEXT NOT NULL REFERENCES "remindersLists"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL DEFAULT ''
    ) STRICT
    """)
    .execute(db)
  try #sql("""
    CREATE INDEX "index_reminders_on_remindersListID" ON "reminders"("remindersListID")
    """)
    .execute(db)
}
```

  * New tables are allowed to have non-NULL columns without defaults.

## Adding fields to an existing table

Add property to the `@Table` struct:

```swift
@Table struct RemindersList {
  let id: UUID
  var title = ""
  var position = 0 // New field
}
```

Register a new migration to add the column to the SQLite table:

```swift
extension DependencyValues {
  func bootstrapDatabase() throws {
    ...
    migrator.registerMigration("Add column 'position' to 'remindersLists'") { db in
      #sql("""
        ALTER TABLE "remindersLists"
        ADD COLUMN "position" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0
        """)
        .execute(db)
    }
  }
}
```

  * **DO NOT** editing existing migrations that have potentially already shipped to users.
  * Non-null columns **MUST** have a default with a "NOT NULL ON CONFLICT REPLACE" clause.
  * Nullable columns do not need a default.

## Dropping and renmaing columns and tables

* If using `SyncEngine`, **NEVER** drop or rename columns and tables in order to preserve backwards compatibility.
