# SELECT statements

## Select subset of columns

```swift
Reminder.select { ($0.id, $0.title) }
```

## Select custom data type

Define `@Selection` and select into its nested `Columns` type:

```swift
@Selection struct Row {
  let reminder: Reminder
  let remindersList: RemindersList
}

Reminder
  .join(RemindersList.all) { $0.remindersListID.eq($1.id) }
  .select {
    Row.Columns(reminder: $0, remindersList: $1)
  }
```

* **DO NOT** select directly into the `@Selection` struct: use the nested `Columns` type instead
