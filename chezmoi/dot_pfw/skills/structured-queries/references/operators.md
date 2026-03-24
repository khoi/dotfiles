# Operators

## "IN" and "NOT IN"

Select all reminders with `id` contained in a list of ids:

```swift
Reminder.where { $0.id.in(ids) }
```

Select all reminders with `id` _not_ contained in a list of ids:

```swift
Reminder.where { $0.id.notIn(ids) }
```

Select all reminders lists with a reminder assigned to it:

```swift
RemindersList.where {
  $0.id.in(Reminder.select(\.remindersListID))
}
```

Select all reminders lists with no reminders assigned to it:

```swift
RemindersList.where {
  $0.id.notIn(Reminder.select(\.remindersListID))
}
```
