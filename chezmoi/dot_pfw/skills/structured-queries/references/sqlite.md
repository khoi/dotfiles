# SQLite

> Important: `import StructuredQueriesSQLite` to get access to SQLite-specific APIs

## General SQLite functionality

```swift
$0.title.groupConcat()
$0.title.groupConcat(", ", order: $0.title.desc(), filter: !$0.isCompleted)

$0.rowid
```

## FTS5

```swift
@Table struct ReminderText: FTS5, Identifiable {
  @Column(primaryKey: true) let rowid: Int
  var id: Int { rowid }
  let title: String
  let notes: String
  let tags: String
}

@Selection struct SearchResult {
  let title: String
  let notes: String
}

ReminderText
  .where { $0.match("call") }
  .order(by: \.rank)
  .select {
    SearchResult.Columns(
      title: 0.title.highlight("**", "**"),
      notes: $0.notes.snippet("**", "**", "...", 80)
    )
  }
  ```

## Collation

```swift
$0.email.collate(.nocase)
```

## Triggers

Prefer type-safe, temporary triggers over persistent triggers.

```swift
Reminder.createTemporaryTrigger(
  after: .insert { new in
    ReminderText.insert {
      ReminderText(
        rowid: new.rowid,
        title: new.title,
        notes: new.notes
      )
    }
  }
)

Reminder.createTemporaryTrigger(
  after: .update { old, new in
    ReminderText
      .find(new.rowid)
      .update {
        $0.title = new.title
        $0.notes = new.notes
      }
  }
)

Reminder.createTemporaryTrigger(
  after: .delete { old in
    ReminderText
      .find(old.rowid)
      .delete()
  }
)

RemindersList.createTemporaryTrigger(
  after: .delete { old in
    RemindersList.insert {
      RemindersList.Draft(title: "Personal")
    }
  } when: { _ in
    !RemindersList.exists()
  }
)

RemindersList.createTemporaryTrigger(
  after: .update { old, new in
    ...
  }
}

RemindersList.createTemporaryTrigger(
  after: .update(of: \.title) { old, new in
    ...
  }
}

RemindersList.createTemporaryTrigger(
  after: .update {
    ($0.title, $0.description)
  } forEachRow: { old, new in
    ...
  }
}
```

### Timestamp triggers

```swift
Reminder.createTemporaryTrigger(
  after: .update(touch: \.updatedAt)
)
```

## Views

Prefer type-safe, temporary views over persistent views.

```swift
@Table struct CompletedReminder {
  let id: Reminder.ID
  let title: String
}

CompletedReminder.createTemporaryView(
  as: Reminder
    .where(\.isCompleted)
    .select {
      CompletedReminder.Columns(id: $0.id, title: $0.title)
    }
)

CompletedReminder.all
```

## User-defined database functions

### Scalar functions

```swift
@DatabaseFunction nonisolated func add(_ lhs: Int, _ rhs: Int) -> Int {
  lhs + rhs
}

ReminderTag.where {
  $add($0.reminderID, $0.tagID)
}
```

### Aggregate functions

```swift
@DatabaseFunction nonisolated func sum(_ xs: some Sequence<Int>) -> Int {
  xs.reduce(into: 0, +=)
}

Reminder.select { $sum($0.id) }
```
