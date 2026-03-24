# Upsert

Upserting is an ergonomic way to either insert a value (if a row with its `id` does not exist), or update the existing value. It is typically better to use over `insert` or `update`.

## Upsert a value

Upsert a draft value:

```swift
Reminder.upsert {
  Reminder.Draft(title "Get milk")
}
```

Make changes to a value and upsert it:

```
reminder.isCompleted.toggle()
Reminder.upsert {
  reminder
}
```

## Return freshly upserted data

```swift
Reminder.upsert {
  Reminder.Draft(title "Get milk")
}
.returning(\.id)

reminder.isCompleted.toggle()
Reminder.upsert {
  reminder
}
```
