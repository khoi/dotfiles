# INSERT

## Inserting values

```swift
// Primary-keyed table drafts
Reminder.insert {
  Reminder.Draft(title: "Call accountant", priority: .high)
  Reminder.Draft(title: "Take a walk", isCompleted: true)
}

ReminderTag.insert {
  ReminderTag(reminderID: 1, tagID: 1)
  ReminderTag(reminderID: 1, tagID: 2)
}

let remindersLists: [RemindersList] = [...]
RemindersList.insert {
  remindersLists
}

// Specifying columns
Tag.insert {
  $0.title
} values: {
  "home"
  "work"
}
```

* **DO** prefer drafts for primary-keyed tables
* **DO NOT** use `.Draft` for non-primary-keyed tables
* **DO** prefer inserting full values over specific columns

## INSERT INTO … SELECT

```swift
ArchivedReminder.insert {
  ($0.title, $0.priority)
} select: {
  Reminder
    .where(\.isCompleted)
    .select { ($0.title, $0.priority) }
}
```

## Conflict resolution

```swift
Reminder.insert {
  ...
} onConflict: {
  $0.id
} doUpdate: { reminder, excluded in
  reminder.title = excluded.title
}

Reminder.insert {
  ...
} onConflictDoUpdate: {
  $0.title = $1.title
}
```

  * **DO** prefer explicit conflict targets when possible
