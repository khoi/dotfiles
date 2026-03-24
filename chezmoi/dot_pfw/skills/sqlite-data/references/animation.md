# Animation

## Static queries

Use `animation` argument in `@FetchAll`/`@FetchOne`:

```swift
@FetchAll(animation: .default) var remindersLists: [RemindersList]
@FetchAll(Reminder.where(\.isCompleted), animation: .default) var completedReminders
@FetchOne(Reminder.count(), animation: .spring) var remindersCount = 0
```

## Dynamic queries

Use `animation` argument of `load` defined on projected value of `@FetchAll`/`@FetchOne`/`@Fetch`:

```swift
$remindersLists.load(…, animation: .default)
```

## withAnimation does not work

`withAnimation` around inserts, updates and deletes does not work:

```swift
try withAnimation {
  try database.write { db in
    try Reminder.find(reminderID).delete().execute(db) // 🛑
  }
}
```
