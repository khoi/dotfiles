# Subqueries

Compose queries together to execute subqueries.

Select reminders lists that have at least one incomplete reminder assigned to it:

```swift
RemindersList.where {
  $0.id.in(
    Reminder
      .select(\.remindersListID)
      .where { !$0.isCompleted }
  )
}
```

Select incomplete reminder count, flagged reminder count, scheduled in the future count, and scheduled today count, in a single query:

```swift
@Selection struct Stats {
  var incompleteCount = 0
  var flaggedCount = 0
  var scheduledCount = 0
  var todayCount = 0
}

Reminder.select {
  Stats.Columns(
    allCount: $0.count(filter: !$0.isCompleted),
    flaggedCount: $0.count(filter: $0.isFlagged && !$0.isCompleted),
    scheduledCount: $0.count(filter: $0.isScheduled),
    todayCount: $0.count(filter: $0.isToday)
  )
}
```
