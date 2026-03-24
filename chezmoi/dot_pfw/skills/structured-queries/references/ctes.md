# Common Table Expressions (CTEs)

```
With {
  ...
  ...
} query: {
  ...
}
```

## Example

```swift
@Selection
struct HighPriorityRemindersList {
  let id: RemindersList.ID
}

With {
  RemindersList
    .group(by: \.id)
    .leftJoin(Reminder.all) { $0.id.eq($1.remindersListID) }
    .select { remindersList, _ in
      HighPriorityRemindersList.Columns(
        id: remindersList.id
      )
    }
    .having { $1.priority.avg() > 1.5 }
} query: {
  RemindersList
    .where { !$0.id.in(HighPriorityRemindersList.select(\.id)) }
    .delete()
}
```

## Recursive CTEs

```swift
@Selection
struct Counts {
  let value: Int
}

With {
  Counts(value: 1)
    .union(
      all: true,
      Counts.select {
        Counts.Columns(
          value: $0.value + 1
        )
      }
    )
} query: {
  Counts.limit(100)
}
```
