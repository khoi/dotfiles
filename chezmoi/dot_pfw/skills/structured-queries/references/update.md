# UPDATE

```swift
Reminder.where(\.isCompleted).update {
  $0.archivedAt = #sql("datetime('now')")
}

Reminder.find(id).update {
  $0.isCompleted.toggle()
}

Player.find(id).update {
  $0.score += 1
}
```
