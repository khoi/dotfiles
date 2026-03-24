# Assets

Store assets directly in `@Table` structs with `Data` properties:

```swift
import Foundation
import SQLiteData

@Table struct RemindersList: Identifiable {
  let id: UUID
  var title = ""
}
@Table struct RemindersListAsset: Identifiable {
  @Column(primaryKey: true)
  var remindersListID: RemindersList.ID
  var coverImageData: Data
  var id: RemindersList.ID { remindersListID }
}
```

* **DO** prefer to put asset data in a separate table if assets can be large or asset is associated with large, high-traffic table.
* **DO** follow migration steps after new table is defined:
  ```swift
  migrator.registerMigration("Create 'remindersListAssets' table") { db in
    try #sql("""
    CREATE TABLE "remindersListAssets"(
      "remindersListID" TEXT NOT NULL PRIMARY KEY REFERENCES "remindersLists"("id") ON DELETE CASCADE,
      "coverageImageData" BLOB NOT NULL
    ) STRICT
    """)
    .execute(db)
  }
  ```